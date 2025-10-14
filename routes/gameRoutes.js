// ==========================
// gameRoutes.js (จัดระเบียบ + อธิบาย)
// ==========================

// --------------------------
// Import Dependencies
// --------------------------
const express = require("express");
const router = express.Router();

// ✅ Middleware สำหรับตรวจสอบสิทธิ์และอัปโหลดไฟล์
const { isAuthenticated, isRole } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

// ✅ Controller สำหรับจัดการเกม
const gameController = require("../controllers/gameControllers");

const GAME_MANAGER_ROLES = ["Member", "Admin"];
const uploadConfig = [
    { name: "file_game", maxCount: 1 }, // 1 ไฟล์เกม
    { name: "images", maxCount: 10 },   // ได้สูงสุด 10 รูป
];

// --------------------------
// ROUTE: ระบบเกม (Game Management)
// --------------------------

/**
 * ==========================
 * SECTION 1: PUBLIC ACCESS (เปิดให้เข้าถึงได้ทุกคน)
 * ==========================
 */

/**
 * [GET] /game/view/:id
 * 📄 แสดงรายละเอียดของเกม
 * ไม่ต้องล็อกอินก็เข้าดูได้
 */
router.get("/view/:id", gameController.getViewGamePage);

/**
 * [GET] /game/review/:id
 * 💬 ดึงข้อมูลรีวิวของเกม (เช่น จาก AJAX)
 * ไม่ต้องล็อกอิน
 */
router.get("/review/:id", gameController.getGameReview);

/**
 * [GET] /game/download/:id
 * ⬇️ ดาวน์โหลดไฟล์เกม (เช่น .zip)
 * เปิดให้สาธารณะ (หรือจะจำกัดภายหลังก็ได้)
 */
router.get("/download/:id", gameController.getDownloadGame);


/**
 * ==========================
 * SECTION 2: AUTHENTICATED USERS (ต้องล็อกอิน)
 * ==========================
 */

/**
 * [POST] /game/review/:id
 * 💬 เพิ่มรีวิวเกม (เฉพาะผู้ที่ล็อกอินแล้วเท่านั้น)
 */
router.post("/review/:id", isAuthenticated, gameController.postCreateReview);


/**
 * ==========================
 * SECTION 3: ROLE-BASED ACCESS (เฉพาะ Member/Admin)
 * ==========================
 */

/**
 * [GET] /game/create
 * 🕹️ แสดงฟอร์มสร้างเกมใหม่
 * เฉพาะ Member และ Admin
 */
router.get(
    "/create",
    isAuthenticated,
    isRole(GAME_MANAGER_ROLES),
    gameController.getCreateGamePage
);

/**
 * [POST] /game/create
 * 💾 บันทึกข้อมูลเกมใหม่ลงฐานข้อมูล
 * อัปโหลดได้ทั้งไฟล์เกม (.zip) และภาพ (หลายไฟล์)
 */
router.post(
    "/create",
    isAuthenticated,
    isRole(GAME_MANAGER_ROLES),
    upload.fields(uploadConfig),
    gameController.postCreateGame
);

/**
 * [GET] /game/edit/:id
 * ✏️ แสดงฟอร์มแก้ไขเกม
 * ต้องเป็นเจ้าของเกมหรือ Admin (ตรวจใน Controller)
 */
router.get(
    "/edit/:id",
    isAuthenticated,
    isRole(GAME_MANAGER_ROLES),
    gameController.getEditGamePage
);

/**
 * [POST] /game/edit/:id
 * 💾 อัปเดตข้อมูลเกม
 * (มี Check Ownership ภายใน Controller)
 */
router.post(
    "/edit/:id",
    isAuthenticated,
    isRole(GAME_MANAGER_ROLES),
    upload.fields(uploadConfig),
    gameController.postUpdateGame
);

/**
 * [POST] /game/delete/:id
 * 🗑️ ลบเกมออกจากระบบ
 * (ตรวจสิทธิ์ว่าเป็นเจ้าของหรือ Admin)
 */
router.post(
    "/delete/:id",
    isAuthenticated,
    isRole(GAME_MANAGER_ROLES),
    upload.fields(uploadConfig), // 💡 เพิ่มส่วนนี้ตามที่ test คาดหวัง
    gameController.postDeleteGame
);

// --------------------------
// Export Router
// --------------------------
module.exports = router;