const request = require('supertest');
const express = require('express');

// --- Mocking Dependencies ---

// 1. Mock Controller
const mockGetViewGamePage = jest.fn((req, res) => res.status(200).send('Game Detail Page'));
const mockGetGameReview = jest.fn((req, res) => res.status(200).json({ reviews: [] }));
const mockGetDownloadGame = jest.fn((req, res) => res.status(200).send('Game File Downloaded'));
const mockPostCreateReview = jest.fn((req, res) => res.status(201).send('Review Created'));
const mockGetCreateGamePage = jest.fn((req, res) => res.status(200).send('Create Game Form'));
const mockPostCreateGame = jest.fn((req, res) => res.status(201).send('Game Created'));
const mockGetEditGamePage = jest.fn((req, res) => res.status(200).send('Edit Game Form'));
const mockPostUpdateGame = jest.fn((req, res) => res.status(200).send('Game Updated'));
const mockPostDeleteGame = jest.fn((req, res) => res.status(200).send('Game Deleted'));

jest.mock('../controllers/gameControllers', () => ({
    getViewGamePage: mockGetViewGamePage,
    getGameReview: mockGetGameReview,
    getDownloadGame: mockGetDownloadGame,
    postCreateReview: mockPostCreateReview,
    getCreateGamePage: mockGetCreateGamePage,
    postCreateGame: mockPostCreateGame,
    getEditGamePage: mockGetEditGamePage,
    postUpdateGame: mockPostUpdateGame,
    postDeleteGame: mockPostDeleteGame,
}));

// 2. Mock Middleware (authMiddleware)
const mockIsAuthenticated = jest.fn((req, res, next) => res.status(401).send('Unauthorized'));
const mockRoleMiddleware = jest.fn((req, res, next) => res.status(403).send('Forbidden: Insufficient privileges.'));
const mockIsRole = jest.fn((roles) => mockRoleMiddleware);

jest.mock('../middlewares/authMiddleware', () => ({
    isAuthenticated: mockIsAuthenticated,
    isRole: mockIsRole,
}));

// 3. Mock Middleware (uploadMiddleware)
const mockUploadMiddleware = jest.fn((req, res, next) => {
    req.files = { file_game: [{ originalname: 'game.zip' }], images: [{ originalname: 'img1.png' }] };
    next();
});
const mockUploadFields = jest.fn((fields) => mockUploadMiddleware);

jest.mock('../middlewares/uploadMiddleware', () => ({
    fields: mockUploadFields,
}));

