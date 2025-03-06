const fs = require('fs');
const path = require('path');
const { Wallets } = require('fabric-network');
const { generateCertificate, getWalletPath,enrollAdmin } = require('../fabric/fabricConnection');

// Path to users.txt file
const usersFilePath = path.resolve(__dirname, '../../data/users.txt');

/**
 * Makes sure the users file exists, creates it if not
 */
function ensureUsersFile() {
  if (!fs.existsSync(usersFilePath)) {
    // Create directory if it doesn't exist
    const dir = path.dirname(usersFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Create empty users file
    fs.writeFileSync(usersFilePath, '', 'utf8');
  }
}

/**
 * Reads all users from the users.txt file
 * @returns {Map<string, object>} Map of users with username as key
 */
function readUsers() {
  ensureUsersFile();
  
  // Read and parse users file
  const content = fs.readFileSync(usersFilePath, 'utf8');
  const users = new Map();
  
  if (content.trim()) {
    const lines = content.split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        const [username, password, role] = line.split(':');
        users.set(username, { password, role: role || 'citizen' });
      }
    });
  }
  
  return users;
}

/**
 * Writes users to the users.txt file
 * @param {Map<string, object>} users - Map of users
 */
function writeUsers(users) {
  ensureUsersFile();
  
  // Convert users map to text format
  let content = '';
  users.forEach((user, username) => {
    content += `${username}:${user.password}:${user.role || 'citizen'}\n`;
  });
  
  // Write to file
  fs.writeFileSync(usersFilePath, content, 'utf8');
}

/**
 * Registers a new citizen user
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<boolean>} Success status
 */
async function registerCitizen(username, password) {
  try {
    const users = readUsers();
    
    // Check if user already exists
    if (users.has(username)) {
      return { success: false, message: 'User already exists' };
    }
    
    // Add user to the file
    users.set(username, { password, role: 'citizen' });
    writeUsers(users);
    
    // Generate certificate
    await enrollAdmin('citizens');

    await generateCertificate('citizens', username, false);
    
    return { success: true, message: 'User registered successfully' };
  } catch (error) {
    console.error(`Error registering citizen: ${error}`);
    return { success: false, message: error.message };
  }
}

/**
 * Validates user login credentials
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<object>} Login result with user info if successful
 */
async function login(username, password) {
    try {
      const users = readUsers();
      
      // Add default admin accounts if they don't exist
      const admins = ['healthad', 'civilad', 'electoralad', 'policead'];
      admins.forEach(admin => {
        if (!users.has(admin)) {
          users.set(admin, { password: '123', role: admin.replace('ad', '') });
        }
      });
      writeUsers(users);
      
      // Check if user exists
      if (!users.has(username)) {
        return { success: false, message: 'User not found' };
      }
      
      // Check password
      const user = users.get(username);
      if (user.password !== password) {
        return { success: false, message: 'Invalid password' };
      }
      
      // Determine organization based on role
      let orgName;
      if (user.role === 'citizen') {
        orgName = 'citizens';
      } else if (user.role === 'health') {
        orgName = 'health';
      } else if (user.role === 'civil') {
        orgName = 'civil';
      } else if (user.role === 'electoral') {
        orgName = 'electoral';
      } else if (user.role === 'police') {
        orgName = 'police';
      } else {
        return { success: false, message: 'Invalid user role' };
      }
      
      // Ensure the admin user for this organization is enrolled first
      // This is crucial for generating certificates and accessing the network
      try {
        await enrollAdmin(orgName);
        console.log(`Admin enrolled for organization: ${orgName}`);
      } catch (adminError) {
        console.error(`Failed to enroll admin for ${orgName}: ${adminError}`);
        // Continue anyway, as the admin might already be enrolled with different credentials
      }
      
    //   // Check if user has a certificate
    //   const walletPath = getWalletPath(orgName);
    //   const wallet = await Wallets.newFileSystemWallet(walletPath);
    //   const identity = await wallet.get(username);
      
    //   // If user doesn't have certificate, generate one
    //   if (!identity) {
    //     // For admin users, generate admin certificate
    //     if (user.role !== 'citizen') {
    //       console.log(`Generating admin certificate for ${username} in ${orgName}`);
    //       await generateCertificate(orgName, username, true);
    //     } else {
    //       // For citizen users, just note that they need to register
    //       console.log(`User ${username} does not have a certificate. They should register first.`);
    //       return { success: false, message: 'User needs to register first' };
    //     }
    //   }
      
      return {
        success: true,
        user: {
          username,
          role: user.role,
          orgName
        }
      };
    } catch (error) {
      console.error(`Error during login: ${error}`);
      return { success: false, message: error.message };
    }
  }

module.exports = {
  registerCitizen,
  login
};