// ==========================
// gameModels.js
// ==========================

// --------------------------
// Import Prisma Client
// --------------------------
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// --------------------------
// Helper Functions
// --------------------------
/**
 * แปลงชื่อ Tag ที่มีช่องว่างให้ตรงกับฟิลด์ใน Prisma
 * เช่น 'Card Game' → 'Card_Game'
 */
const mapTagToPrismaField = (tag) => {
    if (tag === 'Card Game') return 'Card_Game';
    if (tag === 'Interactive Fiction') return 'Interactive_Fiction';
    return tag.replace(/ /g, '_');
};

// =========================================================
// GAME MODELS (ข้อมูลหลักของเกม)
// =========================================================
const gameModels = {

    /**
     * สร้างเกมใหม่ (ไม่รวมรูปและแท็ก)
     */
    createGame: async (data) => prisma.games.create({
        data: {
            User_id: data.user_id,
            Game_Title: data.title_game,
            Description: data.description,
            Status_Game: data.status_game,
            Details: data.details,
            File_Game: data.File_Game || "default.zip", // ถ้าไม่มีไฟล์ ใช้ default.zip
        }
    }),

    incrementGameViews: async (gameId) => {
        return await prisma.games.update({
            where: { Game_id: gameId },
            data: { View: { increment: 1 } }, // ใช้คำสั่ง increment ของ Prisma
        });
    },

    incrementGameDownloads: async (gameId) => {
        return await prisma.games.update({
            where: { Game_id: gameId },
            data: { Download: { increment: 1 } }, // 💡 เพิ่มค่า Download
        });
    },

    /**
     * อัปเดตข้อมูลเกม (แก้ไขรายละเอียด)
     */
    updateGame: async (id, data) => {
        return await prisma.games.update({
            where: { Game_id: id },
            data: data
        });
    },

    /**
     * Soft Delete (ลบเกมแบบไม่ถาวร)
     */
    softDeleteGame: async (gameId) => {
        return await prisma.games.update({
            where: { Game_id: gameId },
            data: { Soft_Delete: 0 },
        });
    },

    /**
     * ค้นหาเกมด้วย ID (รวมข้อมูล tags)
     */
    findGameById: async (id) => {
        const gameId = Number(id);
        if (isNaN(gameId)) return null;

        return await prisma.games.findUnique({
            where: { Game_id: gameId },
            include: { tags: true }
        });
    },

    /**
     * ดึงเกมทั้งหมดที่ไม่ถูกลบ
     */
    getAllGames: async () => {
        return await prisma.games.findMany({
            where: {
                Soft_Delete: { not: 0 }
            },
            include: { tags: true },
            orderBy: { Game_id: 'desc' } // เรียงจากใหม่สุด
        });
    },

    /**
     * ดึงเกมทั้งหมดของผู้ใช้แต่ละคน
     */
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

    /**
     * ดึงเกมตามคำค้นหา + ตัวกรอง Tags + การเรียงลำดับ
     */
    getFilteredGames: async (query, tagArray, sortOrder = 'newest') => {
        // 1️⃣ สร้างเงื่อนไข Tags
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

        // 2️⃣ สร้างเงื่อนไขค้นหา (query)
        let queryConditions = {};
        if (query) {
            queryConditions = {
                OR: [
                    { Game_Title: { contains: query } },
                    { Description: { contains: query } },
                ]
            };
        }

        // 3️⃣ การเรียงลำดับ (Sort)
        let orderBy = { Game_id: 'desc' }; // ค่าเริ่มต้น = ใหม่สุด
        if (sortOrder === 'most_downloaded') orderBy = { Download: 'desc' };
        else if (sortOrder === 'most_viewed') orderBy = { View: 'desc' }; // Placeholder

        // 4️⃣ ดึงข้อมูลเกม
        return await prisma.games.findMany({
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
    // TAG MODELS (ข้อมูลหมวดหมู่เกม)
    // =========================================================

    /**
     * สร้าง Tags ของเกม
     */
    createTags: async (gameId, tags = []) => {
        return await prisma.tags.create({
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
        });
    },

    /**
     * อัปเดต Tags ของเกม (ถ้าไม่มีให้สร้างใหม่)
     */
    updateTags: async (gameId, tagsData) => {
        try {
            return await prisma.tags.upsert({
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

    /**
     * ดึง Tags ของเกม (ส่งเป็น array ของชื่อ tag ที่มีค่า 1)
     */
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
    // IMAGE MODELS (ข้อมูลรูปภาพของเกม)
    // =========================================================

    /**
     * บันทึกรูปภาพใหม่ของเกม
     */
    createImage: async (data) => {
        return await prisma.game_image.create({
            data: {
                Path: `/game/img/${data.url}`,
                Game_id: data.game_id
            }
        });
    },

    /**
     * ดึงรูปภาพทั้งหมดของเกม
     */
    findImagesByGameId: async (gameId) => {
        return await prisma.game_image.findMany({
            where: { Game_id: gameId },
            select: { Path: true, Game_Image_id: true }
        });
    },

    /**
     * ดึงรูปภาพตาม ID
     */
    findImageById: async (imageId) => {
        return await prisma.game_image.findUnique({
            where: { Game_Image_id: imageId }
        });
    },

    /**
     * ลบรูปภาพด้วย ID
     */
    deleteImage: async (imageId) => {
        return await prisma.game_image.delete({
            where: { Game_Image_id: imageId }
        });
    },

    // =========================================================
    // REVIEW MODELS (รีวิวของผู้ใช้)
    // =========================================================

    /**
     * เพิ่มรีวิวใหม่ให้กับเกม
     */
    createReview: async (data) => {
        return await prisma.review.create({
            data: {
                Game_id: data.game_id,
                User_id: data.user_id,
                Comment: data.comment
            }
        });
    },

    /**
     * ดึงรีวิวทั้งหมดของเกม (เรียงจากใหม่สุด)
     */
    findReviewsByGameId: async (gameId) => {
        return await prisma.review.findMany({
            where: { Game_id: gameId },
            include: { account: true },
            orderBy: { Created_At: 'desc' }
        });
    },

    findAllGames: async () => {
        try {
            const gamesData = await prisma.games.findMany({
                where: {
                    Soft_Delete: 1 // ดึงเฉพาะเกมที่ยังไม่ถูกซ่อน (Soft Delete = 1)
                },
                select: {
                    Game_id: true,
                    Game_Title: true,
                    View: true,
                    Download: true,
                    Game_Images: { // ดึงข้อมูลรูปภาพเกมที่เกี่ยวข้อง
                        take: 1, // เอาแค่รูปแรก (สมมติว่าเป็นรูปปก)
                        select: {
                            Path: true // Path คือชื่อไฟล์รูปภาพ
                        }
                    }
                },
                orderBy: {
                    Game_id: 'desc' // เรียงลำดับเกมล่าสุด
                }
            });

            // จัดรูปแบบข้อมูลให้ตรงกับที่ EJS คาดหวัง
            // EJS คาดหวัง: Game_ID, Game_Title, views, downloads, Game_Cover
            return gamesData.map(game => ({
                Game_ID: game.Game_id,
                Game_Title: game.Game_Title,
                // แปลงชื่อ field ให้ตรงกับ EJS
                views: game.View,
                downloads: game.Download,
                // กำหนดรูปปก: /game/img/ + ชื่อไฟล์
                Game_Cover: game.Game_Images.length > 0
                            ? game.Game_Images[0].Path // 💡 ต้องต่อ Path ที่ถูกต้อง
                            : '/img/default_cover.jpg' // ใช้ default ถ้าไม่มีรูป
            }));

        } catch (error) {
            console.error("Prisma Error in findAllGames:", error);
            // ส่ง error ขึ้นไปเพื่อให้ Controller จัดการต่อ
            throw new Error("Failed to fetch game list.");
        }
    },

};

// --------------------------
// Export Game Models
// --------------------------
module.exports = gameModels;
