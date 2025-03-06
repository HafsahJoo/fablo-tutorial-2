const fs = require('fs');
const path = require('path');
const FabricCAServices = require('fabric-ca-client');
const { Wallets, Gateway } = require('fabric-network');

// Base directory for connection profiles
const connectionProfilesDir = path.resolve(__dirname, '../../../fablo-target/fabric-config/connection-profiles');
// Base directory for wallets
const walletsDir = path.resolve(__dirname, '../../wallets');

/**
 * Loads a connection profile for the specified organization
 * @param {string} orgName - Organization name (e.g., 'Citizens', 'Health')
 * @returns {object} Connection profile as a JSON object
 */
function loadConnectionProfile(orgName) {
  // Convert organization name to lowercase for file naming
  const orgNameLower = orgName.toLowerCase();
  
  // Try both JSON and YAML formats
  const jsonPath = path.join(connectionProfilesDir, `connection-profile-${orgNameLower}.json`);
  // Check if the JSON file exists
  if (fs.existsSync(jsonPath)) {
    // console.log(`Loading connection profile for ${orgName} from ${jsonPath}`);
    const fileContent = fs.readFileSync(jsonPath, 'utf8');
    // console.log("fileContent: ", fileContent);
    return JSON.parse(fileContent);
  }
  
  // If we reach here, the connection profile doesn't exist
  throw new Error(`Connection profile for ${orgName} not found`);
}

/**
 * Get the wallet path for a specific organization
 * @param {string} orgName - Organization name
 * @returns {string} Path to the wallet
 */
function getWalletPath(orgName) {
    // Make organization name lowercase for consistent folder naming
    const orgNameLower = orgName.toLowerCase();
    return path.join(walletsDir, `${orgNameLower}`);
}

/**
 * Get CA info for the given organization
 * @param {string} orgName - Organization name
 * @param {object} connectionProfile - Connection profile
 * @returns {object} CA info object
 */
function getCAInfo(orgName, connectionProfile) {
    // console.log("orgName: ", orgName);
    // console.log("connectionProfile: ", connectionProfile);
    
    // Find the correct case-insensitive organization key
    const orgKey = Object.keys(connectionProfile.organizations)
        .find(key => key.toLowerCase() === orgName.toLowerCase());
    
    if (!orgKey) {
        throw new Error(`Organization ${orgName} not found in the connection profile`);
    }
    
    const orgDomain = connectionProfile.organizations[orgKey].mspid.replace('MSP', '').toLowerCase() + '.example.com';
    const caInfo = connectionProfile.certificateAuthorities[`ca.${orgDomain}`];

    if (!caInfo) {
        throw new Error(`CA info for ${orgName} not found in the connection profile`);
    }

    return caInfo;
}

/**
 * Generates a certificate for a new user
 * @param {string} orgName - Organization name (e.g., 'Citizens', 'Health')
 * @param {string} userId - User ID
 * @param {boolean} isAdmin - Whether the user is an admin
 * @returns {Promise<void>}
 */
async function generateCertificate(orgName, userId, isAdmin = false) {
    try {
      // Load the connection profile
      console.log("orgName: ", orgName);
      const connectionProfile = loadConnectionProfile(orgName);
      
      // Get CA information
      const caInfo = getCAInfo(orgName, connectionProfile);
      console.log("caInfo: ", caInfo);
      
      // Get the TLS CA certificate - handling both path and pem formats
      let caTLSCACerts;
      if (caInfo.tlsCACerts.pem) {
        caTLSCACerts = caInfo.tlsCACerts.pem;
      } else if (caInfo.tlsCACerts.path) {
        // Read the cert from the file path
        caTLSCACerts = fs.readFileSync(caInfo.tlsCACerts.path, 'utf8');
      } else {
        throw new Error('Unable to find TLS CA certificates');
      }
      
      console.log("caTLSCACerts loaded: ", !!caTLSCACerts); // Just log if it's loaded, not the entire cert
      const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);
      
      // Create a new wallet for managing identities
      const walletPath = getWalletPath(orgName);
      console.log("walletPath: ", walletPath);
      const wallet = await Wallets.newFileSystemWallet(walletPath);
      
      console.log("cheking is user registers"); 
      console.log("Wallet: ", wallet);
      // Check if user already exists in the wallet
      const userIdentity = await wallet.get(userId);
      if (userIdentity) {
        console.log(`An identity for the user ${userId} already exists in the wallet`);
        return;
      }
      
      // First, check if admin identity exists
      let adminIdentity = await wallet.get('admin');
      
      // If we're enrolling the admin and admin identity doesn't exist yet
      if (userId === 'admin' && !adminIdentity) {
        // Enroll the bootstrap admin using Fabric CA's default credentials
        try {
          const enrollment = await ca.enroll({
            enrollmentID: 'admin',
            enrollmentSecret: 'adminpw'  // Default bootstrap admin password in Fabric CA
          });
          
          const x509Identity = {
            credentials: {
              certificate: enrollment.certificate,
              privateKey: enrollment.key.toBytes(),
            },
            mspId: `${orgName}MSP`,
            type: 'X.509',
          };
          
          await wallet.put('admin', x509Identity);
          console.log('Successfully enrolled admin user and imported it into the wallet');
          return;
        } catch (error) {
          console.error('Failed to enroll admin user:', error);
          throw error;
        }
      }
      
      // For non-admin users or other admin users (not the initial 'admin')
      if (userId !== 'admin' || isAdmin) {
        // We need admin identity to register other users
        if (!adminIdentity) {
          console.log('An identity for the admin user "admin" does not exist in the wallet');
          console.log('Enroll the admin user before registering other users');
          throw new Error('Admin identity not found');
        }
        
        console.log("adminIdentity: ", adminIdentity);
        // Get admin user context for registering new users
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');
        
        console.log("adminUsergood: ", adminUser);
        // Register the user and get a secret
        const secret = await ca.register({
            // Try one of these affiliations:
            affiliation: '',  // Empty affiliation
            // OR
            // affiliation: `${orgName.toLowerCase()}`,  // Just the org name without department
            // OR
            // affiliation: 'org1.department1',  // Try using the default Fabric affiliation
            enrollmentID: userId,
            role: isAdmin ? 'admin' : 'client'
        }, adminUser);

        console.log(`Successfully registered user ${userId}`);
        // Enroll the user with the generated secret
        const enrollment = await ca.enroll({
          enrollmentID: userId,
          enrollmentSecret: secret
        });
        
        // Create and store the user identity
        const x509Identity = {
          credentials: {
            certificate: enrollment.certificate,
            privateKey: enrollment.key.toBytes(),
          },
          mspId: `${orgName}MSP`,
          type: 'X.509',
        };
        
        await wallet.put(userId, x509Identity);
        console.log(`Successfully registered and enrolled user ${userId} and imported it into the wallet`);
      }
    } catch (error) {
      console.error(`Failed to register user: ${error}`);
      throw error;
    }
  }

