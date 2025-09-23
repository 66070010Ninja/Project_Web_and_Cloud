// ==========================
// models/gameModels.js
// ==========================

// นำเข้า Prisma Client
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ==========================
// โมดูลสำหรับจัดการข้อมูลเกม
// ==========================
const gameModels = {

    // ==========================
    // สร้างเกมใหม่
    // ==========================
    createGame: async (data) => prisma.games.create({
        data: {
            User_id: data.user_id,
            Game_Title: data.title_game,
            Description: data.description,
            Status_Game: data.status_game,
            Details: data.details,
            File_Game: data.File_Game || "default.zip"
        }
    }),

    // ==========================
    // สร้าง tags สำหรับเกม
    // ==========================
    createTags: async (gameId, tags = []) => {
        return await prisma.tags.create({
            data: {
                Game_id: gameId,                             // ID เกมที่เกี่ยวข้อง
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

    createImage: async (data) => {
        return await prisma.game_image.create({
            data: {
                Path: `/game/img/${data.url}`, // path ของไฟล์
                Game_id: data.game_id          // ID ของเกมที่ relation
            }
        });
    },


    // ==========================
    // ค้นหาเกมด้วย ID
    // ==========================
    findGameById: async (id) => {
        return await prisma.games.findUnique({
            where: { Game_id: id },
            include: { tags: true } // ดึงข้อมูล tags ของเกมด้วย
        });
    },

    // ==========================
    // อัปเดตข้อมูลเกม
    // ==========================
    updateGame: async (id, data) => {
        return await prisma.games.update({
            where: { Game_id: id },
            data: data
        });
    },

    // ==========================
    // อัปเดต tags ของเกม
    // ==========================
    updateTags: async (gameId, tagsData) => {
        return await prisma.tags.update({
            where: { Game_id: gameId },
            data: tagsData
        });
    },

    // ==========================
    // สร้าง Review ใหม่
    // ==========================
    createReview: async (data) => {
        return await prisma.review.create({
            data: {
                Game_id: data.game_id,  // ID เกมที่รีวิว
                User_id: data.user_id,  // ID ผู้ใช้ที่รีวิว
                Comment: data.comment   // ข้อความรีวิว
            }
        });
    },

    // ==========================
    // ดึง Review ทั้งหมดของเกม
    // ==========================
    findReviewsByGameId: async (gameId) => {
        return await prisma.review.findMany({
            where: { Game_id: gameId },
            include: { account: true },         // ดึงข้อมูลผู้ใช้ด้วย
            orderBy: { Created_At: 'desc' }     // เรียงจากล่าสุดไปเก่าสุด
        });
    },

};

// ==========================
// ส่งออกโมดูล
// ==========================
module.exports = gameModels;
