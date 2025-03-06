// backend/src/routes/healthRoutes.js
const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  res.status(401).json({ success: false, message: 'Unauthorized' });
};

// Middleware to check if user is a health admin
const isHealthAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'health') {
    return next();
  }
  res.status(403).json({ success: false, message: 'Forbidden: Health admin access required' });
};

// Middleware to check if user is a health admin or the citizen themselves
const isHealthAdminOrSelf = (req, res, next) => {
  if (req.session && req.session.user) {
    if (req.session.user.role === 'health' || req.session.user.username === req.params.citizenId) {
      return next();
    }
  }
  res.status(403).json({ success: false, message: 'Forbidden: You can only access your own data or you must be a health admin' });
};

/**
 * Health routes
 * POST /api/health/records - Create a medical record (health admin only)
 * GET /api/health/records/:recordId - Get a medical record by ID (health admin or record owner)
 * GET /api/health/citizens/:citizenId/records - Get citizen's medical history (health admin or record owner)
 * POST /api/health/prescriptions - Create a prescription (health admin only)
 * POST /api/health/appointments - Book an appointment (authenticated users)
 */

// Create a medical record
router.post('/records', isAuthenticated, isHealthAdmin, healthController.createMedicalRecord);

// Get a medical record by ID
router.get('/records/:recordId', isAuthenticated, healthController.getMedicalRecord);

// Get citizen's medical history
router.get('/citizens/:citizenId/records', isAuthenticated, isHealthAdminOrSelf, healthController.getCitizenMedicalHistory);

// Create a prescription
router.post('/prescriptions', isAuthenticated, isHealthAdmin, healthController.createPrescription);

// Book an appointment
router.post('/appointments', isAuthenticated, healthController.bookAppointment);

module.exports = router;