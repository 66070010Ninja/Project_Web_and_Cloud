const models = require('../models/page_model');
const express = require('express');
const router = express.Router();

// Home route
router.get('/', models.getHome);

// Dashboard route
router.get('/dashboard', models.getDashboard);

// Profile route
router.get('/profile', models.getProfile);

// Register route
router.get('/register', models.getRegister);
router.post('/register', models.postRegister);

// Login route
router.get('/login', models.getLogin);

// Browse route
router.get('/browse', models.getBrowse);

// Game upload route
router.get('/game/upload', models.getGameUpload);
router.post('/game/upload', models.postGameUpload);

// Game edit route
router.get('/game/edit', models.getGameEdit);
router.post('/game/edit', models.postGameEdit);

// Profile edit route
router.get('/profile/edit', models.getProfileEdit);
router.post('/profile/edit', models.postProfileEdit);

module.exports = router;
