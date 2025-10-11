// ==========================
// userRoutes.js (แก้ไข)
// ==========================

// --------------------------
// Import Dependencies
// --------------------------
const express = require('express');
const router = express.Router();
// 💡 นำเข้า authMiddleware
const { isAuthenticated, isGuest } = require('../middlewares/authMiddleware');

// --------------------------
// Import Controller
// --------------------------
const userController = require('../controllers/userControllers');

// --------------------------
// User Routes
// --------------------------

// Register Page (GET) - 🚫 ใช้ isGuest: ป้องกันผู้ที่ล็อกอินแล้วเข้าซ้ำ
router.get('/register', isGuest, userController.getRegisterPage);

// Register User (POST) - 🚫 ใช้ isGuest
router.post('/register', isGuest, userController.postRegister);

// Login Page (GET) - 🚫 ใช้ isGuest
router.get('/login', isGuest, userController.getLoginPage);

// Login User (POST) - 🚫 ใช้ isGuest
router.post('/login', isGuest, userController.postLogin);

// Logout (POST) - 🔐 ใช้ isAuthenticated: ต้องล็อกอินถึงจะออกจากระบบได้
router.post('/logout', isAuthenticated, userController.postLogout);

// View User Profile by ID (GET) - 🔓 เปิดให้สาธารณะเข้าถึงได้
router.get('/view/:id', userController.getViewPage);

// Edit Profile Page (GET) - 🔐 ใช้ isAuthenticated: ต้องล็อกอินถึงจะแก้ไขได้
router.get('/edit', isAuthenticated, userController.getEditProfilePage);

// Edit Profile (POST) - 🔐 ใช้ isAuthenticated: ต้องล็อกอินถึงจะแก้ไขได้
router.post('/edit/:id', isAuthenticated, userController.postEditProfile);

// --------------------------
// Export Router
// --------------------------
module.exports = router;