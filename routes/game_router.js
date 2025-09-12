// routes/game_router.js
const controllers = require('../controllers/page_controller');
const express = require('express');
const router = express.Router();

// Game upload route
router.get('/upload', controllers.getGameUpload);
router.post('/upload', controllers.postGameUpload);

// Game edit route
router.get('/edit', controllers.getGameEdit);
router.post('/edit', controllers.postGameEdit);

// Export the router
module.exports = router;
