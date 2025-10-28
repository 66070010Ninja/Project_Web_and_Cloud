// ==========================
// gameModels.js
// ==========================

// --------------------------
// Import Prisma Client
// --------------------------
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');

// --------------------------
// Environment Config
// --------------------------
const USE_S3 = process.env.USE_S3 === "true";
const S3_BUCKET = process.env.AWS_S3_BUCKET_NAME;
const S3_REGION = process.env.AWS_REGION || "ap-southeast-1";

// --------------------------
// Helper Functions
// --------------------------
/**
 * แปลงชื่อ Tag ที่มีช่องว่างให้ตรงกับฟิลด์ใน Prisma
 */
const mapTagToPrismaField = (tag) => {
    if (tag === 'Card Game') return 'Card_Game';
    if (tag === 'Interactive Fiction') return 'Interactive_Fiction';
    return tag.replace(/ /g, '_');
};

/**
 * ✅ Helper: คืนค่า path หรือ URL ของไฟล์ (S3 / Local)
 */
const buildFilePath = (folder, filename) => {
    if (USE_S3) {
        // คืน URL เต็มของไฟล์บน S3
        return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${folder}/${filename}`;
    }
    // คืน path ภายใน public (ใช้ใน Local)
    return `/${folder}/${filename}`;
};

// =========================================================
// GAME MODELS
// =========================================================
const gameModels = {

    /**
     * สร้างเกมใหม่
     */
    createGame: async (data) => prisma.games.create({
        data: {
            User_id: data.user_id,
            Game_Title: data.title_game,
            Description: data.description,
            Status_Game: data.status_game,
            Details: data.details,
            File_Game: data.File_Game || "default.zip",
        }
    }),

    incrementGameViews: async (gameId) => prisma.games.update({
        where: { Game_id: gameId },
        data: { View: { increment: 1 } },
    }),

    incrementGameDownloads: async (gameId) => prisma.games.update({
        where: { Game_id: gameId },
        data: { Download: { increment: 1 } },
    }),

    updateGame: async (id, data) => prisma.games.update({
        where: { Game_id: id },
        data: data
    }),

    softDeleteGame: async (gameId) => prisma.games.update({
        where: { Game_id: gameId },
        data: { Soft_Delete: 0 },
    }),

    findGameById: async (id) => {
        const gameId = Number(id);
        if (isNaN(gameId)) return null;
        return prisma.games.findUnique({
            where: { Game_id: gameId },
            include: { tags: true }
        });
    },

    getAllGames: async () => prisma.games.findMany({
        where: { Soft_Delete: { not: 0 } },
        include: { tags: true },
        orderBy: { Game_id: 'desc' }
    }),

    getGamesByUserId: async (userId) => {
        try {
            return await prisma.games.findMany({
                where: {
                    User_id: userId,
                    Soft_Delete: { not: 0 }
                }
            });
        } catch (error) {
            console.error("Error fetching user's games:", error);
            throw error;
        }
    },

    getFilteredGames: async (query, tagArray, sortOrder = 'newest') => {
        let tagConditions = {};
        if (tagArray && tagArray.length > 0) {
            const andConditions = tagArray.map(tag => ({
                [mapTagToPrismaField(tag)]: 1
            }));

            const matchingTags = await prisma.tags.findMany({
                where: { AND: andConditions },
                select: { Game_id: true }
            });

            const matchingGameIds = matchingTags.map(tag => tag.Game_id);
            if (matchingGameIds.length === 0) return [];
            tagConditions = { Game_id: { in: matchingGameIds } };
        }

        let queryConditions = {};
        if (query) {
            queryConditions = {
                OR: [
                    { Game_Title: { contains: query } },
                    { Description: { contains: query } },
                ]
            };
        }

        let orderBy = { Game_id: 'desc' };
        if (sortOrder === 'most_downloaded') orderBy = { Download: 'desc' };
        else if (sortOrder === 'most_viewed') orderBy = { View: 'desc' };

        return prisma.games.findMany({
            where: {
                ...tagConditions,
                ...queryConditions,
                Soft_Delete: { not: 0 }
            },
            include: { tags: true },
            orderBy: orderBy
        });
    },

    // =========================================================
    // TAG MODELS
    // =========================================================
    createTags: async (gameId, tags = []) => prisma.tags.create({
        data: {
            Game_id: gameId,
            Action: tags.includes("Action") ? 1 : 0,
            Adventure: tags.includes("Adventure") ? 1 : 0,
            Card_Game: tags.includes("Card_Game") ? 1 : 0,
            Educational: tags.includes("Educational") ? 1 : 0,
            Fighting: tags.includes("Fighting") ? 1 : 0,
            Interactive_Fiction: tags.includes("Interactive_Fiction") ? 1 : 0,
            Puzzle: tags.includes("Puzzle") ? 1 : 0,
            Racing: tags.includes("Racing") ? 1 : 0,
            Other: tags.includes("Other") ? 1 : 0
        }
    }),

    updateTags: async (gameId, tagsData) => {
        try {
            return prisma.tags.upsert({
                where: { Game_id: gameId },
                update: tagsData,
                create: {
                    Game_id: gameId,
                    ...tagsData
                }
            });
        } catch (error) {
            console.error("Error updating tags:", error);
            throw error;
        }
    },

    findTagsByGameId: async (gameId) => {
        const tagRecord = await prisma.tags.findUnique({
            where: { Game_id: gameId }
        });
        if (!tagRecord) return [];
        const tagNames = [];
        for (let key of ["Action", "Adventure", "Card_Game", "Educational", "Fighting", "Interactive_Fiction", "Puzzle", "Racing", "Other"]) {
            if (tagRecord[key] === 1) tagNames.push(key);
        }
        return tagNames;
    },

    // =========================================================
    // IMAGE MODELS
    // =========================================================
    createImage: async (data) => {
        // ⚙️ ถ้าใช้ S3 ให้บันทึก URL เต็ม
        const imagePath = USE_S3
            ? buildFilePath("game/img", data.url)
            : `/game/img/${data.url}`;

        return prisma.game_image.create({
            data: {
                Path: imagePath,
                Game_id: data.game_id
            }
        });
    },

    findImagesByGameId: async (gameId) =>
        prisma.game_image.findMany({
            where: { Game_id: gameId },
            select: { Path: true, Game_Image_id: true }
        }),

    findImageById: async (imageId) =>
        prisma.game_image.findUnique({
            where: { Game_Image_id: imageId }
        }),

    deleteImage: async (imageId) =>
        prisma.game_image.delete({
            where: { Game_Image_id: imageId }
        }),

    // =========================================================
    // REVIEW MODELS
    // =========================================================
    createReview: async (data) =>
        prisma.review.create({
            data: {
                Game_id: data.game_id,
                User_id: data.user_id,
                Comment: data.comment
            }
        }),

    findReviewsByGameId: async (gameId) =>
        prisma.review.findMany({
            where: { Game_id: gameId },
            include: { account: true },
            orderBy: { Created_At: 'desc' }
        }),

    findAllGames: async () => {
        try {
            const gamesData = await prisma.games.findMany({
                where: { Soft_Delete: 1 },
                select: {
                    Game_id: true,
                    Game_Title: true,
                    View: true,
                    Download: true,
                    Game_Images: {
                        take: 1,
                        select: { Path: true }
                    }
                },
                orderBy: { Game_id: 'desc' }
            });

            return gamesData.map(game => ({
                Game_ID: game.Game_id,
                Game_Title: game.Game_Title,
                views: game.View,
                downloads: game.Download,
                Game_Cover: game.Game_Images.length > 0
                    ? game.Game_Images[0].Path
                    : '/img/default_cover.jpg'
            }));

        } catch (error) {
            console.error("Prisma Error in findAllGames:", error);
            throw new Error("Failed to fetch game list.");
        }
    },

};

// --------------------------
// Export Game Models
// --------------------------
module.exports = gameModels;
