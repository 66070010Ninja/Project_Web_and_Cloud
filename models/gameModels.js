// ==========================
// gameModels.js
// ==========================

// --------------------------
// Import Prisma Client
// --------------------------
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const mapTagToPrismaField = (tag) => {
    // การจัดการพิเศษสำหรับชื่อที่มีช่องว่าง
    if (tag === 'Card Game') return 'Card_Game';
    if (tag === 'Interactive Fiction') return 'Interactive_Fiction';
    // สำหรับชื่ออื่น ๆ ที่ไม่มีช่องว่าง
    return tag.replace(/ /g, '_');
};

// --------------------------
// Game Models
// --------------------------
const gameModels = {

    // ----------------------
    // สร้างเกมใหม่
    // ----------------------
    createGame: async (data) => prisma.games.create({
        data: {
            User_id: data.user_id,
            Game_Title: data.title_game,
            Description: data.description,
            Status_Game: data.status_game,
            Details: data.details,
            File_Game: data.File_Game || "default.zip" // ถ้าไม่มีไฟล์ ใช้ default.zip
        }
    }),

    // ----------------------
    // สร้าง Tags ของเกม
    // ----------------------
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

    // ----------------------
    // บันทึกรูปภาพของเกม
    // ----------------------
    createImage: async (data) => {
        return await prisma.game_image.create({
            data: {
                Path: `/game/img/${data.url}`, // เก็บ Path ของรูป
                Game_id: data.game_id
            }
        });
    },

    // ----------------------
    // ค้นหาเกมด้วย ID
    // ----------------------
    findGameById: async (id) => {
        const gameId = Number(id);
        if (isNaN(gameId)) return null;

        return await prisma.games.findUnique({
            where: { Game_id: id },
            include: { tags: true } // รวมข้อมูล Tags มาด้วย
        });
    },

    // ----------------------
    // อัปเดตข้อมูลเกม
    // ----------------------
    updateGame: async (id, data) => {
        return await prisma.games.update({
            where: { Game_id: id },
            data: data
        });
    },

    // ----------------------
    // อัปเดต Tags ของเกม
    // ----------------------
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

    // ----------------------
    // เพิ่มรีวิวใหม่
    // ----------------------
    createReview: async (data) => {
        return await prisma.review.create({
            data: {
                Game_id: data.game_id,
                User_id: data.user_id,
                Comment: data.comment
            }
        });
    },

    // ----------------------
    // ดึงรีวิวทั้งหมดของเกม
    // ----------------------
    findReviewsByGameId: async (gameId) => {
        return await prisma.review.findMany({
            where: { Game_id: gameId },
            include: { account: true },           // รวมข้อมูลผู้ใช้ที่รีวิว
            orderBy: { Created_At: 'desc' }       // เรียงตามเวลาล่าสุดก่อน
        });
    },

    // ฟังก์ชันดึงเกมทั้งหมด
    getAllGames: async () => {
        return await prisma.games.findMany({
            where: {
                Soft_Delete: {
                    not: 0
                }
            },
            include: { tags: true },   // ถ้าอยากดึง tags ด้วย
            orderBy: { Game_id: 'desc' } // เรียงจากล่าสุด
        });
    },

    getGamesByUserId: async (userId) => {
        try {
            return await prisma.games.findMany({
                where: {
                    User_id: userId,
                    Soft_Delete: {
                        not: 0
                    }
                }
            });
        } catch (error) {
            console.error("Error fetching user's games:", error);
            throw error;
        }
    },

    // ----------------------
    // ดึงรูปภาพของเกม
    // ----------------------
    findImagesByGameId: async (gameId) => {
        return await prisma.game_image.findMany({
            where: { Game_id: gameId },
            select: { Path: true, Game_Image_id: true } // ส่ง Path และ ID
        });
    },

    findImageById: async (imageId) => {
        return await prisma.game_image.findUnique({
            where: { Game_Image_id: imageId }
        });
    },

    // ----------------------
    // ลบรูปภาพด้วย ID
    // ----------------------
    deleteImage: async (imageId) => {
        return await prisma.game_image.delete({
            where: { Game_Image_id: imageId }
        });
    },

    softDeleteGame: async (gameId) => {
        return await prisma.games.update({
            where: { Game_id: gameId },
            data: { Soft_Delete: 0 },
        });
    },

    // ----------------------
    // ดึง tags ของเกม (ส่งเป็น array ของชื่อ tag ที่มีค่า 1)
    // ----------------------
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

    getFilteredGames: async (query, tagArray, sortOrder = 'newest') => {
        // 1. เตรียมเงื่อนไข WHERE สำหรับ Tags
        let tagConditions = {};
        if (tagArray && tagArray.length > 0) {
            // เงื่อนไข: ต้องมี Game_id ที่มี Tags ครบตามที่ระบุ
            // เราจะหา Game_id ที่ตรงกับเงื่อนไข Tags ทั้งหมด
            const andConditions = tagArray.map(tag => {
                const field = mapTagToPrismaField(tag);
                return {
                    [field]: 1 // ต้องมีค่าเป็น 1
                };
            });

            // ดึง Tags ทั้งหมดที่ตรงตามเงื่อนไข
            const matchingTags = await prisma.tags.findMany({
                where: {
                    AND: andConditions
                },
                select: { Game_id: true }
            });

            // ดึงเฉพาะ Game_id ออกมาเป็น Array
            const matchingGameIds = matchingTags.map(tag => tag.Game_id);

            // ถ้าไม่มี Game_id ที่ตรงเลย ให้ส่งเงื่อนไขที่ไม่มีทางเป็นจริงเพื่อไม่ให้ดึงเกมใด ๆ
            if (matchingGameIds.length === 0) {
                return [];
            }

            // ใช้ Game_id ที่ตรงกับ Tags เป็นเงื่อนไขหลักในการค้นหาเกม
            tagConditions = {
                Game_id: {
                    in: matchingGameIds
                }
            };
        }

        // 2. เตรียมเงื่อนไข WHERE สำหรับคำค้นหา (Query)
        let queryConditions = {};
        if (query) {
            queryConditions = {
                OR: [
                    { Game_Title: { contains: query } },
                    { Description: { contains: query } },
                ]
            };
        }

        // 3. เตรียมเงื่อนไข ORDER BY (เรียงลำดับ)
        let orderBy = { Game_id: 'desc' }; // default: newest
        if (sortOrder === 'most_downloaded') {
            orderBy = { Download: 'desc' };
        } else if (sortOrder === 'most_liked') {
            // สมมติว่าคุณมีคอลัมน์ Like หรือ Rating ที่ใช้แทน Like ได้
            // แต่จาก schema.prisma ที่ให้มา ไม่มีคอลัมน์ Like/Rating โดยตรง
            // ให้คงไว้เป็น Game_id: 'desc' ไปก่อน หรือถ้ามีฟังก์ชัน Like/Rating แยก ให้ใช้คอลัมน์นั้น
            orderBy = { Game_id: 'desc' }; // 
        }

        // 4. ดึงข้อมูลเกม
        return await prisma.games.findMany({
            where: {
                ...tagConditions, // เงื่อนไขจาก Tags
                ...queryConditions, // เงื่อนไขจาก Query
                Soft_Delete: { not: 0 } // ไม่รวมเกมที่ถูกลบแบบ Soft Delete
            },
            include: { tags: true },
            orderBy: orderBy
        });
    },

};

// --------------------------
// Export Game Models
// --------------------------
module.exports = gameModels;
