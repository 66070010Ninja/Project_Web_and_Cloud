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

// Game upload route
router.get('/game/upload', controllers.getGameUpload);
router.post('/game/upload', controllers.postGameUpload);

// Game edit route
router.get('/game/edit', controllers.getGameEdit);
router.post('/game/edit', controllers.postGameEdit);

// Profile route
router.get('/profile/view', controllers.getProfile);

// Profile edit route
router.get('/profile/edit', controllers.getProfileEdit);
router.post('/profile/edit', controllers.postProfileEdit);

// Export the router
module.exports = router;
