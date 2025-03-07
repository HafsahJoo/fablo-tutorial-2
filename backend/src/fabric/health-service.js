// health-service.js
const { Wallets, Gateway } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const logger = require('../config/logger');

// Base directory for connection profiles
const connectionProfilesDir = path.resolve(__dirname, '../../../fablo-target/fabric-config/connection-profiles');
// Base directory for wallets
const walletsDir = path.resolve(__dirname, '../../wallets');

/**
 * Health Service class to interact with the health-chaincode
 */
class HealthService {
  /**
   * Loads a connection profile for the specified organization
   * @param {string} orgName - Organization name (health or citizens)
   * @returns {object} Connection profile as a JSON object
   */
  loadConnectionProfile(orgName) {
    // Convert organization name to lowercase for file naming
    const orgNameLower = orgName.toLowerCase();
    
    // Try JSON format
    const jsonPath = path.join(connectionProfilesDir, `connection-profile-${orgNameLower}.json`);
    
    // Check if the JSON file exists
    if (fs.existsSync(jsonPath)) {
      logger.info(`Loading connection profile for ${orgName} from ${jsonPath}`);
      const fileContent = fs.readFileSync(jsonPath, 'utf8');
      return JSON.parse(fileContent);
    }
    
    // If we reach here, the connection profile doesn't exist
    throw new Error(`Connection profile for ${orgName} not found`);
  }

