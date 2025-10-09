const express = require('express');
const router = express.Router();

const pageController = require('../controllers/pageControllers')

router.get('/', pageController.getHomePage);
router.get('/browse', pageController.getBrowsePage);
router.get('/dashboard', pageController.getDashboardPage);

module.exports = router;
