// ==========================
// routes/adminRoutes.js
// ==========================

// --------------------------
// Import Dependencies
// --------------------------
// 💡 Express Router: ใช้จัดการเส้นทาง (route) เฉพาะของส่วน Admin
const express = require("express");
const router = express.Router();

// 💡 Middleware ตรวจสอบสิทธิ์
// - isAuthenticated: ตรวจสอบว่าผู้ใช้ล็อกอินแล้วหรือไม่
// - isRole: ตรวจสอบบทบาท (role) เช่น 'Admin'
const { isAuthenticated, isRole } = require('../middlewares/authMiddleware');

// 💡 Controller ของฝั่ง Admin
// - รวม logic สำหรับจัดการหน้า Admin Panel
const adminController = require('../controllers/adminController');


// --------------------------
// Route Definitions
// --------------------------

/**
 * =======================================
 * [GET] /admin
 * =======================================
 * แสดงหน้า Admin Panel
 * ✅ เฉพาะผู้ใช้ที่ล็อกอินและมีสิทธิ์เป็น "Admin" เท่านั้น
 * 
 * เส้นทางนี้ถูกกำหนดใน server.js ว่า:
 *   app.use('/admin', adminRoute);
 * 
 * ดังนั้น path จริงคือ: http://localhost:3000/admin
 */
router.get(
    '/',                   // 🔹 เส้นทางหลักของ /admin
    isAuthenticated,        // ✅ ต้องล็อกอินก่อน
    isRole(['Admin']),      // ✅ ต้องเป็น Admin เท่านั้น
    adminController.getAdminPage  // 📦 เรียก Controller เพื่อเรนเดอร์หน้า Admin
);


// --------------------------
// Export Router
// --------------------------
// 💡 ส่งออก router นี้ไปใช้ใน server.js
module.exports = router;
