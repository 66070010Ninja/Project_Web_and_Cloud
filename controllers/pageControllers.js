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
            const games = await gameModels.getAllGames();
            const gamesWithImages = await Promise.all(
                games.map(async (game) => {
                    const images = await gameModels.findImagesByGameId(game.Game_id);
                    return {
                        ...game,
                        images: images.length > 0 ? images.map(img => img.Path) : [game.Game_Cover]
                    };
                })
            );

            let user = null;
            if (req.session && req.session.userId) {
                user = await userModels.findByUserID(req.session.userId);
            }

            // 🔹 ส่งค่า default เพื่อป้องกัน ReferenceError
            res.render('browse', {
                games: gamesWithImages,
                user,
                selectedTags: [],   // array ว่าง
                query: '',          // string ว่าง
                sortOrder: 'newest' // default sort
            });

        } catch (error) {
            console.log("Error fetching data for browse page:", error);
            res.status(500).send("Internal Server Error");
        };
    },

    getDashboardPage: async (req, res) => {
        try {
            if (!req.session || !req.session.userId) {
                return res.redirect('/user/login'); // ถ้าไม่ล็อกอิน ให้ไปหน้า login
            }

            const userId = req.session.userId;

            // Fetch all games
            const games = await gameModels.getGamesByUserId(userId);
            const gamesWithImages = await Promise.all(
                games.map(async (game) => {
                    const images = await gameModels.findImagesByGameId(game.Game_id);

                    return {
                        ...game,
                        images: images.length > 0
                            ? images.map(img => img.Path)
                            : [game.Game_Cover]
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
    },

    searchGames: async (req, res) => {
        try {
            const { query, tags } = req.query;
            const tagArray = tags ? tags.split(',') : [];

            let allGames = await gameModels.getAllGames();

            // Filter by query
            if (query) {
                allGames = allGames.filter(game =>
                    game.Game_Title.toLowerCase().includes(query.toLowerCase()) ||
                    (game.Description && game.Description.toLowerCase().includes(query.toLowerCase()))
                );
            }

            // Filter by tags
            if (tagArray.length > 0) {
                allGames = allGames.filter(game => {
                    const gameTags = game.tags
                        ? Object.keys(game.tags).filter(t => t !== "Game_id" && game.tags[t] === 1)
                        : [];
                    return tagArray.every(tag => gameTags.includes(tag));
                });
            }

            // 🔹 ดึง images ของแต่ละเกม
            const gamesWithImages = await Promise.all(
                allGames.map(async (game) => {
                    const images = await gameModels.findImagesByGameId(game.Game_id);
                    return {
                        ...game,
                        images: images.length > 0 ? images.map(img => img.Path) : [game.Game_Cover]
                    };
                })
            );

            res.render('browse', {
                games: gamesWithImages,
                user: req.session.userId ? await userModels.findByUserID(req.session.userId) : null,
                selectedTags: tagArray,
                query: query || '',
                sortOrder: 'newest'
            });

        } catch (error) {
            console.error("Error searching games:", error);
            res.status(500).send("Internal Server Error");
        };
    },
};

module.exports = pageController;