// ==========================
// userModels.js
// ==========================

// --------------------------
// Import Prisma Client
// --------------------------
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// =========================================================
// USER MODELS (จัดการข้อมูลผู้ใช้และโปรไฟล์)
// =========================================================
const userModels = {

    // -----------------------------------------------------
    // ✅ สร้างบัญชีผู้ใช้ใหม่ (Register)
    // -----------------------------------------------------
    create: async (data) => {
        return await prisma.account.create({
            data: {
                User_Name: data.username,
                Email: data.email,
                Hashed_Password: data.password
            }
        });
    },

    // -----------------------------------------------------
    // ✅ ดึงข้อมูลผู้ใช้จาก User ID
    // -----------------------------------------------------
    getUser: async (user_id) => {
        return await prisma.account.findUnique({
            where: { User_id: user_id },
            include: { Profile_Image: true } // รวมข้อมูลรูปโปรไฟล์
        });
    },

    // -----------------------------------------------------
    // ✅ ค้นหาผู้ใช้ด้วย Username
    // -----------------------------------------------------
    findByUsername: async (username) => {
        return await prisma.account.findUnique({
            where: { User_Name: username }
        });
    },

    // -----------------------------------------------------
    // ✅ ค้นหาผู้ใช้ด้วย ID (รวมรูปโปรไฟล์)
    // -----------------------------------------------------
    findByUserID: async (user_id) => {
        return await prisma.account.findUnique({
            where: { User_id: user_id },
            include: { Profile_Image: true }
        });
    },

    // -----------------------------------------------------
    // ✅ อัปเดตข้อมูลผู้ใช้
    // -----------------------------------------------------
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

    // =========================================================
    // PROFILE IMAGE MODELS (รองรับ S3 URL)
    // =========================================================

    // -----------------------------------------------------
    // ✅ เพิ่มหรืออัปโหลดรูปโปรไฟล์ให้ผู้ใช้ (S3 URL)
    // -----------------------------------------------------
    /**
     * @param {number} userId - รหัสผู้ใช้
     * @param {string} imageUrl - URL ของรูปภาพใน S3
     */
    addProfileImage: async (userId, imageUrl) => {
        // ตรวจสอบว่าผู้ใช้นี้มีรูปอยู่แล้วไหม
        const existing = await prisma.user_image.findUnique({
            where: { User_id: userId }
        });

        if (existing) {
            // 👉 ถ้ามีแล้ว → อัปเดตเป็น URL ใหม่
            return await prisma.user_image.update({
                where: { User_id: userId },
                data: { Path: imageUrl }
            });
        } else {
            // 👉 ถ้ายังไม่มี → เพิ่มรายการใหม่
            return await prisma.user_image.create({
                data: {
                    Path: imageUrl,
                    User_id: userId
                }
            });
        }
    },

};

module.exports = userModels;
