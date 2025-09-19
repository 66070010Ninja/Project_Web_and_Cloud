// config/db.js

// Load environment variables from .env file
const mysql = require('mysql2');
const dotenv = require('dotenv');

// Configure dotenv to load variables from .env file
dotenv.config();

// Create a connection db to the MySQL database
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

// Export the db for use in other modules
module.exports = db.promise();
