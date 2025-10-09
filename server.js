// ==========================
// server.js
// ==========================

// --------------------------
// Import Dependencies
// --------------------------
const express = require('express');
const path = require('path');
const session = require('express-session');
const fileUpload = require('express-fileupload');

// --------------------------
// App Initialization
// --------------------------
const app = express();
const port = 3000;

// --------------------------
// View Engine Setup (EJS)
// --------------------------
app.set('view engine', 'ejs'); // ใช้ EJS เป็น template engine
app.set('views', path.join(__dirname, 'views')); // กำหนดโฟลเดอร์ views

// --------------------------
// Middleware Setup
// --------------------------

// รองรับการส่งข้อมูลแบบ form-urlencoded
app.use(express.urlencoded({ extended: true }));

// รองรับการส่งข้อมูล JSON
app.use(express.json());

// จัดการ Session สำหรับการ login/logout
app.use(session({
    secret: 'your-secret-key', // คีย์ลับสำหรับเข้ารหัส session
    resave: false,             // ไม่บันทึก session ซ้ำถ้าไม่มีการเปลี่ยนแปลง
    saveUninitialized: false,  // ไม่สร้าง session เปล่า
    cookie: { secure: false }  // true ถ้าใช้ HTTPS
}));

// อัปโหลดไฟล์ (ใช้ req.files)
app.use(fileUpload());

// กำหนดให้เข้าถึงไฟล์ static ได้จาก /public (เช่น CSS, JS, รูปภาพ)
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));

// --------------------------
// Routes
// --------------------------
const adminRoute = require('./routes/adminRouters');
const userRoute = require('./routes/userRoutes');
const gameRoute = require('./routes/gameRoutes');
const pageRoute = require('./routes/pageRoutes');

app.use('/admin', adminRoute);

// เส้นทางที่เกี่ยวข้องกับผู้ใช้
app.use('/user', userRoute);

// เส้นทางที่เกี่ยวข้องกับเกม
app.use('/game', gameRoute);

app.use('/', pageRoute);

// --------------------------
// Start Server
// --------------------------
app.listen(port, () => {
    console.log(`✅ Server is running at: http://localhost:${port}`);
});
