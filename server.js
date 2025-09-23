// ==========================
// server.js
// ==========================

// นำเข้าโมดูลที่จำเป็น
const express = require('express');             // สำหรับสร้างเว็บเซิร์ฟเวอร์
const path = require('path');                   // สำหรับจัดการ path ของไฟล์และโฟลเดอร์
const session = require('express-session');     // สำหรับจัดการ session
const fileUpload = require('express-fileupload'); // สำหรับอัปโหลดไฟล์

// สร้าง instance ของ Express application
const app = express();
const port = 3000; // กำหนดพอร์ตที่ server จะรัน

// ==========================
// ตั้งค่า View Engine
// ==========================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ==========================
// Middleware
// ==========================

// สำหรับ parse form data (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

// สำหรับ parse JSON body
app.use(express.json());

// ตั้งค่า session
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// ใช้งาน express-fileupload
app.use(fileUpload());

// ตั้งค่า public folder สำหรับไฟล์ static (รูป/zip)
app.use('/public', express.static(path.join(__dirname, 'public')));

// ==========================
// Routes
// ==========================
const userRoute = require('./routes/userRoutes');
const gameRoute = require('./routes/gameRoutes'); // ต้องตรงกับไฟล์จริง

app.use('/user', userRoute);
app.use('/game', gameRoute);

// ==========================
// เริ่ม server
// ==========================
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
