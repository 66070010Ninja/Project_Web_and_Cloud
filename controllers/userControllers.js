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
            if (!userId) return res.status(401).send("Unauthorized");

            const { User_Name } = req.body;

            // อัปเดตชื่อผู้ใช้
            await userModels.updateUser(userId, { User_Name });
            
            let updatedUser = null; // ตัวแปรสำหรับเก็บข้อมูลผู้ใช้ล่าสุด

            // ถ้ามีไฟล์อัปโหลด → บันทึกลงโฟลเดอร์
            if (req.files && req.files.Profile_Image) {
                const file = req.files.Profile_Image;
                const uploadDir = path.join(__dirname, '..', 'public', 'user', 'img');

                // สร้างโฟลเดอร์ถ้ายังไม่มี
                if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

                const filename = `${Date.now()}_${file.name}`;
                const destPath = path.join(uploadDir, filename);

                // ย้ายไฟล์จริงไปที่ public
                await file.mv(destPath);

                // เก็บ path ของภาพลง DB
                const profileImagePath = `/user/img/${filename}`;

                // ✅ 1. เพิ่มรูปโปรไฟล์เข้า DB ก่อน
                await userModels.addProfileImage(userId, profileImagePath);

                // ✅ 2. ดึงข้อมูลผู้ใช้แบบเต็มล่าสุด (รวม Profile_Image ใหม่)
                updatedUser = await userModels.findByUserID(userId);

                req.flash('success', 'Profile and image updated successfully!');

            } else {
                // ✅ กรณีอัปเดตแค่ชื่อผู้ใช้: ดึงข้อมูลล่าสุดเพื่ออัปเดต session
                updatedUser = await userModels.findByUserID(userId);
                req.flash('success', 'Profile name updated successfully!');
            }
            
            // ✅ บันทึกข้อมูลผู้ใช้แบบเต็มลงใน Session (ไม่ว่าจะเปลี่ยนรูปหรือไม่ก็ตาม)
            if (updatedUser) {
                req.session.user = updatedUser;
            }


            // กลับไปหน้าโปรไฟล์ของตัวเอง
            res.redirect(`/user/view/${userId}`);
        } catch (err) {
            console.error("Error updating profile:", err);
            res.status(500).send("Error updating profile");
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