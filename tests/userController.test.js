const userController = require('../controllers/userControllers');
const userModels = require('../models/userModels');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs').promises; // ใช้ fs.promises ตามที่ controller require 'fs' และใช้ await fs.promises.unlink()

// ====================================================================
// Mock Dependencies
// ====================================================================

// Mock userModels
jest.mock('../models/userModels', () => ({
    findByUserID: jest.fn(),
    findByUsername: jest.fn(),
    create: jest.fn(),
    addProfileImage: jest.fn(),
    updateUser: jest.fn(),
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
}));

// Mock path and fs (สำหรับการลบรูปโปรไฟล์)
jest.mock('path', () => ({
    join: jest.fn((...args) => args.join('/')), // Mock join ให้ใช้งานได้ง่าย
}));

jest.mock('fs', () => ({
    promises: {
        unlink: jest.fn(),
    }
}));


// ====================================================================
// Mock Express Objects and Data
// ====================================================================

const mockRes = () => {
    const res = {};
    // Mock status/json/render/redirect/send/flash
    res.status = jest.fn().mockReturnThis();
    res.json = jest.fn().mockReturnThis();
    res.render = jest.fn().mockReturnThis();
    res.redirect = jest.fn().mockReturnThis();
    res.send = jest.fn().mockReturnThis();
    return res;
};

const mockUser = {
    User_id: 1,
    User_Name: 'testuser',
    Roles: 'User',
    Email: 'test@example.com',
    Hashed_Password: 'hashedpassword',
    Profile_Image_Path: '/user/img/profile.jpg'
};

const mockUserDefaultImage = {
    ...mockUser,
    Profile_Image_Path: '/user/img/user_default.jpg'
};

// ====================================================================
// Start Unit Test
// ====================================================================

