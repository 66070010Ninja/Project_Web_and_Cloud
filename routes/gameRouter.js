// ==========================
// routes/gameRoutes.js
// ==========================

// นำเข้า Express
const express = require("express");
const router = express.Router();

// นำเข้า controller สำหรับจัดการเกม
const gameController = require('../controllers/gameControllers');

// ==========================
// Routes สำหรับสร้างเกม
// ==========================

// แสดงหน้า create game
router.get('/create', gameController.getCreateGamePage);

// ประมวลผลการสร้างเกม
router.post('/create', gameController.postCreateGame);

// ==========================
// Routes สำหรับแก้ไขเกม
// ==========================

// แสดงหน้า edit game โดยระบุ ID ของเกม
router.get('/edit/:id', gameController.getEditGamePage);

// ประมวลผลการอัปเดตเกม โดยระบุ ID ของเกม
router.post('/edit/:id', gameController.postUpdateGame);

// ==========================
// ส่งออก router
// ==========================
module.exports = router;
