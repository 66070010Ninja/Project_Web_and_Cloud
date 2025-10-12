// ==========================
// server.js (ไม่มีการเปลี่ยนแปลง)
// ==========================

// --------------------------
// Import Dependencies (เพิ่ม connect-flash)
// --------------------------
const express = require('express');
const path = require('path');
const session = require('express-session');
const fileUpload = require('express-fileupload');
const flash = require('connect-flash'); // 💡 เพิ่ม: Import connect-flash

// --------------------------
// App Initialization
// --------------------------
const app = express();
const port = 3000;

// --------------------------
// View Engine Setup (EJS)
// --------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --------------------------
// Middleware Setup
// --------------------------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. Session Setup (ต้องอยู่ก่อน flash)
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// 2. CONNECT-FLASH: 💡 เพิ่ม: ต้องเรียกใช้ทันทีหลัง session
app.use(flash());

// 3. GLOBAL MIDDLEWARE: 💡 เพิ่ม: เพื่อส่งข้อมูล user/flash message ไปยัง EJS
app.use((req, res, next) => {
    // กำหนด req.user และ res.locals.user จาก session (สำหรับ authMiddleware และ EJS)
    if (req.session.user) {
        res.locals.user = req.session.user; // สำหรับ EJS
        req.user = req.session.user;        // สำหรับ Controller/Middleware
    } else {
        // หากไม่มี session.user ให้เคลียร์ค่า (เผื่อไว้)
        res.locals.user = null;
        req.user = null;
    }

    // กำหนด flash messages ให้ใช้ได้ใน EJS
    res.locals.errorMessage = req.flash('error');
    res.locals.successMessage = req.flash('success');

    next();
});

// อัปโหลดไฟล์ (ใช้ req.files)
app.use(fileUpload());

// ... (Static File Setup) ...
// app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));

// --------------------------
// Routes (ควรอยู่ล่างสุด)
// --------------------------
const adminRoute = require('./routes/adminRouters');
const userRoute = require('./routes/userRoutes');
const gameRoute = require('./routes/gameRoutes');
const pageRoute = require('./routes/pageRoutes');

app.use('/admin', adminRoute);
app.use('/user', userRoute);
app.use('/game', gameRoute);
app.use('/', pageRoute);

// --------------------------
// Start Server
// --------------------------
app.listen(port, () => {
    console.log(`✅ Server is running at: http://localhost:${port}`);
});
