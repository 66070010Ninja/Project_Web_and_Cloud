// __tests__/controllers/adminController.test.js

// --------------------------
// 1. Import และ Mock Dependencies
// --------------------------
const adminController = require('../controllers/adminController');
const gameModels = require('../models/gameModels'); 

// Mock: แทนที่ gameModels ด้วยฟังก์ชันปลอมทั้งหมด
jest.mock('../models/gameModels'); 

// --------------------------
// 2. Mock Express Request/Response Objects
// --------------------------

// เตรียม Mock object สำหรับ res (Response)
const mockRes = () => {
    const res = {};
    // Mock ฟังก์ชันสถานะและ render ให้ return ตัว res เอง (chaining)
    res.status = jest.fn().mockReturnThis(); 
    res.render = jest.fn().mockReturnThis();
    return res;
};

// เตรียม Mock object สำหรับ req (Request) 
// (ใน test นี้ req ไม่ได้ถูกใช้โดยตรง แต่ต้องส่งไปตาม signature ของ Controller)
const mockReq = () => ({}); 

// --------------------------
// 3. เริ่ม Unit Test
// --------------------------

describe('Admin Controller: getAdminPage', () => {
    let req;
    let res;

    // ตั้งค่าก่อนเริ่ม test แต่ละตัว
    beforeEach(() => {
        req = mockReq();
        res = mockRes();
        // ล้างข้อมูลการเรียกใช้ mock function ก่อน test ตัวถัดไป
        jest.clearAllMocks(); 
    });

    // -----------------------------------------------------------
    // TEST CASE 1: โหลดหน้าสำเร็จและแสดงข้อมูลเกม
    // -----------------------------------------------------------
    test('should fetch all games and render the admin page with games data (Success)', async () => {
        // Arrange: เตรียมข้อมูลเกมปลอม
        const mockGames = [{ id: 1, title: 'Game A' }, { id: 2, title: 'Game B' }];
        // Mock ให้ gameModels.findAllGames() ส่งค่าสำเร็จ
        gameModels.findAllGames.mockResolvedValue(mockGames);

        // Act: เรียกใช้ Controller
        await adminController.getAdminPage(req, res);

        // Assert: ตรวจสอบ
        
        // A. ตรวจสอบว่า Model ถูกเรียกใช้ 1 ครั้ง
        expect(gameModels.findAllGames).toHaveBeenCalledTimes(1);
        
        // B. ตรวจสอบว่า res.status ไม่ถูกเรียก (สถานะ 200 โดยปริยาย)
        expect(res.status).not.toHaveBeenCalled(); 

        // C. ตรวจสอบว่า res.render ถูกเรียกใช้ด้วย View และข้อมูลที่ถูกต้อง
        expect(res.render).toHaveBeenCalledWith('admin', {
            games: mockGames // ต้องส่งข้อมูลเกมที่ Mock ไป
        });
    });

    // -----------------------------------------------------------
    // TEST CASE 2: การโหลดหน้าสำเร็จแต่ไม่มีเกมในระบบ (Model ส่ง null)
    // -----------------------------------------------------------
    test('should render the admin page with an empty array if findAllGames returns null', async () => {
        // Arrange: เตรียมให้ Model ส่งค่า null กลับมา
        gameModels.findAllGames.mockResolvedValue(null); 

        // Act: เรียกใช้ Controller
        await adminController.getAdminPage(req, res);

        // Assert: ตรวจสอบว่า Controller จัดการ null โดยส่ง Array ว่างไป
        expect(res.render).toHaveBeenCalledWith('admin', {
            games: [] 
        });
    });

    // -----------------------------------------------------------
    // TEST CASE 3: การจัดการข้อผิดพลาด (Database Error)
    // -----------------------------------------------------------
    test('should handle database error (reject) and render admin page with status 500 and error message', async () => {
        // Arrange: เตรียมให้ Model โยน Error ออกมา
        const databaseError = new Error('DB Connection Failed');
        gameModels.findAllGames.mockRejectedValue(databaseError);

        // Mock console.error เพื่อดูว่ามีการ Log Error จริงไหม
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        // Act: เรียกใช้ Controller
        await adminController.getAdminPage(req, res);

        // Assert: ตรวจสอบ
        
        // A. ตรวจสอบว่า res.status ถูกเรียกด้วย 500
        expect(res.status).toHaveBeenCalledWith(500); 

        // B. ตรวจสอบว่า res.render ถูกเรียกใช้เพื่อแสดงหน้า Error
        expect(res.render).toHaveBeenCalledWith('admin', {
            games: [], // ต้องส่ง Array ว่าง
            error: 'Failed to load game data.' // ต้องส่งข้อความ Error
        });

        // C. ตรวจสอบว่ามีการ log error ใน console
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "Error fetching data for admin page:", 
            databaseError
        );
        
        // คืนค่า console.error
        consoleErrorSpy.mockRestore();
    });
});
