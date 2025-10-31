// ==========================
// pageController.js
// ==========================

// --------------------------
// Import Dependencies
// --------------------------
const gameModels = require('../models/gameModels');

// --------------------------
// Helper Function
// --------------------------
/**
 * ดึงข้อมูลภาพของแต่ละเกม
 * ถ้ามีหลายภาพ → รวมไว้ใน array
 * ถ้าไม่มี → ใช้ Game_Cover เป็น fallback
 */
const attachGameImages = async (games) => {
    const baseUrl = process.env.CLOUDFRONT_URL
        || `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`;

    console.log("DEBUG IMAGE >>", {
        title: game.Game_Title,
        cover: game.Game_Cover,
        imgsDB: imgs.map(i => i.Path),
        finalImages: imgs.length
            ? imgs.map(img => formatImage(img.Path))
            : [formatImage(game.Game_Cover)],
        baseUrl
    });

    return Promise.all(
        games.map(async (game) => {
            const imgs = await gameModels.findImagesByGameId(game.Game_id);

            const formatImage = (path) =>
                path?.startsWith("http")
                    ? path
                    : path
                        ? `${baseUrl}/${path}`
                        : "/default-cover.png";

            return {
                ...game,
                images: imgs.length
                    ? imgs.map(img => formatImage(img.Path))
                    : [formatImage(game.Game_Cover)]
            };
        })
    );
};

// --------------------------
// Controller Functions
// --------------------------
const pageController = {

    // ==========================
    // 1️⃣ หน้าแรก (Home)
    // ==========================
    getHomePage: async (req, res) => {
        try {
            // 1. ดึงเกมทั้งหมด
            const allGames = await gameModels.getAllGames();
            const gamesWithImages = await attachGameImages(allGames);

            // 2. จัดเรียงเกมสำหรับส่วน "Most Download"
            // 💡 สร้างสำเนาของอาร์เรย์ก่อนเรียง เพื่อไม่ให้กระทบกับลำดับเดิม (ถ้ามี)
            const downloadGames = [...gamesWithImages].sort((a, b) => {
                // เรียงลำดับจากมากไปน้อย (b - a) โดยใช้ฟิลด์ Download
                // และตั้งค่าเริ่มต้นเป็น 0 หากฟิลด์เป็น undefined/null
                const downloadB = b.Download || 0;
                const downloadA = a.Download || 0;
                return downloadB - downloadA;
            });

            // 3. เตรียมเกมสำหรับส่วน Featured (3 เกมแรก, ใช้ลำดับเดิม)
            const featuredGames = gamesWithImages.slice(0, 3);

            // 4. ดึงข้อมูลผู้ใช้ถ้ามี session
            const user = req.user || null;

            // 5. แสดงหน้า home.ejs โดยส่ง games 2 ชุดแยกกัน
            res.render('home', {
                // ส่ง games สำหรับ Featured (ใช้ในส่วน JS ด้านบน)
                games: featuredGames,

                // 💡 ส่ง downloadGames สำหรับส่วน Most Download (ใช้ใน Grid ด้านล่าง)
                downloadGames: downloadGames,
                user
            });
        } catch (error) {
            console.error("Error fetching data for home page:", error);
            res.status(500).send("Internal Server Error");
        }
    },

    // ==========================
    // 2️⃣ หน้า Browse (สำหรับดูเกมทั้งหมด + ตัวกรอง)
    // ==========================
    getBrowsePage: async (req, res) => {
        try {
            const games = await gameModels.getAllGames();
            const gamesWithImages = await attachGameImages(games);

            // ดึงข้อมูลผู้ใช้ถ้ามี session
            const user = req.user || null;

            // ส่งค่า default เพื่อป้องกัน ReferenceError ตอน render
            res.render('browse', {
                games: gamesWithImages,
                user,
                selectedTags: [],   // ค่าเริ่มต้น
                query: '',          // คำค้นหาเริ่มต้น
                sortOrder: 'newest' // การเรียงลำดับเริ่มต้น
            });
        } catch (error) {
            console.error("Error fetching data for browse page:", error);
            res.status(500).send("Internal Server Error");
        }
    },

    // ==========================
    // 3️⃣ หน้า Dashboard (เฉพาะผู้ใช้ที่ล็อกอิน)
    // ==========================
    getDashboardPage: async (req, res) => {
        try {
            // ถ้าไม่มี session → redirect ไป login
            if (!req.user) {
                return res.redirect('/user/login');
            }

            const userId = req.user.User_id;

            // ดึงเกมของผู้ใช้คนนั้น
            const games = await gameModels.getGamesByUserId(userId);
            const gamesWithImages = await attachGameImages(games);

            const user = req.user;

            // แสดงหน้า dashboard.ejs
            res.render('dashboard', {
                games: gamesWithImages,
                user
            });
        } catch (error) {
            console.error("Error fetching data for dashboard page:", error);
            res.status(500).send("Internal Server Error");
        }
    },

    // ==========================
    // 4️⃣ ระบบค้นหาเกม (ใช้ใน Browse)
    // ==========================
    searchGames: async (req, res) => {
        try {
            // 1. รับค่าพารามิเตอร์จาก URL
            const { query, tags, sortOrder } = req.query;

            // 2. แปลง tags จาก string → array
            const tagArray = tags
                ? tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
                : [];

            const currentSortOrder = sortOrder || 'newest';

            // 3. ดึงเกมที่ตรงกับเงื่อนไขจากฐานข้อมูล
            const filteredGames = await gameModels.getFilteredGames(query, tagArray, currentSortOrder);

            // 4. แนบข้อมูลภาพของแต่ละเกม
            const gamesWithImages = await attachGameImages(filteredGames);

            // 5. ดึงข้อมูลผู้ใช้ (ถ้ามี)
            const user = req.user || null;

            // 6. แสดงผลในหน้า browse.ejs พร้อมค่าที่ค้นหา
            res.render('browse', {
                games: gamesWithImages,
                user,
                selectedTags: tagArray,
                query: query || '',
                sortOrder: currentSortOrder
            });
        } catch (error) {
            console.error("Error searching games:", error);
            res.status(500).send("Internal Server Error");
        }
    },
};

// --------------------------
// Export Controller
// --------------------------
module.exports = pageController;
