const gameModels = require('../models/gameModels');
const userModels = require('../models/userModels');

const pageController = {
    getHomePage: async (req, res) => {
        try {
            // Fetch all games
            const games = await gameModels.getAllGames();

            let user = null;
            // Check if a user ID exists in the session
            if (req.session && req.session.userId) {
                // If it exists, fetch the user's data
                user = await userModels.findByUserID(req.session.userId);
            };

            // Render the home page, passing the games and the user (which will be null if not logged in)
            res.render('home', {
                games,
                user
            });
        } catch (error) {
            console.error("Error fetching data for home page:", error);
            res.status(500).send("Internal Server Error");
        }
    },

    getBrowsePage: async (req, res) => {
        try {
            res.render('browse');
        } catch (error) {
            console.log("Error fetching data for browse page:", error);
            res.status(500).send("Internal Server Error");
        };
    },

    getDashboardPage: async (req, res) => {
        try {
            res.render('dashboard');
        } catch (error) {
            console.log("Error fetching data for dashboard page:", error);
            res.status(500).send("Internal Server Error");
        };
    }
};

module.exports = pageController;