// ==================================================
// ✅ GAME CONTROLLER (รองรับ S3 + Delete Image & File)
// ==================================================

// ---------------------------
// 📦 Import Dependencies
// ---------------------------
const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
dayjs.extend(relativeTime);

const path = require('path');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const gameModels = require('../models/gameModels');
const userModels = require('../models/userModels');

// ---------------------------
// 🌩️ S3 Config
// ---------------------------
const s3 = new S3Client({
    region: process.env.AWS_REGION
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

// ดึง Key ของไฟล์ใน S3 จาก URL
const getS3KeyFromUrl = (url) => {
    const prefix = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`;
    return url.startsWith(prefix) ? url.slice(prefix.length) : null;
};

// ==================================================
// 🎮 GAME CONTROLLER OBJECT
// ==================================================
const gameController = {

    // ==================================================
    // 1️⃣ CREATE GAME PAGE (GET)
    // ==================================================
    getCreateGamePage: async (req, res) => {
        try {
            const user = req.user || null;
            res.render("create_game", { user, error: null });
        } catch (err) {
            console.error("⚠️ Create game page error:", err);
            res.status(500).send("Server Error");
        }
    },

    // ==================================================
    // 2️⃣ CREATE GAME (POST)
    // ==================================================
    postCreateGame: async (req, res) => {
        try {
            const { title_game, description, status_game, details } = req.body;
            const userId = req.user?.User_id;
            if (!userId) return res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อน" });

            const uploaded = req.files || {};
            const gameFile = uploaded.file_game?.[0];
            const images = uploaded.images || [];

            if (!gameFile) return res.status(400).json({ error: "ต้องอัปโหลดไฟล์เกม (.zip)" });
            if (images.length < 1) return res.status(400).json({ error: "ต้องอัปโหลดรูปอย่างน้อย 1 รูป" });

            let tags = req.body.tags || [];
            if (!Array.isArray(tags)) tags = [tags];

            // ✅ บันทึกเกม
            const newGame = await gameModels.createGame({
                user_id: userId,
                title_game,
                description,
                status_game,
                details,
                File_Game: gameFile.location
            });

            // ✅ บันทึกรูป
            for (const img of images) {
                await gameModels.createImage({ Path: img.location, Game_id: newGame.Game_id });
            }

            // ✅ บันทึกแท็ก
            if (tags.length > 0) {
                await gameModels.createTags(newGame.Game_id, tags);
            }

            return res.json({ message: "✅ สร้างเกมสำเร็จ", game: newGame });

        } catch (err) {
            console.error("❌ Error creating game:", err);
            res.status(500).json({ error: "สร้างเกมไม่สำเร็จ" });
        }
    },

    // ==================================================
    // 3️⃣ EDIT GAME PAGE (GET)
    // ==================================================
    getEditGamePage: async (req, res) => {
        try {
            const gameId = +req.params.id;
            if (!req.user) return res.redirect("/user/login");

            const game = await gameModels.findGameById(gameId);
            if (!game) return res.status(404).redirect("/browse");

            const isOwner = game.User_id === req.user.User_id;
            const isAdmin = req.user.Roles === "Admin";
            if (!isOwner && !isAdmin) return res.status(403).redirect(`/game/view/${gameId}`);

            game.images = await gameModels.findImagesByGameId(gameId);
            game.tags = await gameModels.findTagsByGameId(gameId);

            res.render("edit_game", {
                game,
                user: req.user,
                flashMessages: {
                    error: req.flash("error"),
                    success: req.flash("success")
                }
            });

        } catch (err) {
            console.error("❌ Edit game page error:", err);
            res.status(500).redirect("/browse");
        }
    },

    // ==================================================
    // 4️⃣ UPDATE GAME (POST)
    // ==================================================
    postUpdateGame: async (req, res) => {
        try {
            const gameId = +req.params.id;
            const existingGame = await gameModels.findGameById(gameId);

            if (!existingGame) return res.status(404).json({ error: "ไม่พบเกม" });

            const isOwner = existingGame.User_id === req.user.User_id;
            const isAdmin = req.user.Roles === "Admin";
            if (!isOwner && !isAdmin) return res.status(403).json({ error: "ไม่มีสิทธิ์แก้ไขเกมนี้" });

            // ✅ รับข้อมูล
            const { Game_Title, Description, Status_Game, Details } = req.body;
            const updateData = { Game_Title, Description, Status_Game, Details };

            // ✅ อัปเดตไฟล์เกมใหม่ (ถ้ามี)
            const newGameFile = req.files?.file_game?.[0];
            if (newGameFile) {
                // ลบไฟล์เก่าใน S3
                if (existingGame.File_Game.includes("s3.amazonaws.com")) {
                    const key = getS3KeyFromUrl(existingGame.File_Game);
                    if (key) await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
                }
                updateData.File_Game = newGameFile.location;
            }

            console.log("req.body['delete_images']:", req.body['delete_images']);

            // ✅ ลบรูปเก่า
            let imagesToDelete = req.body.delete_images || [];
            if (!Array.isArray(imagesToDelete)) imagesToDelete = [imagesToDelete];

            for (const imgId of imagesToDelete) {
                const img = await gameModels.findImageById(+imgId);
                if (img?.Path.includes("amazonaws.com")) {
                    const key = getS3KeyFromUrl(img.Path);
                    if (key) {
                        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
                    }
                }
                await gameModels.deleteImage(+imgId);
            }

            // ✅ เพิ่มรูปใหม่
            const newImages = req.files?.images || [];
            for (const img of newImages) {
                await gameModels.createImage({ Path: img.location, Game_id: gameId });
            }

            // ✅ อัปเดต Tags
            let tags = req.body.tags || [];
            if (!Array.isArray(tags)) tags = [tags];
            const tagFlags = {
                Action: tags.includes("Action"),
                Adventure: tags.includes("Adventure"),
                Card_Game: tags.includes("Card_Game"),
                Educational: tags.includes("Educational"),
                Fighting: tags.includes("Fighting"),
                Interactive_Fiction: tags.includes("Interactive_Fiction"),
                Puzzle: tags.includes("Puzzle"),
                Racing: tags.includes("Racing"),
                Other: tags.includes("Other"),
            };
            await gameModels.updateTags(gameId, tagFlags);

            // ✅ อัปเดตข้อมูลเกม
            await gameModels.updateGame(gameId, updateData);

            const updatedImages = await gameModels.findImagesByGameId(gameId);

            return res.json({
                message: "✅ อัปเดตเกมสำเร็จ",
                game: { Game_id: gameId, images: updatedImages.map(i => i.Path) }
            });

        } catch (err) {
            console.error("❌ Update game error:", err);
            res.status(500).json({ error: "อัปเดตเกมไม่สำเร็จ" });
        }
    },

    // ==================================================
    // 5️⃣ DOWNLOAD GAME (REDIRECT + COUNT)
    // ==================================================
    getDownloadGame: async (req, res) => {
        try {
            const gameId = +req.params.id;
            const game = await gameModels.findGameById(gameId);
            if (!game) return res.status(404).send("ไม่พบเกม");

            await gameModels.incrementGameDownloads(gameId);

            if (game.File_Game.startsWith("http")) {
                return res.redirect(game.File_Game);
            }

            res.download(path.join(__dirname, "../public/game/file", game.File_Game));

        } catch (err) {
            console.error("❌ Download error:", err);
            res.status(500).send("ดาวน์โหลดไม่ได้");
        }
    },

    // ==================================================
    // 6️⃣ VIEW GAME PAGE
    // ==================================================
    getViewGamePage: async (req, res) => {
        try {
            const user = req.user || null;
            const gameId = +req.params.id;

            const game = await gameModels.findGameById(gameId);
            if (!game) return res.status(404).send("ไม่พบเกม");

            await gameModels.incrementGameViews(gameId);

            game.images = (await gameModels.findImagesByGameId(gameId)).map(i => i.Path);
            game.developer = await userModels.findByUserID(game.User_id);
            game.tags = await gameModels.findTagsByGameId(gameId);

            const comments = await gameModels.findReviewsByGameId(gameId);
            const reviews = comments.map(c => ({ ...c, timeAgo: dayjs(c.Created_At).fromNow() }));

            res.render("view_game", { game, reviews, user });

        } catch (err) {
            console.error("❌ View game error:", err);
            res.status(500).send("Server Error");
        }
    },

    // ==================================================
    // 7️⃣ GET GAME REVIEWS (JSON)
    // ==================================================
    getGameReview: async (req, res) => {
        try {
            const gameId = +req.params.id;
            const reviews = await gameModels.findReviewsByGameId(gameId);
            res.json(reviews);
        } catch (err) {
            console.error("❌ Reviews error:", err);
            res.status(500).send("Server Error");
        }
    },

    // ==================================================
    // 8️⃣ CREATE REVIEW
    // ==================================================
    postCreateReview: async (req, res) => {
        try {
            const userId = req.user?.User_id;
            if (!userId) return res.status(401).send("Unauthorized");

            const gameId = +req.params.id;
            await gameModels.createReview({ game_id: gameId, user_id: userId, comment: req.body.comment });

            res.redirect(`/game/view/${gameId}`);

        } catch (err) {
            console.error("❌ Create review error:", err);
            res.status(500).send("Server Error");
        }
    },

    // ==================================================
    // 9️⃣ DELETE GAME (SOFT DELETE)
    // ==================================================
    postDeleteGame: async (req, res) => {
        try {
            const gameId = +req.params.id;
            const userId = req.user?.User_id;

            if (!userId) return res.status(401).send("Unauthorized");

            const game = await gameModels.findGameById(gameId);
            if (!game) return res.status(404).send("ไม่พบเกม");

            const isOwner = game.User_id === userId;
            const isAdmin = req.user.Roles === "Admin";
            if (!isOwner && !isAdmin) return res.status(403).send("Forbidden");

            await gameModels.softDeleteGame(gameId);

            const from = req.query.from || "dashboard";
            if (from === "admin") return res.redirect("/admin");
            if (from === "edit") return res.json({ success: true });

            res.redirect("/dashboard");

        } catch (err) {
            console.error("❌ Delete game error:", err);
            res.status(500).send("Server Error");
        }
    }
};

// Export Controller
module.exports = gameController;
