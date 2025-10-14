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

    // ======================================================
    // 1️⃣ PUBLIC PAGES (หน้า Login / Register / View user)
    // ======================================================

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

    /**
     * ดูข้อมูลผู้ใช้ (ตาม userId จาก URL)
     */
    getViewPage: async (req, res) => {
        try {
            const userId = parseInt(req.params.id, 10);
            // โค้ดนี้ถูกต้องแล้ว: ดึงข้อมูลเต็มสำหรับหน้า View
            const user = await userModels.findByUserID(userId);

            if (!user) return res.status(404).send("User not found");

            res.render('view_user', { user });
        } catch (error) {
            console.error("Error fetching user:", error);
            res.status(500).send("Internal Server Error");
        }
    },

    // ======================================================
    // 2️⃣ AUTHENTICATION (Login / Register)
    // ======================================================

    /**
     * ประมวลผลการ Login
     */
    postLogin: async (req, res) => {
        try {
            const { username, password } = req.body;

            // ตรวจสอบการกรอกข้อมูล
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

            // ✅ ส่วนที่แก้ไข: ดึงข้อมูลผู้ใช้แบบเต็มรวม Profile_Image
            const fullUser = await userModels.findByUserID(user.User_id);

            // ✅ เก็บข้อมูลเต็มลงใน session
            if (!fullUser) {
                // Fallback: ถ้าดึงข้อมูลเต็มไม่ได้ ให้ใช้ข้อมูลย่อที่มี Roles
                req.session.user = {
                    User_id: user.User_id,
                    User_Name: user.User_Name,
                    Roles: user.Roles
                };
            } else {
                // ✅ ใช้ fullUser ซึ่งรวม Profile_Image
                req.session.user = fullUser;
            }

            req.flash('success', `Welcome back, ${user.User_Name}!`);

            // ไปหน้าแรก
            res.redirect('/');
        } catch (error) {
            console.error("Login error:", error);
            res.status(500).json({ err: error.message });
        }
    },

    /**
     * ประมวลผลการ Register (สร้างบัญชีผู้ใช้ใหม่)
     */
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

            // ตรวจสอบความตรงกันของรหัสผ่าน
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

            // Hash password ก่อนเก็บ
            const hashedPassword = await bcrypt.hash(password, 10);

            // สร้าง user ใหม่
            const newUser = await userModels.create({
                username,
                email,
                password: hashedPassword
            });

            // กำหนดรูปโปรไฟล์เริ่มต้น
            const defaultImagePath = '/user/img/user_default.jpg';
            await userModels.addProfileImage(newUser.User_id, defaultImagePath);

            res.redirect('/user/login');
        } catch (error) {
            console.error("Register error:", error);
            res.status(500).json({ err: error.message });
        }
    },

    // ======================================================
    // 3️⃣ USER PROFILE (View / Edit)
    // ======================================================

    /**
     * แสดงหน้าแก้ไขโปรไฟล์ของผู้ใช้ (ต้องล็อกอินก่อน)
     */
    getEditProfilePage: async (req, res) => {
        try {
            // ใช้ req.user ที่กำหนดใน Global Middleware แล้ว (แต่ใช้ req.session.user ก็ยังใช้งานได้)
            const userId = req.session.user ? req.session.user.User_id : null;
            if (!userId) return res.redirect('/user/login');

            // ดึงข้อมูลเต็มเพื่อนำไปแสดงในฟอร์มแก้ไข
            const user = await userModels.findByUserID(userId);
            if (!user) return res.status(404).send("User not found");

            res.render('edit_profile', { user });
        } catch (error) {
            console.error("Error loading profile:", error);
            res.status(500).send("Internal Server Error");
        }
    },

    /**
     * อัปเดตข้อมูลโปรไฟล์ (ชื่อ + รูป)
     */
    postEditProfile: async (req, res) => {
        try {
            const userId = req.session.user ? req.session.user.User_id : null;
            if (!userId) {
                req.flash('error', 'Please log in to update your profile.');
                return res.status(401).redirect('/user/login');
            }

            // Multer ได้ประมวลผลฟอร์มแล้ว ข้อมูลฟอร์มอยู่ใน req.body
            const { User_Name } = req.body;

            // 💡 ตรวจสอบว่าชื่อผู้ใช้ไม่ว่างเปล่า
            if (!User_Name || User_Name.trim() === '') {
                req.flash('error', 'Username cannot be empty.');
                return res.redirect(`/user/edit`);
            }

            // อัปเดตชื่อผู้ใช้ (ใช้ User_Name ที่มาจาก req.body)
            await userModels.updateUser(userId, { User_Name });

            let updatedUser = null; // ตัวแปรสำหรับเก็บข้อมูลผู้ใช้ล่าสุด

            // 💡 Multer (single) ใช้ req.file แทน req.files
            if (req.file) {
                const file = req.file;
                const filename = file.filename;

                // สร้าง Path สำหรับเก็บใน DB (ต้องตรงกับ destination ที่ตั้งใน uploadMiddleware)
                const profileImagePath = `/user/img/${filename}`;

                // 💡 2. ลบรูปโปรไฟล์เก่าก่อน (พร้อมเงื่อนไขป้องกัน user_default.jpg)
                const oldUser = await userModels.findByUserID(userId);
                const oldImagePath = oldUser.Profile_Image_Path; // Path เก่าใน DB

                // ตรวจสอบ: Path เก่ามีอยู่ + ต้องไม่เป็นรูป Default
                if (oldImagePath && oldImagePath !== '/user/img/user_default.jpg') {
                    // 💡 ใช้ path.join เพื่อสร้าง Absolute Path
                    const absoluteOldPath = path.join(__dirname, '..', 'public', oldImagePath);
                    try {
                        // 💡 ใช้ fs.promises.unlink() หรือ fs.unlink() (ถ้าไม่ได้ require 'fs/promises')
                        await fs.promises.unlink(absoluteOldPath);
                    } catch (err) {
                        // ไม่ต้องทำอะไรมากถ้าลบไฟล์เก่าไม่ได้ (อาจไม่มีไฟล์อยู่จริง)
                        console.warn("Warning: Could not delete old profile image:", err.message);
                    }
                }

                // ✅ 3. อัปเดต Path รูปโปรไฟล์ใหม่เข้า DB
                await userModels.addProfileImage(userId, profileImagePath);

                req.flash('success', 'Profile and image updated successfully!');
            } else {
                // ✅ กรณีอัปเดตแค่ชื่อผู้ใช้
                req.flash('success', 'Profile name updated successfully!');
            }

            // ✅ ดึงข้อมูลผู้ใช้แบบเต็มล่าสุด (ไม่ว่าจะเปลี่ยนรูปหรือไม่ก็ตาม)
            updatedUser = await userModels.findByUserID(userId);

            // ✅ บันทึกข้อมูลผู้ใช้แบบเต็มลงใน Session 
            if (updatedUser) {
                req.session.user = updatedUser;
            }

            // กลับไปหน้าโปรไฟล์ของตัวเอง
            res.redirect(`/user/view/${userId}`);
        } catch (err) {
            console.error("Error updating profile:", err);
            req.flash('error', `Error updating profile: ${err.message}`);
            // Redirect กลับไปหน้าเดิม
            res.status(500).redirect(`/user/edit`);
        }
    },

    /**
     * แสดงหน้าโปรไฟล์ของผู้ใช้ที่ล็อกอินอยู่ (จาก session)
     */
    getProfile: async (req, res) => {
        try {
            const userId = req.session.user ? req.session.user.User_id : null;
            if (!userId) return res.redirect('/user/login');

            // ดึงข้อมูลเต็ม (userModels.findByUserID มี include: { Profile_Image: true } อยู่แล้ว)
            const user = await userModels.findByUserID(userId);
            if (!user) return res.status(404).send("User not found");

            res.render('view_profile', { user });
        } catch (err) {
            console.error("Error fetching profile:", err);
            res.status(500).send("Server Error");
        }
    },

    // ======================================================
    // 4️⃣ LOGOUT
    // ======================================================

    /**
     * ออกจากระบบ (ลบ session)
     */
    postLogout: (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                console.error("Logout error:", err);
                return res.status(500).json({ err: 'Logout failed' });
            }
            res.redirect('/');
        });
    },
};

// --------------------------
// Export Controller
// --------------------------
module.exports = userController;