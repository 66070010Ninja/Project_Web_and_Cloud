// ==========================
// gameModels.js
// ==========================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const USE_S3 = process.env.USE_S3 === "true";
const S3_BUCKET = process.env.AWS_S3_BUCKET_NAME;
const S3_REGION = process.env.AWS_REGION || "ap-southeast-1";

const s3 = new S3Client({ region: S3_REGION });

// --------------------------
// Helper Functions
// --------------------------
const mapTagToPrismaField = (tag) => {
    if (tag === 'Card Game') return 'Card_Game';
    if (tag === 'Interactive Fiction') return 'Interactive_Fiction';
    return tag.replace(/ /g, '_');
};

const buildFilePath = (folder, filename) => {
    if (USE_S3) {
        const hasFolder = filename.includes('/') || filename.includes('\\');
        const key = hasFolder ? filename : `${folder}/${filename}`;
        return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
    }
    return `/${folder}/${filename}`;
};

const getS3KeyFromUrl = (url) => {
    const prefix = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/`;
    return url?.startsWith(prefix) ? url.slice(prefix.length) : null;
};

// =========================================================
// GAME MODELS
// =========================================================
const gameModels = {

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

    updateGame: async (id, data) => prisma.games.update({
        where: { Game_id: id },
        data
    }),

    incrementGameViews: async (gameId) => prisma.games.update({
        where: { Game_id: gameId },
        data: { View: { increment: 1 } },
    }),

    incrementGameDownloads: async (gameId) => prisma.games.update({
        where: { Game_id: gameId },
        data: { Download: { increment: 1 } },
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

    getGamesByUserId: async (userId) => prisma.games.findMany({
        where: { User_id: userId, Soft_Delete: { not: 0 } }
    }),

    getFilteredGames: async (query, tagArray, sortOrder = 'newest') => {
        let tagConditions = {};
        if (tagArray?.length) {
            const andConditions = tagArray.map(tag => ({ [mapTagToPrismaField(tag)]: 1 }));
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
            orderBy
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
        const tagsInt = {};
        for (const key in tagsData) tagsInt[key] = tagsData[key] ? 1 : 0;
        return prisma.tags.upsert({
            where: { Game_id: gameId },
            update: tagsInt,
            create: { Game_id: gameId, ...tagsInt }
        });
    },

    findTagsByGameId: async (gameId) => {
        const tagRecord = await prisma.tags.findUnique({ where: { Game_id: gameId } });
        if (!tagRecord) return [];
        return ["Action", "Adventure", "Card_Game", "Educational", "Fighting", "Interactive_Fiction", "Puzzle", "Racing", "Other"]
            .filter(k => tagRecord[k] === 1);
    },

    // =========================================================
    // IMAGE MODELS
    // =========================================================
    createImage: async (data) => {
        const url = data.Path || data.path || null;
        const gameId = data.Game_id || data.game_id;

        if (!gameId) throw new Error("Game ID is required for createImage");

        let imagePath;
        if (url) {
            if (USE_S3) {
                imagePath = url.startsWith('http') ? url : buildFilePath("", url);
            } else {
                imagePath = `/${url}`;
            }
        } else {
            imagePath = '/default-cover.png';
        }

        return prisma.game_image.create({
            data: { Path: imagePath, Game_id: gameId }
        });
    },

    findImagesByGameId: async (gameId) =>
        prisma.game_image.findMany({
            where: { Game_id: gameId },
            select: { Path: true, Game_Image_id: true }
        }),

    findImageById: async (imageId) =>
        prisma.game_image.findUnique({ where: { Game_Image_id: imageId } }),

    deleteImage: async (imageId) => {
        const image = await prisma.game_image.findUnique({ where: { Game_Image_id: imageId } });
        if (!image) return;

        if (USE_S3 && image.Path?.includes(`${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`)) {
            const key = getS3KeyFromUrl(image.Path);
            if (key) await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
        }

        await prisma.game_image.delete({ where: { Game_Image_id: imageId } });
        return true;
    },

    // =========================================================
    // REVIEW MODELS
    // =========================================================
    createReview: async (data) => prisma.review.create({
        data: { Game_id: data.game_id, User_id: data.user_id, Comment: data.comment }
    }),

    findReviewsByGameId: async (gameId) => prisma.review.findMany({
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
                    Game_Images: { take: 1, select: { Path: true } }
                },
                orderBy: { Game_id: 'desc' }
            });

            return gamesData.map(game => ({
                Game_ID: game.Game_id,
                Game_Title: game.Game_Title,
                views: game.View,
                downloads: game.Download,
                Game_Cover: game.Game_Images.length > 0 ? game.Game_Images[0].Path : '/img/default_cover.jpg'
            }));

        } catch (error) {
            console.error("Prisma Error in findAllGames:", error);
            throw new Error("Failed to fetch game list.");
        }
    },
};

module.exports = gameModels;
