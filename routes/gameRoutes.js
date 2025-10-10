// ==========================
// gameRoutes.js
// ==========================

// --------------------------
// Import Dependencies
// --------------------------
const express = require("express");
const router = express.Router();

// --------------------------
// Import Controller
// --------------------------
const gameController = require('../controllers/gameControllers');

// --------------------------
// Game Routes
// --------------------------

// สร้างเกมใหม่ (หน้า form)
router.get('/create', gameController.getCreateGamePage);

// บันทึกข้อมูลเกมใหม่
router.post('/create', gameController.postCreateGame);

// แก้ไขเกม (หน้า form)
router.get('/edit/:id', gameController.getEditGamePage);

// อัปเดตข้อมูลเกม
router.post('/edit/:id', gameController.postUpdateGame);

// เพิ่มรีวิวเกม
router.post('/review/:id', gameController.postCreateReview);

// ดูรีวิวของเกม
router.get('/review/:id', gameController.getGameReview);

// ดูรายละเอียดเกม
router.get('/view/:id', gameController.getViewGamePage);

router.post('/delete/:id', gameController.postDeleteGame);

// --------------------------
// Export Router
// --------------------------
module.exports = router;
