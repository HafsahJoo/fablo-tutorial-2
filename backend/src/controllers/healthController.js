// backend/src/controllers/healthController.js
const healthService = require('../fabric/health-service');
const logger = require('../config/logger');

/**
 * Controller for health-related endpoints
 */

/**
 * Create a new medical record for a citizen
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
exports.createMedicalRecord = async (req, res) => {
  try {
    // Check if user is authenticated and is a health admin
    if (!req.session.user || req.session.user.role !== 'health') {
      return res.status(403).json({
        success: false,
        message: 'Only health administrators can create medical records'
      });
    }
    
    const userId = req.session.user.username;
    const { citizenId, diagnosis, treatment, date } = req.body;
    
    // Validate request body
    if (!citizenId || !diagnosis || !treatment || !date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: citizenId, diagnosis, treatment, date'
      });
    }
    
    // Create medical record
    const record = await healthService.createMedicalRecord(userId, {
      citizenId,
      diagnosis,
      treatment,
      date
    });
    
    // Return created record
    res.status(201).json({
      success: true,
      message: 'Medical record created successfully',
      record
    });
  } catch (error) {
    logger.error(`Error creating medical record: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

/**
 * Get a medical record by ID
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
exports.getMedicalRecord = async (req, res) => {
  try {
    // Check if user is authenticated
    // if (!req.session.user) {
    //   return res.status(401).json({
    //     success: false,
    //     message: 'Unauthorized'
    //   });
    // }
    
    const userId = req.session.user.username;
    const orgName = req.session.user.orgName;
    const { recordId } = req.params;
    
    // Validate request parameters
    if (!recordId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: recordId'
      });
    }
    
    // Get medical record
    const record = await healthService.getMedicalRecord(userId, orgName, recordId);
    
    // Check if user has access to this record
    if (req.session.user.role !== 'health' && record.citizenId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this medical record'
      });
    }
    
    // Return record
    res.json({
      success: true,
      record
    });
  } catch (error) {
    logger.error(`Error getting medical record: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

/**
 * Get citizen's medical history
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
exports.getCitizenMedicalHistory = async (req, res) => {
  try {
    // Check if user is authenticated
    // if (!req.session.user) {
    //   return res.status(401).json({
    //     success: false,
    //     message: 'Unauthorized'
    //   });
    // }
    
    const userId = req.session.user.username;
    const orgName = req.session.user.orgName;
    const { citizenId } = req.params;
    
    // Validate request parameters
    if (!citizenId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: citizenId'
      });
    }
    
    // Check if user has access to this citizen's medical history
    if (req.session.user.role !== 'health' && citizenId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only access your own medical history or you must be a health administrator'
      });
    }
    
    // Get citizen's medical history
    const records = await healthService.getCitizenMedicalHistory(userId, orgName, citizenId);
    
    // Return records
    res.json({
      success: true,
      citizenId,
      records
    });
  } catch (error) {
    logger.error(`Error getting citizen medical history: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

/**
 * Create a prescription for a citizen
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
exports.createPrescription = async (req, res) => {
  try {
    // Check if user is authenticated and is a health admin
    if (!req.session.user || req.session.user.role !== 'health') {
      return res.status(403).json({
        success: false,
        message: 'Only health administrators can create prescriptions'
      });
    }
    
    const userId = req.session.user.username;
    const { citizenId, medications, instructions, expiryDate } = req.body;
    
    // Validate request body
    if (!citizenId || !medications || !instructions || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: citizenId, medications, instructions, expiryDate'
      });
    }
    
    // Create prescription
    const prescription = await healthService.createPrescription(userId, {
      citizenId,
      medications,
      instructions,
      expiryDate
    });
    
    // Return created prescription
    res.status(201).json({
      success: true,
      message: 'Prescription created successfully',
      prescription
    });
  } catch (error) {
    logger.error(`Error creating prescription: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

/**
 * Book an appointment
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
exports.bookAppointment = async (req, res) => {
  try {
    // // Check if user is authenticated
    // if (!req.session.user) {
    //   return res.status(401).json({
    //     success: false,
    //     message: 'Unauthorized'
    //   });
    // }
    
    const userId = req.session.user.username;
    const orgName = req.session.user.orgName;
    const { citizenId, doctorId, date, time, purpose } = req.body;
    
    // Validate request body
    if (!citizenId || !doctorId || !date || !time || !purpose) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: citizenId, doctorId, date, time, purpose'
      });
    }
    
    // Check if user is booking for themselves or is a health admin
    if (req.session.user.role !== 'health' && citizenId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only book appointments for yourself or you must be a health administrator'
      });
    }
    
    // Book appointment
    const appointment = await healthService.bookAppointment(userId, orgName, {
      citizenId,
      doctorId,
      date,
      time,
      purpose
    });
    
    // Return created appointment
    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      appointment
    });
  } catch (error) {
    logger.error(`Error booking appointment: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};