const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const Model = {

    getUser: (username, callback) => {
        const sql = "SELECT * FROM Account WHERE User_id=?";
        db.query(sql, [username], (err, results) => {
            if (err) return callback(err);
            callback(null, results[0]);
        });
    },

    postRegister: (username, password, callback) => {
        const id = uuidv4();
        const sql = "INSERT INTO Account (id, User_Name, Email, Password) VALUES (?, ?, ?, ?)";
        db.query(sql, [id, username, Email, password], (err, result) => {
            if (err) return callback(err);
            callback(null, result);
        });
    },

    postLogin: (username, password, callback) => {
        const sql = "SELECT * FROM Account WHERE User_Name=? AND Password=?";
        db.query(sql, [username, password], (err, results) => {
            if (err) return callback(err);
            callback(null, results[0]);
        });
    },
    postUpload: (fileData, callback) => {
        const id = uuidv4();
        const sql = "INSERT INTO Game_Data (Game_id ,Game_Name, Description, Game_Image, File_Game, Status_Game, Log_Game) VALUES (?, ?, ?, ?, ?, ?, ?)";
        db.query(sql, [id, Game_Name, Description, Game_Image, File_Game, Status_Game, Log_Game], (err, result) => {
            if (err) return callback(err);
            callback(null, result);
        });
    }
};

module.exports = Model;
