// ==========================
// routes/pageRoutes.js
// ==========================

// --------------------------
// Import Dependencies
// --------------------------
// 💡 Express Router: ใช้สำหรับกำหนดเส้นทาง (Route) เฉพาะของหน้าเพจทั่วไป (Public Pages)
const express = require('express');
const router = express.Router();

// 💡 Controller ของหน้าเพจหลัก
// - รวมฟังก์ชันที่ใช้เรนเดอร์หน้าเว็บหลัก เช่น หน้าแรก, หน้า Browse, Dashboard ฯลฯ
const pageController = require('../controllers/pageControllers');


// --------------------------
// Route Definitions
// --------------------------

/**
 * =======================================
 * [GET] /
 * =======================================
 * หน้าแรกของเว็บไซต์ (Home Page)
 * - แสดงภาพรวม / เนื้อหาหลักของระบบ
 * - เปิดให้เข้าถึงได้โดยทุกคน (Public)
 */
router.get('/', pageController.getHomePage);


/**
 * =======================================
 * [GET] /browse
 * =======================================
 * หน้า Browse Game
 * - แสดงรายการเกมทั้งหมด
 * - อาจมีตัวกรอง/การค้นหาเบื้องต้นในหน้า
 */
router.get('/browse', pageController.getBrowsePage);


/**
 * =======================================
 * [GET] /dashboard
 * =======================================
 * หน้า Dashboard
 * - ใช้สำหรับผู้ใช้ที่ล็อกอินแล้ว (อาจเพิ่ม middleware ตรวจสอบสิทธิ์ภายหลัง)
 * - แสดงข้อมูลส่วนตัว หรือรายการเกมที่ผู้ใช้สร้าง
 */
router.get('/dashboard', pageController.getDashboardPage);


/**
 * =======================================
 * [GET] /browse/search
 * =======================================
 * หน้า Search Game
 * - ใช้สำหรับค้นหาเกมตามคีย์เวิร์ด หมวดหมู่ หรือแท็ก
 * - รองรับการส่ง query string เช่น ?q=action&genre=RPG
 */
router.get('/browse/search', pageController.searchGames);


// --------------------------
// Export Router
// --------------------------
// 💡 ส่งออก router เพื่อให้ server.js นำไปใช้ เช่น
//   app.use('/', pageRoute);
module.exports = router;