  /**
   * Get wallet path for the specified organization
   * @param {string} orgName - Organization name
   * @returns {string} Path to the wallet
   */
  getWalletPath(orgName) {
    const orgNameLower = orgName.toLowerCase();
    return path.join(walletsDir, `${orgNameLower}`);
  }

/**
 * Connect to the Fabric network
 * @param {string} orgName - Organization name (health or citizens)
 * @param {string} userId - User ID (healthad or citizen ID)
 * @returns {Promise<{gateway: Gateway, network: Network, contract: Contract}>} - Gateway, network and contract
 */
async connect(orgName, userId) {
    try {
      // Load connection profile
      const connectionProfile = this.loadConnectionProfile(orgName);
      
      // Get wallet path
      const walletPath = this.getWalletPath(orgName);
      const wallet = await Wallets.newFileSystemWallet(walletPath);
      
      // Map userId to the actual identity file name in the wallet
      // For 'health' org, if userId is 'healthad', use 'admin' as the identity
      let identityId = userId;
      if (orgName.toLowerCase() === 'health' && userId === 'healthad') {
        identityId = 'admin';
        console.log(`Using 'admin' identity for user ${userId}`);
      }
      
      console.log("Looking for identity:", identityId, "for user:", userId); 
      
      // Check if user identity exists
      const myidentity = await wallet.get(identityId);
      if (!myidentity) {
        throw new Error(`Identity ${identityId} not found in the wallet for ${orgName} organization`);
      }
      console.log(myidentity);
      
      // Connect to gateway using the identity name from the wallet
      const gateway = new Gateway();
      await gateway.connect(connectionProfile, {
        wallet,
        identity: identityId,
        discovery: { enabled: true, asLocalhost: true }
      });
      
      // Get network and contract instances
      let channelName;
      
      // Use citizens-health channel for health chaincode interaction
      channelName = 'citizens-health';
      
      const network = await gateway.getNetwork(channelName);
      const contract = network.getContract('health-chaincode');
      
      logger.info(`Connected to the network as ${identityId} on channel ${channelName}`);
      
      return { gateway, network, contract };
    } catch (error) {
      logger.error(`Failed to connect to the network: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a medical record for a citizen
   * @param {string} userId - User ID (must be healthad)
   * @param {object} recordData - Medical record data
   * @returns {Promise<object>} - Created medical record
   */
  async createMedicalRecord(userId, recordData) {
    // Validate that the user is a health admin
    if (userId !== 'healthad') {
      throw new Error('Only health administrators can create medical records');
    }
    
    const { citizenId, diagnosis, treatment, date } = recordData;
    
    // Generate a unique record ID
    const recordId = `MED_REC_${Date.now()}_${citizenId}`;
    
    let gateway;
    
    try {
      // Connect to the network as health admin
      const connection = await this.connect('health', userId);
      gateway = connection.gateway;
      const contract = connection.contract;
      
      // Create medical record
      const result = await contract.submitTransaction(
        'createMedicalRecord',
        recordId,
        citizenId,
        userId, // doctorId is the health admin ID
        diagnosis,
        treatment,
        date
      );
      
      return JSON.parse(result.toString());
    } catch (error) {
      logger.error(`Failed to create medical record: ${error.message}`);
      throw error;
    } finally {
      if (gateway) {
        gateway.disconnect();
      }
    }
  }

  /**
   * Get a medical record by ID
   * @param {string} userId - User ID (healthad or citizen ID)
   * @param {string} orgName - Organization name (health or citizens)
   * @param {string} recordId - Medical record ID
   * @returns {Promise<object>} - Medical record
   */
  async getMedicalRecord(userId, orgName, recordId) {
    let gateway;
    
    try {
      // Connect to the network
      const connection = await this.connect(orgName, userId);
      gateway = connection.gateway;
      const contract = connection.contract;
      
      // Get medical record
      const result = await contract.evaluateTransaction(
        'getMedicalRecord',
        recordId
      );
      
      return JSON.parse(result.toString());
    } catch (error) {
      logger.error(`Failed to get medical record: ${error.message}`);
      throw error;
    } finally {
      if (gateway) {
        gateway.disconnect();
      }
    }
  }

  /**
   * Get citizen's medical history
   * @param {string} userId - User ID (healthad or citizen ID)
   * @param {string} orgName - Organization name (health or citizens)
   * @param {string} citizenId - Citizen ID to get history for
   * @returns {Promise<object[]>} - Medical records
   */
  async getCitizenMedicalHistory(userId, orgName, citizenId) {
    // Validate that the user is either the citizen themselves or a health admin
    if (userId !== 'healthad' && userId !== citizenId) {
      throw new Error('You can only access your own medical history or you must be a health administrator');
    }
    
    let gateway;
    
    try {
      // Connect to the network'
      console.log("connecting");
      console.log("orgName:", orgName, "userId:", userId);
      const connection = await this.connect(orgName, userId);
      gateway = connection.gateway;
      const contract = connection.contract;
      
      console.log("connecting1");
      // Get citizen's medical history
      const result = await contract.evaluateTransaction(
        'getCitizenMedicalHistory',
        citizenId
      );
      console.log("connecting3");
      return JSON.parse(result.toString());
    } catch (error) {
      logger.error(`Failed to get citizen medical history: ${error.message}`);
      throw error;
    } finally {
      if (gateway) {
        gateway.disconnect();
      }
    }
  }

  /**
   * Create a prescription for a citizen
   * @param {string} userId - User ID (must be healthad)
   * @param {object} prescriptionData - Prescription data
   * @returns {Promise<object>} - Created prescription
   */
  async createPrescription(userId, prescriptionData) {
    // Validate that the user is a health admin
    if (userId !== 'healthad') {
      throw new Error('Only health administrators can create prescriptions');
    }
    
    const { citizenId, medications, instructions, expiryDate } = prescriptionData;
    
    // Generate a unique prescription ID
    const prescriptionId = `PRES_${Date.now()}_${citizenId}`;
    
    let gateway;
    
    try {
      // Connect to the network as health admin
      const connection = await this.connect('health', userId);
      gateway = connection.gateway;
      const contract = connection.contract;
      
      // Create prescription
      const result = await contract.submitTransaction(
        'createPrescription',
        prescriptionId,
        citizenId,
        userId, // doctorId is the health admin ID
        medications,
        instructions,
        expiryDate
      );
      
      return JSON.parse(result.toString());
    } catch (error) {
      logger.error(`Failed to create prescription: ${error.message}`);
      throw error;
    } finally {
      if (gateway) {
        gateway.disconnect();
      }
    }
  }

  /**
   * Book an appointment
   * @param {string} userId - User ID (can be healthad or citizen ID)
   * @param {string} orgName - Organization name (health or citizens)
   * @param {object} appointmentData - Appointment data
   * @returns {Promise<object>} - Created appointment
   */
  async bookAppointment(userId, orgName, appointmentData) {
    const { citizenId, doctorId, date, time, purpose } = appointmentData;
    
    // Generate a unique appointment ID
    const appointmentId = `APP_${Date.now()}_${citizenId}`;
    
    let gateway;
    
    try {
      // Connect to the network
      const connection = await this.connect(orgName, userId);
      gateway = connection.gateway;
      const contract = connection.contract;
      
      // Book appointment
      const result = await contract.submitTransaction(
        'bookAppointment',
        appointmentId,
        citizenId,
        doctorId,
        date,
        time,
        purpose
      );
      
      return JSON.parse(result.toString());
    } catch (error) {
      logger.error(`Failed to book appointment: ${error.message}`);
      throw error;
    } finally {
      if (gateway) {
        gateway.disconnect();
      }
    }
  }
}

module.exports = new HealthService();