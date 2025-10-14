// ==========================
// adminController.js
// ==========================

// --------------------------
// Import Dependencies
// --------------------------
// 💡 ดึง model ที่ใช้จัดการข้อมูล "เกม" จาก database
const gameModels = require('../models/gameModels'); 


// --------------------------
// Controller Definition
// --------------------------
// 💡 รวมฟังก์ชันที่ใช้ควบคุมการทำงานฝั่ง Admin
const adminController = {

    /**
     * =======================================
     * [GET] /admin
     * แสดงหน้า Admin Panel สำหรับจัดการเกมทั้งหมด
     * =======================================
     * ✅ ใช้ร่วมกับ middleware: isRole(['Admin'])
     * เพื่อให้เฉพาะผู้ใช้ที่เป็น Admin เท่านั้นที่เข้าถึงได้
     */
    getAdminPage: async (req, res) => {
        try {
            // --------------------------
            // 1️⃣ ดึงข้อมูลเกมทั้งหมดจากฐานข้อมูล
            // --------------------------
            const games = await gameModels.findAllGames();

            // --------------------------
            // 2️⃣ ส่งข้อมูลไปยังหน้า EJS (admin.ejs)
            // --------------------------
            // - games: รายการเกมทั้งหมด (Array)
            // - EJS จะใช้ข้อมูลนี้ในการแสดงตารางรายชื่อเกม
            res.render('admin', { 
                games: games || [] // หากไม่มีข้อมูล ให้ส่ง Array ว่าง
            });

        } catch (error) {
            // --------------------------
            // ❌ กรณีเกิดข้อผิดพลาด
            // --------------------------
            console.error("Error fetching data for admin page:", error);

            // แสดงหน้า admin.ejs พร้อมข้อความ error
            res.status(500).render('admin', { 
                games: [], // ป้องกัน EJS พังด้วยการส่ง Array ว่าง
                error: 'Failed to load game data.' // แจ้งเตือนใน view
            });
        }
    },

};


// --------------------------
// Export Controller
// --------------------------
// 💡 ให้ไฟล์อื่น (เช่น routes/adminRouters.js) นำไปใช้งานได้
module.exports = adminController;
