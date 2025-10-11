// ==========================
// gameController.js
// ==========================

// --------------------------
// 🧩 Import Dependencies
// --------------------------
const gameModels = require('../models/gameModels');
const userModels = require('../models/userModels');
const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;

// ใช้ dayjs เพื่อแสดงเวลาแบบ “xx days ago”
dayjs.extend(relativeTime);

// --------------------------
// 🎮 Game Controller
// --------------------------
const gameController = {

    // ==================================================
    // 1️⃣ แสดงหน้า Create Game
    // ==================================================
    getCreateGamePage: async (req, res) => {
        try {
            let user = null;

            // ✅ ตรวจสอบว่ามี user ที่ล็อกอินหรือไม่
            if (req.session?.userId) {
                user = await userModels.findByUserID(req.session.userId);
            }

            // ✅ Render หน้า create_game.ejs
            res.render('create_game', {
                user: user,
                error: null
            });
        } catch (err) {
            console.error("❌ Error fetching user for create game page:", err);
            res.status(500).send("An error occurred");
        }
    },

    // ==================================================
    // 2️⃣ แสดงหน้า Edit Game
    // ==================================================
    getEditGamePage: async (req, res) => {
        try {
            const gameId = parseInt(req.params.id, 10);
            if (isNaN(gameId)) return res.status(400).send("Invalid game ID");

            // ✅ ดึงข้อมูลผู้ใช้ปัจจุบัน
            let user = null;
            if (req.session?.userId) {
                user = await userModels.findByUserID(req.session.userId);
            }

            // ✅ ดึงข้อมูลเกมจาก DB
            const game = await gameModels.findGameById(gameId);
            if (!game) return res.status(404).send("Game not found");

            // ✅ ดึงข้อมูลรูปภาพ และ Tags
            game.images = await gameModels.findImagesByGameId(gameId);
            game.tags = await gameModels.findTagsByGameId(gameId);

            // ✅ Render หน้าแก้ไข
            res.render('edit_game', {
                game: game,
                user: user
            });

        } catch (error) {
            console.error("❌ Error fetching game for edit page:", error);
            res.status(500).send("Internal Server Error");
        }
    },

    // ==================================================
    // 3️⃣ แสดงหน้า View Game (พร้อม Reviews)
    // ==================================================
    getViewGamePage: async (req, res) => {
        try {
            const gameId = parseInt(req.params.id, 10);
            if (isNaN(gameId)) return res.status(400).send("Invalid game ID");

            // ✅ ดึงข้อมูลผู้ใช้ปัจจุบัน
            let user = null;
            if (req.session?.userId) {
                user = await userModels.findByUserID(req.session.userId);
            }

            // ✅ ดึงข้อมูลเกม
            const game = await gameModels.findGameById(gameId);
            if (!game) return res.status(404).send("Game not found");

            // ✅ ดึงรูปภาพ / รีวิว / ผู้พัฒนา / Tags
            const images = await gameModels.findImagesByGameId(gameId);
            const comments = await gameModels.findReviewsByGameId(gameId);
            const developer = await userModels.findByUserID(game.User_id);
            const tags = await gameModels.findTagsByGameId(gameId);

            // ✅ จัดรูปแบบเวลารีวิว
            const commentsWithTimeAgo = comments.map(c => ({
                ...c,
                timeAgo: dayjs(c.Created_At).fromNow()
            }));

            // ✅ ใส่ข้อมูลทั้งหมดใน game object
            game.images = images.map(img => img.Path);
            game.developer = developer;
            game.tags = tags;

            // ✅ Render หน้า view_game.ejs
            res.render('view_game', {
                game: game,
                reviews: commentsWithTimeAgo,
                user: user
            });
        } catch (error) {
            console.error("❌ Error fetching game:", error);
            res.status(500).send("Internal Server Error");
        }
    },

    // ==================================================
    // 4️⃣ สร้างเกมใหม่ (Create)
    // ==================================================
    postCreateGame: async (req, res) => {
        try {
            const { title_game, description, status_game, details } = req.body;

            // ✅ ตรวจสอบการล็อกอิน
            if (!req.session.userId)
                return res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" });

            // ✅ ตรวจสอบไฟล์เกม (.zip)
            const gameFile = req.files?.file_game;
            if (!gameFile) return res.status(400).json({ error: "ต้องเลือกไฟล์เกม (.zip)" });
            if (!gameFile.name.endsWith(".zip"))
                return res.status(400).json({ error: "ไฟล์เกมต้องเป็น .zip" });

            // ✅ ตรวจสอบรูปภาพ (อย่างน้อย 1 รูป)
            const images = req.files?.images
                ? (Array.isArray(req.files.images) ? req.files.images : [req.files.images])
                : [];
            if (images.length < 1)
                return res.status(400).json({ error: "ต้องอัปโหลดรูปเกมอย่างน้อย 1 รูป" });

            // ✅ Tags
            let tags = req.body.tags || [];
            if (!Array.isArray(tags)) tags = [tags];

            // ✅ บันทึกไฟล์เกมลงโฟลเดอร์
            const gameFileName = `${Date.now()}_${gameFile.name}`;
            const gameFilePath = path.join(__dirname, "../public/game/file", gameFileName);
            fs.writeFileSync(gameFilePath, gameFile.data);

            // ✅ เพิ่มเกมในฐานข้อมูล
            const newGame = await gameModels.createGame({
                user_id: req.session.userId,
                title_game,
                description,
                status_game,
                details,
                File_Game: gameFileName
            });

            // ✅ บันทึกรูปภาพ
            for (let img of images) {
                const imageName = `${Date.now()}_${img.name}`;
                const imagePath = path.join(__dirname, "../public/game/img", imageName);
                fs.writeFileSync(imagePath, img.data);
                await gameModels.createImage({ url: imageName, game_id: newGame.Game_id });
            }

            // ✅ บันทึก Tags
            if (tags.length > 0) await gameModels.createTags(newGame.Game_id, tags);

            res.json({ message: "สร้างเกมสำเร็จ", game: newGame });

        } catch (err) {
            console.error("❌ Error creating game:", err);
            res.status(500).json({ error: "สร้างเกมไม่สำเร็จ กรุณาลองใหม่" });
        }
    },

    // ==================================================
    // 5️⃣ อัปเดตข้อมูลเกม (Update)
    // ==================================================
    postUpdateGame: async (req, res) => {
        try {
            const gameId = parseInt(req.params.id, 10);
            if (isNaN(gameId)) return res.status(400).json({ error: "Invalid game ID" });

            // ✅ ตรวจสอบว่าเกมมีอยู่จริง
            const existingGame = await gameModels.findGameById(gameId);
            if (!existingGame) return res.status(404).json({ error: "ไม่พบเกมนี้" });

            const { Game_Title, Description, Status_Game, Details } = req.body;

            // --------------------------
            // 🖼️ STEP 1: จัดการรูปภาพ
            // --------------------------
            let deleteImages = req.body['delete_images[]'] || [];
            if (!Array.isArray(deleteImages)) deleteImages = [deleteImages];
            deleteImages = deleteImages.map(id => parseInt(id, 10));

            const existingImages = await gameModels.findImagesByGameId(gameId);
            const remainingOldImages = existingImages.filter(img => !deleteImages.includes(img.Game_Image_id));

            const newImages = req.files?.images
                ? (Array.isArray(req.files.images) ? req.files.images : [req.files.images])
                : [];

            // ตรวจสอบว่ามีรูปอย่างน้อย 1 รูป
            if ((remainingOldImages.length + newImages.length) === 0)
                return res.status(400).json({ error: "ต้องมีรูปอย่างน้อย 1 รูป" });

            // 🔹 ลบรูปเก่า
            for (let imgId of deleteImages) {
                const img = await gameModels.findImageById(imgId);
                if (img) {
                    const imgPath = path.join(__dirname, "../public", img.Path);
                    try { await fsPromises.unlink(imgPath); } catch { }
                    await gameModels.deleteImage(imgId);
                }
            }

            // 🔹 เพิ่มรูปใหม่
            for (let img of newImages) {
                const imageName = `${Date.now()}_${img.name}`;
                const imagePath = path.join(__dirname, "../public/game/img", imageName);
                await fsPromises.writeFile(imagePath, img.data);
                await gameModels.createImage({ url: imageName, game_id: gameId });
            }

            // --------------------------
            // 🏷️ STEP 2: อัปเดต Tags
            // --------------------------
            let tags = req.body.tags || [];
            if (!Array.isArray(tags)) tags = [tags];

            const allTags = [
                "Action", "Adventure", "Card_Game", "Educational", "Fighting",
                "Interactive_Fiction", "Puzzle", "Racing", "Other"
            ];

            const tagsData = {};
            allTags.forEach(tag => {
                tagsData[tag] = tags.includes(tag) ? 1 : 0;
            });
            await gameModels.updateTags(gameId, tagsData);

            // --------------------------
            // 💾 STEP 3: อัปเดตไฟล์เกม (.zip)
            // --------------------------
            const updateData = { Game_Title, Description, Status_Game, Details };

            if (req.files?.file_game) {
                const file_game = req.files.file_game;
                if (!file_game.name.endsWith(".zip"))
                    return res.status(400).json({ error: "ไฟล์เกมต้องเป็น .zip เท่านั้น" });

                const gameFileName = `${Date.now()}_${file_game.name}`;
                const gameFilePath = path.join(__dirname, "../public/game/file", gameFileName);
                await fsPromises.writeFile(gameFilePath, file_game.data);
                updateData.File_Game = gameFileName;

                // ลบไฟล์เก่า
                if (existingGame.File_Game) {
                    const oldPath = path.join(__dirname, "../public/game/file", existingGame.File_Game);
                    try { await fsPromises.unlink(oldPath); } catch { }
                }
            }

            // --------------------------
            // 🧠 STEP 4: อัปเดตข้อมูลเกมหลัก
            // --------------------------
            await gameModels.updateGame(gameId, updateData);

            res.json({ message: "แก้ไขเกมสำเร็จ", game: { Game_id: gameId } });

        } catch (error) {
            console.error("❌ Error updating game:", error);
            res.status(500).json({ error: "แก้ไขเกมไม่สำเร็จ กรุณาลองใหม่" });
        }
    },

    // ==================================================
    // 6️⃣ เพิ่มรีวิวใหม่
    // ==================================================
    postCreateReview: async (req, res) => {
        try {
            if (!req.session.userId)
                return res.status(401).send("Unauthorized: Please log in first.");

            const gameId = parseInt(req.params.id, 10);
            const { comment } = req.body;

            await gameModels.createReview({
                game_id: gameId,
                user_id: req.session.userId,
                comment
            });

            res.redirect(`/game/view/${gameId}`);
        } catch (error) {
            console.error("❌ Error creating review:", error);
            res.status(500).send("Internal Server Error");
        }
    },

    // ==================================================
    // 7️⃣ ดึงรีวิวทั้งหมดของเกม (JSON)
    // ==================================================
    getGameReview: async (req, res) => {
        try {
            const gameId = parseInt(req.params.id, 10);
            const review = await gameModels.findReviewsByGameId(gameId);
            res.json(review);
        } catch (error) {
            console.error("❌ Error fetching reviews:", error);
            res.status(500).send("Internal Server Error");
        }
    },

    // ==================================================
    // 8️⃣ ลบเกม (Soft Delete)
    // ==================================================
    postDeleteGame: async (req, res) => {
        try {
            const gameId = parseInt(req.params.id, 10);
            const userId = req.session.userId;
            const from = req.query.from || 'dashboard';

            if (isNaN(gameId)) return res.status(400).send("Invalid Game ID");
            if (!userId) return res.status(401).send("Unauthorized");

            const game = await gameModels.findGameById(gameId);
            if (!game) return res.status(404).send("Game not found");

            // ✅ ตรวจสอบว่าเป็นเจ้าของเกมหรือไม่
            if (game.User_id !== userId)
                return res.status(403).send("Forbidden - You do not own this game");

            // ✅ Soft delete (ตั้งค่า Soft_Delete = 0)
            await gameModels.softDeleteGame(gameId);

            // ✅ Redirect หรือส่ง JSON ตาม context
            if (from === 'edit') res.json({ success: true });
            else res.redirect('/dashboard');

        } catch (error) {
            console.error("❌ Error deleting game:", error);
            res.status(500).send("Internal Server Error");
        }
    },

};

// --------------------------
// 🧾 Export Controller
// --------------------------
module.exports = gameController;
