// ==========================
// routes/pageRoutes.js
// ==========================

// --------------------------
// Import Dependencies
// --------------------------
const express = require('express');
const router = express.Router();

// 💡 Controller ของหน้าเพจหลัก
// - รวมฟังก์ชันที่ใช้เรนเดอร์หน้าเว็บหลัก เช่น หน้าแรก, หน้า Browse, Dashboard ฯลฯ
const pageController = require('../controllers/pageControllers');

/**
 * @swagger
 * tags:
 *   name: Pages
 *   description: หน้าเพจทั่วไป (Public Pages)
 */

// --------------------------
// Route Definitions
// --------------------------

/**
 * @swagger
 * /:
 *   get:
 *     summary: หน้าแรกของเว็บไซต์
 *     description: แสดงหน้า Home Page (Public)
 *     tags: [Pages]
 *     responses:
 *       200:
 *         description: แสดงหน้าแรกของเว็บไซต์สำเร็จ
 */
router.get('/', pageController.getHomePage);

/**
 * @swagger
 * /browse:
 *   get:
 *     summary: หน้า Browse Game
 *     description: แสดงรายการเกมทั้งหมด (Public)
 *     tags: [Pages]
 *     responses:
 *       200:
 *         description: แสดงรายการเกมทั้งหมด
 */
router.get('/browse', pageController.getBrowsePage);

/**
 * @swagger
 * /dashboard:
 *   get:
 *     summary: หน้า Dashboard ของผู้ใช้
 *     description: แสดงข้อมูลส่วนตัวหรือรายการเกมที่ผู้ใช้สร้าง (ต้องล็อกอิน)
 *     tags: [Pages]
 *     responses:
 *       200:
 *         description: แสดงหน้า Dashboard ของผู้ใช้สำเร็จ
 *       401:
 *         description: ผู้ใช้ยังไม่ได้เข้าสู่ระบบ
 */
router.get('/dashboard', pageController.getDashboardPage);

/**
 * @swagger
 * /browse/search:
 *   get:
 *     summary: ค้นหาเกมตามคีย์เวิร์ดหรือหมวดหมู่
 *     description: ใช้ query string เช่น ?q=action&genre=RPG เพื่อค้นหาเกม
 *     tags: [Pages]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: คำค้นหาชื่อเกม
 *         example: "Zelda"
 *       - in: query
 *         name: genre
 *         schema:
 *           type: string
 *         description: หมวดหมู่ของเกม
 *         example: "RPG"
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         description: แท็กของเกม
 *         example: "Action"
 *     responses:
 *       200:
 *         description: แสดงผลการค้นหาเกมสำเร็จ
 *       404:
 *         description: ไม่พบเกมที่ค้นหา
 */
router.get('/browse/search', pageController.searchGames);

// --------------------------
// Export Router
// --------------------------
module.exports = router;
