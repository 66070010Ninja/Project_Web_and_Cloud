// ==========================
// userModels.js
// ==========================

// --------------------------
// Import Prisma Client
// --------------------------
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// --------------------------
// User Models
// --------------------------
const userModels = {

    // ----------------------
    // สร้างผู้ใช้ใหม่ (Register)
    // ----------------------
    create: async (data) => {
        return await prisma.account.create({
            data: {
                User_Name: data.username,
                Email: data.email,
                Hashed_Password: data.password
            }
        });
    },

    // ----------------------
    // ค้นหาผู้ใช้ด้วย Username (ใช้ตอน Login)
    // ----------------------
    findByUsername: async (username) => {
        return await prisma.account.findUnique({
            where: {
                User_Name: username
            }
        });
    },

    // ----------------------
    // ค้นหาผู้ใช้ด้วย User ID
    // ----------------------
    findByUserID: async (user_id) => {
        return await prisma.account.findUnique({
            where: {
                User_id: user_id
            }
        });
    },

    // ----------------------
    // อัปเดตข้อมูลผู้ใช้ (Edit Profile)
    // ----------------------
    updateUser: async (id, data) => {
        return await prisma.account.update({
            where: {
                User_id: id
            },
            data: data
        });
    },
};

// --------------------------
// Export User Models
// --------------------------
module.exports = userModels;
