// --------------------------------------------------------
// [Unit Test] routes/adminRoutes.js - โดยใช้ supertest
// --------------------------------------------------------
const request = require('supertest');
const express = require('express');
const cookieSession = require('cookie-session'); // ต้องติดตั้ง: npm install cookie-session --save-dev

// Mock Dependencies
// 1. Mock Middleware (authMiddleware)
const mockIsAuthenticated = jest.fn((req, res, next) => {
    // req.session ถูกตั้งค่าโดย cookie-session
    if (req.session && req.session.user) {
        return next();
    }
    // จำลองการ Redirect 302 ไปหน้า Login
    req.flash('error', 'Please log in to access this page.');
    return res.status(302).redirect('/user/login');
});

const mockIsRole = (roles) => (req, res, next) => {
    // req.session.user ถูกตั้งค่าโดย agent.session
    if (req.session.user && roles.includes(req.session.user.Roles)) {
        return next();
    }
    // จำลองการปฏิเสธสิทธิ์ (403 Forbidden)
    return res.status(403).send('Forbidden: Insufficient privileges.');
};

// 2. Mock Controller (adminController)
const mockGetAdminPage = jest.fn((req, res) => {
    res.status(200).send('Admin Page Rendered');
});

jest.mock('../middlewares/authMiddleware', () => ({
    isAuthenticated: mockIsAuthenticated,
    isRole: mockIsRole,
}));

jest.mock('../controllers/adminController', () => ({
    getAdminPage: mockGetAdminPage,
}));

// Setup Express App for testing
const app = express();
// ***แก้ไข: เพิ่ม signed: false เพื่อให้การตั้งค่า agent.session ทำงานได้ง่ายขึ้นในสภาพแวดล้อมทดสอบ***
app.use(cookieSession({ secret: 'mock-secret', signed: false }));

// Mock req.flash สำหรับใช้งานใน isAuthenticated
app.use((req, res, next) => {
    req.flash = req.flash || jest.fn();
    next();
});

// นำเข้า Router ที่ต้องการทดสอบ
// ***แก้ไข: ใช้ 'adminRoutes' ตามชื่อไฟล์ที่ให้มา (route/adminRoutes.js)***
const adminRoutes = require('../routes/adminRoutes');
app.use('/admin', adminRoutes);

// --------------------------------------------------------
// Start Test Suite
// --------------------------------------------------------
describe('Admin Routes: GET /admin', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ----------------------------------------------------
    // 1. Success Case: Admin (ล็อกอินและมีสิทธิ์)
    // ----------------------------------------------------
    test('should allow access and call getAdminPage for Admin user', async () => {
        // ใช้ request.agent() เพื่อสร้าง HTTP Agent ที่สามารถจัดการสถานะ (Session/Cookie) ได้
        const agent = request.agent(app);

        // กำหนด Session โดยตรงบน agent.session
        mockIsAuthenticated.mockImplementationOnce((req, res, next) => {
            req.session = req.session || {}; // รับประกันว่า req.session มีอยู่
            // จำลองข้อมูลผู้ใช้ Role: Admin
            req.session.user = { User_id: 1, User_Name: 'AdminUser', Roles: 'Admin' };
            next(); // อนุญาตให้เข้าถึง (Authentication Passed)
        });

        // ทำ request โดยใช้ agent
        const response = await agent.get('/admin');

        // Assert
        expect(response.statusCode).toBe(200);
        expect(response.text).toBe('Admin Page Rendered');
        expect(mockIsAuthenticated).toHaveBeenCalled();
        expect(mockGetAdminPage).toHaveBeenCalledTimes(1);
    });

    // ----------------------------------------------------
    // 2. Fail Case: Logged-in User (ไม่มีสิทธิ์)
    // ----------------------------------------------------
    test('should return 403 Forbidden for non-Admin (Regular User)', async () => {
        const agent = request.agent(app);

        // กำหนด Session โดยตรงสำหรับ User ทั่วไป
        mockIsAuthenticated.mockImplementationOnce((req, res, next) => {
        req.session = req.session || {}; 
        // จำลองข้อมูลผู้ใช้ Role: User ธรรมดา
        req.session.user = { User_id: 2, User_Name: 'RegularUser', Roles: 'User' }; 
        next(); // อนุญาตให้เข้าถึง (Authentication Passed)
    });

        const response = await agent.get('/admin');

        // Assert
        expect(response.statusCode).toBe(403);
        expect(response.text).toBe('Forbidden: Insufficient privileges.');
        expect(mockIsAuthenticated).toHaveBeenCalled();
        expect(mockGetAdminPage).not.toHaveBeenCalled();
    });

    // ----------------------------------------------------
    // 3. Fail Case: Guest (ไม่ได้ล็อกอิน)
    // ----------------------------------------------------
    test('should redirect to /user/login for Guest user (not authenticated)', async () => {
        // ไม่ใช้ agent เพื่อให้ไม่มี Session ติดไปด้วย
        const response = await request(app).get('/admin');

        // Assert
        expect(response.statusCode).toBe(302);
        expect(response.headers.location).toBe('/user/login');
        expect(mockIsAuthenticated).toHaveBeenCalled();
        expect(mockGetAdminPage).not.toHaveBeenCalled();
    });
});
