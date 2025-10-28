// ==========================
// userController.js (S3 version)
// ==========================

const userModels = require('../models/userModels');
const bcrypt = require('bcrypt');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// --------------------------
// AWS S3 Config
// --------------------------
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});
const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

// --------------------------
// User Controller
// --------------------------
const userController = {
    // ======================================================
    // 1️⃣ PUBLIC PAGES
    // ======================================================

    getLoginPage: (req, res) => res.render('login', { error: null, formData: {} }),
    getRegisterPage: (req, res) => res.render('register', { error: null, formData: {} }),

    getViewPage: async (req, res) => {
        try {
            const userId = parseInt(req.params.id, 10);
            const user = await userModels.findByUserID(userId);
            if (!user) return res.status(404).send("User not found");
            res.render('view_user', { user });
        } catch (err) {
            console.error("Error fetching user:", err);
            res.status(500).send("Internal Server Error");
        }
    },

    // ======================================================
    // 2️⃣ AUTHENTICATION
    // ======================================================

    postLogin: async (req, res) => {
        try {
            const { username, password } = req.body;
            if (!username || !password)
                return res.render('login', { error: 'Please fill in all fields', formData: { username } });

            const user = await userModels.findByUsername(username);
            if (!user)
                return res.render('login', { error: 'Invalid username or password', formData: { username } });

            const isMatch = await bcrypt.compare(password, user.Hashed_Password);
            if (!isMatch)
                return res.render('login', { error: 'Invalid username or password', formData: { username } });

            const fullUser = await userModels.findByUserID(user.User_id);
            req.session.user = fullUser || { User_id: user.User_id, User_Name: user.User_Name, Roles: user.Roles };

            req.flash('success', `Welcome back, ${user.User_Name}!`);
            res.redirect('/');
        } catch (err) {
            console.error("Login error:", err);
            res.status(500).json({ err: err.message });
        }
    },

    postRegister: async (req, res) => {
        try {
            const { username, email, password, confirm_password } = req.body;
            if (!username || !email || !password || !confirm_password)
                return res.render('register', { error: 'Please fill in all fields', formData: { username, email } });

            if (password !== confirm_password)
                return res.render('register', { error: 'Passwords do not match !!!', formData: { username, email } });

            const existingUser = await userModels.findByUsername(username);
            if (existingUser)
                return res.render('register', { error: 'Username already exists !!!', formData: { username, email } });

            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = await userModels.create({ username, email, password: hashedPassword });

            // Default profile image (ใช้ไฟล์ใน S3 หรือ URL ตายตัว)
            const defaultImageUrl = `${process.env.S3_BASE_URL}/user/img/user_default.jpg`;
            await userModels.addProfileImage(newUser.User_id, defaultImageUrl);

            res.redirect('/user/login');
        } catch (err) {
            console.error("Register error:", err);
            res.status(500).json({ err: err.message });
        }
    },

    // ======================================================
    // 3️⃣ USER PROFILE
    // ======================================================

    getEditProfilePage: async (req, res) => {
        try {
            const userId = req.session.user?.User_id;
            if (!userId) return res.redirect('/user/login');

            const user = await userModels.findByUserID(userId);
            if (!user) return res.status(404).send("User not found");

            res.render('edit_profile', { user });
        } catch (err) {
            console.error("Error loading profile:", err);
            res.status(500).send("Internal Server Error");
        }
    },

    postEditProfile: async (req, res) => {
        try {
            const userId = req.session.user?.User_id;
            if (!userId) return res.redirect('/user/login');

            const { User_Name } = req.body;
            if (!User_Name || User_Name.trim() === '') {
                req.flash('error', 'Username cannot be empty.');
                return res.redirect(`/user/edit`);
            }

            await userModels.updateUser(userId, { User_Name });

            // ✅ ถ้ามีการอัปโหลดรูปใหม่ (ผ่าน multer-s3)
            if (req.file) {
                const file = req.file;

                // ลบรูปเก่าจาก S3 ถ้าไม่ใช่ default
                const oldUser = await userModels.findByUserID(userId);
                const oldUrl = oldUser.Profile_Image_Path;
                if (oldUrl && !oldUrl.endsWith("user_default.jpg")) {
                    const key = oldUrl.split('/').slice(-2).join('/'); // เช่น "user/img/xxx.jpg"
                    try {
                        await s3.send(new DeleteObjectCommand({
                            Bucket: BUCKET_NAME,
                            Key: key
                        }));
                    } catch (err) {
                        console.warn("Failed to delete old S3 image:", err.message);
                    }
                }

                // บันทึก URL ของรูปใหม่ลงใน DB
                await userModels.addProfileImage(userId, file.location);

                req.flash('success', 'Profile and image updated successfully!');
            } else {
                req.flash('success', 'Profile name updated successfully!');
            }

            const updatedUser = await userModels.findByUserID(userId);
            req.session.user = updatedUser;

            res.redirect(`/user/view/${userId}`);
        } catch (err) {
            console.error("Error updating profile:", err);
            req.flash('error', `Error updating profile: ${err.message}`);
            res.redirect(`/user/edit`);
        }
    },

    getProfile: async (req, res) => {
        try {
            const userId = req.session.user?.User_id;
            if (!userId) return res.redirect('/user/login');
            const user = await userModels.findByUserID(userId);
            res.render('view_profile', { user });
        } catch (err) {
            console.error("Error fetching profile:", err);
            res.status(500).send("Server Error");
        }
    },

    // ======================================================
    // 4️⃣ LOGOUT
    // ======================================================

    postLogout: (req, res) => {
        req.session.destroy((err) => {
            if (err) return res.status(500).json({ err: 'Logout failed' });
            res.redirect('/');
        });
    },
};

module.exports = userController;