describe('User Controller', () => {
    let req;
    let res;
    let consoleErrorSpy;
    let consoleWarnSpy;

    beforeEach(() => {
        res = mockRes();
        req = {
            // Default req setup
            body: {},
            params: {},
            query: {},
            user: null,
            session: { destroy: jest.fn(cb => cb()), user: null },
            flash: jest.fn(),
            file: undefined, // สำหรับ Multer
        };
        jest.clearAllMocks();
        
        // Mock console error/warn เพื่อป้องกันข้อความรบกวน console ระหว่าง test
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterAll(() => {
        // Restore console spies
        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
    });

    // ----------------------------------------------------------------
    // TEST SECTION: 1️⃣ PUBLIC PAGES
    // ----------------------------------------------------------------

    describe('PUBLIC PAGES', () => {
        test('getLoginPage should render login template', () => {
            userController.getLoginPage(req, res);
            expect(res.render).toHaveBeenCalledWith('login', { error: null, formData: {} });
        });

        test('getRegisterPage should render register template', () => {
            userController.getRegisterPage(req, res);
            expect(res.render).toHaveBeenCalledWith('register', { error: null, formData: {} });
        });

        describe('getViewPage', () => {
            test('should fetch user and render view_user template', async () => {
                // Arrange
                req.params.id = '1';
                userModels.findByUserID.mockResolvedValue(mockUser);

                // Act
                await userController.getViewPage(req, res);

                // Assert
                expect(userModels.findByUserID).toHaveBeenCalledWith(1);
                expect(res.render).toHaveBeenCalledWith('view_user', { user: mockUser });
            });

            test('should return 404 if user not found', async () => {
                // Arrange
                req.params.id = '999';
                userModels.findByUserID.mockResolvedValue(null);

                // Act
                await userController.getViewPage(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(404);
                expect(res.send).toHaveBeenCalledWith("User not found");
                expect(res.render).not.toHaveBeenCalled();
            });

            test('should return 500 on database error', async () => {
                // Arrange
                req.params.id = '1';
                userModels.findByUserID.mockRejectedValue(new Error('DB error'));

                // Act
                await userController.getViewPage(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(500);
                expect(res.send).toHaveBeenCalledWith("Internal Server Error");
            });
        });
    });

    // ----------------------------------------------------------------
    // TEST SECTION: 2️⃣ AUTHENTICATION
    // ----------------------------------------------------------------

    describe('postLogin', () => {
        beforeEach(() => {
            req.body = { username: 'testuser', password: 'correctpassword' };
        });

        test('should redirect to home page on successful login', async () => {
            // Arrange
            const userShort = { User_id: 1, User_Name: 'testuser', Roles: 'User', Hashed_Password: 'hashedpassword' };
            const userFull = mockUser; 
            
            userModels.findByUsername.mockResolvedValue(userShort);
            userModels.findByUserID.mockResolvedValue(userFull); // สำหรับดึงข้อมูลเต็ม
            bcrypt.compare.mockResolvedValue(true);

            // Act
            await userController.postLogin(req, res);

            // Assert
            expect(userModels.findByUsername).toHaveBeenCalledWith('testuser');
            expect(bcrypt.compare).toHaveBeenCalledWith('correctpassword', userShort.Hashed_Password);
            expect(req.session.user).toEqual(userFull); // ตรวจสอบว่าเก็บข้อมูลเต็ม
            expect(req.flash).toHaveBeenCalledWith('success', 'Welcome back, testuser!');
            expect(res.redirect).toHaveBeenCalledWith('/');
        });

        test('should render login page with error if fields are missing', async () => {
            // Arrange
            req.body = { username: 'testuser', password: '' };

            // Act
            await userController.postLogin(req, res);

            // Assert
            expect(res.render).toHaveBeenCalledWith('login', {
                error: 'Please fill in all fields',
                formData: { username: 'testuser' }
            });
            expect(userModels.findByUsername).not.toHaveBeenCalled();
        });

        test('should render login page with error if username not found', async () => {
            // Arrange
            userModels.findByUsername.mockResolvedValue(null);

            // Act
            await userController.postLogin(req, res);

            // Assert
            expect(res.render).toHaveBeenCalledWith('login', {
                error: 'Invalid username or password',
                formData: { username: 'testuser' }
            });
        });

        test('should render login page with error if password incorrect', async () => {
            // Arrange
            userModels.findByUsername.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(false);

            // Act
            await userController.postLogin(req, res);

            // Assert
            expect(res.render).toHaveBeenCalledWith('login', {
                error: 'Invalid username or password',
                formData: { username: 'testuser' }
            });
        });
        
        test('should handle findByUserID failure and use fallback data for session', async () => {
            // Arrange
            const userShort = { User_id: 1, User_Name: 'testuser', Roles: 'User', Hashed_Password: 'hashedpassword' };
            userModels.findByUsername.mockResolvedValue(userShort);
            userModels.findByUserID.mockResolvedValue(null); // Simulate finding user failed
            bcrypt.compare.mockResolvedValue(true);

            // Act
            await userController.postLogin(req, res);

            // Assert
            // Fallback: ใช้ข้อมูลย่อที่มี Roles
            expect(req.session.user).toEqual({
                User_id: userShort.User_id,
                User_Name: userShort.User_Name,
                Roles: userShort.Roles
            });
            expect(res.redirect).toHaveBeenCalledWith('/');
        });
    });

    describe('postRegister', () => {
        beforeEach(() => {
            req.body = {
                username: 'newuser',
                email: 'new@example.com',
                password: 'password123',
                confirm_password: 'password123'
            };
        });

        test('should create new user and redirect to login page', async () => {
            // Arrange
            userModels.findByUsername.mockResolvedValue(null);
            bcrypt.hash.mockResolvedValue('hashed_new_password');
            userModels.create.mockResolvedValue({ User_id: 2, User_Name: 'newuser' });

            // Act
            await userController.postRegister(req, res);

            // Assert
            expect(userModels.findByUsername).toHaveBeenCalledWith('newuser');
            expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
            expect(userModels.create).toHaveBeenCalledWith(expect.objectContaining({
                username: 'newuser',
                email: 'new@example.com',
                password: 'hashed_new_password'
            }));
            // ตรวจสอบการเพิ่มรูป Default
            expect(userModels.addProfileImage).toHaveBeenCalledWith(2, '/user/img/user_default.jpg');
            expect(res.redirect).toHaveBeenCalledWith('/user/login');
        });

        test('should render register page with error if passwords do not match', async () => {
            // Arrange
            req.body.confirm_password = 'wrongpassword';

            // Act
            await userController.postRegister(req, res);

            // Assert
            expect(res.render).toHaveBeenCalledWith('register', {
                error: 'Passwords do not match !!!',
                formData: { username: 'newuser', email: 'new@example.com' }
            });
            expect(userModels.findByUsername).not.toHaveBeenCalled();
        });

        test('should render register page with error if username already exists', async () => {
            // Arrange
            userModels.findByUsername.mockResolvedValue(mockUser);

            // Act
            await userController.postRegister(req, res);

            // Assert
            expect(res.render).toHaveBeenCalledWith('register', {
                error: 'Username already exists !!!',
                formData: { username: 'newuser', email: 'new@example.com' }
            });
            expect(bcrypt.hash).not.toHaveBeenCalled();
        });
    });

    // ----------------------------------------------------------------
    // TEST SECTION: 3️⃣ USER PROFILE
    // ----------------------------------------------------------------

    describe('getEditProfilePage', () => {
        test('should redirect to login if not logged in', async () => {
            // Arrange: req.session.user = null (Default)

            // Act
            await userController.getEditProfilePage(req, res);

            // Assert
            expect(res.redirect).toHaveBeenCalledWith('/user/login');
        });

        test('should fetch user data and render edit_profile template', async () => {
            // Arrange
            req.session.user = { User_id: 1 };
            userModels.findByUserID.mockResolvedValue(mockUser);

            // Act
            await userController.getEditProfilePage(req, res);

            // Assert
            expect(userModels.findByUserID).toHaveBeenCalledWith(1);
            expect(res.render).toHaveBeenCalledWith('edit_profile', { user: mockUser });
        });
    });

    describe('postEditProfile', () => {
        const userId = 1;
        
        beforeEach(() => {
            req.session.user = { User_id: userId };
            req.body.User_Name = 'updatedname';
        });

        test('should update only username and redirect to view page', async () => {
            // Arrange
            // [FIX] สร้าง user object ที่มีชื่อถูกอัปเดตสำหรับ mock การดึงข้อมูลล่าสุดเพื่อ refresh session
            const updatedUser = { 
                ...mockUser, 
                User_Name: 'updatedname' 
            };
            userModels.findByUserID.mockResolvedValue(updatedUser); 
            req.file = undefined; // ไม่มีไฟล์ใหม่

            // Act
            await userController.postEditProfile(req, res);

            // Assert
            expect(userModels.updateUser).toHaveBeenCalledWith(userId, { User_Name: 'updatedname' });
            expect(userModels.addProfileImage).not.toHaveBeenCalled();
            expect(fs.unlink).not.toHaveBeenCalled();
            expect(req.flash).toHaveBeenCalledWith('success', 'Profile name updated successfully!');
            expect(req.session.user.User_Name).toBe('updatedname'); // ตรวจสอบ session update
            expect(res.redirect).toHaveBeenCalledWith(`/user/view/${userId}`);
        });

        test('should update username, new image, and delete old image (if not default)', async () => {
            // Arrange
            req.file = { filename: 'new_image.jpg' };
            const newPath = '/user/img/new_image.jpg';
            // Mock findByUserID ครั้งแรก (ดึงรูปเก่า)
            userModels.findByUserID.mockResolvedValueOnce(mockUser); 
            // Mock findByUserID ครั้งที่สอง (ดึงข้อมูลล่าสุด)
            const updatedUser = { ...mockUser, User_Name: 'updatedname', Profile_Image_Path: newPath };
            userModels.findByUserID.mockResolvedValueOnce(updatedUser); 
            
            // Mock path.join (เพื่อตรวจสอบว่าถูกเรียกถูก)
            path.join.mockReturnValue('path/to/public/user/img/profile.jpg');

            // Act
            await userController.postEditProfile(req, res);

            // Assert
            expect(userModels.updateUser).toHaveBeenCalledTimes(1);
            expect(fs.unlink).toHaveBeenCalledWith('path/to/public/user/img/profile.jpg');
            expect(userModels.addProfileImage).toHaveBeenCalledWith(userId, newPath);
            expect(req.session.user).toEqual(updatedUser);
            expect(res.redirect).toHaveBeenCalledWith(`/user/view/${userId}`);
        });

        test('should update image but NOT delete old image if old image is default', async () => {
            // Arrange
            req.file = { filename: 'new_image.jpg' };
            const newPath = '/user/img/new_image.jpg';
            // Mock findByUserID ครั้งแรก (รูปเก่าเป็น Default)
            userModels.findByUserID.mockResolvedValueOnce(mockUserDefaultImage); 
            // Mock findByUserID ครั้งที่สอง (ดึงข้อมูลล่าสุด)
            const updatedUser = { ...mockUserDefaultImage, User_Name: 'updatedname', Profile_Image_Path: newPath };
            userModels.findByUserID.mockResolvedValueOnce(updatedUser); 

            // Act
            await userController.postEditProfile(req, res);

            // Assert
            expect(fs.unlink).not.toHaveBeenCalled(); // ไม่ควรลบรูป Default
            expect(userModels.addProfileImage).toHaveBeenCalledWith(userId, newPath);
        });
        
        test('should handle file unlink error gracefully (warn, not fail)', async () => {
            // Arrange
            req.file = { filename: 'new_image.jpg' };
            const newPath = '/user/img/new_image.jpg';
            // Mock findByUserID (รูปเก่าไม่ใช่ Default)
            userModels.findByUserID.mockResolvedValueOnce(mockUser); 
            // Mock fs.unlink ให้เกิด Error
            fs.unlink.mockRejectedValue(new Error('File not found on disk')); 
            // Mock findByUserID ครั้งที่สอง (ดึงข้อมูลล่าสุด)
            const updatedUser = { ...mockUser, User_Name: 'updatedname', Profile_Image_Path: newPath };
            userModels.findByUserID.mockResolvedValueOnce(updatedUser); 
            
            // Act
            await userController.postEditProfile(req, res);

            // Assert
            expect(fs.unlink).toHaveBeenCalledTimes(1);
            expect(consoleWarnSpy).toHaveBeenCalled(); // ตรวจสอบว่ามีการเตือน
            expect(userModels.addProfileImage).toHaveBeenCalledWith(userId, newPath); // การอัปเดต DB ยังคงต้องเกิดขึ้น
            expect(res.redirect).toHaveBeenCalledWith(`/user/view/${userId}`); // ยังคง Redirect สำเร็จ
        });
        
        test('should return error if username is empty', async () => {
            // Arrange
            req.body.User_Name = ' '; // Empty name
            req.file = undefined;
            
            // Act
            await userController.postEditProfile(req, res);
            
            // Assert
            expect(userModels.updateUser).not.toHaveBeenCalled();
            expect(req.flash).toHaveBeenCalledWith('error', 'Username cannot be empty.');
            expect(res.redirect).toHaveBeenCalledWith(`/user/edit`);
        });
        
        test('should return 401 and redirect to login if not logged in', async () => {
            // Arrange
            req.session.user = null;
            
            // Act
            await userController.postEditProfile(req, res);
            
            // Assert
            expect(req.flash).toHaveBeenCalledWith('error', 'Please log in to update your profile.');
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.redirect).toHaveBeenCalledWith('/user/login');
        });
    });

    describe('getProfile', () => {
        test('should redirect to login if not logged in', async () => {
            // Arrange: req.session.user = null (Default)

            // Act
            await userController.getProfile(req, res);

            // Assert
            expect(res.redirect).toHaveBeenCalledWith('/user/login');
        });

        test('should fetch user data and render view_profile template', async () => {
            // Arrange
            req.session.user = { User_id: 1 };
            userModels.findByUserID.mockResolvedValue(mockUser);

            // Act
            await userController.getProfile(req, res);

            // Assert
            expect(userModels.findByUserID).toHaveBeenCalledWith(1);
            expect(res.render).toHaveBeenCalledWith('view_profile', { user: mockUser });
        });
    });

    // ----------------------------------------------------------------
    // TEST SECTION: 4️⃣ LOGOUT
    // ----------------------------------------------------------------

    describe('postLogout', () => {
        test('should destroy session and redirect to home page', () => {
            // Act
            userController.postLogout(req, res);

            // Assert
            expect(req.session.destroy).toHaveBeenCalledTimes(1);
            expect(res.redirect).toHaveBeenCalledWith('/');
        });

        test('should return 500 on session destroy error', () => {
            // Arrange
            const destroyError = new Error('Session failed');
            // Mock destroy to call callback with error
            req.session.destroy = jest.fn(cb => cb(destroyError));

            // Act
            userController.postLogout(req, res);

            // Assert
            expect(req.session.destroy).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ err: 'Logout failed' });
        });
    });
});
