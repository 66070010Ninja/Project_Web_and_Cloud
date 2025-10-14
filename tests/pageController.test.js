// __tests__/pageController.test.js

const pageController = require('../controllers/pageControllers');
const gameModels = require('../models/gameModels');

// 1. Mock Express Objects
const mockRes = () => {
    const res = {};
    // Mock status/json/render/redirect/send
    res.status = jest.fn().mockReturnThis();
    res.json = jest.fn().mockReturnThis();
    res.render = jest.fn().mockReturnThis();
    res.redirect = jest.fn().mockReturnThis();
    res.send = jest.fn().mockReturnThis();
    return res;
};

// 2. Mock gameModels ทั้งหมด
jest.mock('../models/gameModels', () => ({
    getAllGames: jest.fn(),
    getGamesByUserId: jest.fn(),
    getFilteredGames: jest.fn(),
    findImagesByGameId: jest.fn(),
    // findImagesByGameId ถูกเรียกใช้ใน attachGameImages Helper
}));

// --------------------------
// ข้อมูล Mock ทั่วไป
// --------------------------
const mockGames = [
    { Game_id: 1, Game_Title: 'Game A', Game_Cover: '/img/default_a.jpg', tags: [] },
    { Game_id: 2, Game_Title: 'Game B', Game_Cover: '/img/default_b.jpg', tags: [] },
];

const mockImagesGame1 = [
    { Path: '/game/img/img1-1.jpg', Game_Image_id: 101 },
    { Path: '/game/img/img1-2.jpg', Game_Image_id: 102 },
];

const mockImagesGame2 = [
    { Path: '/game/img/img2-1.jpg', Game_Image_id: 201 },
];

// --------------------------
// เริ่ม Unit Test
// --------------------------

