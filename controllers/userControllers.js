// controllers/userControllers.js

// Import necessary modules
const userModels = require('../models/userModels');
const bcrypt = require('bcrypt');

// Controller functions
const userController = {

    //get page login
    getLoginPage: (req, res) => {
        res.render('login', { error: null });
    },

    // get page register
    getRegisterPage: (req, res) => {
        res.render('register', { error: null });
    },

    // login
    postLogin: async (req, res) => {
        try {
            const { username, password } = req.body;

            const user = await userModels.findByUsername(username);
            if (!user) {
                return res.render('login', { error: 'Invalid username or password' });
            }

            const isMatch = await bcrypt.compare(password, user.Hashed_Password);
            if (!isMatch) {
                return res.render('login', { error: 'Invalid username or password' })
            }

            // login succcess
            res.send(`Welcome ${user.User_Name}, login success!`);
        }
        catch (error) {
            res.status(500).json({ err: error.message });
        }
    },

    // register
    postRegister: async (req, res) => {
        try {
            const { username, email, password, confirm_password } = req.body;

            if (password !== confirm_password) {
                return res.render('register', { error: 'Passwords do not match !!!' });
            }

            const existingUser = await userModels.findByUsername(username);
            if (existingUser) {
                return res.render('register', { error: 'Username already exists !!!' });
            }

            const hashedpassword = await bcrypt.hash(password, 10);

            await userModels.create({
                username,
                email,
                password: hashedpassword
            })

            res.redirect('/user/login');
        }
        catch (error) {
            res.status(500).json({ err: error.message });
        }
    },
};

// Export the controller
module.exports = userController;
