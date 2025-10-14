// ==========================
// server.js
// (จัดระเบียบ + ใส่คอมเมนต์อธิบายละเอียด)
// ==========================


// --------------------------
// 1️⃣ Import Dependencies
// --------------------------
const express = require('express');          // Framework หลักสำหรับ Web Server
const path = require('path');                // ใช้จัดการเส้นทางไฟล์
const session = require('express-session');  // จัดการ session ของผู้ใช้
const flash = require('connect-flash');      // สำหรับส่งข้อความชั่วคราวระหว่าง request-response


// --------------------------
// 2️⃣ App Initialization
// --------------------------
const app = express(); // สร้าง instance ของ Express
const port = 3000;     // ตั้งค่า port ที่ใช้รันเว็บเซิร์ฟเวอร์


// --------------------------
// 3️⃣ View Engine Setup (EJS Template)
// --------------------------
/**
 * EJS (Embedded JavaScript Templates)
 * ใช้แสดงหน้าเว็บแบบ dynamic (ฝัง JS logic ใน HTML)
 */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// --------------------------
// 4️⃣ Core Middleware Setup
// --------------------------

/**
 * ✅ Body Parser
 * - รองรับข้อมูลที่ส่งผ่านฟอร์ม (urlencoded)
 * - รองรับ JSON payload
 */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/**
 * ✅ Session Setup
 * ต้องอยู่ก่อน connect-flash เสมอ
 * ใช้เก็บข้อมูลผู้ใช้ที่ล็อกอินหรือ flash message
 */
app.use(session({
    secret: 'your-secret-key',   // คีย์ลับสำหรับเข้ารหัส session
    resave: false,               // ไม่บันทึกซ้ำถ้าไม่มีการเปลี่ยนแปลง
    saveUninitialized: false,    // ไม่สร้าง session ถ้ายังไม่จำเป็น
    cookie: { secure: false }    // false = ใช้ได้ทั้ง HTTP/HTTPS (dev mode)
}));

/**
 * ✅ Connect-Flash Middleware
 * ใช้คู่กับ session เพื่อเก็บข้อความชั่วคราว (เช่น success/error)
 */
app.use(flash());

/**
 * ✅ Global Middleware
 * ใช้กำหนดข้อมูลที่ส่งไปยังทุกหน้า EJS เช่น:
 *  - user (จาก session)
 *  - flash message (error/success)
 */
app.use((req, res, next) => {
    // กำหนดข้อมูลผู้ใช้ (ถ้ามี session.user)
    if (req.session.user) {
        res.locals.user = req.session.user; // ใช้ใน EJS
        req.user = req.session.user;        // ใช้ใน Controller/Middleware
    } else {
        res.locals.user = null;
        req.user = null;
    }

    // ส่งต่อข้อความ flash ไปยัง EJS
    res.locals.errorMessage = req.flash('error');
    res.locals.successMessage = req.flash('success');

    next();
});


// --------------------------
// 5️⃣ Static File Serving
// --------------------------
/**
 * ใช้สำหรับเปิดให้เข้าถึงไฟล์ในโฟลเดอร์ public ได้โดยตรง
 * เช่น รูปภาพ, CSS, JS, ไฟล์เกม, ฯลฯ
 * ตัวอย่าง: /public/game/img/... → http://localhost:3000/game/img/...
 */
app.use(express.static('public'));


// --------------------------
// 6️⃣ Route Setup (Main Routing)
// --------------------------
/**
 * รวม route หลักของระบบทั้งหมด
 * เรียงตามลำดับความเฉพาะเจาะจง → ทั่วไป
 */
const adminRoute = require('./routes/adminRoutes');
const userRoute  = require('./routes/userRoutes');
const gameRoute  = require('./routes/gameRoutes');
const pageRoute  = require('./routes/pageRoutes');

// ✅ เชื่อม route เข้ากับ prefix ของแต่ละส่วน
app.use('/admin', adminRoute);  // ส่วนจัดการของแอดมิน
app.use('/user', userRoute);    // ระบบผู้ใช้
app.use('/game', gameRoute);    // ระบบเกม (CRUD + Review)
app.use('/', pageRoute);        // หน้าเพจทั่วไป (Home, About, Contact ฯลฯ)


// --------------------------
// 7️⃣ Start Server
// --------------------------
/**
 * เริ่มรันเซิร์ฟเวอร์บน port ที่กำหนด
 * และเก็บ instance ไว้ในตัวแปร server (เพื่อควบคุม timeout ได้)
 */
const server = app.listen(port, () => {
    console.log(`✅ Server is running at: http://localhost:${port}`);
});

/**
 * ✅ ตั้งค่า Server Timeout
 * - เพื่อรองรับการอัปโหลดไฟล์ขนาดใหญ่
 * - ค่า 300000 ms = 5 นาที
 */
server.setTimeout(300000);
