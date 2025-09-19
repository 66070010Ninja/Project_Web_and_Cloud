// config/db.js

// นำเข้าโมดูล mysql2 สำหรับเชื่อมต่อ MySQL
const mysql = require('mysql2');

// นำเข้า dotenv สำหรับโหลดตัวแปรสภาพแวดล้อมจากไฟล์ .env
const dotenv = require('dotenv');

// กำหนดให้ dotenv โหลดตัวแปรจากไฟล์ .env
dotenv.config();

// สร้างการเชื่อมต่อกับฐานข้อมูล MySQL
const db = mysql.createConnection({
    host: process.env.DB_HOST,      // ชื่อ host ของฐานข้อมูล เช่น localhost
    user: process.env.DB_USER,      // ชื่อผู้ใช้งาน MySQL
    password: process.env.DB_PASSWORD,  // รหัสผ่านของผู้ใช้งาน
    database: process.env.DB_NAME,  // ชื่อฐานข้อมูลที่จะใช้
    port: process.env.DB_PORT       // พอร์ตของ MySQL (ค่า default คือ 3306)
});

// ส่งออกการเชื่อมต่อแบบ promise เพื่อให้สามารถใช้ async/await ในโมดูลอื่นๆ ได้
module.exports = db.promise();
