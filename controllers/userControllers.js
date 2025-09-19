// controllers/userControllers.js

// นำเข้าโมดูลที่จำเป็น
const userModels = require('../models/userModels'); // โมเดลสำหรับจัดการข้อมูลผู้ใช้
const bcrypt = require('bcrypt'); // สำหรับเข้ารหัสและตรวจสอบรหัสผ่าน

// Controller object รวมฟังก์ชันสำหรับจัดการผู้ใช้
const userController = {

    // แสดงหน้า login
    getLoginPage: (req, res) => {
        res.render('login', { error: null }); // render หน้า login และส่งค่า error เป็น null
    },

    // แสดงหน้า register
    getRegisterPage: (req, res) => {
        res.render('register', { error: null }); // render หน้า register และส่งค่า error เป็น null
    },

    // ฟังก์ชัน login
    postLogin: async (req, res) => {
        try {
            const { username, password } = req.body; // รับค่าจากฟอร์ม login

            // ค้นหาผู้ใช้จาก username
            const user = await userModels.findByUsername(username);
            if (!user) {
                // ถ้าไม่พบผู้ใช้ แสดง error
                return res.render('login', { error: 'Invalid username or password' });
            }

            // ตรวจสอบรหัสผ่านว่าตรงกับ hashed password หรือไม่
            const isMatch = await bcrypt.compare(password, user.Hashed_Password);
            if (!isMatch) {
                return res.render('login', { error: 'Invalid username or password' })
            }

            // login สำเร็จ
            res.send(`Welcome ${user.User_Name}, login success!`);
        }
        catch (error) {
            // กรณีเกิดข้อผิดพลาด ส่ง status 500 พร้อม message
            res.status(500).json({ err: error.message });
        }
    },

    // ฟังก์ชัน register
    postRegister: async (req, res) => {
        try {
            const { username, email, password, confirm_password } = req.body; // รับค่าจากฟอร์ม register

            // ตรวจสอบรหัสผ่านสองช่องให้ตรงกัน
            if (password !== confirm_password) {
                return res.render('register', { error: 'Passwords do not match !!!' });
            }

            // ตรวจสอบว่ามี username นี้อยู่แล้วหรือไม่
            const existingUser = await userModels.findByUsername(username);
            if (existingUser) {
                return res.render('register', { error: 'Username already exists !!!' });
            }

            // เข้ารหัสรหัสผ่าน
            const hashedpassword = await bcrypt.hash(password, 10);

            // สร้างผู้ใช้ใหม่ในฐานข้อมูล
            await userModels.create({
                username,
                email,
                password: hashedpassword
            })

            // หลังลงทะเบียนสำเร็จ redirect ไปหน้า login
            res.redirect('/user/login');
        }
        catch (error) {
            // กรณีเกิดข้อผิดพลาด ส่ง status 500 พร้อม message
            res.status(500).json({ err: error.message });
        }
    },
};

// ส่งออก controller เพื่อใช้ใน route
module.exports = userController;
