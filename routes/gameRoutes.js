// ==========================
// gameRoutes.js (แก้ไข)
// ==========================

// --------------------------
// Import Dependencies
// --------------------------
const express = require("express");
const router = express.Router();
// 💡 นำเข้า authMiddleware
const { isAuthenticated, isRole } = require('../middlewares/authMiddleware');

// --------------------------
// Import Controller
// --------------------------
const gameController = require('../controllers/gameControllers');

// --------------------------
// Game Routes
// --------------------------

// สร้างเกมใหม่ (หน้า form) - 🔒 ใช้ isRole: เฉพาะ Member/Admin
router.get('/create', isAuthenticated, isRole(['Member', 'Admin']), gameController.getCreateGamePage);

// บันทึกข้อมูลเกมใหม่ - 🔒 ใช้ isRole
router.post('/create', isAuthenticated, isRole(['Member', 'Admin']), gameController.postCreateGame);

// แก้ไขเกม (หน้า form) - 🔒 ใช้ isRole (และควรมี Check Ownership ใน Controller ด้วย)
router.get('/edit/:id', isAuthenticated, isRole(['Member', 'Admin']), gameController.getEditGamePage);

// อัปเดตข้อมูลเกม - 🔒 ใช้ isRole
router.post('/edit/:id', isAuthenticated, isRole(['Member', 'Admin']), gameController.postUpdateGame);

// เพิ่มรีวิวเกม - 🔐 ใช้ isAuthenticated: ต้องล็อกอินถึงจะรีวิวได้
router.post('/review/:id', isAuthenticated, gameController.postCreateReview);

// ดูรีวิวของเกม (GET) - 🔓 เปิดให้สาธารณะเข้าถึงได้
router.get('/review/:id', gameController.getGameReview);

// ดูรายละเอียดเกม - 🔓 เปิดให้สาธารณะเข้าถึงได้
router.get('/view/:id', gameController.getViewGamePage);

// ลบเกม - 🔒 ใช้ isRole
router.post('/delete/:id', isAuthenticated, isRole(['Member', 'Admin']), gameController.postDeleteGame);

// --------------------------
// Export Router
// --------------------------
module.exports = router;