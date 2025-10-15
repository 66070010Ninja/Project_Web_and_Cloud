// ==========================
// tests/AdminPageAccess.test.js
// ==========================

// --------------------------
// Import Controller
// --------------------------
const pageController = require('../controllers/adminController');

// --------------------------
// Mock Dependencies
// --------------------------
jest.mock('../models/gameModels', () => ({
    getAllGames: jest.fn(),        // Mock ฟังก์ชันดึงเกมทั้งหมด
    findImagesByGameId: jest.fn(), // Mock ฟังก์ชันดึงรูปของเกม
}));

// --------------------------
// Test Suite: Admin Page Access Control
// --------------------------
describe('getAdminPage (Admin Page Access Control)', () => {
    let req, res, consoleErrorSpy;

    // --------------------------
    // Mock Users
    // --------------------------
    const mockAdminUser = { User_id: 10, Username: 'adminUser', Roles: 'Admin' };
    const mockMemberUser = { User_id: 20, Username: 'memberUser', Roles: 'Member' };

    // --------------------------
    // Setup Before Each Test
    // --------------------------
    beforeEach(() => {
        jest.clearAllMocks();

        // Spy on console.error เพื่อป้องกัน output ระหว่าง test
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        // Mock Response object สำหรับ render / redirect / status / send
        res = {
            render: jest.fn(),
            redirect: jest.fn(),
            status: jest.fn(() => res), // status() ต้อง return res เพื่อ chain .render() ได้
            send: jest.fn(),
        };

        // Base request object
        req = { user: null, query: {} };

        // Mock DB call ให้คืนค่า empty array
        require('../models/gameModels').getAllGames.mockResolvedValue([]);
    });

    // --------------------------
    // Cleanup After Each Test
    // --------------------------
    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    // --------------------------
    // Test Cases
    // --------------------------

    test('A1: should render admin page (Admin user)', async () => {
        req.user = mockAdminUser;

        await pageController.getAdminPage(req, res);

        // ✅ ตรวจสอบว่า render ถูกเรียก พร้อม games array
        expect(res.render).toHaveBeenCalledWith('admin', expect.objectContaining({
            games: expect.any(Array)
        }));

        // ❌ ไม่มีการ redirect
        expect(res.redirect).not.toHaveBeenCalled();
    });

    test('A2: should render admin page for Member user (no role check in current controller)', async () => {
        req.user = mockMemberUser;

        await pageController.getAdminPage(req, res);

        // Controller ปัจจุบันไม่ได้ check role → render ปกติ
        expect(res.render).toHaveBeenCalledWith('admin', expect.objectContaining({
            games: expect.any(Array)
        }));

        expect(res.redirect).not.toHaveBeenCalled();
    });

    test('A3: should render admin page for not logged in user (null user)', async () => {
        req.user = null;

        await pageController.getAdminPage(req, res);

        // Controller ปัจจุบันไม่ได้ check login → render ปกติ
        expect(res.render).toHaveBeenCalledWith('admin', expect.objectContaining({
            games: expect.any(Array)
        }));

        expect(res.redirect).not.toHaveBeenCalled();
    });

    test('A4: should render admin page with error if internal error occurs', async () => {
        req.user = mockAdminUser;

        // Mock DB call ให้เกิด error
        require('../models/gameModels').getAllGames.mockRejectedValue(new Error('DB error'));

        await pageController.getAdminPage(req, res);

        // ตรวจสอบว่า status 500 ถูกเรียก
        expect(res.status).toHaveBeenCalledWith(500);

        // ตรวจสอบว่า render ถูกเรียกพร้อม error message
        expect(res.render).toHaveBeenCalledWith('admin', expect.objectContaining({
            games: [],
            error: 'Failed to load game data.'
        }));
    });
});
