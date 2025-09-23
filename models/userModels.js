// ==========================
// models/userModels.js
// ==========================

// นำเข้า PrismaClient จาก @prisma/client
const { PrismaClient } = require('@prisma/client');

// สร้าง instance ของ PrismaClient เพื่อใช้เชื่อมต่อฐานข้อมูล
const prisma = new PrismaClient();

// ==========================
// โมเดลสำหรับจัดการข้อมูลผู้ใช้
// ==========================
const userModels = {

    // ==========================
    // ฟังก์ชันสร้างผู้ใช้ใหม่
    // ==========================
    create: async (data) => {
        // ใช้ Prisma สร้างแถวใหม่ในตาราง account
        return await prisma.account.create({
            data: {
                User_Name: data.username,       // กำหนดชื่อผู้ใช้
                Email: data.email,              // กำหนดอีเมล
                Hashed_Password: data.password  // กำหนดรหัสผ่านที่เข้ารหัสแล้ว
            }
        });
    },

    // ==========================
    // ฟังก์ชันค้นหาผู้ใช้ตาม username
    // ==========================
    findByUsername: async (username) => {
        // ใช้ Prisma ค้นหาผู้ใช้จากคอลัมน์ User_Name
        return await prisma.account.findUnique({
            where: {
                User_Name: username
            }
        });
    },

    findByUserID: async (user_id) => {
        return await prisma.account.findUnique({
            where: {
                User_id: user_id
            }
        });
    },

    updateUser: async (id, data) => {
        return await prisma.account.update({
            where: {
                User_id: id
            },
            data: data
        });
    },
};

// ==========================
// ส่งออกโมเดลเพื่อใช้ใน controller หรือที่อื่น ๆ
// ==========================
module.exports = userModels;
