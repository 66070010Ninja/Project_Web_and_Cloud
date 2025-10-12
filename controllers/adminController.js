// ==========================
// adminController.js
// ==========================

// 💡 ต้องมีการ import gameModels เพื่อดึงข้อมูลเกม
const gameModels = require('../models/gameModels'); 

const adminController = {
    /**
     * แสดงหน้า Admin Panel สำหรับจัดการเกมทั้งหมด
     * (Route นี้ควรได้รับการป้องกันด้วย isRole(['Admin']))
     */
    getAdminPage: async(req, res) => {
        try {
            // 1. ดึงข้อมูลเกมทั้งหมด
            const games = await gameModels.findAllGames(); 

            // 2. ส่งข้อมูล games ไปยัง EJS template ('admin.ejs')
            res.render('admin', { 
                // EJS template ใช้ตัวแปร 'games' 
                games: games || [] 
            });

        } catch (error) {
            console.error("Error fetching data for admin page:", error);
            // 💡 ส่ง games เป็น Array ว่างพร้อมแสดงข้อความแจ้ง error ใน console
            res.status(500).render('admin', { 
                games: [],
                error: 'Failed to load game data.'
            });
        };
    },
};

module.exports = adminController;