// ==========================
// routes/adminRoutes.js
// ==========================

// --------------------------
// 1️⃣ Import Dependencies
// --------------------------
const express = require("express");
const router = express.Router();

// ✅ Middleware ตรวจสอบสิทธิ์
// - isAuthenticated: ตรวจสอบว่าผู้ใช้ล็อกอินแล้วหรือไม่
// - isRole: ตรวจสอบสิทธิ์เฉพาะ role เช่น "Admin"
const { isAuthenticated, isRole } = require("../middlewares/authMiddleware");

// ✅ Controller ฝั่ง Admin
// - รวม logic สำหรับจัดการข้อมูลผู้ใช้, เกม, และระบบหลังบ้าน
const adminController = require("../controllers/adminController");

// --------------------------
// 2️⃣ Swagger Tag Definition
// --------------------------
/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: API สำหรับส่วนจัดการของผู้ดูแลระบบ (Admin Panel)
 */

// ===================================================================
// SECTION 1: ADMIN DASHBOARD
// ===================================================================

/**
 * =======================================
 * [GET] /admin
 * =======================================
 * แสดงหน้าแดชบอร์ดของแอดมิน
 * - เฉพาะผู้ใช้ที่ล็อกอินและมี role = "Admin"
 * 
 * ตัวอย่าง URL จริง:
 *   http://localhost:3000/admin
 */

/**
 * @swagger
 * /admin:
 *   get:
 *     summary: แสดงหน้าแดชบอร์ดของผู้ดูแลระบบ
 *     description: เข้าถึงเฉพาะผู้ใช้ที่มีสิทธิ์เป็น Admin เท่านั้น
 *     tags: [Admin]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: หน้าแดชบอร์ดของแอดมิน
 *       401:
 *         description: ต้องล็อกอินก่อนเข้าถึง
 *       403:
 *         description: ต้องมีสิทธิ์เป็น Admin
 */
router.get(
  "/",
  isAuthenticated,              // ✅ ต้องล็อกอินก่อน
  isRole(["Admin"]),            // ✅ ต้องเป็น Admin เท่านั้น
  adminController.getAdminPage  // 📦 เรียก Controller เพื่อเรนเดอร์หน้า Admin
);

// ===================================================================
// Export Router
// ===================================================================
module.exports = router;
