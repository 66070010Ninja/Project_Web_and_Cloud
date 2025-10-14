// __tests__/gameController.test.js

const gameController = require('../controllers/gameControllers'); // สมมติ path ถูกต้อง
const gameModels = require('../models/gameModels');
// เราต้อง Mock โมดูลที่เกี่ยวข้องกับ I/O (Input/Output) และ Database
jest.mock('../models/gameModels', () => ({
    createGame: jest.fn(),
    createImage: jest.fn(),
    createTags: jest.fn(),
    // ... ฟังก์ชันอื่น ๆ ที่จะใช้ใน Controller อื่น (เช่น findGameById, updateGame)
    findGameById: jest.fn(),
    // ...
}));

jest.mock('../models/userModels', () => ({
    findByUserID: jest.fn(), 
    // ถ้ามีฟังก์ชันอื่นที่ Controller เรียกใช้ (เช่น register, login) ให้เพิ่ม Mock เข้าไปด้วย
}));

// Mock fs/promises และ path เพื่อไม่ให้เกิด I/O จริง
jest.mock('fs/promises', () => ({
    unlink: jest.fn().mockResolvedValue(),
    writeFile: jest.fn().mockResolvedValue(),
}));
jest.mock('path'); // Mock path

// Mock Express Objects
const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnThis();
    res.json = jest.fn().mockReturnThis();
    return res;
};

// --------------------------
// เริ่ม Unit Test
// --------------------------

describe('Game Controller: postCreateGame', () => {
    let req;
    let res;
    const mockUserId = 101;
    const mockGameId = 505;

    beforeEach(() => {
        res = mockRes();
        jest.clearAllMocks();

        // 1. Mock การสร้างเกมให้คืนค่า Game ID
        gameModels.createGame.mockResolvedValue({ Game_id: mockGameId });
        gameModels.createImage.mockResolvedValue(true);
        gameModels.createTags.mockResolvedValue(true);

        // 2. Mock Request Default (สำเร็จ)
        req = {
            user: { User_id: mockUserId, Roles: 'Member' },
            body: {
                title_game: 'Test Game',
                description: 'A test game',
                status_game: 'Completed',
                details: 'Details here',
                tags: ['Action', 'Puzzle']
            },
            files: {
                // Mock ไฟล์เกม (Multer field: file_game)
                file_game: [{ 
                    filename: 'gamefile-12345.zip', 
                    fieldname: 'file_game' 
                }],
                // Mock รูปภาพ (Multer field: images)
                images: [
                    { filename: 'img1-abc.jpg', fieldname: 'images' },
                    { filename: 'img2-def.jpg', fieldname: 'images' }
                ]
            }
        };
    });

    // TEST CASE 1: การสร้างเกมสำเร็จ
    test('should successfully create a new game with file, images, and tags', async () => {
        // Act
        await gameController.postCreateGame(req, res);

        // Assert
        
        // A. ตรวจสอบการเรียก Model หลัก
        expect(gameModels.createGame).toHaveBeenCalledTimes(1);
        expect(gameModels.createGame).toHaveBeenCalledWith({
            user_id: mockUserId,
            title_game: 'Test Game',
            description: 'A test game',
            status_game: 'Completed',
            details: 'Details here',
            File_Game: 'gamefile-12345.zip'
        });

        // B. ตรวจสอบการบันทึกรูปภาพ (2 รูป)
        expect(gameModels.createImage).toHaveBeenCalledTimes(2);
        expect(gameModels.createImage).toHaveBeenCalledWith({
            url: 'img1-abc.jpg',
            game_id: mockGameId
        });
        expect(gameModels.createImage).toHaveBeenCalledWith({
            url: 'img2-def.jpg',
            game_id: mockGameId
        });

        // C. ตรวจสอบการบันทึก Tags
        expect(gameModels.createTags).toHaveBeenCalledTimes(1);
        expect(gameModels.createTags).toHaveBeenCalledWith(mockGameId, ['Action', 'Puzzle']);

        // D. ตรวจสอบ Response
        expect(res.json).toHaveBeenCalledWith({ 
            message: "สร้างเกมสำเร็จ", 
            game: { Game_id: mockGameId } 
        });
        expect(res.status).not.toHaveBeenCalled(); // สถานะ 200 (Default)
    });

    // TEST CASE 2: ไม่มีไฟล์เกม (File_Game)
    test('should return 400 error if game file is missing', async () => {
        // Arrange: ลบไฟล์เกมออกจาก req.files
        req.files.file_game = null; 

        // Act
        await gameController.postCreateGame(req, res);

        // Assert
        expect(gameModels.createGame).not.toHaveBeenCalled(); // ต้องไม่สร้างเกม
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "ต้องเลือกไฟล์เกม (.zip)" });
    });

    // TEST CASE 3: ไม่มีรูปภาพ (Images)
    test('should return 400 error if no images are uploaded', async () => {
        // Arrange: ลบรูปภาพออกจาก req.files
        req.files.images = []; 

        // Act
        await gameController.postCreateGame(req, res);

        // Assert
        expect(gameModels.createGame).not.toHaveBeenCalled(); // ต้องไม่สร้างเกม
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "ต้องอัปโหลดรูปเกมอย่างน้อย 1 รูป" });
    });

    // TEST CASE 4: Error Handling (Database Error)
    test('should return 500 status on database error', async () => {
        // Arrange: Mock ให้ createGame โยน Error
        const dbError = new Error('Database connection failed');
        gameModels.createGame.mockRejectedValue(dbError); 
        
        // Mock console.error
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        // Act
        await gameController.postCreateGame(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "สร้างเกมไม่สำเร็จ กรุณาลองใหม่" });
        expect(consoleErrorSpy).toHaveBeenCalledWith("Error creating game:", dbError);
        
        consoleErrorSpy.mockRestore(); 
    });
});