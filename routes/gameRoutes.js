// ==========================
// routes/gameRoutes.js
// ==========================

const express = require("express");
const router = express.Router();

const { isAuthenticated, isRole } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");
const gameController = require("../controllers/gameControllers");

// --------------------------
// Configuration
// --------------------------
const GAME_MANAGER_ROLES = ["Member", "Admin"];
const uploadConfig = [
  { name: "file_game", maxCount: 1 }, // ไฟล์เกม
  { name: "images", maxCount: 10 },   // รูปภาพ
];

/**
 * @swagger
 * tags:
 *   name: Games
 *   description: API สำหรับจัดการข้อมูลเกม (CRUD + รีวิว)
 */

// ===================================================================
// SECTION 1: PUBLIC ACCESS
// ===================================================================

/**
 * @swagger
 * /game/view/{id}:
 *   get:
 *     summary: แสดงรายละเอียดเกม
 *     tags: [Games]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: ข้อมูลเกม
 *       404:
 *         description: ไม่พบเกม
 */
router.get("/view/:id", gameController.getViewGamePage);

/**
 * @swagger
 * /game/review/{id}:
 *   get:
 *     summary: ดึงข้อมูลรีวิวของเกม
 *     tags: [Games]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: รายการรีวิว
 */
router.get("/review/:id", gameController.getGameReview);

/**
 * @swagger
 * /game/download/{id}:
 *   get:
 *     summary: ดาวน์โหลดไฟล์เกม
 *     tags: [Games]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: ดาวน์โหลดสำเร็จ
 *       404:
 *         description: ไม่พบไฟล์เกม
 */
router.get("/download/:id", gameController.getDownloadGame);


// ===================================================================
// SECTION 2: AUTHENTICATED USERS
// ===================================================================

/**
 * @swagger
 * /game/review/{id}:
 *   post:
 *     summary: เพิ่มรีวิวเกม
 *     tags: [Games]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: number
 *                 example: 4.5
 *               comment:
 *                 type: string
 *                 example: "เกมสนุกมาก"
 *     responses:
 *       201:
 *         description: เพิ่มรีวิวสำเร็จ
 *       400:
 *         description: ข้อมูลไม่ถูกต้อง
 */
router.post("/review/:id", isAuthenticated, gameController.postCreateReview);


// ===================================================================
// SECTION 3: ROLE-BASED ACCESS (Member/Admin)
// ===================================================================

/**
 * @swagger
 * /game/create:
 *   get:
 *     summary: แสดงฟอร์มสร้างเกมใหม่
 *     tags: [Games]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: แสดงฟอร์มสำเร็จ
 *       403:
 *         description: ไม่มีสิทธิ์
 */
router.get(
  "/create",
  isAuthenticated,
  isRole(GAME_MANAGER_ROLES),
  gameController.getCreateGamePage
);

/**
 * @swagger
 * /game/create:
 *   post:
 *     summary: สร้างเกมใหม่
 *     tags: [Games]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - file_game
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               file_game:
 *                 type: string
 *                 format: binary
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: สร้างเกมสำเร็จ
 */
router.post(
  "/create",
  isAuthenticated,
  isRole(GAME_MANAGER_ROLES),
  upload.fields(uploadConfig),
  gameController.postCreateGame
);

/**
 * @swagger
 * /game/edit/{id}:
 *   get:
 *     summary: แสดงฟอร์มแก้ไขเกม
 *     tags: [Games]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: แสดงฟอร์มแก้ไขเกมสำเร็จ
 *       403:
 *         description: ไม่มีสิทธิ์
 */
router.get(
  "/edit/:id",
  isAuthenticated,
  isRole(GAME_MANAGER_ROLES),
  gameController.getEditGamePage
);

/**
 * @swagger
 * /game/edit/{id}:
 *   post:
 *     summary: อัปเดตเกม
 *     tags: [Games]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: อัปเดตเกมสำเร็จ
 */
router.post(
  "/edit/:id",
  isAuthenticated,
  isRole(GAME_MANAGER_ROLES),
  upload.fields(uploadConfig),
  gameController.postUpdateGame
);

/**
 * @swagger
 * /game/delete/{id}:
 *   post:
 *     summary: ลบเกม
 *     tags: [Games]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: ลบเกมสำเร็จ
 *       403:
 *         description: ไม่มีสิทธิ์ลบ
 */
router.post(
  "/delete/:id",
  isAuthenticated,
  isRole(GAME_MANAGER_ROLES),
  gameController.postDeleteGame
);


// --------------------------
// Export Router
// --------------------------
module.exports = router;
