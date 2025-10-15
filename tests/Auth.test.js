// tests/Auth.test.js
const userController = require('../controllers/userControllers');
const userModels = require('../models/userModels');
const bcrypt = require('bcrypt');

jest.mock('../models/userModels');
jest.mock('bcrypt');

let req, res, consoleErrorSpy;

// Mock Data
const MOCK_USERNAME = 'NewUser';
const MOCK_EMAIL = 'newuser@example.com';
const MOCK_PASSWORD = 'strongPassword123';
const MOCK_HASHED_PASSWORD = 'hashedPasswordPlaceholder';
const mockFoundUser = {
    User_id: 10,
    User_Name: 'ExistingUser',
    Roles: 'Member',
    Hashed_Password: MOCK_HASHED_PASSWORD
};

beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    req = { body: {}, session: {}, flash: jest.fn() };
    res = {
        render: jest.fn(),
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    };
});

afterEach(() => consoleErrorSpy.mockRestore());

// ---------------------------
// Registration Tests
// ---------------------------
describe('postRegister', () => {
    test('R1: create new user successfully', async () => {
        req.body = { username: MOCK_USERNAME, email: MOCK_EMAIL, password: MOCK_PASSWORD, confirm_password: MOCK_PASSWORD };
        userModels.findByUsername.mockResolvedValue(null);
        bcrypt.hash.mockResolvedValue(MOCK_HASHED_PASSWORD);
        userModels.create.mockResolvedValue({ User_id: 20 });
        userModels.addProfileImage.mockResolvedValue(true);

        await userController.postRegister(req, res);

        expect(userModels.findByUsername).toHaveBeenCalledWith(MOCK_USERNAME);
        expect(bcrypt.hash).toHaveBeenCalledWith(MOCK_PASSWORD, 10);
        expect(userModels.create).toHaveBeenCalledWith({
            username: MOCK_USERNAME,
            email: MOCK_EMAIL,
            password: MOCK_HASHED_PASSWORD
        });
        expect(userModels.addProfileImage).toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith('/user/login');
    });

    test('R2: missing required field', async () => {
        req.body = { username: MOCK_USERNAME, email: MOCK_EMAIL }; // password missing

        await userController.postRegister(req, res);

        expect(res.render).toHaveBeenCalledWith(
            'register',
            expect.objectContaining({
                error: 'Please fill in all fields',
                formData: { username: MOCK_USERNAME, email: MOCK_EMAIL }
            })
        );
    });

    test('R3: username already exists', async () => {
        req.body = { username: MOCK_USERNAME, email: MOCK_EMAIL, password: MOCK_PASSWORD, confirm_password: MOCK_PASSWORD };
        userModels.findByUsername.mockResolvedValue(mockFoundUser);

        await userController.postRegister(req, res);

        expect(res.render).toHaveBeenCalledWith(
            'register',
            expect.objectContaining({
                error: 'Username already exists !!!',
                formData: { username: MOCK_USERNAME, email: MOCK_EMAIL }
            })
        );
    });

    test('R4: DB fails', async () => {
        req.body = { username: MOCK_USERNAME, email: MOCK_EMAIL, password: MOCK_PASSWORD, confirm_password: MOCK_PASSWORD };
        userModels.findByUsername.mockResolvedValue(null);
        bcrypt.hash.mockResolvedValue(MOCK_HASHED_PASSWORD);
        userModels.create.mockRejectedValue(new Error('DB fail'));

        await userController.postRegister(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ err: 'DB fail' });
        expect(consoleErrorSpy).toHaveBeenCalled();
    });
});

// ---------------------------
// Login Tests
// ---------------------------
describe('postLogin', () => {
    test('L1: login success', async () => {
        req.body = { username: MOCK_USERNAME, password: MOCK_PASSWORD };
        userModels.findByUsername.mockResolvedValue(mockFoundUser);
        bcrypt.compare.mockResolvedValue(true);
        userModels.findByUserID.mockResolvedValue(mockFoundUser);

        await userController.postLogin(req, res);

        expect(userModels.findByUsername).toHaveBeenCalledWith(MOCK_USERNAME);
        expect(bcrypt.compare).toHaveBeenCalledWith(MOCK_PASSWORD, MOCK_HASHED_PASSWORD);
        expect(req.session.user).toEqual(mockFoundUser);
        expect(res.redirect).toHaveBeenCalledWith('/');
    });

    test('L2: missing fields', async () => {
        req.body = { username: '', password: '' };

        await userController.postLogin(req, res);

        expect(res.render).toHaveBeenCalledWith(
            'login',
            expect.objectContaining({
                error: 'Please fill in all fields',
                formData: { username: '' }
            })
        );
    });

    test('L3: invalid username', async () => {
        req.body = { username: MOCK_USERNAME, password: MOCK_PASSWORD };
        userModels.findByUsername.mockResolvedValue(null);

        await userController.postLogin(req, res);

        expect(res.render).toHaveBeenCalledWith(
            'login',
            expect.objectContaining({
                error: 'Invalid username or password',
                formData: { username: MOCK_USERNAME }
            })
        );
        expect(req.session.user).toBeUndefined();
    });

    test('L4: password mismatch', async () => {
        req.body = { username: MOCK_USERNAME, password: MOCK_PASSWORD };
        userModels.findByUsername.mockResolvedValue(mockFoundUser);
        bcrypt.compare.mockResolvedValue(false);

        await userController.postLogin(req, res);

        expect(res.render).toHaveBeenCalledWith(
            'login',
            expect.objectContaining({
                error: 'Invalid username or password',
                formData: { username: MOCK_USERNAME }
            })
        );
        expect(req.session.user).toBeUndefined();
    });

    test('L5: internal server error', async () => {
        req.body = { username: MOCK_USERNAME, password: MOCK_PASSWORD };
        userModels.findByUsername.mockRejectedValue(new Error('DB fail'));

        await userController.postLogin(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ err: 'DB fail' });
        expect(consoleErrorSpy).toHaveBeenCalled();
    });
});
