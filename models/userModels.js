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
    /**
     * ใช้สร้างบัญชีผู้ใช้ใหม่ในระบบ
     * @param {Object} data - ข้อมูลผู้ใช้ { username, email, password }
     */
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
    /**
     * ใช้ดึงข้อมูลผู้ใช้ตาม User ID
     * @param {number} user_id - รหัสผู้ใช้
     */
    getUser: async (user_id) => {
        return await prisma.account.findUnique({
            where: { User_id: user_id },
            include: { Profile_Image: true } // รวมข้อมูลรูปโปรไฟล์
        });
    },

    // -----------------------------------------------------
    // ✅ ค้นหาผู้ใช้ด้วย Username (สำหรับ login / ตรวจสอบชื่อซ้ำ)
    // -----------------------------------------------------
    /**
     * ค้นหาผู้ใช้ด้วย Username
     * @param {string} username - ชื่อผู้ใช้
     */
    findByUsername: async (username) => {
        return await prisma.account.findUnique({
            where: { User_Name: username }
        });
    },

    // -----------------------------------------------------
    // ✅ ค้นหาผู้ใช้ด้วย User ID (เหมือน getUser แต่ใช้ชื่อสื่อความชัด)
    // -----------------------------------------------------
    /**
     * ค้นหาผู้ใช้ด้วย ID (รวมรูปโปรไฟล์)
     * @param {number} user_id - รหัสผู้ใช้
     */
    findByUserID: async (user_id) => {
        return await prisma.account.findUnique({
            where: { User_id: user_id },
            include: { Profile_Image: true }
        });
    },

    // -----------------------------------------------------
    // ✅ อัปเดตข้อมูลผู้ใช้ (ชื่อ, อีเมล, รหัสผ่าน)
    // -----------------------------------------------------
    /**
     * ใช้สำหรับอัปเดตข้อมูลบัญชีผู้ใช้
     * @param {number} id - รหัสผู้ใช้
     * @param {Object} data - ข้อมูลที่ต้องการอัปเดต
     */
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
    // PROFILE IMAGE MODELS (รูปโปรไฟล์ผู้ใช้)
    // =========================================================

    // -----------------------------------------------------
    // ✅ เพิ่มรูปโปรไฟล์ใหม่ให้ผู้ใช้
    // -----------------------------------------------------
    /**
     * เพิ่มหรืออัปโหลดรูปโปรไฟล์ให้ผู้ใช้
     * @param {number} userId - รหัสผู้ใช้
     * @param {string} path - ที่อยู่ไฟล์รูปภาพ (Path)
     */
    addProfileImage: async (userId, path) => {
        return await prisma.user_image.create({
            data: {
                Path: path,
                User_id: userId
            }
        });
    },

};

// --------------------------
// Export User Models
// --------------------------
module.exports = userModels;
