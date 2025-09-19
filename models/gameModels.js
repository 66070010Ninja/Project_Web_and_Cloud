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
    createGame: async (data) => {
        return await prisma.games.create({
            data: {
                User_id: data.user_id,           // ID ผู้ใช้ที่สร้างเกม
                Game_Title: data.title_game,     // ชื่อเกม
                Description: data.description,   // คำอธิบายเกม
                Status_Game: data.status_game,   // สถานะเกม
                Details: data.details,           // รายละเอียดเพิ่มเติม
                Game_Image: "default.png",       // ตั้งค่า default image
                File_Game: "default.zip"         // ตั้งค่า default file
            }
        });
    },

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

};

// ==========================
// ส่งออกโมดูล
// ==========================
module.exports = gameModels;
