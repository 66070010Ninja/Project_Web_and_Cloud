// ==========================
// userController.js
// ==========================

const userModels = require('../models/userModels');
const bcrypt = require('bcrypt');

const userController = {

    // ==========================
    // แสดงหน้า Login
    // ==========================
    getLoginPage: (req, res) => {
        res.render('login', { error: null, formData: {} });
    },

    // ==========================
    // แสดงหน้า Register
    // ==========================
    getRegisterPage: (req, res) => {
        res.render('register', { error: null, formData: {} });
    },

    // ==========================
    // ดูข้อมูลผู้ใช้ (ตาม userId)
    // ==========================
    getViewPage: async (req, res) => {
        try {
            const userId = parseInt(req.params.id, 10);
            const user = await userModels.findByUserID(userId);

            if (!user) return res.status(404).send("User not found");

            res.render('view_user', { user });
        } catch (error) {
            console.log("Error fetching user:", error);
            res.status(500).send("Internal Server Error");
        }
    },

    // ==========================
    // แสดงหน้าแก้ไขโปรไฟล์ (ใช้ user จาก session)
    // ==========================
    getEditProfilePage: async (req, res) => {
        try {
            const userId = req.session.user?.id; // ดึง id จาก session

            const user = await userModels.findByUserID(userId);
            if (!user) return res.status(404).send("User not found");

            res.render('edit_profile', { user });
        } catch (error) {
            console.error(error);
            res.status(500).send("Error loading profile");
        }
    },

    // ==========================
    // Login
    // ==========================
    postLogin: async (req, res) => {
        try {
            const { username, password } = req.body;

            // เช็คว่ากรอกครบหรือไม่
            if (!username || !password) {
                return res.render('login', {
                    error: 'Please fill in all fields',
                    formData: { username }
                });
            }

            // หาผู้ใช้จาก DB
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

            // บันทึก session
            req.session.user = {
                id: user.User_id,
                username: user.User_Name,
                email: user.Email,
                role: user.Roles
            };

            res.redirect('/'); // ไปหน้าแรก
        } catch (error) {
            console.error("Login error:", error);
            res.status(500).json({ err: error.message });
        }
    },

    // ==========================
    // Register
    // ==========================
    postRegister: async (req, res) => {
        try {
            const { username, email, password, confirm_password } = req.body;

            // ตรวจสอบกรอกครบหรือไม่
            if (!username || !email || !password || !confirm_password) {
                return res.render('register', {
                    error: 'Please fill in all fields',
                    formData: { username, email }
                });
            }

            // ตรวจสอบรหัสผ่านซ้ำกันไหม
            if (password !== confirm_password) {
                return res.render('register', {
                    error: 'Passwords do not match !!!',
                    formData: { username, email }
                });
            }

            // ตรวจสอบ username ซ้ำ
            const existingUser = await userModels.findByUsername(username);
            if (existingUser) {
                return res.render('register', {
                    error: 'Username already exists !!!',
                    formData: { username, email }
                });
            }

            // Hash รหัสผ่าน
            const hashedPassword = await bcrypt.hash(password, 10);

            // สร้าง user ใหม่
            await userModels.create({
                username,
                email,
                password: hashedPassword
            });

            res.redirect('/user/login');
        } catch (error) {
            console.error("Register error:", error);
            res.status(500).json({ err: error.message });
        }
    },

    // ==========================
    // อัปเดตโปรไฟล์
    // ==========================
    postEditProfile: async (req, res) => {
        try {
            const userId = parseInt(req.params.id, 10);
            if (isNaN(userId)) return res.status(400).send("Invalid user ID");

            console.log(userId);
            console.log(req.body);

            const { User_Name, Email, Profile_Image } = req.body;

            // อัปเดตข้อมูลใน DB
            await userModels.updateUser(userId, { User_Name, Email, Profile_Image });

            res.send(`The Id ${userId}, edit success!`);
        } catch (error) {
            console.error("Register error:", error);
            res.status(500).json({ err: error.message });
        }
    },

    // ==========================
    // Logout
    // ==========================
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

// --------------------------
// Export User Controller
// --------------------------
module.exports = userController;
