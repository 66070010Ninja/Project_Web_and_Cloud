const express = require("express");
const router = express.Router();

// นำเข้า controller สำหรับจัดการเกม
const gameController = require('../controllers/gameControllers');

// --------------------------
// GAME ROUTES
// --------------------------
router.get('/create', gameController.getCreateGamePage);
router.post('/create', gameController.postCreateGame);
router.get('/edit/:id', gameController.getEditGamePage);
router.post('/edit/:id', gameController.postUpdateGame);
router.post('/review/:id', gameController.postCreateReview);
router.get('/review/:id', gameController.getGameReview);
router.get('/view/:id', gameController.getViewGamePage);

module.exports = router;
