// controllers/gameController.js

// ==========================
// นำเข้าโมดูลที่จำเป็น
// ==========================
const gameModels = require('../models/gameModels'); // โมเดลสำหรับจัดการข้อมูลเกม

// ==========================
// Controller object รวมฟังก์ชันสำหรับจัดการเกม
// ==========================
const gameController = {

    // ==========================
    // แสดงหน้า Create Game
    // ==========================
    getCreateGamePage: (req, res) => {
        // render หน้า create game พร้อม error เป็น null
        res.render('create', { error: null });
    },

    // ==========================
    // แสดงหน้า Edit Game
    // ==========================
    getEditGamePage: async (req, res) => {
        try {
            const gameId = parseInt(req.params.id, 10); // รับ game ID จาก params
            const game = await gameModels.findGameById(gameId);

            if (!game) {
                // ถ้าไม่พบเกม แสดง 404
                return res.status(404).send("Game not found");
            }

            // render หน้า edit game พร้อมส่งข้อมูลเกม
            res.render('edit_game', { game });
        } catch (error) {
            console.error("Error fetching game:", error);
            res.status(500).send("Internal Server Error");
        }
    },

    // ==========================
    // สร้างเกมใหม่
    // ==========================
    postCreateGame: async (req, res) => {
        try {
            const { title_game, description, status_game, details, tags = [] } = req.body;

            // ตรวจสอบว่าผู้ใช้ login หรือยัง
            if (!req.session.user) {
                return res.status(401).send('Unauthorized: Please log in first.');
            }

            // สร้างเกมใหม่ในฐานข้อมูล
            const newGame = await gameModels.createGame({
                user_id: req.session.user.id,
                title_game,
                description,
                status_game,
                details
            });

            // สร้าง tags สำหรับเกม
            await gameModels.createTags(newGame.Game_id, tags);

            // สามารถ redirect หรือส่ง response สำเร็จได้ตามต้องการ
            res.send(`Game "${title_game}" created successfully!`);
        } catch (error) {
            console.error(error);
            res.render('create', { error: 'Failed to create game. Please try again.' });
        }
    },

    // ==========================
    // อัปเดตเกม
    // ==========================
    postUpdateGame: async (req, res) => {
        try {
            const gameId = parseInt(req.params.id, 10);

            // ตรวจสอบว่าค่า gameId เป็นตัวเลข
            if (isNaN(gameId)) {
                return res.status(400).send("Invalid game ID");
            }

            console.log("Updating gameId:", gameId);

            const { Game_Title, Description, Status_Game, Details, tags } = req.body;

            // อัปเดตข้อมูลเกม
            await gameModels.updateGame(gameId, {
                Game_Title,
                Description,
                Status_Game,
                Details
            });

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

            // อัปเดต tags ในฐานข้อมูล
            await gameModels.updateTags(gameId, tagsData);

            res.send(`The Id ${gameId}, edit success!`);
        } catch (error) {
            console.error("Error updating game:", error);
            res.status(500).send("Internal Server Error");
        }
    },

};

// ==========================
// ส่งออก controller เพื่อใช้ใน route
// ==========================
module.exports = gameController;
