// ==========================
// gameController.js (รองรับ S3)
// ==========================

const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
dayjs.extend(relativeTime);

const gameModels = require('../models/gameModels');
const userModels = require('../models/userModels');

// 🟦 เพิ่ม AWS SDK สำหรับลบไฟล์จาก S3 (กรณีอัปเดต/ลบ)
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});
const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

// ===================================================
// 🟩 1. สร้างเกมใหม่ (POST)
// ===================================================
exports.postCreateGame = async (req, res) => {
    try {
        const { title_game, description, status_game, details } = req.body;
        const userId = req.user?.User_id;

        if (!userId) return res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" });

        const uploadedFiles = req.files || {};
        const gameFile = uploadedFiles.file_game?.[0];
        const images = uploadedFiles.images || [];

        if (!gameFile) return res.status(400).json({ error: "ต้องเลือกไฟล์เกม (.zip)" });
        if (images.length < 1) return res.status(400).json({ error: "ต้องอัปโหลดรูปเกมอย่างน้อย 1 รูป" });

        let tags = req.body.tags;
        if (!tags) tags = [];
        else if (!Array.isArray(tags)) tags = [tags];

        // ✅ บันทึกเกมลงฐานข้อมูล (ใช้ URL จาก S3)
        const newGame = await gameModels.createGame({
            user_id: userId,
            title_game,
            description,
            status_game,
            details,
            File_Game: gameFile.location // ← URL จาก S3
        });

        // ✅ บันทึกรูปภาพ (URL จาก S3)
        for (const img of images) {
            await gameModels.createImage({
                url: img.location,
                game_id: newGame.Game_id
            });
        }

        // ✅ บันทึกแท็ก
        if (tags.length > 0) await gameModels.createTags(newGame.Game_id, tags);

        res.json({ message: "สร้างเกมสำเร็จ", game: newGame });
    } catch (err) {
        console.error("Error creating game:", err);
        res.status(500).json({ error: "สร้างเกมไม่สำเร็จ กรุณาลองใหม่" });
    }
};

// ===================================================
// 🟦 2. อัปเดตเกม (รองรับการอัปโหลดไฟล์ใหม่ไป S3)
// ===================================================
exports.postUpdateGame = async (req, res) => {
    try {
        const gameId = parseInt(req.params.id, 10);
        const existingGame = await gameModels.findGameById(gameId);

        if (!existingGame) return res.status(404).json({ error: "ไม่พบเกม" });
        if (existingGame.User_id !== req.user.User_id)
            return res.status(403).json({ error: "คุณไม่มีสิทธิ์แก้ไขเกมนี้" });

        const { Game_Title, Description, Status_Game, Details } = req.body;
        const uploadedGameFiles = req.files?.file_game;
        const newImages = req.files?.images || [];

        const updateData = { Game_Title, Description, Status_Game, Details };

        // ✅ ถ้ามีอัปโหลดไฟล์เกมใหม่
        if (uploadedGameFiles?.length > 0) {
            const file = uploadedGameFiles[0];

            // ลบไฟล์เก่าใน S3 (ถ้ามี)
            if (existingGame.File_Game?.includes("s3.amazonaws.com")) {
                const key = existingGame.File_Game.split("/").slice(-1)[0];
                await s3.send(new DeleteObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: `game/file/${key}`
                }));
            }

            // อัปเดตเป็นไฟล์ใหม่
            updateData.File_Game = file.location;
        }

        // ✅ เพิ่มรูปใหม่ใน S3
        for (const img of newImages) {
            await gameModels.createImage({
                url: img.location,
                game_id: gameId
            });
        }

        // ✅ อัปเดตข้อมูลเกมในฐานข้อมูล
        await gameModels.updateGame(gameId, updateData);
        res.json({ message: "อัปเดตเกมสำเร็จ", game: { Game_id: gameId } });

    } catch (err) {
        console.error("Error updating game:", err);
        res.status(500).json({ error: "ไม่สามารถอัปเดตเกมได้" });
    }
};

// ===================================================
// 🟨 3. ดาวน์โหลดเกมจาก S3 (Redirect URL)
// ===================================================
exports.getDownloadGame = async (req, res) => {
    try {
        const gameId = parseInt(req.params.id, 10);
        const game = await gameModels.findGameById(gameId);
        if (!game) return res.status(404).send("ไม่พบเกม");

        // ถ้าเก็บไฟล์เป็น URL ของ S3 → redirect ไปให้ดาวน์โหลด
        if (game.File_Game.startsWith("http")) {
            await gameModels.incrementGameDownloads(gameId);
            return res.redirect(game.File_Game);
        }

        // fallback สำหรับ local (กรณีไฟล์เก่ายังอยู่)
        res.download(path.join(__dirname, "../public/game/file", game.File_Game));

    } catch (err) {
        console.error("Error downloading game:", err);
        res.status(500).send("ไม่สามารถดาวน์โหลดได้");
    }
};

exports.getViewGamePage = async (req, res) => {
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
}

exports.getGameReview = async (req, res) => {
    try {
        const gameId = parseInt(req.params.id, 10);
        const review = await gameModels.findReviewsByGameId(gameId);
        res.json(review);
    } catch (error) {
        console.error("Error fetching reviews:", error);
        res.status(500).send("Internal Server Error");
    }
}

exports.postCreateReview = async (req, res) => {
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
}

exports.getCreateGamePage = async (req, res) => {
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
}

exports.getEditGamePage = async (req, res) => {
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
}

exports.postDeleteGame = async (req, res) => {
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
