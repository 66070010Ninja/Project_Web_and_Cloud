// ==========================
// userRoutes.js
// (Express Routes + Swagger Docs + จัดลำดับความสำคัญ + comment)
// ==========================


// --------------------------
// 1️⃣ Import Dependencies
// --------------------------
const express = require('express');
const router = express.Router();

// 💡 Middleware สำหรับตรวจสอบสถานะผู้ใช้
const { isAuthenticated, isGuest } = require('../middlewares/authMiddleware');

// 💡 Middleware สำหรับอัปโหลดไฟล์ (Profile Image)
const upload = require('../middlewares/uploadMiddleware');

// 💡 Controller ของผู้ใช้
const userController = require('../controllers/userControllers');


// --------------------------
// 2️⃣ Swagger Tag Definition & Components
// --------------------------
/**
 * @swagger
 * tags:
 *   name: Users
 *   description: การจัดการผู้ใช้ (Register / Login / Profile)
 *
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - id
 *         - username
 *         - email
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         username:
 *           type: string
 *           example: "john_doe"
 *         email:
 *           type: string
 *           example: "john@example.com"
 *         bio:
 *           type: string
 *           example: "Gamer & Developer"
 *         profileImage:
 *           type: string
 *           format: uri
 *           example: "/uploads/profile/12345_avatar.png"
 */


// --------------------------
// 3️⃣ User Registration Routes
// --------------------------

// [GET] /user/register
// แสดงหน้าแบบฟอร์มสมัครสมาชิก
router.get('/register', isGuest, userController.getRegisterPage);

/**
 * @swagger
 * /user/register:
 *   post:
 *     summary: สมัครสมาชิกใหม่
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: "john_doe"
 *               email:
 *                 type: string
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 example: "123456"
 *               confirm_password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       201:
 *         description: สมัครสมาชิกสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.post('/register', isGuest, userController.postRegister);


// --------------------------
// 4️⃣ User Login / Logout Routes
// --------------------------

// [GET] /user/login
// แสดงหน้าเข้าสู่ระบบ
router.get('/login', isGuest, userController.getLoginPage);

// [POST] /user/login
// เข้าสู่ระบบ
router.post('/login', isGuest, userController.postLogin);

// [POST] /user/logout
// ออกจากระบบ (เฉพาะผู้ที่ล็อกอิน)
router.post('/logout', isAuthenticated, userController.postLogout);

/**
 * @swagger
 * /user/login:
 *   post:
 *     summary: เข้าสู่ระบบ
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: "john_doe"
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: เข้าสู่ระบบสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *
 * /user/logout:
 *   post:
 *     summary: ออกจากระบบ
 *     tags: [Users]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: ออกจากระบบสำเร็จ
 */


// --------------------------
// 5️⃣ User Profile Routes
// --------------------------

// [GET] /user/view/:id
// ดูโปรไฟล์ผู้ใช้ตาม ID (สาธารณะ)
router.get('/view/:id', userController.getViewPage);

/**
 * @swagger
 * /user/view/{id}:
 *   get:
 *     summary: ดูโปรไฟล์ของผู้ใช้
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: ข้อมูลโปรไฟล์ของผู้ใช้
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */


// --------------------------
// 6️⃣ Edit Profile Routes (ผู้ใช้ล็อกอินเท่านั้น)
// --------------------------

// [GET] /user/edit
// แสดงหน้าแก้ไขโปรไฟล์
router.get('/edit', isAuthenticated, userController.getEditProfilePage);

// [POST] /user/edit/:id
// แก้ไขข้อมูลโปรไฟล์และอัปโหลด Profile Image
router.post(
    '/edit/:id',
    isAuthenticated,
    upload.single('Profile_Image'),
    userController.postEditProfile
);

/**
 * @swagger
 * /user/edit/{id}:
 *   post:
 *     summary: แก้ไขข้อมูลโปรไฟล์
 *     tags: [Users]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               Profile_Image:
 *                 type: string
 *                 format: binary
 *               username:
 *                 type: string
 *                 example: "john_doe"
 *               bio:
 *                 type: string
 *                 example: "Gamer & Developer"
 *     responses:
 *       200:
 *         description: โปรไฟล์ถูกอัปเดตเรียบร้อย
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */


// --------------------------
// 7️⃣ Export Router
// --------------------------
module.exports = router;
