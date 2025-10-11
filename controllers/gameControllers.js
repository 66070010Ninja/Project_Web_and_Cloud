// ==========================
// gameController.js
// ==========================

// --------------------------
// Import Dependencies
// --------------------------
const gameModels = require('../models/gameModels');
const userModels = require('../models/userModels');
const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;

// ขยายความสามารถให้ dayjs แปลงเวลาแบบ relative (xx days ago)
dayjs.extend(relativeTime);

// --------------------------
// Game Controller
// --------------------------
const gameController = {

    // ==================================================
    // แสดงหน้า Create Game
    // ==================================================
    getCreateGamePage: async (req, res) => {
        try {
            let user = req.user || null;

            res.render('create_game', {
                user: user, // ส่งข้อมูลผู้ใช้
                error: null
            });

        } catch (err) {
            console.error("Error fetching user for create game page:", err);
            // อาจจะ render หน้า error หรือ redirect ไปที่อื่น
            res.status(500).send("An error occurred");
        }
    },

    // ==================================================
    // แสดงหน้า Edit Game
    // ==================================================
    getEditGamePage: async (req, res) => {
        try {

            console.log('Logged in user data (req.user):', req.user);

            const gameId = parseInt(req.params.id, 10);

            // 💡 1. ตรวจสอบว่ามีผู้ใช้ล็อกอินอยู่หรือไม่ (แม้ว่า Routes จะป้องกันแล้วก็ตาม)
            // ข้อมูล req.user ถูกกำหนดโดย isAuthenticated middleware
            if (!req.user) {
                req.flash('error', 'Please log in to edit a game.');
                return res.redirect('/user/login');
            }

            // --- หาเกมจาก DB เพื่อตรวจสอบความเป็นเจ้าของ ---
            const game = await gameModels.findGameById(gameId);
            if (!game) {
                req.flash('error', 'Game not found.');
                return res.status(404).redirect('/browse');
            }

            // 💡 2. ตรวจสอบความเป็นเจ้าของ (Ownership Check)
            const loggedInUserId = req.user.User_id; // User_id จาก account model
            const gameOwnerId = game.User_id;       // User_id ของเจ้าของเกม
            const userRole = req.user.Roles;        // บทบาทของผู้ใช้ (เช่น 'Admin', 'Developer')

            // อนุญาต: ถ้าเป็นเจ้าของเกม หรือเป็น Admin
            if (gameOwnerId !== loggedInUserId && userRole !== 'Admin') {
                req.flash('error', 'Permission denied. You are not authorized to edit this game.');
                return res.status(403).redirect(`/game/view/${gameId}`);
            }

            // 💡 3. หากผ่านการตรวจสอบ: ดึงข้อมูลที่จำเป็นต่อการแสดงผล

            // --- ดึงรูปภาพเกม ---
            game.images = await gameModels.findImagesByGameId(gameId);

            // --- ดึง Tags ของเกม ---
            game.tags = await gameModels.findTagsByGameId(gameId);

            // 4. ส่งไป render หน้าแก้ไขเกม พร้อมข้อมูล game และ user
            // Note: ตัวแปร user ถูกส่งไปใน res.locals.user โดย authMiddleware อยู่แล้ว
            //       แต่เราส่งซ้ำไปใน object นี้เพื่อให้มั่นใจว่า view ได้รับ
            res.render('edit_game', {
                game: game,
                user: req.user,
                flashMessages: {
                    error: req.flash('error'),
                    success: req.flash('success')
                }
            });

        } catch (error) {
            console.error("Error fetching game for edit page:", error);
            req.flash('error', 'An internal error occurred.');
            res.status(500).redirect('/browse');
        }
    },

    // ==================================================
    // แสดงหน้า View Game พร้อม Reviews
    // ==================================================
    getViewGamePage: async (req, res) => {
        try {
            // --- ดึงข้อมูลผู้ใช้ที่ล็อกอินอยู่ ---
            let user = req.user || null;

            const gameId = parseInt(req.params.id, 10);

            // หาเกม
            const game = await gameModels.findGameById(gameId);
            if (!game) {
                return res.status(404).send("Game not found");
            }

            // --- ดึงข้อมูลอื่นๆ ที่เกี่ยวข้องกับเกม ---
            const images = await gameModels.findImagesByGameId(gameId);
            game.images = images.map(img => img.Path);

            const comments = await gameModels.findReviewsByGameId(gameId);
            const commentsWithTimeAgo = comments.map(c => ({
                ...c,
                timeAgo: dayjs(c.Created_At).fromNow()
            }));

            // --- ดึงข้อมูลนักพัฒนา, Tags ---
            game.developer = await userModels.findByUserID(game.User_id);
            game.tags = await gameModels.findTagsByGameId(gameId);


            // Render หน้า view_game พร้อมส่งข้อมูลทั้งหมด
            res.render('view_game', {
                game: game,
                reviews: commentsWithTimeAgo,
                user: user // ส่งข้อมูลผู้ใช้ไปด้วย
            });

        } catch (error) {
            console.error("Error fetching game:", error);
            res.status(500).send("Internal Server Error");
        }
    },

    // ==================================================
    // บันทึกเกมใหม่ (Create)
    // ==================================================
    postCreateGame: async (req, res) => {
        try {
            const { title_game, description, status_game, details } = req.body;

            // --- 1) ตรวจสอบการล็อกอิน ---
            const userId = req.user ? req.user.User_id : null;
            if (!userId)
                return res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" });

            // --- 2) ตรวจสอบไฟล์เกม ---
            if (!req.files || !req.files.file_game)
                return res.status(400).json({ error: "ต้องเลือกไฟล์เกม (.zip)" });

            const gameFile = req.files.file_game;
            if (!gameFile.name.endsWith(".zip"))
                return res.status(400).json({ error: "ไฟล์เกมต้องเป็น .zip" });

            // --- 3) ตรวจสอบรูปภาพ (≥ 1 รูป) ---
            if (!req.files.images)
                return res.status(400).json({ error: "ต้องอัปโหลดรูปเกมอย่างน้อย 1 รูป" });

            const images = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
            if (images.length < 1)
                return res.status(400).json({ error: "ต้องอัปโหลดรูปเกมอย่างน้อย 1 รูป" });

            // --- 4) อ่าน Tags ---
            let tags = req.body.tags;
            if (!tags) tags = [];
            else if (!Array.isArray(tags)) tags = [tags];
            // console.log("Tags:", tags);

            // --- 5) บันทึกไฟล์เกม ---
            const gameFileName = Date.now() + "_" + gameFile.name;
            const gameFilePath = path.join(__dirname, "../public/game/file", gameFileName);
            fs.writeFileSync(gameFilePath, gameFile.data);

            // --- 6) สร้างเกมใน DB ---
            const newGame = await gameModels.createGame({
                user_id: userId,
                title_game,
                description,
                status_game,
                details,
                File_Game: gameFileName
            });

            // --- 7) บันทึกรูปภาพ ---
            for (let img of images) {
                const imageName = Date.now() + "_" + img.name;
                const imagePath = path.join(__dirname, "../public/game/img", imageName);
                fs.writeFileSync(imagePath, img.data);

                await gameModels.createImage({
                    url: imageName,
                    game_id: newGame.Game_id
                });
            }

            // --- 8) บันทึก Tags ---
            if (tags.length > 0) {
                await gameModels.createTags(newGame.Game_id, tags);
            }

            // --- 9) ส่ง response ---
            res.json({ message: "สร้างเกมสำเร็จ", game: newGame });

        } catch (err) {
            console.error("Error creating game:", err);
            res.status(500).json({ error: "สร้างเกมไม่สำเร็จ กรุณาลองใหม่" });
        }
    },

    // ==================================================
    // อัปเดตข้อมูลเกม (Update)
    // ==================================================
    postUpdateGame: async (req, res) => {
        try {

            const gameId = parseInt(req.params.id, 10);
            if (isNaN(gameId)) return res.status(400).json({ error: "Invalid game ID" });

            const existingGame = await gameModels.findGameById(gameId);
            if (!existingGame) return res.status(404).json({ error: "เกมไม่พบ" });

            const { Game_Title, Description, Status_Game, Details } = req.body;

            // ==========================
            // STEP 1: จัดการรูปภาพ
            // ==========================
            let deleteImages = req.body['delete_images[]'] || [];
            if (!Array.isArray(deleteImages)) deleteImages = [deleteImages];
            deleteImages = deleteImages.map(id => parseInt(id, 10));

            const existingImages = await gameModels.findImagesByGameId(gameId);

            // รูปเก่าหลังลบ
            const remainingOldImages = existingImages.filter(
                img => !deleteImages.includes(img.Game_Image_id)
            );

            // รูปใหม่
            const newImages = req.files?.images ? (Array.isArray(req.files.images) ? req.files.images : [req.files.images]) : [];

            // ตรวจสอบว่ามีรูปอย่างน้อย 1 รูป
            if ((remainingOldImages.length + newImages.length) === 0) {
                return res.status(400).json({ error: "ต้องมีรูปอย่างน้อย 1 รูป" });
            }

            // ลบรูปเก่า
            for (let imgId of deleteImages) {
                const img = await gameModels.findImageById(imgId);
                if (img) {
                    const imgPath = path.join(__dirname, "../public", img.Path);
                    try { await fsPromises.unlink(imgPath); } catch (err) { }
                    await gameModels.deleteImage(imgId);
                }
            }

            // เพิ่มรูปใหม่
            for (let img of newImages) {
                const imageName = Date.now() + "_" + img.name;
                const imagePath = path.join(__dirname, "../public/game/img", imageName);
                await fsPromises.writeFile(imagePath, img.data);
                await gameModels.createImage({ url: imageName, game_id: gameId });
            }

            // ==========================
            // ✅ STEP 3: อัปเดต Tags
            // ==========================
            let tags = req.body.tags;
            if (!tags) tags = [];
            else if (!Array.isArray(tags)) tags = [tags];

            const allTags = [
                "Action", "Adventure", "Card_Game", "Educational", "Fighting",
                "Interactive_Fiction", "Puzzle", "Racing", "Other"
            ];
            const tagsData = {};
            allTags.forEach(tag => {
                tagsData[tag] = tags.includes(tag) ? 1 : 0;
            });
            await gameModels.updateTags(gameId, tagsData);

            // ==========================
            // ✅ STEP 5: อัปเดตไฟล์เกม (.zip)
            // ==========================
            const updateData = { Game_Title, Description, Status_Game, Details };

            if (req.files?.file_game) {
                const file_game = req.files.file_game;
                if (!file_game.name.endsWith(".zip"))
                    return res.status(400).json({ error: "ไฟล์เกมต้องเป็น .zip เท่านั้น" });

                const gameFileName = Date.now() + "_" + file_game.name;
                const gameFilePath = path.join(__dirname, "../public/game/file", gameFileName);
                await fsPromises.writeFile(gameFilePath, file_game.data);
                updateData.File_Game = gameFileName;

                // ลบไฟล์เก่า
                if (existingGame.File_Game) {
                    const oldPath = path.join(__dirname, "../public/game/file", existingGame.File_Game);
                    try { await fsPromises.unlink(oldPath); } catch { }
                }
            }

            // ==========================
            // ✅ STEP 6: อัปเดตข้อมูลเกมหลัก
            // ==========================
            await gameModels.updateGame(gameId, updateData);

            res.json({ message: "แก้ไขเกมสำเร็จ", game: { Game_id: gameId } });

        } catch (error) {
            console.error("Error updating game:", error);
            res.status(500).json({ error: "แก้ไขเกมไม่สำเร็จ กรุณาลองใหม่" });
        }
    },

    // ==================================================
    // เพิ่มรีวิวใหม่
    // ==================================================
    postCreateReview: async (req, res) => {
        try {
            const userId = req.user ? req.user.User_id : null;
            if (!userId)
                return res.status(401).send("Unauthorized: Please log in first.");

            const gameId = parseInt(req.params.id, 10);
            const { comment } = req.body;

            await gameModels.createReview({
                game_id: gameId,
                user_id: userId,
                comment
            });

            res.redirect(`/game/view/${gameId}`);
        } catch (error) {
            console.error("Error creating review:", error);
            res.status(500).send("Internal Server Error");
        }
    },

    // ==================================================
    // ดึงรีวิวทั้งหมดของเกม (JSON)
    // ==================================================
    getGameReview: async (req, res) => {
        try {
            const gameId = parseInt(req.params.id, 10);
            const review = await gameModels.findReviewsByGameId(gameId);
            res.json(review);
        } catch (error) {
            console.error("Error fetching reviews:", error);
            res.status(500).send("Internal Server Error");
        }
    },

    // ==========================
    // ลบเกม (Soft Delete)
    // ==========================
    postDeleteGame: async (req, res) => {
        try {
            const gameId = parseInt(req.params.id, 10);
            const userId = req.user ? req.user.User_id : null;
            const from = req.query.from || 'dashboard';

            if (isNaN(gameId)) return res.status(400).send("Invalid Game ID");
            if (!userId) return res.status(401).send("Unauthorized");

            // ✅ ดึงข้อมูลเกมจาก model แทนที่จะใช้ prisma โดยตรง
            const game = await gameModels.findGameById(gameId);
            const gameImages = await gameModels.findImagesByGameId(gameId);

            if (!game) return res.status(404).send("Game not found");

            // ตรวจสอบว่าเป็นเจ้าของเกมหรือไม่
            if (game.User_id !== userId) {
                return res.status(403).send("Forbidden - You do not own this game");
            }

            // ✅ Soft delete (ตั้งค่า Soft_Delete = 0)
            await gameModels.softDeleteGame(gameId);
            if (from === 'edit') {
                res.json({ success: true });
            } else {
                res.redirect('/dashboard');
            }
        } catch (error) {
            console.error("Error deleting game:", error);
            res.status(500).send("Internal Server Error");
        }
    },

};

// --------------------------
// Export Game Controller
// --------------------------
module.exports = gameController;
