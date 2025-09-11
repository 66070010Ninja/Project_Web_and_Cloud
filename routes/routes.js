const express = require('express');
const router = express.Router();
const controllers = require('../controllers/controller');

// Homepage
router.get('/', controllers.getHome);

// Dashboard
router.get('/dashboard', controllers.getDashboard);

// Profile
router.get('/profile', controllers.getProfile);

// Register
router.get('/register', controllers.getRegister);
router.post('/register', controllers.postRegister);

// Login
router.get('/login', controllers.getLogin);
router.post('/login', controllers.postLogin);

// Browse
router.get('/browse', controllers.getBrowse);

// Upload
router.get('/upload', controllers.getUpload);
router.post('/upload', controllers.postUpload);

// Edit
router.get('/edit', controllers.getEdit);

// Dev Log
router.get('/devlogs', controllers.getDevLogs);

module.exports = router;
