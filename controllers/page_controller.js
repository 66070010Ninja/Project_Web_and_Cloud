// controllers/page_controller.js
const controllers = {
    // Home route
    getHome: (req, res) => {
        res.send('home');
    },

    // Dashboard route
    getDashboard: (req, res) => {
        res.send('dashboard');
    },

    // Profile route
    getProfile: (req, res) => {
        res.send('profile');
    },

    // Register route
    getRegister: (req, res) => {
        res.send('register');
    },
    postRegister: (req, res) => {
        res.send('register');
    },

    // Login route
    getLogin: (req, res) => {
        res.send('login');
    },

    // Browse route
    getBrowse: (req, res) => {
        res.send('browse');
    },

    // Game upload route
    getGameUpload: (req, res) => {
        res.send('game upload');
    },
    postGameUpload: (req, res) => {
        res.send('game upload');
    },

    // Game edit route
    getGameEdit: (req, res) => {
        res.send('game edit');
    },
    postGameEdit: (req, res) => {
        res.send('game edit');
    },

    // Profile edit route
    getProfileEdit: (req, res) => {
        res.send('profile edit');
    },
    postProfileEdit: (req, res) => {
        res.send('profile edit');
    }
};

// Export the controllers
module.exports = controllers;
