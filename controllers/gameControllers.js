// controllers/gameControllers.js

// ==========================
// นำเข้าโมดูลที่จำเป็น
// ==========================
const gameModels = require('../models/gameModels'); // โมเดลสำหรับจัดการข้อมูลเกม
const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
const path = require('path');
const fs = require('fs');
dayjs.extend(relativeTime); // เพิ่ม plugin สำหรับคำนวณเวลาสัมพันธ์ (time ago)

// ==========================
// Controller object รวมฟังก์ชันสำหรับจัดการเกม
// ==========================
const gameController = {

    // ==========================
    // ======== PAGE VIEWS =======
    // ==========================

    /**
     * แสดงหน้า Create Game
     */
    getCreateGamePage: (req, res) => {
        res.render('create_game', { error: null });
    },

    /**
     * แสดงหน้า Edit Game
     */
    getEditGamePage: async (req, res) => {
        try {
            const gameId = parseInt(req.params.id, 10);
            const game = await gameModels.findGameById(gameId);

            if (!game) {
                return res.status(404).send("Game not found");
            }

            res.render('edit_game', { game });
        } catch (error) {
            console.error("Error fetching game:", error);
            res.status(500).send("Internal Server Error");
        }
    },

    /**
     * แสดงหน้า View Game พร้อม Comment
     */
    getViewGamePage: async (req, res) => {
        try {
            const gameId = parseInt(req.params.id, 10);
            const game = await gameModels.findGameById(gameId);

            if (!game) {
                return res.status(404).send("Game not found");
            }

            // ดึง comment ล่าสุดของเกมนี้
            const comments = await gameModels.findReviewsByGameId(gameId);

            // เพิ่ม timeAgo ให้แต่ละ comment
            const commentsWithTimeAgo = comments.map(c => ({
                ...c,
                timeAgo: dayjs(c.Created_At).fromNow() // ตัวอย่าง: "10 days ago"
            }));

            res.render('view_game', { game, reviews: commentsWithTimeAgo });
        } catch (error) {
            console.error("Error fetching game:", error);
            res.status(500).send("Internal Server Error");
        }
    },

    // ==========================
    // ======== GAME CRUD =======
    // ==========================

    /**
     * สร้างเกมใหม่
     */
    postCreateGame: async (req, res) => {
        try {
            const { title_game, description, status_game, details, tags = [] } = req.body;

            if (!req.session.user) return res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" });
            if (!req.files || !req.files.file_game) return res.status(400).json({ error: "ต้องเลือกไฟล์เกม (.zip)" });

            const gameFile = req.files.file_game;
            if (!gameFile.name.endsWith(".zip")) return res.status(400).json({ error: "ไฟล์เกมต้องเป็น .zip" });

            const gameFileName = Date.now() + "_" + gameFile.name;
            const gameFilePath = path.join(__dirname, "../public/game/file", gameFileName);
            fs.writeFileSync(gameFilePath, gameFile.data);

            const newGame = await gameModels.createGame({
                user_id: req.session.user.id,
                title_game,
                description,
                status_game,
                details,
                File_Game: gameFileName
            });

            if (req.files.images) {
                const images = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
                for (let img of images) {
                    const imageName = Date.now() + "_" + img.name;
                    const imagePath = path.join(__dirname, "../public/game/img", imageName);
                    fs.writeFileSync(imagePath, img.data);

                    // เรียก createImage
                    await gameModels.createImage({
                        url: imageName,
                        game_id: newGame.Game_id
                    });
                }
            }


            if (tags.length > 0) await gameModels.createTags(newGame.Game_id, tags);

            res.json({ message: "สร้างเกมสำเร็จ", game: newGame });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "สร้างเกมไม่สำเร็จ กรุณาลองใหม่" });
        }
    },


    /**
     * อัปเดตเกม
     */
    postUpdateGame: async (req, res) => {
        try {
            const gameId = parseInt(req.params.id, 10);
            if (isNaN(gameId)) return res.status(400).send("Invalid game ID");

            const { Game_Title, Description, Status_Game, Details, tags } = req.body;

            // อัปเดตข้อมูลเกม
            await gameModels.updateGame(gameId, { Game_Title, Description, Status_Game, Details });

            // แปลง tags เป็น object สำหรับอัปเดต
            const tagsData = {
                Action: tags?.includes("Action") ? 1 : 0,
                Adventure: tags?.includes("Adventure") ? 1 : 0,
                Card_Game: tags?.includes("Card_Game") ? 1 : 0,
                Educational: tags?.includes("Educational") ? 1 : 0,
                Fighting: tags?.includes("Fighting") ? 1 : 0,
                Interactive_Fiction: tags?.includes("Interactive_Fiction") ? 1 : 0,
                Puzzle: tags?.includes("Puzzle") ? 1 : 0,
                Racing: tags?.includes("Racing") ? 1 : 0,
                Other: tags?.includes("Other") ? 1 : 0
            };

            // อัปเดต tags
            await gameModels.updateTags(gameId, tagsData);

            res.send(`The Id ${gameId}, edit success!`);
        } catch (error) {
            console.error("Error updating game:", error);
            res.status(500).send("Internal Server Error");
        }
    },

    // ==========================
    // ======== REVIEWS =========
    // ==========================

    /**
     * สร้าง Review ใหม่
     */
    postCreateReview: async (req, res) => {
        try {
            if (!req.session.user) return res.status(401).send("Unauthorized: Please log in first.");

            const gameId = parseInt(req.params.id, 10);
            const { comment } = req.body;

            await gameModels.createReview({
                game_id: gameId,
                user_id: req.session.user.id,
                comment
            });

            res.send("Review added successfully!");
        } catch (error) {
            console.error("Error creating review:", error);
            res.status(500).send("Internal Server Error");
        }
    },

    /**
     * ดึง Review ของเกม
     */
    getGameReview: async (req, res) => {
        try {
            const gameId = parseInt(req.params.id, 10);
            const review = await gameModels.findReviewsByGameId(gameId);
            res.json(review);
        } catch (error) {
            console.error("Error fetching reviews:", error);
            res.status(500).send("Internal Server Error");
        }
    }

};

// ==========================
// ส่งออก controller เพื่อใช้ใน route
// ==========================
module.exports = gameController;
