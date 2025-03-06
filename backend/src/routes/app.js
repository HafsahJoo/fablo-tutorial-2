// backend/src/routes/app.js
const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const healthRoutes = require('./healthRoutes');

// Mount authentication routes
router.use('/auth', authRoutes);

// Mount health routes
router.use('/health', healthRoutes);

// Add a simple health check route
router.get('/health-check', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  res.status(401).json({ success: false, message: 'Unauthorized' });
};

// Middleware to check if user has admin role
const isAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role !== 'citizen') {
    return next();
  }
  res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
};

// Protected route example for citizens
router.get('/citizen/profile', isAuthenticated, (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Citizen profile accessed',
    user: req.session.user 
  });
});

// Protected route example for admins
router.get('/admin/dashboard', isAuthenticated, isAdmin, (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Admin dashboard accessed',
    user: req.session.user 
  });
});

module.exports = router;