/**
 * Gets a Gateway instance connected to the network
 * @param {string} orgName - Organization name
 * @param {string} userId - User ID
 * @returns {Promise<Gateway>} Gateway instance
 */
async function getGateway(orgName, userId) {
  try {
    // Load connection profile
    const connectionProfile = loadConnectionProfile(orgName);
    
    console.log("connectionProfile: ", connectionProfile);
    // Create a new file system wallet
    const walletPath = getWalletPath(orgName);
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    
    // Check if user exists in the wallet
    const identity = await wallet.get(userId);
    if (!identity) {
      throw new Error(`User ${userId} not found in the wallet`);
    }
    
    // Set up the gateway
    const gateway = new Gateway();
    await gateway.connect(connectionProfile, {
      wallet,
      identity: userId,
      discovery: { enabled: true, asLocalhost: true }
    });
    
    return gateway;
  } catch (error) {
    console.error(`Failed to connect to gateway: ${error}`);
    throw error;
  }
}

// Add this new function to explicitly enroll the admin
async function enrollAdmin(orgName) {
    try {
      // Load the connection profile
      console.log("Enrolling admin for organization:", orgName);
      const connectionProfile = loadConnectionProfile(orgName);
      
      // Get CA information
      const caInfo = getCAInfo(orgName, connectionProfile);
      
      // Get the correct org key and MSP ID
      const orgKey = Object.keys(connectionProfile.organizations)
        .find(key => key.toLowerCase() === orgName.toLowerCase());
      
      if (!orgKey) {
        throw new Error(`Organization ${orgName} not found in the connection profile`);
      }
      
      const mspId = connectionProfile.organizations[orgKey].mspid;
      console.log("Using MSP ID:", mspId);
      
      // Get the TLS CA certificate - handling both path and pem formats
      let caTLSCACerts;
      if (caInfo.tlsCACerts.pem) {
        caTLSCACerts = caInfo.tlsCACerts.pem;
      } else if (caInfo.tlsCACerts.path) {
        // Read the cert from the file path
        caTLSCACerts = fs.readFileSync(caInfo.tlsCACerts.path, 'utf8');
      } else {
        throw new Error('Unable to find TLS CA certificates');
      }
      
      const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);
      
      // Create a new wallet for managing identities
      const walletPath = getWalletPath(orgName);
      const wallet = await Wallets.newFileSystemWallet(walletPath);
      
      // Remove existing admin identity if it exists
      const adminIdentity = await wallet.get('admin');
      if (adminIdentity) {
        console.log('Removing existing admin identity for re-enrollment');
        await wallet.remove('admin');
      }
      
      // Enroll the admin with the CA using the bootstrap admin credentials
      console.log("Enrolling admin with CA, using bootstrap admin credentials");
      const enrollment = await ca.enroll({
        enrollmentID: 'admin',
        enrollmentSecret: 'adminpw'  // Default bootstrap admin password in Fabric CA
      });
      
      const x509Identity = {
        credentials: {
          certificate: enrollment.certificate,
          privateKey: enrollment.key.toBytes(),
        },
        mspId: mspId,
        type: 'X.509',
      };
      
      await wallet.put('admin', x509Identity);
      console.log('Successfully enrolled admin user and imported it into the wallet');
      return true;
    } catch (error) {
      console.error(`Failed to enroll admin user: ${error}`);
      throw error;
    }
  }

  module.exports = {
    generateCertificate,
    enrollAdmin,
    getGateway,
    getWalletPath
  };