// ==========================
// server.js
// (Express MVC Server + Swagger + Session + Flash)
// ==========================


// --------------------------
// 1️⃣ Import Dependencies
// --------------------------
const express = require('express');          // Framework หลักสำหรับ Web Server
const path = require('path');                // จัดการ path ของไฟล์
const session = require('express-session');  // จัดการ session ของผู้ใช้
const flash = require('connect-flash');      // ส่งข้อความชั่วคราว (success/error)
const swaggerSetup = require('./config/swagger'); // ตั้งค่า Swagger API Docs
const dotenv = require('dotenv');

dotenv.config();


// --------------------------
// 2️⃣ App Initialization
// --------------------------
const app = express(); // สร้าง instance ของ Express
const port = 3000;     // กำหนด port สำหรับรันเว็บเซิร์ฟเวอร์


// --------------------------
// 3️⃣ View Engine Setup (EJS)
// --------------------------
/**
 * EJS (Embedded JavaScript Templates)
 * - ใช้เรนเดอร์หน้าเว็บแบบ dynamic
 * - สามารถฝัง JS logic ใน HTML
 */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// --------------------------
// 4️⃣ Core Middleware
// --------------------------

/**
 * ✅ Body Parser
 * - รองรับข้อมูลจาก form: urlencoded
 * - รองรับ JSON payload: application/json
 */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/**
 * ✅ Session Setup
 * - เก็บข้อมูลผู้ใช้ที่ล็อกอิน
 * - ต้องอยู่ก่อน connect-flash เสมอ
 */
app.use(session({
    secret: process.env.JWT_SECRET,   // คีย์ลับสำหรับเข้ารหัส session
    resave: false,               // ไม่บันทึกซ้ำถ้า session ไม่เปลี่ยนแปลง
    saveUninitialized: false,    // ไม่สร้าง session ถ้ายังไม่จำเป็น
    cookie: { secure: false }    // false = ใช้ได้ทั้ง HTTP/HTTPS (dev mode)
}));

/**
 * ✅ Flash Message
 * - ส่งข้อความชั่วคราวระหว่าง request-response
 * - เช่น success หรือ error
 */
app.use(flash());

/**
 * ✅ Swagger / OpenAPI Setup
 * - เรียกใช้งาน Swagger UI ที่ path /api-docs
 */
swaggerSetup(app);

/**
 * ✅ Global Middleware
 * - ส่งข้อมูลที่ต้องใช้ทุกหน้า EJS
 *   1. res.locals.user → ใช้ใน EJS
 *   2. req.user → ใช้ใน Controller / Middleware
 *   3. Flash messages → errorMessage / successMessage
 */
app.use((req, res, next) => {
    // กำหนด user จาก session
    if (req.session.user) {
        res.locals.user = req.session.user;
        req.user = req.session.user;
    } else {
        res.locals.user = null;
        req.user = null;
    }

    // ส่ง flash messages ไปยัง EJS
    res.locals.errorMessage = req.flash('error');
    res.locals.successMessage = req.flash('success');

    next();
});


// --------------------------
// 5️⃣ Static File Serving
// --------------------------
/**
 * เปิดให้เข้าถึงไฟล์ใน public/
 * เช่น รูปภาพ, CSS, JS, เกม
 * ตัวอย่าง:
 *   /public/game/img/... → http://localhost:3000/game/img/...
 */
app.use(express.static('public'));


// --------------------------
// 6️⃣ Route Setup (Main Routing)
// --------------------------
/**
 * รวม route หลักของระบบ
 * เรียงลำดับจากเฉพาะเจาะจง → ทั่วไป
 */

const adminRoute = require('./routes/adminRoutes'); // Admin Panel
const userRoute  = require('./routes/userRoutes');  // ระบบผู้ใช้ (Login/Register/Profile)
const gameRoute  = require('./routes/gameRoutes');  // ระบบเกม (CRUD + Review)
const pageRoute  = require('./routes/pageRoutes');  // หน้าเพจทั่วไป (Home, Browse, Dashboard)

// เชื่อม route กับ prefix ของแต่ละ module
app.use('/admin', adminRoute);  // เส้นทาง admin
app.use('/user', userRoute);    // เส้นทางผู้ใช้
app.use('/game', gameRoute);    // เส้นทางเกม
app.use('/', pageRoute);        // หน้าเพจทั่วไป


// --------------------------
// 7️⃣ Start Server
// --------------------------
/**
 * เริ่มรันเว็บเซิร์ฟเวอร์
 */
const server = app.listen(port, () => {
    console.log(`✅ Server is running at http://localhost:${port}`);
});

/**
 * ✅ ตั้งค่า Server Timeout
 * - รองรับการอัปโหลดไฟล์ใหญ่ (5 นาที)
 */
server.setTimeout(300000);
