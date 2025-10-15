const userController = require('../controllers/userControllers');

// Mock Dependencies
jest.mock('../models/userModels', () => ({
    // 💡 ใช้ findByUserID ตาม controller จริง
    findByUserID: jest.fn(), 
}));

const mockUserModels = require('../models/userModels');

// Mock Data
const MOCK_USER_ID = 1;
const MOCK_USER_DATA = {
    User_id: MOCK_USER_ID,
    Username: 'TestUser',
    Email: 'test@example.com',
    Bio: 'A test profile.',
    Profile_Picture: 'avatar.png'
};

// ----------------------------------------------------------------
// Mock Setup
// ----------------------------------------------------------------
describe('getProfile (View/Edit Profile Access)', () => {
    let req, res;
    let consoleErrorSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const mockRes = {};
        mockRes.render = jest.fn();
        mockRes.redirect = jest.fn();
        mockRes.status = jest.fn(() => mockRes);
        mockRes.send = jest.fn();
        res = mockRes;

        req = {
            user: { User_id: MOCK_USER_ID },
            session: { user: { User_id: MOCK_USER_ID } },
            params: { userId: MOCK_USER_ID.toString() } // ไม่สำคัญ controller จะใช้ session.user
        };

        mockUserModels.findByUserID.mockResolvedValue(MOCK_USER_DATA);
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    // ----------------------------------------------------------------
    // P. Profile View Success
    // ----------------------------------------------------------------

    test('P1: should render profile page successfully when viewing OWN profile', async () => {
        await userController.getProfile(req, res);

        expect(mockUserModels.findByUserID).toHaveBeenCalledWith(MOCK_USER_ID);
        expect(res.render).toHaveBeenCalledWith('view_profile', expect.objectContaining({
            user: MOCK_USER_DATA
        }));
        expect(res.redirect).not.toHaveBeenCalled();
    });

    test('P2: should render profile page successfully when viewing ANOTHER user\'s profile', async () => {
        const ANOTHER_USER_ID = 99;
        const ANOTHER_USER_DATA = { ...MOCK_USER_DATA, User_id: ANOTHER_USER_ID, Username: 'AnotherUser' };

        req.session.user.User_id = ANOTHER_USER_ID;
        mockUserModels.findByUserID.mockResolvedValue(ANOTHER_USER_DATA);

        await userController.getProfile(req, res);

        expect(mockUserModels.findByUserID).toHaveBeenCalledWith(ANOTHER_USER_ID);
        expect(res.render).toHaveBeenCalledWith('view_profile', expect.objectContaining({
            user: ANOTHER_USER_DATA
        }));
        expect(res.redirect).not.toHaveBeenCalled();
    });

    // ----------------------------------------------------------------
    // E. Error Handling & Access Control
    // ----------------------------------------------------------------

    test('E1: should redirect to login if user is not logged in', async () => {
        req.session.user = null;

        await userController.getProfile(req, res);

        expect(res.redirect).toHaveBeenCalledWith('/user/login');
        expect(mockUserModels.findByUserID).not.toHaveBeenCalled();
        expect(res.render).not.toHaveBeenCalled();
    });

    test('E2: should return 404 if the requested user profile is not found', async () => {
        mockUserModels.findByUserID.mockResolvedValue(null);

        await userController.getProfile(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith('User not found');
        expect(res.render).not.toHaveBeenCalled();
    });

    test('E3: should return 500 if DB fetching fails', async () => {
        mockUserModels.findByUserID.mockRejectedValue(new Error('DB connection failed'));

        await userController.getProfile(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith('Server Error');
        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(res.render).not.toHaveBeenCalled();
    });
});
