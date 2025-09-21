// ==========================
// routes/gameRoutes.js
// ==========================

// นำเข้า Express
const express = require("express");
const router = express.Router();

// นำเข้า controller สำหรับจัดการเกม
const gameController = require('../controllers/gameControllers');

// ==========================
// ======== GAME ROUTES ======
// ==========================

// --------------------------
// สร้างเกม (Create Game)
// --------------------------

// แสดงหน้า create game
router.get('/create', gameController.getCreateGamePage);

// ประมวลผลการสร้างเกม
router.post('/create', gameController.postCreateGame);

// --------------------------
// แก้ไขเกม (Edit Game)
// --------------------------

// แสดงหน้า edit game โดยระบุ ID ของเกม
router.get('/edit/:id', gameController.getEditGamePage);

// ประมวลผลการอัปเดตเกม โดยระบุ ID ของเกม
router.post('/edit/:id', gameController.postUpdateGame);

// --------------------------
// รีวิวเกม (Reviews)
// --------------------------

// สร้าง review ใหม่ โดยระบุ ID ของเกม
router.post('/review/:id', gameController.postCreateReview);

// ดึง review ของเกมตาม ID
router.get('/review/:id', gameController.getGameReview);

// --------------------------
// แสดงรายละเอียดเกม (View Game)
// --------------------------

// แสดงหน้า view game โดยระบุ ID ของเกม
router.get('/view/:id', gameController.getViewGamePage);

// ==========================
// ส่งออก router
// ==========================
module.exports = router;
