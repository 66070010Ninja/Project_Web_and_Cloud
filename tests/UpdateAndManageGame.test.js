// ==========================
// tests/UpdateAndManageGame.test.js
// ==========================
// Unit tests สำหรับ postUpdateGame ใน gameController
// ทดสอบการอัปเดตเกม, การจัดการไฟล์, การลบ/เพิ่มรูป, tags, และ error handling
// ==========================

// --------------------------
// 1. Dependencies
// --------------------------
const path = require('path');
const gameController = require('../controllers/gameControllers');

// --------------------------
// 2. Mock Models
// --------------------------
jest.mock('../models/gameModels', () => ({
    findGameById: jest.fn(),
    findImagesByGameId: jest.fn(),
    findImageById: jest.fn(),
    updateGame: jest.fn(),
    deleteImage: jest.fn(),
    createImage: jest.fn(),
    updateTags: jest.fn(),
}));
const mockGameModels = require('../models/gameModels');

// --------------------------
// 3. Mock FS (เฉพาะ fs.promises ที่ใช้)
// --------------------------
jest.mock('fs', () => {
    const originalFs = jest.requireActual('fs');
    return {
        ...originalFs,
        promises: {
            ...originalFs.promises,
            unlink: jest.fn(),
            rename: jest.fn(),
            writeFile: jest.fn(),
        },
    };
});
const fsPromises = require('fs').promises;

// --------------------------
// 4. Mock Data
// --------------------------
const mockExistingGame = {
    Game_id: 101,
    User_id: 1,
    Game_Title: 'Old Test Game',
    File_Game: 'old-game-file.zip',
    Game_Cover: 'old-cover.png', // Required field
};
const mockExistingImages = [
    { Game_Image_id: 1, Path: 'img-c-old.png' },
    { Game_Image_id: 2, Path: 'img-d-old.jpg' }
];

// ไฟล์ใหม่ที่ใช้ทดสอบ
const mockNewGameFile = {
    originalname: 'new-game-update.zip',
    path: '/tmp/multer-file.zip'
};
const mockNewImage = {
    name: 'new-img-a.png',
    data: Buffer.from('image data')
};

