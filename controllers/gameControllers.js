// ==========================
// gameController.js (รองรับ S3 + ลบภาพ)
// ==========================

const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
dayjs.extend(relativeTime);

const gameModels = require('../models/gameModels');
const userModels = require('../models/userModels');
const path = require('path');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
    region: process.env.AWS_REGION
});
const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

const getS3KeyFromUrl = (url) => {
    const prefix = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`;
    return url.startsWith(prefix) ? url.slice(prefix.length) : null;
};

// ===================================================
// 1️⃣ สร้างเกมใหม่ (POST)
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

        // ✅ บันทึกเกม
        const newGame = await gameModels.createGame({
            user_id: userId,
            title_game,
            description,
            status_game,
            details,
            File_Game: gameFile.location
        });

        // ✅ บันทึกรูปภาพ
        for (const img of images) {
            if (!img.location) continue;
            await gameModels.createImage({
                Path: img.location,
                Game_id: newGame.Game_id
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
// 2️⃣ อัปเดตเกม (POST)
// ===================================================
exports.postUpdateGame = async (req, res) => {
    try {
        const gameId = parseInt(req.params.id, 10);
        const existingGame = await gameModels.findGameById(gameId);
        if (!existingGame) return res.status(404).json({ error: "ไม่พบเกม" });
        if (existingGame.User_id !== req.user.User_id && req.user.Roles !== 'Admin')
            return res.status(403).json({ error: "คุณไม่มีสิทธิ์แก้ไขเกมนี้" });

        const { Game_Title, Description, Status_Game, Details } = req.body;

        // 1️⃣ จัดการ tags
        let newTags = req.body.tags || [];
        if (!Array.isArray(newTags)) newTags = [newTags];

        const tagData = {
            Action: newTags.includes("Action") ? 1 : 0,
            Adventure: newTags.includes("Adventure") ? 1 : 0,
            Card_Game: newTags.includes("Card_Game") ? 1 : 0,
            Educational: newTags.includes("Educational") ? 1 : 0,
            Fighting: newTags.includes("Fighting") ? 1 : 0,
            Interactive_Fiction: newTags.includes("Interactive_Fiction") ? 1 : 0,
            Puzzle: newTags.includes("Puzzle") ? 1 : 0,
            Racing: newTags.includes("Racing") ? 1 : 0,
            Other: newTags.includes("Other") ? 1 : 0,
        };

        // 2️⃣ อัปเดตไฟล์เกมใหม่
        const uploadedGameFiles = req.files?.file_game;
        const updateData = { Game_Title, Description, Status_Game, Details };
        if (uploadedGameFiles?.length > 0) {
            const file = uploadedGameFiles[0];
            if (existingGame.File_Game?.includes("s3.amazonaws.com")) {
                const key = getS3KeyFromUrl(existingGame.File_Game);
                if (key) await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
            }
            updateData.File_Game = file.location;
        }

        // 3️⃣ ลบภาพเก่า
        let imagesToDelete = req.body['delete_images[]'] || [];
        if (!Array.isArray(imagesToDelete)) imagesToDelete = [imagesToDelete];
        for (const imageId of imagesToDelete) {
            const img = await gameModels.findImageById(parseInt(imageId, 10));
            if (img && img.Path.includes("amazonaws.com")) {
                const key = getS3KeyFromUrl(img.Path);
                if (key) {
                    try {
                        await s3.send(new DeleteObjectCommand({
                            Bucket: BUCKET_NAME,
                            Key: key
                        }));
                        console.log(`✅ Deleted from S3: ${key}`);
                    } catch (err) {
                        console.error("❌ S3 delete failed:", err);
                    }
                }
            }
            await gameModels.deleteImage(parseInt(imageId, 10));
        }

        // 4️⃣ เพิ่มภาพใหม่
        const newImages = req.files?.images || [];
        for (const img of newImages) {
            await gameModels.createImage({
                Path: img.location,
                Game_id: gameId
            });
        }

        // 5️⃣ อัปเดตแท็ก
        await gameModels.updateTags(gameId, tagData);

        // 6️⃣ อัปเดตข้อมูลเกม
        await gameModels.updateGame(gameId, updateData);

        // 7️⃣ ส่งข้อมูลภาพล่าสุดกลับไป front-end
        const updatedImages = await gameModels.findImagesByGameId(gameId);
        res.json({ message: "อัปเดตเกมสำเร็จ", game: { Game_id: gameId, images: updatedImages.map(i => i.Path) } });

    } catch (err) {
        console.error("Error updating game:", err);
        res.status(500).json({ error: "ไม่สามารถอัปเดตเกมได้" });
    }
};

// ===================================================
// 3️⃣ ดาวน์โหลดเกม (Redirect URL)
// ===================================================
exports.getDownloadGame = async (req, res) => {
    try {
        const gameId = parseInt(req.params.id, 10);
        const game = await gameModels.findGameById(gameId);
        if (!game) return res.status(404).send("ไม่พบเกม");

        if (game.File_Game.startsWith("http")) {
            await gameModels.incrementGameDownloads(gameId);
            return res.redirect(game.File_Game);
        }

        res.download(path.join(__dirname, "../public/game/file", game.File_Game));

    } catch (err) {
        console.error("Error downloading game:", err);
        res.status(500).send("ไม่สามารถดาวน์โหลดได้");
    }
};

// ===================================================
// 4️⃣ แสดงเกม
// ===================================================
exports.getViewGamePage = async (req, res) => {
    try {
        const user = req.user || null;
        const gameId = parseInt(req.params.id, 10);
        const game = await gameModels.findGameById(gameId);
        if (!game) return res.status(404).send("Game not found");

        await gameModels.incrementGameViews(gameId);

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
};

// ===================================================
// 5️⃣ รีวิวเกม
// ===================================================
exports.getGameReview = async (req, res) => {
    try {
        const gameId = parseInt(req.params.id, 10);
        const review = await gameModels.findReviewsByGameId(gameId);
        res.json(review);
    } catch (error) {
        console.error("Error fetching reviews:", error);
        res.status(500).send("Internal Server Error");
    }
};

exports.postCreateReview = async (req, res) => {
    try {
        const userId = req.user ? req.user.User_id : null;
        if (!userId) return res.status(401).send("Unauthorized");

        const gameId = parseInt(req.params.id, 10);
        const { comment } = req.body;

        await gameModels.createReview({ game_id: gameId, user_id: userId, comment });
        res.redirect(`/game/view/${gameId}`);

    } catch (error) {
        console.error("Error creating review:", error);
        res.status(500).send("Internal Server Error");
    }
};
