// ==========================
// userController.js
// ==========================

// --------------------------
// Import Dependencies
// --------------------------
const userModels = require('../models/userModels');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

// --------------------------
// User Controller
// --------------------------
const userController = {

    // ----------------------
    // แสดงหน้า Login
    // ----------------------
    getLoginPage: (req, res) => {
        res.render('login', { error: null, formData: {} });
    },

    // ----------------------
    // แสดงหน้า Register
    // ----------------------
    getRegisterPage: (req, res) => {
        res.render('register', { error: null, formData: {} });
    },

    // ----------------------
    // ดูข้อมูลผู้ใช้ (ตาม userId)
    // ----------------------
    getViewPage: async (req, res) => {
        try {
            const userId = parseInt(req.params.id, 10);
            const user = await userModels.findByUserID(userId);

            if (!user) return res.status(404).send("User not found");

            res.render('view_user', { user });
        } catch (error) {
            console.error("Error fetching user:", error);
            res.status(500).send("Internal Server Error");
        }
    },

    // ----------------------
    // แสดงหน้าแก้ไขโปรไฟล์ (ดึง user จาก session)
    // ----------------------
    getEditProfilePage: async (req, res) => {
        try {
            const userId = req.session.user?.id; // ดึง id จาก session
            const user = await userModels.findByUserID(userId);

            if (!user) return res.status(404).send("User not found");

            res.render('edit_profile', { user });
        } catch (error) {
            console.error("Error loading profile:", error);
            res.status(500).send("Internal Server Error");
        }
    },

    // ----------------------
    // Login
    // ----------------------
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

            // เก็บข้อมูลผู้ใช้ใน session
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

    // ----------------------
    // Register
    // ----------------------
    postRegister: async (req, res) => {
        try {
            const { username, email, password, confirm_password } = req.body;

            // ตรวจสอบการกรอกข้อมูล
            if (!username || !email || !password || !confirm_password) {
                return res.render('register', {
                    error: 'Please fill in all fields',
                    formData: { username, email }
                });
            }

            // ตรวจสอบ password ตรงกันหรือไม่
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

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // สร้าง user ใหม่
            const newUser = await userModels.create({
                username,
                email,
                password: hashedPassword
            });

            // สร้าง default profile image
            const defaultImagePath = '/user/img/user_default.jpg';
            await userModels.addProfileImage(newUser.User_id, defaultImagePath);

            res.redirect('/user/login');
        } catch (error) {
            console.error("Register error:", error);
            res.status(500).json({ err: error.message });
        }
    },

    // ----------------------
    // อัปเดตโปรไฟล์
    // ----------------------
    postEditProfile: async (req, res) => {
        try {
            const userId = req.session.user?.id;
            if (!userId) return res.status(401).send("Unauthorized");

            const { User_Name } = req.body;

            // อัปเดตชื่อผู้ใช้
            await userModels.updateUser(userId, { User_Name });

            // อัปโหลดรูปโปรไฟล์ใหม่ (ถ้ามี)
            if (req.files && req.files.Profile_Image) {
                const file = req.files.Profile_Image;
                const uploadDir = path.join(__dirname, '..', 'public', 'user', 'img');

                // สร้างโฟลเดอร์ถ้ายังไม่มี
                if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

                const filename = `${Date.now()}_${file.name}`;
                const destPath = path.join(uploadDir, filename);

                // ย้ายไฟล์ไปโฟลเดอร์
                await file.mv(destPath);

                const profileImagePath = `/user/img/${filename}`;
                await userModels.addProfileImage(userId, profileImagePath);
            }

            res.redirect('/user/view/' + userId);
        } catch (err) {
            console.error("Error updating profile:", err);
            res.status(500).send("Error updating profile");
        }
    },

    // ----------------------
    // Logout
    // ----------------------
    postLogout: (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                console.error("Logout error:", err);
                return res.status(500).json({ err: 'Logout failed' });
            }
            res.redirect('/');
        });
    },

    // ----------------------
    // ดูโปรไฟล์จาก session
    // ----------------------
    getProfile: async (req, res) => {
        try {
            const userId = req.session.user.id;
            const user = userModels.getUser(userId);
            res.render('view_profile', { user });
        } catch (err) {
            console.error("Error fetching profile:", err);
            res.status(500).send("Server Error");
        }
    }

};

// --------------------------
// Export User Controller
// --------------------------
module.exports = userController;
