const module = require('../models/model');

const controllers = {
    getHome: (req, res) => {
        res.render('index');
    },

    getDashboard: (req, res) => {
        res.render('dashboard', { user: req.session.user });
    },

    getProfile: (req, res) => {
        module.getUser(req.session.user.username, (err, user) => {
            if (err) return res.send("Error!");
            res.render('profile', { user });
        });
    },

    getRegister: (req, res) => {
        res.render('register');
    },

    postRegister: (req, res) => {
        module.postRegister(req.body.username, req.body.password, (err, result) => {
            if (err) return res.send("Error!");
            res.redirect('/login');
        });
    },

    getLogin: (req, res) => {
        res.render('login');
    },
    postLogin: (req, res) => {
        module.postLogin(req.body.username, req.body.password, (err, user) => {
            if (err) return res.send("Error!");
            if (!user) return res.send("Invalid credentials");
            req.session.user = user;
            res.redirect('/dashboard');
        });
    },

    getBrowse : (req, res) => {
        res.render('browse');
    },

    getUpload: (req, res) => {
        res.render('upload');
    },
    postUpload: (req, res) => {
        module.postUpload(req.body, (err, result) => {
            if (err) return res.send("Error!");
            res.send("File uploaded!");
        });
    },

    getEdit: (req, res) => {
        res.render('edit');
    },

    getDevLogs: (req, res) => {
        res.render('devlogs');
    }
};

module.exports = controllers;
