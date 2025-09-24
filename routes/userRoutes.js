// ==========================
// userRoutes.js
// ==========================

// --------------------------
// Import Dependencies
// --------------------------
const express = require('express');
const router = express.Router();

// --------------------------
// Import Controller
// --------------------------
const userController = require('../controllers/userControllers');

// --------------------------
// User Routes
// --------------------------

// Register Page (GET)
router.get('/register', userController.getRegisterPage);

// Register User (POST)
router.post('/register', userController.postRegister);

// Login Page (GET)
router.get('/login', userController.getLoginPage);

// Login User (POST)
router.post('/login', userController.postLogin);

// View User Profile by ID (GET)
router.get('/view/:id', userController.getViewPage);

// Edit Profile Page (GET)
router.get('/edit', userController.getEditProfilePage);

// Edit Profile (POST)
router.post('/edit/:id', userController.postEditProfile);

// --------------------------
// Export Router
// --------------------------
module.exports = router;
