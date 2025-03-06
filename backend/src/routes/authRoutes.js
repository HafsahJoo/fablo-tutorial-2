const express = require('express');
const router = express.Router();
const { registerCitizen, login } = require('../controllers/userController');

/**
 * Route for citizen registration
 * POST /auth/register
 * Body: { username, password }
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }
    
    // Register the citizen
    const result = await registerCitizen(username, password);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error(`Error in register route: ${error}`);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * Route for user login (both citizens and admins)
 * POST /auth/login
 * Body: { username, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }
    
    // Perform login
    const result = await login(username, password);
    
    if (result.success) {
      // Set session data
      req.session.user = result.user;
      res.status(200).json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    console.error(`Error in login route: ${error}`);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * Route for user logout
 * POST /auth/logout
 */
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error logging out' });
    }
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  });
});

/**
 * Route to check if user is logged in
 * GET /auth/status
 */
router.get('/status', (req, res) => {
  if (req.session && req.session.user) {
    res.status(200).json({ 
      success: true, 
      isLoggedIn: true, 
      user: req.session.user 
    });
  } else {
    res.status(200).json({ 
      success: true, 
      isLoggedIn: false 
    });
  }
});

module.exports = router;