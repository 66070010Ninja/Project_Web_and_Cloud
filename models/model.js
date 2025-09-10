const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const Model = {

    getUser: (username, callback) => {
        const sql = "SELECT * FROM users WHERE username=?";
        db.query(sql, [username], (err, results) => {
            if (err) return callback(err);
            callback(null, results[0]);
        });
    },

    postRegister: (username, password, callback) => {
        const id = uuidv4();
        const sql = "INSERT INTO users (id, username, password) VALUES (?, ?, ?)";
        db.query(sql, [id, username, password], (err, result) => {
            if (err) return callback(err);
            callback(null, result);
        });
    },

    postLogin: (username, password, callback) => {
        const sql = "SELECT * FROM users WHERE username=? AND password=?";
        db.query(sql, [username, password], (err, results) => {
            if (err) return callback(err);
            callback(null, results[0]);
        });
    },
    postUpload: (fileData, callback) => {
        const id = uuidv4();
        const sql = "INSERT INTO files (id, filename, filepath) VALUES (?, ?, ?)";
        db.query(sql, [id, fileData.filename, fileData.filepath], (err, result) => {
            if (err) return callback(err);
            callback(null, result);
        });
    }
};

module.exports = Model;