// --- Start Test Suite ---
describe('Game Routes', () => {

    let app;
    let gameRoutes;

    // Helper: Reset all mocks AND reload the router before each test
    beforeEach(() => {
        // 1. Reset Modules (ทำให้ require('..routes/gameRoutes') ในข้อ 3 โหลดไฟล์ใหม่)
        jest.resetModules();

        // 2. Clear call history ของ Wrapper Functions ที่ถูกเรียกทันทีที่ require
        //    (เพื่อให้ประวัติการเรียกของ Test Case ใหม่เริ่มต้นที่ 0)
        mockIsRole.mockClear();
        mockUploadFields.mockClear();

        // 3. Setup Express App AND load the Router
        //    (บรรทัดนี้จะเรียก isRole() และ fields() ทำให้เกิด calls ใหม่ที่ต้องถูกตรวจสอบ)
        app = express();
        gameRoutes = require('../routes/gameRoutes');
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
        app.use('/game', gameRoutes);

        // 4. Clear Controllers, Auth, and Upload execution history to ensure only one call per test
        mockGetViewGamePage.mockClear();
        mockGetGameReview.mockClear();
        mockGetDownloadGame.mockClear();
        mockPostCreateReview.mockClear();
        mockGetCreateGamePage.mockClear();
        mockPostCreateGame.mockClear();
        mockGetEditGamePage.mockClear();
        mockPostUpdateGame.mockClear();
        mockPostDeleteGame.mockClear();
        mockIsAuthenticated.mockClear();
        mockRoleMiddleware.mockClear();
        mockUploadMiddleware.mockClear();
    });

    // --------------------------------------------------------
    // SECTION 1: PUBLIC ACCESS (เปิดให้เข้าถึงได้ทุกคน)
    // --------------------------------------------------------
    describe('SECTION 1: PUBLIC ACCESS', () => {

        test('[GET] /game/view/:id should allow access and call getViewGamePage', async () => {
            const response = await request(app).get('/game/view/123');

            expect(response.statusCode).toBe(200);
            expect(response.text).toBe('Game Detail Page');
            expect(mockGetViewGamePage).toHaveBeenCalledTimes(1);
            expect(mockIsAuthenticated).not.toHaveBeenCalled();
        });

        test('[GET] /game/review/:id should allow access and call getGameReview', async () => {
            const response = await request(app).get('/game/review/123');

            expect(response.statusCode).toBe(200);
            expect(mockGetGameReview).toHaveBeenCalledTimes(1);
        });

        test('[GET] /game/download/:id should allow access and call getDownloadGame', async () => {
            const response = await request(app).get('/game/download/123');

            expect(response.statusCode).toBe(200);
            expect(response.text).toBe('Game File Downloaded');
            expect(mockGetDownloadGame).toHaveBeenCalledTimes(1);
        });
    });

    // --------------------------------------------------------
    // SECTION 2: AUTHENTICATED USERS (ต้องล็อกอิน)
    // --------------------------------------------------------
    describe('SECTION 2: AUTHENTICATED USERS (Login Required)', () => {

        const endpoint = '/game/review/123';

        test('[POST] /game/review/:id should fail with 401 if not authenticated', async () => {
            const response = await request(app).post(endpoint).send({ rating: 5 });

            expect(response.statusCode).toBe(401);
            expect(mockIsAuthenticated).toHaveBeenCalledTimes(1);
            expect(mockPostCreateReview).not.toHaveBeenCalled();
        });

        test('[POST] /game/review/:id should succeed if authenticated', async () => {
            // Mock isAuthenticated ให้ทำงานสำเร็จ
            mockIsAuthenticated.mockImplementationOnce((req, res, next) => next());

            const response = await request(app).post(endpoint).send({ rating: 5 });

            expect(response.statusCode).toBe(201);
            expect(response.text).toBe('Review Created');
            expect(mockIsAuthenticated).toHaveBeenCalledTimes(1);
            expect(mockPostCreateReview).toHaveBeenCalledTimes(1);
        });
    });

    // --------------------------------------------------------
    // SECTION 3: ROLE-BASED ACCESS (เฉพาะ Member/Admin)
    // --------------------------------------------------------
    describe('SECTION 3: ROLE-BASED ACCESS (Member/Admin Only)', () => {

        // --- /game/create ---
        describe('[GET] /game/create', () => {
            const endpoint = '/game/create';
            const roles = ["Member", "Admin"];

            test('should return 401 if not authenticated', async () => {
                const response = await request(app).get(endpoint);
                expect(response.statusCode).toBe(401);
                expect(mockGetCreateGamePage).not.toHaveBeenCalled();
            });

            test('should return 403 if authenticated but wrong role', async () => {
                // Auth success, but mockRoleMiddleware uses its default mock (403)
                mockIsAuthenticated.mockImplementationOnce((req, res, next) => next());

                const response = await request(app).get(endpoint);

                // Assertions for the wrapper and the middleware response
                expect(mockIsRole).toHaveBeenCalledWith(roles); // Check wrapper arguments
                expect(mockRoleMiddleware).toHaveBeenCalledTimes(1); // Check middleware execution
                expect(response.statusCode).toBe(403);
                expect(mockGetCreateGamePage).not.toHaveBeenCalled();
            });

            test('should succeed if authenticated and has correct role', async () => {
                // Mock Auth and Role success
                mockIsAuthenticated.mockImplementationOnce((req, res, next) => next());
                // Bypassing 403 response for this one test
                mockRoleMiddleware.mockImplementationOnce((req, res, next) => next());

                const response = await request(app).get(endpoint);

                // Assertions for the wrapper and the controller execution
                expect(mockIsRole).toHaveBeenCalledWith(roles);
                expect(response.statusCode).toBe(200);
                expect(response.text).toBe('Create Game Form');
                expect(mockGetCreateGamePage).toHaveBeenCalledTimes(1);
            });
        });

        // --- /game/create (POST with upload) ---
        describe('[POST] /game/create', () => {
            const endpoint = '/game/create';
            const roles = ["Member", "Admin"];

            test('should call upload middleware with correct fields', async () => {
                // Mock Auth and Role success
                mockIsAuthenticated.mockImplementationOnce((req, res, next) => next());
                mockRoleMiddleware.mockImplementationOnce((req, res, next) => next());

                // NOTE: supertest's .attach() requires using the correct MIME type for the request 
                // to be processed as multipart/form-data, triggering the upload middleware properly.

                await request(app).post(endpoint)
                    // .attach() is needed for supertest to trigger file upload middleware
                    .attach('file_game', Buffer.from('mock game'), { filename: 'game.zip', contentType: 'application/zip' })
                    .attach('images', Buffer.from('mock image'), { filename: 'img1.png', contentType: 'image/png' })
                    .field('title', 'New Game'); // Send a field to make it a multipart request

                // Check wrapper arguments for isRole
                expect(mockIsRole).toHaveBeenCalledWith(roles);

                // Check wrapper arguments for upload.fields
                expect(mockUploadFields).toHaveBeenCalledWith([
                    { name: "file_game", maxCount: 1 },
                    { name: "images", maxCount: 10 },
                ]);
                // Assert that the upload middleware wrapper was called twice during router initialization
                expect(mockUploadFields).toHaveBeenCalledTimes(3);

                // Check actual execution of upload middleware
                expect(mockUploadMiddleware).toHaveBeenCalledTimes(1);
                expect(mockPostCreateGame).toHaveBeenCalledTimes(1);
            });

            test('should return 403 if authenticated but wrong role', async () => {
                // Auth success, but role fails (default mockRoleMiddleware = 403)
                mockIsAuthenticated.mockImplementationOnce((req, res, next) => next());

                const response = await request(app).post(endpoint).send({ title: 'New Game' });

                expect(mockIsRole).toHaveBeenCalledWith(roles);
                expect(mockRoleMiddleware).toHaveBeenCalledTimes(1);
                expect(response.statusCode).toBe(403);
                expect(mockPostCreateGame).not.toHaveBeenCalled();
            });

            test('should succeed and call postCreateGame (without files)', async () => {
                // Mock Auth and Role success
                mockIsAuthenticated.mockImplementationOnce((req, res, next) => next());
                mockRoleMiddleware.mockImplementationOnce((req, res, next) => next());

                const response = await request(app).post(endpoint)
                    // Must use .send() for JSON/urlencoded body, which is usually not multipart
                    .send({ title: 'New Game' });

                expect(response.statusCode).toBe(201);
                expect(response.text).toBe('Game Created');
                expect(mockIsRole).toHaveBeenCalledWith(roles);
                // Upload middleware is called before the controller
                // The middleware for this route must be fields() which returns mockUploadMiddleware
                expect(mockUploadMiddleware).toHaveBeenCalledTimes(1);
                expect(mockPostCreateGame).toHaveBeenCalledTimes(1);
            });
        });

        // --- /game/edit/:id ---
        describe('Routes with [GET/POST] /game/edit/:id', () => {
            const endpoint = '/game/edit/456';
            const roles = ["Member", "Admin"];

            test('[GET] /game/edit/:id should succeed with correct role', async () => {
                // Mock Auth and Role success
                mockIsAuthenticated.mockImplementationOnce((req, res, next) => next());
                mockRoleMiddleware.mockImplementationOnce((req, res, next) => next());

                const response = await request(app).get(endpoint);

                expect(mockIsRole).toHaveBeenCalledWith(roles);
                expect(response.statusCode).toBe(200);
                expect(response.text).toBe('Edit Game Form');
                expect(mockGetEditGamePage).toHaveBeenCalledTimes(1);
            });

            test('[POST] /game/edit/:id should succeed and call postUpdateGame', async () => {
                // Mock Auth and Role success
                mockIsAuthenticated.mockImplementationOnce((req, res, next) => next());
                mockRoleMiddleware.mockImplementationOnce((req, res, next) => next());

                const response = await request(app).post(endpoint).send({ title: 'Updated' });

                expect(mockIsRole).toHaveBeenCalledWith(roles);
                expect(response.statusCode).toBe(200);
                expect(response.text).toBe('Game Updated');
                expect(mockPostUpdateGame).toHaveBeenCalledTimes(1);
            });

            test('[GET] /game/edit/:id should return 403 if wrong role', async () => {
                // Auth success, but role fails (default mockRoleMiddleware = 403)
                mockIsAuthenticated.mockImplementationOnce((req, res, next) => next());

                const response = await request(app).get(endpoint);

                expect(mockIsRole).toHaveBeenCalledWith(roles);
                expect(response.statusCode).toBe(403);
                expect(mockGetEditGamePage).not.toHaveBeenCalled();
            });
        });

        // --- /game/delete/:id ---
        describe('[POST] /game/delete/:id', () => {
            const endpoint = '/game/delete/789';
            const roles = ["Member", "Admin"];

            test('should succeed and call postDeleteGame', async () => {
                // Mock Auth and Role success
                mockIsAuthenticated.mockImplementationOnce((req, res, next) => next());
                mockRoleMiddleware.mockImplementationOnce((req, res, next) => next());

                // FIX: Sending a dummy body to ensure the request hits the middleware chain properly.
                const response = await request(app).post(endpoint).send({ action: 'delete' });

                // Assertions for wrapper arguments and middleware execution
                expect(mockIsRole).toHaveBeenCalledWith(roles);
                expect(mockUploadFields).toHaveBeenCalledTimes(3); // Retained: Correct for router load
                expect(mockUploadMiddleware).toHaveBeenCalledTimes(1); // Should now pass
                expect(response.statusCode).toBe(200);
                expect(response.text).toBe('Game Deleted');
                expect(mockPostDeleteGame).toHaveBeenCalledTimes(1);
            });

            test('should call upload middleware with correct optional fields', async () => {
                // Mock Auth and Role success 
                mockIsAuthenticated.mockImplementationOnce((req, res, next) => next());
                mockRoleMiddleware.mockImplementationOnce((req, res, next) => next());

                // Sending a body again to ensure all mocks are called consistently
                await request(app).post(endpoint).send({ action: 'delete' });

                // ตรวจสอบว่ามีการเรียก upload.fields ด้วย configuration ที่ถูกต้อง
                expect(mockUploadFields).toHaveBeenCalledWith([
                    { name: "file_game", maxCount: 1 },
                    { name: "images", maxCount: 10 },
                ]);
            });

            test('should return 403 if wrong role', async () => {
                // Auth success, but role fails (default mockRoleMiddleware = 403)
                mockIsAuthenticated.mockImplementationOnce((req, res, next) => next());

                const response = await request(app).post(endpoint).send({});

                expect(mockIsRole).toHaveBeenCalledWith(roles);
                expect(response.statusCode).toBe(403);
                expect(mockPostDeleteGame).not.toHaveBeenCalled();
            });
        });
    });
});