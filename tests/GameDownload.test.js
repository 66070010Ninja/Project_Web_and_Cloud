// ==========================
// tests/GameDownload.test.js
// ==========================

// 🎮 ทดสอบฟังก์ชันดาวน์โหลดไฟล์เกม: getDownloadGame
// เน้นตรวจสอบ access control, error handling, และการเรียกใช้ fs / database
// ==========================

const gameController = require('../controllers/gameControllers');
const path = require('path');
const fs = require('fs');

// ==========================
// Mock Dependencies
// ==========================
jest.mock('../models/gameModels', () => ({
    findGameById: jest.fn(),           // ใช้เพื่อตรวจสอบว่ามีเกมอยู่จริงหรือไม่
    incrementGameDownloads: jest.fn()  // ใช้เพิ่มจำนวนดาวน์โหลด
}));

jest.mock('fs', () => {
    const originalFs = jest.requireActual('fs');
    return {
        ...originalFs,
        promises: {
            access: jest.fn() // Mock fs.promises.access เพื่อตรวจสอบไฟล์บน disk
        }
    };
});

const mockGameModels = require('../models/gameModels');
const mockFs = require('fs');
const mockPath = path.join(__dirname, "../public/game/file");

// ==========================
// Mock Data
// ==========================
const MOCK_GAME_ID = 101;
const MOCK_USER_ID = 1;
const MOCK_FILENAME = 'test-game-101.zip';

const mockGameData = {
    Game_id: MOCK_GAME_ID,
    User_id: 99,                   // เจ้าของเกม
    Game_Title: 'Awesome Game Title',
    File_Game: MOCK_FILENAME
};

// ==========================
// Test Suite: getDownloadGame
// ==========================
describe('getDownloadGame (Game Download Access Control)', () => {
    let req, res;
    let consoleErrorSpy;

    // --------------------------
    // ก่อนแต่ละ test
    // --------------------------
    beforeEach(() => {
        jest.clearAllMocks();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        // Mock Response object
        res = {
            download: jest.fn((filePath, filename, callback) => callback(null)), // default success
            status: jest.fn(() => res),
            send: jest.fn(),
        };

        // Mock Request object
        req = {
            user: { User_id: MOCK_USER_ID, Roles: 'Member' },
            params: { id: MOCK_GAME_ID.toString() }
        };

        // Mock DB & FS default behavior
        mockGameModels.findGameById.mockResolvedValue(mockGameData);
        mockGameModels.incrementGameDownloads.mockResolvedValue();
        mockFs.promises.access.mockResolvedValue(); // file exists
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    // ==========================
    // D. Download Success
    // ==========================
    test('D1: should successfully send the file', async () => {
        const expectedFilePath = path.join(mockPath, MOCK_FILENAME);

        await gameController.getDownloadGame(req, res);

        // ตรวจสอบ DB call
        expect(mockGameModels.findGameById).toHaveBeenCalledWith(MOCK_GAME_ID);

        // ตรวจสอบว่าไฟล์มีอยู่
        expect(mockFs.promises.access).toHaveBeenCalledWith(expectedFilePath, fs.constants.F_OK);

        // ตรวจสอบการส่งไฟล์
        expect(res.download).toHaveBeenCalledWith(
            expectedFilePath,
            mockGameData.Game_Title + '.zip',
            expect.any(Function)
        );

        // ตรวจสอบเพิ่มจำนวนดาวน์โหลด
        expect(mockGameModels.incrementGameDownloads).toHaveBeenCalledWith(MOCK_GAME_ID);
    });

    // ==========================
    // E. Error Handling
    // ==========================
    test('E1: should return 404 if game not found', async () => {
        mockGameModels.findGameById.mockResolvedValue(null);

        await gameController.getDownloadGame(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith('Game file not found.');
    });

    test('E2: should return 404 if file does not exist on server', async () => {
        mockFs.promises.access.mockRejectedValue({ code: 'ENOENT' });

        await gameController.getDownloadGame(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith('Game file not found on server.');
    });

    test('E3: should return 500 if internal error occurs', async () => {
        mockGameModels.findGameById.mockRejectedValue(new Error('DB failed'));

        await gameController.getDownloadGame(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith('Internal Server Error');

        // ต้อง log error
        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test('E4: should handle download callback error gracefully', async () => {
        // Mock download ให้เกิด error callback
        res.download = jest.fn((filePath, filename, callback) => callback(new Error('Download failed')));

        await gameController.getDownloadGame(req, res);

        // Controller ปัจจุบันจะไม่เรียก res.status/res.send แต่จะ log error
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.any(String),                     // "Error during file download:"
            expect.stringContaining('Download failed')
        );
    });
});
