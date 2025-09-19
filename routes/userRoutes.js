// routes/userRoutes.js

// Import necessary modules
const express = require('express');
const router = express.Router();

// Import controllers
const userController = require('../controllers/userControllers');

// Render the registration page
router.get('/register', userController.getRegisterPage);

// Handle registration form submission
router.post('/register', userController.postRegister);

// Render the login page
router.get('/login', userController.getLoginPage);

// Handle login form submission
router.post('/login', userController.postLogin);

// Export the router
module.exports = router;
