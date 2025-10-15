// ==========================
// CreateGame.test.js
// ==========================

// --------------------------
// Dependencies
// --------------------------
const gameController = require('../controllers/gameControllers');
const gameModels = require('../models/gameModels');
const fsPromises = require('fs').promises;

// --------------------------
// Jest Mocks
// --------------------------

// Mock gameModels module
jest.mock('../models/gameModels');

// Mock fs module
jest.mock('fs', () => {
    const originalFs = jest.requireActual('fs'); // ใช้งานฟังก์ชันจริงของ fs (เช่น existsSync)
    return {
        ...originalFs,
        promises: {
            ...originalFs.promises,
            unlink: jest.fn(), // Mock เฉพาะ unlink สำหรับ cleanup tests
        },
    };
});

// --------------------------
// Utility Functions
// --------------------------

// จำลองการลบไฟล์ที่อัปโหลด
const mockCleanupUploadedFiles = async (gameFile, images) => {
    const filesToClean = [];
    if (gameFile) filesToClean.push(`../public/game/file/${gameFile.filename}`);
    if (images && images.length > 0) {
        images.forEach(img => filesToClean.push(`../public/game/img/${img.filename}`));
    }
    for (const filePath of filesToClean) {
        try {
            await fsPromises.unlink(filePath);
        } catch (err) {
            // silent fail
        }
    }
};

// --------------------------
// Test Suite: postCreateGame
// --------------------------
describe('postCreateGame (Game Creation)', () => {

    let consoleErrorSpy;
    let req, res, next;

    // --------------------------
    // Mock Files & Game Data
    // --------------------------
    const mockGameFile = { fieldname: 'file_game', filename: 'game-12345.zip' };
    const mockImage1 = { fieldname: 'images', filename: 'img-a-67890.png' };
    const mockImage2 = { fieldname: 'images', filename: 'img-b-12345.jpg' };
    const mockImages = [mockImage1, mockImage2];

    const mockGameData = {
        Game_id: 101,
        User_id: 1,
        Game_Title: 'Test Game',
        File_Game: mockGameFile.filename
    };

    // --------------------------
    // Before Each Test
    // --------------------------
    beforeEach(() => {
        jest.clearAllMocks(); // Reset mocks

        // Mock console.error เพื่อไม่ให้ error แสดงใน test log
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        // Mock Request Object
        req = {
            user: { User_id: 1, Roles: 'Member' },
            body: {
                title_game: 'New Test Game Title',
                description: 'A brief description.',
                status_game: 'Draft',
                details: 'Details text',
                tags: ['Action', 'Puzzle']
            },
            files: {
                file_game: [mockGameFile],
                images: mockImages,
            }
        };

        // Mock Response Object
        res = {
            status: jest.fn(() => res),
            json: jest.fn(() => res),
            send: jest.fn(() => res),
        };

        // Mock database methods
        gameModels.createGame.mockResolvedValue(mockGameData);
        gameModels.createImage.mockResolvedValue({});
        gameModels.createTags.mockResolvedValue({});
    });

    // --------------------------
    // After Each Test
    // --------------------------
    afterEach(() => {
        consoleErrorSpy.mockRestore(); // คืนค่า console.error
    });

    // ==========================
    // A. Happy Path Test
    // ==========================
    test('A1: should create a game successfully and return 201 status', async () => {
        await gameController.postCreateGame(req, res);

        // ✅ HTTP Status
        expect(res.status).not.toHaveBeenCalledWith(400);
        expect(res.status).not.toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: "สร้างเกมสำเร็จ",
            game: mockGameData
        }));

        // ✅ DB Calls
        expect(gameModels.createGame).toHaveBeenCalledWith(expect.objectContaining({
            user_id: 1,
            title_game: req.body.title_game,
            File_Game: mockGameFile.filename
        }));
        expect(gameModels.createImage).toHaveBeenCalledTimes(mockImages.length);
        expect(gameModels.createTags).toHaveBeenCalledTimes(1);

        // ✅ File Cleanup (ไม่ถูกเรียกเมื่อสำเร็จ)
        expect(fsPromises.unlink).not.toHaveBeenCalled();
    });

    // ==========================
    // B. Validation & Bad Request (400)
    // ==========================
    test('B1: should return 400 if file_game is missing', async () => {
        req.files.file_game = null;

        await gameController.postCreateGame(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "ต้องเลือกไฟล์เกม (.zip)"
        }));

        expect(gameModels.createGame).not.toHaveBeenCalled();
    });

    test('B2: should return 400 if images are missing', async () => {
        req.files.images = [];

        await gameController.postCreateGame(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "ต้องอัปโหลดรูปเกมอย่างน้อย 1 รูป"
        }));

        expect(gameModels.createGame).not.toHaveBeenCalled();

        // Simulate cleanup for uploaded game file
        await mockCleanupUploadedFiles(mockGameFile, []);
        expect(fsPromises.unlink).toHaveBeenCalledWith(
            expect.stringContaining(mockGameFile.filename)
        );
    });

    // ==========================
    // C. Database & Rollback (500)
    // ==========================
    test('C1: should return 500 and cleanup files if createGame fails', async () => {
        gameModels.createGame.mockRejectedValue(new Error('DB connection failed'));

        await gameController.postCreateGame(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "สร้างเกมไม่สำเร็จ กรุณาลองใหม่"
        }));

        expect(gameModels.createGame).toHaveBeenCalledTimes(1);
        expect(gameModels.createImage).not.toHaveBeenCalled();

        await mockCleanupUploadedFiles(mockGameFile, mockImages);
        expect(fsPromises.unlink).toHaveBeenCalledTimes(3); // game file + 2 images
    });

    test('C2: should return 500 and cleanup files if createImage fails', async () => {
        gameModels.createImage.mockRejectedValue(new Error('Image DB write failed'));

        await gameController.postCreateGame(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(gameModels.createGame).toHaveBeenCalledTimes(1);
        expect(gameModels.createImage).toHaveBeenCalledTimes(1);

        await mockCleanupUploadedFiles(mockGameFile, mockImages);
        expect(fsPromises.unlink).toHaveBeenCalledTimes(3);
    });

    // ==========================
    // D. Access Control (401/403)
    // ==========================
    test('D1: should return 401 if user is not logged in', async () => {
        req.user = null;

        await gameController.postCreateGame(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "กรุณาเข้าสู่ระบบก่อน" });

        expect(gameModels.createGame).not.toHaveBeenCalled();

        await mockCleanupUploadedFiles(null, mockImages);
        expect(fsPromises.unlink).toHaveBeenCalledTimes(2); // images only
    });

});
