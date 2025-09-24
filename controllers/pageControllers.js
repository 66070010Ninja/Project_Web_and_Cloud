const gameModels = require('../models/gameModels');

const pageController = {
    getHomePage: async (req, res) => {
        try {
            // ดึงเกมทั้งหมด (สามารถเพิ่ม orderBy, limit, filter ได้)
            const games = await gameModels.getAllGames();

            // ส่งตัวแปร games และ user (จาก session) ให้ view
            res.render('home', {
                games,
                user: req.session.user || null
            });
        } catch (error) {
            console.error("Error fetching games:", error);
            res.status(500).send("Internal Server Error");
        }
    }
};

module.exports = pageController;
