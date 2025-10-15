// ==========================
// gameController.js
// ==========================
// Controller หลักของระบบเกม (Game System Controller)
// จัดการฟังก์ชันทั้งหมดเกี่ยวกับเกม เช่น Create / Edit / Delete / View / Download / Review
// ==========================


// --------------------------
// Import Dependencies
// --------------------------
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;
const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');

const gameModels = require('../models/gameModels');
const userModels = require('../models/userModels');

// เปิดใช้งาน plugin เพื่อแสดงเวลารูปแบบ "xx days ago"
dayjs.extend(relativeTime);


// --------------------------
// Game Controller Object
// --------------------------
const gameController = {

    // ==================================================
    // 🟩 1. หน้า “สร้างเกมใหม่” (GET)
    // ==================================================
    getCreateGamePage: async (req, res) => {
        try {
            const user = req.user || null;
            res.render('create_game', {
                user,
                error: null
            });
        } catch (err) {
            console.error("Error fetching user for create game page:", err);
            res.status(500).send("An error occurred");
        }
    },


    // ==================================================
    // 🟩 2. บันทึก “เกมใหม่” ลงฐานข้อมูล (POST)
    // ==================================================
    postCreateGame: async (req, res) => {
        try {
            const { title_game, description, status_game, details } = req.body;
            const userId = req.user ? req.user.User_id : null;

            // ตรวจสอบการล็อกอิน
            if (!userId)
                return res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" });

            // จัดการไฟล์จาก Multer
            const uploadedFiles = req.files || {};
            const gameFile = uploadedFiles.file_game ? uploadedFiles.file_game[0] : null;
            const images = uploadedFiles.images || [];

            if (!gameFile)
                return res.status(400).json({ error: "ต้องเลือกไฟล์เกม (.zip)" });
            if (images.length < 1)
                return res.status(400).json({ error: "ต้องอัปโหลดรูปเกมอย่างน้อย 1 รูป" });

            // จัดการ tags
            let tags = req.body.tags;
            if (!tags) tags = [];
            else if (!Array.isArray(tags)) tags = [tags];

            // บันทึกเกมหลัก
            const newGame = await gameModels.createGame({
                user_id: userId,
                title_game,
                description,
                status_game,
                details,
                File_Game: gameFile.filename
            });

            // บันทึกรูปภาพ
            for (const img of images) {
                await gameModels.createImage({
                    url: img.filename,
                    game_id: newGame.Game_id
                });
            }

            // บันทึก tags
            if (tags.length > 0) {
                await gameModels.createTags(newGame.Game_id, tags);
            }

            res.json({ message: "สร้างเกมสำเร็จ", game: newGame });

        } catch (err) {
            console.error("Error creating game:", err);
            res.status(500).json({ error: "สร้างเกมไม่สำเร็จ กรุณาลองใหม่" });
        }
    },


    // ==================================================
    // 🟦 3. หน้า “แก้ไขเกม” (GET)
    // ==================================================
    getEditGamePage: async (req, res) => {
        try {
            const gameId = parseInt(req.params.id, 10);

            // ตรวจสอบ login
            if (!req.user) {
                req.flash('error', 'Please log in to edit a game.');
                return res.redirect('/user/login');
            }

            // ดึงข้อมูลเกม
            const game = await gameModels.findGameById(gameId);
            if (!game) {
                req.flash('error', 'Game not found.');
                return res.status(404).redirect('/browse');
            }

            // ตรวจสอบความเป็นเจ้าของ (Developer หรือ Admin)
            const loggedInUserId = req.user.User_id;
            const gameOwnerId = game.User_id;
            const userRole = req.user.Roles;
            if (gameOwnerId !== loggedInUserId && userRole !== 'Admin') {
                req.flash('error', 'Permission denied. You are not authorized to edit this game.');
                return res.status(403).redirect(`/game/view/${gameId}`);
            }

            // ดึงข้อมูลประกอบ
            game.images = await gameModels.findImagesByGameId(gameId);
            game.tags = await gameModels.findTagsByGameId(gameId);

            res.render('edit_game', {
                game,
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
    // 🟦 4. อัปเดตข้อมูลเกม (POST)
    // ==================================================
    postUpdateGame: async (req, res) => {
        try {
            const gameId = parseInt(req.params.id, 10);
            if (isNaN(gameId)) return res.status(400).json({ error: "Invalid game ID" });

            const existingGame = await gameModels.findGameById(gameId);
            if (!existingGame) return res.status(404).json({ error: "เกมไม่พบ" });

            if (existingGame.User_id !== req.user.User_id) {
                return res.status(403).json({ error: "คุณไม่มีสิทธิ์แก้ไขเกมนี้" });
            }

            const { Game_Title, Description, Status_Game, Details } = req.body;

            // --------------------------
            // จัดการรูปภาพ (เก่า / ใหม่)
            // --------------------------
            let deleteImages = req.body['delete_images[]'] || [];
            if (!Array.isArray(deleteImages)) deleteImages = [deleteImages];
            deleteImages = deleteImages.map(id => parseInt(id, 10));

            const existingImages = await gameModels.findImagesByGameId(gameId);
            const remainingOldImages = existingImages.filter(
                img => !deleteImages.includes(img.Game_Image_id)
            );

            const newImages = req.files?.images
                ? (Array.isArray(req.files.images) ? req.files.images : [req.files.images])
                : [];

            // ต้องมีรูปอย่างน้อย 1 รูป
            if ((remainingOldImages.length + newImages.length) === 0) {
                return res.status(400).json({ error: "ต้องมีรูปอย่างน้อย 1 รูป" });
            }

            // ลบรูปเก่าที่เลือก
            for (const imgId of deleteImages) {
                const img = await gameModels.findImageById(imgId);
                if (img) {
                    const imgPath = path.join(__dirname, "../public", img.Path);
                    try { await fsPromises.unlink(imgPath); } catch { }
                    await gameModels.deleteImage(imgId);
                }
            }

            // เพิ่มรูปใหม่
            for (const img of newImages) {
                const imageName = Date.now() + "_" + img.name;
                const imagePath = path.join(__dirname, "../public/game/img", imageName);
                await fsPromises.writeFile(imagePath, img.data);
                await gameModels.createImage({ url: imageName, game_id: gameId });
            }

            // --------------------------
            // อัปเดต Tags
            // --------------------------
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

            // --------------------------
            // อัปเดตไฟล์เกม (.zip)
            // --------------------------
            const updateData = { Game_Title, Description, Status_Game, Details };
            const uploadedGameFiles = req.files?.file_game;

            if (uploadedGameFiles && uploadedGameFiles.length > 0) {
                const file_game = uploadedGameFiles[0];

                if (!file_game.originalname.endsWith(".zip"))
                    return res.status(400).json({ error: "ไฟล์เกมต้องเป็น .zip เท่านั้น" });

                // 1. สร้างชื่อไฟล์ใหม่
                const gameFileName = Date.now() + "_" + file_game.originalname; // ใช้ originalname
                const gameFilePath = path.join(__dirname, "../public/game/file", gameFileName);

                // 2. ย้ายไฟล์ชั่วคราวไปที่ปลายทาง (แทนการ writeFile)
                try {
                    // 💡 ใช้ fsPromises.rename แทน fsPromises.writeFile
                    await fsPromises.rename(file_game.path, gameFilePath);
                } catch (err) {
                    console.error("Error renaming/moving file:", err);
                    return res.status(500).json({ error: "ไม่สามารถบันทึกไฟล์เกมได้" });
                }

                updateData.File_Game = gameFileName;

                // ลบไฟล์เก่า
                if (existingGame.File_Game) {
                    const oldPath = path.join(__dirname, "../public/game/file", existingGame.File_Game);
                    try { await fsPromises.unlink(oldPath); } catch { }
                }
            }

            // --------------------------
            // อัปเดตข้อมูลเกมหลัก
            // --------------------------
            await gameModels.updateGame(gameId, updateData);
            res.status(200).json({ message: "แก้ไขเกมสำเร็จ", game: { Game_id: gameId } });
            res.json({ message: "แก้ไขเกมสำเร็จ", game: { Game_id: gameId } });

        } catch (error) {
            console.error("Error updating game:", error);
            res.status(500).json({ error: "แก้ไขเกมไม่สำเร็จ กรุณาลองใหม่" });
        }
    },


    // ==================================================
    // 🟨 5. หน้า “ดูรายละเอียดเกม” + Reviews
    // ==================================================
    getViewGamePage: async (req, res) => {
        try {
            const user = req.user || null;
            const gameId = parseInt(req.params.id, 10);

            const game = await gameModels.findGameById(gameId);
            if (!game) return res.status(404).send("Game not found");

            // เพิ่ม view count
            await gameModels.incrementGameViews(gameId);

            // ดึงข้อมูลประกอบ
            const images = await gameModels.findImagesByGameId(gameId);
            game.images = images.map(img => img.Path);

            const comments = await gameModels.findReviewsByGameId(gameId);
            const commentsWithTimeAgo = comments.map(c => ({
                ...c,
                timeAgo: dayjs(c.Created_At).fromNow()
            }));

            game.developer = await userModels.findByUserID(game.User_id);
            game.tags = await gameModels.findTagsByGameId(gameId);

            res.render('view_game', {
                game,
                reviews: commentsWithTimeAgo,
                user
            });

        } catch (error) {
            console.error("Error fetching game:", error);
            res.status(500).send("Internal Server Error");
        }
    },


    // ==================================================
    // 🟨 6. ดาวน์โหลดไฟล์เกม
    // ==================================================
    getDownloadGame: async (req, res) => {
        try {
            const gameId = parseInt(req.params.id, 10);
            const game = await gameModels.findGameById(gameId);

            if (!game || !game.File_Game)
                return res.status(404).send("Game file not found.");

            const filePath = path.join(__dirname, "../public/game/file", game.File_Game);

            try {
                await fsPromises.access(filePath, fs.constants.F_OK);
            } catch {
                console.error(`File not found at path: ${filePath}`);
                return res.status(404).send("Game file not found on server.");
            }

            // โหลดไฟล์ + เพิ่มจำนวนดาวน์โหลด
            res.download(filePath, game.Game_Title + '.zip', async (err) => {
                if (err) {
                    if (err.code === 'ECONNABORTED' || err.headersSent) {
                        console.log(`Download aborted for Game ID ${gameId}.`);
                        return;
                    }
                    console.error("Error during file download:", err.message);
                } else {
                    try {
                        await gameModels.incrementGameDownloads(gameId);
                    } catch (dbErr) {
                        console.error(`Error incrementing download count:`, dbErr);
                    }
                }
            });

        } catch (error) {
            console.error("Error downloading game:", error);
            res.status(500).send("Internal Server Error");
        }
    },


    // ==================================================
    // 🟧 7. เพิ่มรีวิวใหม่ (POST)
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
    // 🟧 8. ดึงรีวิวทั้งหมดของเกม (JSON)
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


    // ==================================================
    // 🟥 9. ลบเกม (Soft Delete)
    // ==================================================
    postDeleteGame: async (req, res) => {
        try {
            const gameId = parseInt(req.params.id, 10);
            const userId = req.user ? req.user.User_id : null;
            const from = req.query.from || 'dashboard';

            if (isNaN(gameId)) return res.status(400).send("Invalid Game ID");
            if (!userId) return res.status(401).send("Unauthorized");

            const game = await gameModels.findGameById(gameId);
            if (!game) return res.status(404).send("Game not found");

            // ตรวจสอบสิทธิ์การลบ
            if (game.User_id !== userId && req.user.Roles !== 'Admin') {
                return res.status(403).send("Forbidden - You are not authorized to delete this game.");
            }

            await gameModels.softDeleteGame(gameId);

            // ตอบกลับตามต้นทาง
            if (from === 'admin') {
                res.redirect('/admin');
            } else if (from === 'edit') {
                res.json({ success: true });
            } else {
                res.redirect('/dashboard');
            }

        } catch (error) {
            console.error("Error deleting game:", error);
            res.status(500).send("Internal Server Error");
        }
    }

};


// --------------------------
// Export Game Controller
// --------------------------
module.exports = gameController;
