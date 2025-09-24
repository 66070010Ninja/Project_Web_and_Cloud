const express = require('express');
const router = express.Router();

const pageController = require('../controllers/pageControllers')

router.get('/', pageController.getHomePage);

module.exports = router;
