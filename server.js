// server.js

// นำเข้าโมดูลที่จำเป็น
const express = require('express'); // สำหรับสร้างเว็บเซิร์ฟเวอร์
const path = require('path');       // สำหรับจัดการ path ของไฟล์และโฟลเดอร์

// สร้าง instance ของ Express application
const app = express();
const port = 3000; // กำหนดพอร์ตที่ server จะรัน

// กำหนด EJS เป็น templating engine
app.set('view engine', 'ejs');                    // ใช้ EJS แทน HTML ธรรมดา
app.set('views', path.join(__dirname, 'views'));  // กำหนดโฟลเดอร์ views

// Middleware สำหรับ parse request body
app.use(express.urlencoded({ extended: true }));  // สำหรับ form data (application/x-www-form-urlencoded)
app.use(express.json());                          // สำหรับ JSON body

// นำเข้า routes ของผู้ใช้
const userRoutes = require('./routes/userRoutes');

// ใช้ routes ของผู้ใช้ สำหรับ path /user
app.use('/user', userRoutes);

// เริ่ม server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