describe('Page Controller', () => {
    let req;
    let res;

    beforeEach(() => {
        res = mockRes();
        req = { user: null, query: {} }; // Default req
        jest.clearAllMocks();

        // ตั้งค่า Mock Default: Game A มี 2 รูป, Game B มี 1 รูป
        gameModels.findImagesByGameId.mockImplementation(async (gameId) => {
            if (gameId === 1) return mockImagesGame1;
            if (gameId === 2) return mockImagesGame2;
            return []; // เกมอื่นไม่มีรูป
        });
    });

    // ----------------------------------------------------------------
    // TEST SECTION: Helper Function (attachGameImages)
    // * แม้จะเป็น Helper แต่ควรทดสอบ Logic ที่สำคัญนี้โดยอ้อมด้วยการ Mock
    // ----------------------------------------------------------------

    describe('Helper Logic: attachGameImages', () => {
        test('should attach images property to each game object correctly', async () => {
            // Act: รันฟังก์ชัน controller หลัก (getHomePage)
            gameModels.getAllGames.mockResolvedValue(mockGames);
            await pageController.getHomePage(req, res);

            // Assert: ตรวจสอบผลลัพธ์ที่ส่งไป render
            const renderData = res.render.mock.calls[0][1];
            const gamesWithImages = renderData.games;

            expect(gamesWithImages).toHaveLength(2);

            // Game 1: ควรมี 2 รูป
            expect(gamesWithImages[0].Game_id).toBe(1);
            expect(gamesWithImages[0].images).toEqual([
                '/game/img/img1-1.jpg',
                '/game/img/img1-2.jpg',
            ]);

            // Game 2: ควรมี 1 รูป
            expect(gamesWithImages[1].Game_id).toBe(2);
            expect(gamesWithImages[1].images).toEqual([
                '/game/img/img2-1.jpg',
            ]);

            // ตรวจสอบว่า findImagesByGameId ถูกเรียกสำหรับทุกเกม
            expect(gameModels.findImagesByGameId).toHaveBeenCalledWith(1);
            expect(gameModels.findImagesByGameId).toHaveBeenCalledWith(2);
        });

        test('should use Game_Cover as fallback if findImagesByGameId returns empty array', async () => {
            // Arrange: Mock ให้ Game_id 3 ไม่มีรูปเลย
            const mockGamesFallback = [
                { Game_id: 3, Game_Title: 'Game C', Game_Cover: '/img/fallback_c.jpg', tags: [] },
            ];
            gameModels.getAllGames.mockResolvedValue(mockGamesFallback);
            gameModels.findImagesByGameId.mockResolvedValue([]); // Mock ทั่วไปให้คืนค่าว่าง

            // Act
            await pageController.getHomePage(req, res);

            // Assert
            const renderData = res.render.mock.calls[0][1];
            const gamesWithImages = renderData.games;

            // Game 3: ควรใช้ Game_Cover เป็น Array
            expect(gamesWithImages[0].images).toEqual(['/img/fallback_c.jpg']);
        });
    });

    // ----------------------------------------------------------------
    // TEST SECTION: 1️⃣ getHomePage
    // ----------------------------------------------------------------

    describe('getHomePage', () => {
        test('should fetch all games and render home template with data', async () => {
            // Arrange
            gameModels.getAllGames.mockResolvedValue(mockGames);
            req.user = { User_id: 99, Username: 'testuser' };

            // Act
            await pageController.getHomePage(req, res);

            // Assert
            expect(gameModels.getAllGames).toHaveBeenCalledTimes(1);
            expect(res.render).toHaveBeenCalledTimes(1);
            expect(res.render).toHaveBeenCalledWith('home', {
                games: expect.any(Array), // ตรวจสอบว่ามีข้อมูลเกม
                user: req.user
            });

            // ตรวจสอบว่า games มี property images แล้ว
            const renderedGames = res.render.mock.calls[0][1].games;
            expect(renderedGames[0].images).toBeDefined();
        });

        test('should handle database error and return 500 status', async () => {
            // Arrange
            const dbError = new Error('DB failed');
            gameModels.getAllGames.mockRejectedValue(dbError);
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

            // Act
            await pageController.getHomePage(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith("Internal Server Error");
            expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching data for home page:", dbError);

            consoleErrorSpy.mockRestore();
        });
    });

    // ----------------------------------------------------------------
    // TEST SECTION: 2️⃣ getBrowsePage
    // ----------------------------------------------------------------

    describe('getBrowsePage', () => {
        test('should fetch all games and render browse template with default filters', async () => {
            // Arrange
            gameModels.getAllGames.mockResolvedValue(mockGames);

            // Act
            await pageController.getBrowsePage(req, res);

            // Assert
            expect(gameModels.getAllGames).toHaveBeenCalledTimes(1);
            expect(res.render).toHaveBeenCalledWith('browse', {
                games: expect.any(Array),
                user: null,
                selectedTags: [],      // Default
                query: '',             // Default
                sortOrder: 'newest'    // Default
            });
        });
    });

    // ----------------------------------------------------------------
    // TEST SECTION: 3️⃣ getDashboardPage
    // ----------------------------------------------------------------

    describe('getDashboardPage', () => {
        const mockUser = { User_id: 999, Roles: 'Developer' };

        test('should redirect to login if user is not logged in', async () => {
            // Arrange: req.user = null (Default)

            // Act
            await pageController.getDashboardPage(req, res);

            // Assert
            expect(res.redirect).toHaveBeenCalledWith('/user/login');
            expect(gameModels.getGamesByUserId).not.toHaveBeenCalled();
        });

        test('should fetch user\'s games and render dashboard template', async () => {
            // Arrange
            req.user = mockUser;
            gameModels.getGamesByUserId.mockResolvedValue(mockGames);

            // Act
            await pageController.getDashboardPage(req, res);

            // Assert
            expect(gameModels.getGamesByUserId).toHaveBeenCalledWith(999);
            expect(res.render).toHaveBeenCalledWith('dashboard', {
                games: expect.any(Array),
                user: mockUser
            });

            // ตรวจสอบว่า Games ถูก attach images แล้ว
            const renderedGames = res.render.mock.calls[0][1].games;
            expect(renderedGames[0].images).toEqual(mockImagesGame1.map(img => img.Path));
        });
    });

    // ----------------------------------------------------------------
    // TEST SECTION: 4️⃣ searchGames (Filter/Sort)
    // ----------------------------------------------------------------

    describe('searchGames', () => {

        test('should call getFilteredGames with empty/default parameters and render browse page', async () => {
            // Arrange: req.query = {} (Default)
            gameModels.getFilteredGames.mockResolvedValue(mockGames);

            // Act
            await pageController.searchGames(req, res);

            // Assert
            // 1. ตรวจสอบการเรียก Model ด้วยค่า default: (query=undefined, tags=[], sortOrder='newest')
            expect(gameModels.getFilteredGames).toHaveBeenCalledWith(
                undefined,
                [],
                'newest'
            );

            // 2. ตรวจสอบการ Render ด้วยค่า default
            expect(res.render).toHaveBeenCalledWith('browse', {
                games: expect.any(Array),
                user: null,
                selectedTags: [],
                query: '',
                sortOrder: 'newest'
            });
        });

        test('should call getFilteredGames with specific query, tags, and sortOrder', async () => {
            // Arrange
            req.query = {
                query: 'space',
                tags: 'Action,Puzzle,Card_Game',
                sortOrder: 'most_downloaded'
            };
            const filteredMockGames = [{ Game_id: 1, Game_Title: 'Space Shooter', Game_Cover: '/img/space.jpg', tags: [] }];
            gameModels.getFilteredGames.mockResolvedValue(filteredMockGames);

            // Mock images for Game 1 (used in helper function)
            gameModels.findImagesByGameId.mockResolvedValue([{ Path: '/game/img/space_cover.jpg' }]);


            // Act
            await pageController.searchGames(req, res);

            // Assert
            const expectedTags = ['Action', 'Puzzle', 'Card_Game'];

            // 1. ตรวจสอบการเรียก Model ด้วยค่าที่ส่งมา
            expect(gameModels.getFilteredGames).toHaveBeenCalledWith(
                'space',
                expectedTags,
                'most_downloaded'
            );

            // 2. ตรวจสอบการ Render ด้วยค่าที่ส่งมา
            expect(res.render).toHaveBeenCalledWith('browse', {
                games: expect.any(Array),
                user: null,
                selectedTags: expectedTags,
                query: 'space',
                sortOrder: 'most_downloaded'
            });

            // 3. ตรวจสอบว่า Games ที่ถูก Render มีภาพ
            const renderedGames = res.render.mock.calls[0][1].games;
            expect(renderedGames[0].images).toEqual(['/game/img/space_cover.jpg']);
        });

        test('should correctly handle tags parameter as a single tag string', async () => {
            // Arrange
            req.query = { tags: 'Racing' };
            gameModels.getFilteredGames.mockResolvedValue(mockGames);

            // Act
            await pageController.searchGames(req, res);

            // Assert
            expect(gameModels.getFilteredGames).toHaveBeenCalledWith(
                undefined,
                ['Racing'],
                'newest'
            );
            expect(res.render).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    selectedTags: ['Racing'],
                })
            );
        });

        test('should handle database error and return 500 status', async () => {
            // Arrange
            gameModels.getFilteredGames.mockRejectedValue(new Error('Search DB failed'));
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

            // Act
            await pageController.searchGames(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith("Internal Server Error");
            consoleErrorSpy.mockRestore();
        });
    });
});
