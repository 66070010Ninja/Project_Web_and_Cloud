// routes/user_router.js
const controllers = require('../controllers/page_controller');
const express = require('express');
const router = express.Router();

// User profile view route
router.get('/view', controllers.getProfile);

// User profile edit route
router.get('/edit', controllers.getProfileEdit);
router.post('/edit', controllers.postProfileEdit);

// Export the router
module.exports = router;
