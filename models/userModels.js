// ==========================
// userModels.js
// ==========================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const userModels = {

    // สร้างผู้ใช้ใหม่ (Register)
    create: async (data) => {
        return await prisma.account.create({
            data: {
                User_Name: data.username,
                Email: data.email,
                Hashed_Password: data.password
            }
        });
    },

    // ดึง user โดยใช้ user_id
    getUser: async (user_id) => {
        return await prisma.account.findUnique({
            where: { User_id: user_id },
            include: { Profile_Image: true }
        });
    },

    // ค้นหาผู้ใช้ด้วย Username
    findByUsername: async (username) => {
        return await prisma.account.findUnique({
            where: { User_Name: username }
        });
    },

    // ค้นหาผู้ใช้ด้วย User ID
    findByUserID: async (user_id) => {
        return await prisma.account.findUnique({
            where: { User_id: user_id },
            include: { Profile_Image: true }
        });
    },

    // อัปเดตข้อมูลผู้ใช้
    updateUser: async (id, data) => {
        return await prisma.account.update({
            where: { User_id: id },
            data: {
                ...(data.User_Name && { User_Name: data.User_Name }),
                ...(data.Email && { Email: data.Email }),
                ...(data.Hashed_Password && { Hashed_Password: data.Hashed_Password })
            }
        });
    },

    // เพิ่มรูปโปรไฟล์
    addProfileImage: async (userId, path) => {
        return await prisma.user_image.create({
            data: {
                Path: path,
                User_id: userId
            }
        });
    },
};

module.exports = userModels;
