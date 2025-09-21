// controllers/userControllers.js

// ==========================
// นำเข้าโมดูลที่จำเป็น
// ==========================
const userModels = require('../models/userModels'); // โมเดลสำหรับจัดการข้อมูลผู้ใช้
const bcrypt = require('bcrypt'); // สำหรับเข้ารหัสและตรวจสอบรหัสผ่าน

// ==========================
// Controller object รวมฟังก์ชันสำหรับจัดการผู้ใช้
// ==========================
const userController = {

    // ==========================
    // ======== PAGE VIEWS =======
    // ==========================

    /**
     * แสดงหน้า Login
     */
    getLoginPage: (req, res) => {
        res.render('login', { error: null, formData: {} });
    },

    /**
     * แสดงหน้า Register
     */
    getRegisterPage: (req, res) => {
        res.render('register', { error: null, formData: {} });
    },

    // ==========================
    // ======== AUTH ACTIONS =====
    // ==========================

    /**
     * ฟังก์ชัน Login
     */
    postLogin: async (req, res) => {
        try {
            const { username, password } = req.body;

            // ตรวจสอบว่ากรอกครบหรือไม่
            if (!username || !password) {
                return res.render('login', { 
                    error: 'Please fill in all fields', 
                    formData: { username } 
                });
            }

            // ค้นหาผู้ใช้จากฐานข้อมูล
            const user = await userModels.findByUsername(username);
            if (!user) {
                return res.render('login', { 
                    error: 'Invalid username or password', 
                    formData: { username } 
                });
            }

            // ตรวจสอบรหัสผ่าน
            const isMatch = await bcrypt.compare(password, user.Hashed_Password);
            if (!isMatch) {
                return res.render('login', { 
                    error: 'Invalid username or password', 
                    formData: { username } 
                });
            }

            // เก็บข้อมูลลง session
            req.session.user = {
                id: user.User_id,
                username: user.User_Name,
                email: user.Email,
                role: user.Roles
            };

            // หลัง login สำเร็จ redirect ไปหน้า dashboard หรือหน้า home
            res.redirect('/'); 
        } catch (error) {
            console.error("Login error:", error);
            res.status(500).json({ err: error.message });
        }
    },

    /**
     * ฟังก์ชัน Register
     */
    postRegister: async (req, res) => {
        try {
            const { username, email, password, confirm_password } = req.body;

            // ตรวจสอบว่ากรอกครบหรือไม่
            if (!username || !email || !password || !confirm_password) {
                return res.render('register', { 
                    error: 'Please fill in all fields', 
                    formData: { username, email } 
                });
            }

            // ตรวจสอบรหัสผ่านตรงกันหรือไม่
            if (password !== confirm_password) {
                return res.render('register', { 
                    error: 'Passwords do not match !!!', 
                    formData: { username, email } 
                });
            }

            // ตรวจสอบว่ามี username นี้แล้วหรือไม่
            const existingUser = await userModels.findByUsername(username);
            if (existingUser) {
                return res.render('register', { 
                    error: 'Username already exists !!!', 
                    formData: { username, email } 
                });
            }

            // เข้ารหัสรหัสผ่าน
            const hashedPassword = await bcrypt.hash(password, 10);

            // บันทึกผู้ใช้ใหม่
            await userModels.create({
                username,
                email,
                password: hashedPassword
            });

            // เสร็จแล้ว redirect ไปหน้า login
            res.redirect('/user/login');
        } catch (error) {
            console.error("Register error:", error);
            res.status(500).json({ err: error.message });
        }
    },

    /**
     * ฟังก์ชัน Logout
     */
    postLogout: (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                console.error("Logout error:", err);
                return res.status(500).json({ err: 'Logout failed' });
            }
            res.redirect('/user/login');
        });
    }

};

// ==========================
// ส่งออก controller
// ==========================
module.exports = userController;
