const gameModels = require('../models/gameModels');
const userModels = require('../models/userModels');

const pageController = {
    getHomePage: async (req, res) => {
        try {
            // Fetch all games
            const games = await gameModels.getAllGames();
            const gamesWithImages = await Promise.all(
                games.map(async (game) => {
                    const images = await gameModels.findImagesByGameId(game.Game_id);

                    return {
                        ...game,
                        images: images.length > 0
                            ? images.map(img => img.Path)  // ใช้ Path จาก model ที่ให้มา
                            : [game.Game_Cover]            // fallback ถ้าไม่มีรูป
                    };
                })
            );


            let user = null;
            // Check if a user ID exists in the session
            if (req.session && req.session.userId) {
                // If it exists, fetch the user's data
                user = await userModels.findByUserID(req.session.userId);
            };

            // Render the home page, passing the games and the user (which will be null if not logged in)
            res.render('home', {
                games: gamesWithImages,
                user
            });
        } catch (error) {
            console.error("Error fetching data for home page:", error);
            res.status(500).send("Internal Server Error");
        }
    },

    getBrowsePage: async (req, res) => {
        try {
            // Fetch all games
            const games = await gameModels.getAllGames();
            const gamesWithImages = await Promise.all(
                games.map(async (game) => {
                    const images = await gameModels.findImagesByGameId(game.Game_id);

                    return {
                        ...game,
                        images: images.length > 0
                            ? images.map(img => img.Path)  // ใช้ Path จาก model ที่ให้มา
                            : [game.Game_Cover]            // fallback ถ้าไม่มีรูป
                    };
                })
            );

            let user = null;
            // Check if a user ID exists in the session
            if (req.session && req.session.userId) {
                // If it exists, fetch the user's data
                user = await userModels.findByUserID(req.session.userId);
            };

            res.render('browse', {
                games: gamesWithImages,
                user
            });
        } catch (error) {
            console.log("Error fetching data for browse page:", error);
            res.status(500).send("Internal Server Error");
        };
    },

    getDashboardPage: async (req, res) => {
        try {
            // Fetch all games
            const games = await gameModels.getAllGames();
            const gamesWithImages = await Promise.all(
                games.map(async (game) => {
                    const images = await gameModels.findImagesByGameId(game.Game_id);

                    return {
                        ...game,
                        images: images.length > 0
                            ? images.map(img => img.Path)  // ใช้ Path จาก model ที่ให้มา
                            : [game.Game_Cover]            // fallback ถ้าไม่มีรูป
                    };
                })
            );

            let user = null;
            // Check if a user ID exists in the session
            if (req.session && req.session.userId) {
                // If it exists, fetch the user's data
                user = await userModels.findByUserID(req.session.userId);
            };
            res.render('dashboard', {
                games: gamesWithImages,
                user
            });
        } catch (error) {
            console.log("Error fetching data for dashboard page:", error);
            res.status(500).send("Internal Server Error");
        };
    }
};

module.exports = pageController;