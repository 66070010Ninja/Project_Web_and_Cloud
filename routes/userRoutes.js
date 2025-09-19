// routes/userRoutes.js

// นำเข้าโมดูล express
const express = require('express');
// สร้าง router สำหรับจัดการ route ของผู้ใช้
const router = express.Router();

// นำเข้า controller ที่จัดการ logic ของผู้ใช้
const userController = require('../controllers/userControllers');

// Route สำหรับแสดงหน้า register
router.get('/register', userController.getRegisterPage);

// Route สำหรับส่งข้อมูลฟอร์ม register
router.post('/register', userController.postRegister);

// Route สำหรับแสดงหน้า login
router.get('/login', userController.getLoginPage);

// Route สำหรับส่งข้อมูลฟอร์ม login
router.post('/login', userController.postLogin);

// ส่งออก router เพื่อใช้ใน app.js หรือ server.js
module.exports = router;
