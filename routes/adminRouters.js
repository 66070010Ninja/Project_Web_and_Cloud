// ==========================
// routes/adminRoutes.js (แก้ไขแล้ว)
// ==========================

const express = require("express");
const router = express.Router();

// 💡 นำเข้า authMiddleware (ถูกต้องแล้ว)
const { isAuthenticated, isRole } = require('../middlewares/authMiddleware');

const adminController = require('../controllers/adminController');

// ✅ แก้ไข: ใช้ '/' (Root Path) แทน '/admin' เพื่อให้รวมกับ server.js เป็น /admin
router.get(
    '/', 
    isAuthenticated, 
    isRole(['Admin']), 
    adminController.getAdminPage
);

module.exports = router;