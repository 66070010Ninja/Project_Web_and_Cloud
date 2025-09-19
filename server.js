// ==========================
// server.js
// ==========================

// นำเข้าโมดูลที่จำเป็น
const express = require('express');         // สำหรับสร้างเว็บเซิร์ฟเวอร์
const path = require('path');               // สำหรับจัดการ path ของไฟล์และโฟลเดอร์
const session = require('express-session'); // สำหรับจัดการ session

// สร้าง instance ของ Express application
const app = express();
const port = 3000; // กำหนดพอร์ตที่ server จะรัน

// ==========================
// ตั้งค่า View Engine
// ==========================
app.set('view engine', 'ejs');                    // ใช้ EJS แทน HTML ธรรมดา
app.set('views', path.join(__dirname, 'views'));  // กำหนดโฟลเดอร์ views

// ==========================
// Middleware
// ==========================

// สำหรับ parse form data (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

// สำหรับ parse JSON body
app.use(express.json());

// ตั้งค่า session
app.use(session({
    secret: 'your-secret-key',  // ใช้สำหรับเข้ารหัส session
    resave: false,              // ไม่บันทึก session ทุก request หากไม่มีการเปลี่ยนแปลง
    saveUninitialized: false,   // ไม่สร้าง session จนกว่าจะมีการใช้งานจริง
    cookie: { secure: false }   // สำหรับ https ให้เป็น true
}));

// ==========================
// Routes
// ==========================
const userRoutes = require('./routes/userRoutes');
const gameRoutes = require('./routes/gameRouter');

app.use('/user', userRoutes); // route สำหรับผู้ใช้
app.use('/game', gameRoutes); // route สำหรับเกม

// ==========================
// เริ่ม server
// ==========================
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