// --------------------------
// 5. Describe Test Suite
// --------------------------
describe('postUpdateGame (Game Update & File Management)', () => {
    let req, res;
    let consoleErrorSpy;
    let mockDateNow;

    // --------------------------
    // 5.1 beforeEach
    // --------------------------
    beforeEach(() => {
        // Mock Date.now() เพื่อคาดชื่อไฟล์
        mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1678886400000);

        jest.clearAllMocks();

        // Mock console.error
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        // Mock DB Methods
        mockGameModels.findGameById.mockResolvedValue(mockExistingGame);
        mockGameModels.findImagesByGameId.mockResolvedValue(mockExistingImages);
        mockGameModels.findImageById.mockImplementation((id) => {
            const img = mockExistingImages.find(i => i.Game_Image_id === id);
            return img ? { Game_Image_id: img.Game_Image_id, Path: `game/img/${img.Path}` } : null;
        });
        mockGameModels.updateGame.mockResolvedValue({});
        mockGameModels.deleteImage.mockResolvedValue({});
        mockGameModels.createImage.mockResolvedValue({});
        mockGameModels.updateTags.mockResolvedValue({});

        // Mock FS Methods
        fsPromises.unlink.mockResolvedValue();
        fsPromises.rename.mockResolvedValue();
        fsPromises.writeFile.mockResolvedValue();

        // Mock Request & Response
        req = {
            user: { User_id: 1, Roles: 'Member' },
            params: { id: '101' },
            body: {
                Game_Title: 'Updated Game Title',
                Description: 'New Description',
                Status_Game: 'Released',
                Details: 'Updated details',
                Game_Engin: 'Unity',
                Game_Cover: mockExistingGame.Game_Cover,
                tags: ['Adventure', 'Other'],
                'delete_images[]': []
            },
            files: {
                cover_image: [],
                file_game: [],
                images: []
            }
        };

        res = {};
        res.status = jest.fn(() => res);
        res.json = jest.fn(() => res);
    });

    // --------------------------
    // 5.2 afterEach
    // --------------------------
    afterEach(() => {
        consoleErrorSpy.mockRestore();
        mockDateNow.mockRestore();
    });

    // --------------------------
    // 6. Happy Path & Core Logic Tests
    // --------------------------
    test('E1: should update game metadata successfully (no file changes) and return 200 status', async () => {
        await gameController.postUpdateGame(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: "แก้ไขเกมสำเร็จ"
        }));
        expect(mockGameModels.updateGame).toHaveBeenCalledTimes(1);
    });

    // --------------------------
    // 7. File Update & Deletion Tests
    // --------------------------
    test('F1: should update game file successfully and delete the old file', async () => {
        req.files.file_game = [mockNewGameFile];
        const expectedNewFilename = `${mockDateNow()}_${mockNewGameFile.originalname}`;

        await gameController.postUpdateGame(req, res);

        expect(mockGameModels.updateGame).toHaveBeenCalledWith(101, expect.objectContaining({
            File_Game: expectedNewFilename
        }));
        expect(fsPromises.unlink).toHaveBeenCalledWith(expect.stringContaining(mockExistingGame.File_Game));
        expect(fsPromises.rename).toHaveBeenCalledWith(
            mockNewGameFile.path,
            expect.stringContaining(expectedNewFilename)
        );
    });

    test('F2: should delete specified images and add new image(s)', async () => {
        req.body['delete_images[]'] = [1];
        req.files.images = [mockNewImage];
        const expectedNewImageName = `${mockDateNow()}_${mockNewImage.name}`;

        await gameController.postUpdateGame(req, res);

        expect(mockGameModels.deleteImage).toHaveBeenCalledWith(1);
        expect(mockGameModels.createImage).toHaveBeenCalledWith(expect.objectContaining({
            url: expectedNewImageName,
            game_id: 101
        }));
        expect(fsPromises.unlink).toHaveBeenCalledWith(expect.stringContaining(mockExistingImages[0].Path));
        expect(fsPromises.writeFile).toHaveBeenCalledWith(expect.stringContaining(expectedNewImageName), mockNewImage.data);
    });

    // --------------------------
    // 8. Error Handling & Rollback Tests
    // --------------------------
    test('G1: should return 500 if updateGame fails (DB Error)', async () => {
        req.files.file_game = [mockNewGameFile];
        mockGameModels.updateGame.mockRejectedValue(new Error('Update DB failed'));

        await gameController.postUpdateGame(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(fsPromises.unlink).toHaveBeenCalledWith(expect.stringContaining(mockExistingGame.File_Game));
        expect(fsPromises.rename).toHaveBeenCalledTimes(1);
    });

    test('G2: should return 500 if createImage fails (DB Error)', async () => {
        req.files.images = [mockNewImage];
        mockGameModels.createImage.mockRejectedValue(new Error('Image DB write failed'));

        await gameController.postUpdateGame(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(fsPromises.writeFile).toHaveBeenCalledTimes(1);
        expect(fsPromises.unlink).not.toHaveBeenCalled();
    });

    // --------------------------
    // 9. Validation & Access Control
    // --------------------------
    test('H1: should return 404 if game is not found', async () => {
        mockGameModels.findGameById.mockResolvedValue(null);

        await gameController.postUpdateGame(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(mockGameModels.updateGame).not.toHaveBeenCalled();
    });

    test('H2: should return 403 if user does not own the game', async () => {
        mockGameModels.findGameById.mockResolvedValue({ ...mockExistingGame, User_id: 2 });

        await gameController.postUpdateGame(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(mockGameModels.updateGame).not.toHaveBeenCalled();
    });
});
