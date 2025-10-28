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
