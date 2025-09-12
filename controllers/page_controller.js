const module = require('../models/page_model');

const pageController = {
    getHome: (req, res) => {
        res.send('home');
    },
    getDashboard: (req, res) => {
        res.send('dashboard');
    },
    getProfile: (req, res) => {
        res.send('profile');
    },
    getRegister: (req, res) => {
        res.send('register');
    },
    postRegister: (req, res) => {
        res.send('register');
    },
    getLogin: (req, res) => {
        res.send('login');
    },
    getBrowse: (req, res) => {
        res.send('browse');
    },
    getGameUpload: (req, res) => {
        res.send('game upload');
    },
    postGameUpload: (req, res) => {
        res.send('game upload');
    },
    getGameEdit: (req, res) => {
        res.send('game edit');
    },
    postGameEdit: (req, res) => {
        res.send('game edit');
    },
    getProfileEdit: (req, res) => {
        res.send('profile edit');
    },
    postProfileEdit: (req, res) => {
        res.send('profile edit');
    }
};

module.exports = pageController;
