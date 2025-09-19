// ==========================
// routes/userRoutes.js
// ==========================

// นำเข้า Express
const express = require('express');
const router = express.Router();

// นำเข้า controller สำหรับจัดการผู้ใช้
const userController = require('../controllers/userControllers');

// ==========================
// Routes สำหรับ Register
// ==========================

// แสดงหน้า register
router.get('/register', userController.getRegisterPage);

// ประมวลผลการส่งฟอร์ม register
router.post('/register', userController.postRegister);

// ==========================
// Routes สำหรับ Login
// ==========================

// แสดงหน้า login
router.get('/login', userController.getLoginPage);

// ประมวลผลการส่งฟอร์ม login
router.post('/login', userController.postLogin);

// ==========================
// ส่งออก router
// ==========================
module.exports = router;
