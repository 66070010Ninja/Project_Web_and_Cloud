// routes/page_router.js
const controllers = require('../controllers/page_controller');
const express = require('express');
const router = express.Router();

// Home route
router.get('/', controllers.getHome);

// Dashboard route
router.get('/dashboard', controllers.getDashboard);

// Register route
router.get('/register', controllers.getRegister);
router.post('/register', controllers.postRegister);

// Login route
router.get('/login', controllers.getLogin);

// Browse route
router.get('/browse', controllers.getBrowse);

// Export the router
module.exports = router;
