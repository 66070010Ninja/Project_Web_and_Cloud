// middlewares/authMiddleware.js

// 1. ตรวจสอบว่าผู้ใช้ล็อกอินอยู่หรือไม่
const isAuthenticated = (req, res, next) => {
    // 💡 ปรับปรุง: ตรวจสอบแค่ req.user ที่ถูกกำหนดใน Global Middleware แล้ว
    if (req.user) {
        // ถ้าล็อกอินแล้ว ให้ดำเนินการต่อ
        return next();
    }

    // หากไม่ล็อกอิน ให้ส่งไปหน้า login พร้อมข้อความแจ้งเตือน
    req.flash('error', 'Please log in to access this page.');
    // 💡 แก้ไข: ใช้ '/user/login' ตาม route ที่กำหนดไว้ใน server.js
    return res.redirect('/user/login');
};

// 2. ตรวจสอบว่าผู้ใช้มีบทบาทตามที่กำหนดหรือไม่ (สำหรับ Developer, Admin)
const isRole = (roles) => {
    return (req, res, next) => {
        // ตรวจสอบว่า req.user ถูกกำหนดและ roles ตรงกัน
        if (!req.user || !roles.includes(req.user.Roles)) {
            req.flash('error', 'Permission denied. You do not have the required role.');
            return res.status(403).redirect('/'); // ส่งกลับหน้า Home
        }
        return next();
    };
};

// 3. ป้องกันไม่ให้เข้าหน้า Login/Register หากล็อกอินอยู่แล้ว
const isGuest = (req, res, next) => {
    // 💡 ปรับปรุง: ตรวจสอบแค่ req.user ที่ถูกกำหนดใน Global Middleware แล้ว
    if (req.user) {
        // หากล็อกอินอยู่แล้ว ให้ส่งไปหน้า Dashboard
        return res.redirect('/dashboard');
    }
    next();
};

module.exports = {
    isAuthenticated,
    isRole,
    isGuest
};
