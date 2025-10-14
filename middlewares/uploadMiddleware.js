// ==========================
// uploadMiddleware.js
// (CommonJS Syntax + จัดระเบียบ + คอมเมนต์อธิบาย)
// ==========================

// --------------------------
// 1️⃣ Import Dependencies
// --------------------------
const multer = require("multer"); // สำหรับจัดการอัปโหลดไฟล์
const path = require("path");     // ใช้จัดการเส้นทางไฟล์ (path.join, extname ฯลฯ)


// --------------------------
// 2️⃣ กำหนด Storage Engine สำหรับ Multer
// --------------------------
/**
 * ใช้ multer.diskStorage เพื่อกำหนด:
 *  - ตำแหน่งเก็บไฟล์ (destination)
 *  - ชื่อไฟล์ที่จัดเก็บ (filename)
 */
const storage = multer.diskStorage({

    // ✅ ระบุโฟลเดอร์ปลายทางในการเก็บไฟล์
    destination: function (req, file, cb) {
        // ตรวจสอบ fieldname ว่าเป็นประเภทไหน
        if (file.fieldname === "file_game") {
            // 👉 กรณีเป็นไฟล์เกม (.zip)
            cb(null, path.join(__dirname, "../public/game/file"));
        } else if (file.fieldname === "images") {
            // 👉 กรณีเป็นรูปภาพเกม (.jpg, .png)
            cb(null, path.join(__dirname, "../public/game/img"));
        } else {
            // 👉 กรณีไม่ระบุหรือ field อื่น ๆ
            cb(null, path.join(__dirname, "../public"));
        }
    },

    // ✅ ตั้งชื่อไฟล์ใหม่ (เพื่อป้องกันชื่อซ้ำ)
    filename: function (req, file, cb) {
        // สร้าง suffix เฉพาะ (timestamp + random number)
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);

        // ดึงนามสกุลไฟล์เดิม
        const ext = path.extname(file.originalname);

        // ตั้งชื่อไฟล์ใหม่ → ตัวอย่าง: "images-1691234567890-123456789.png"
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
});


// --------------------------
// 3️⃣ สร้าง File Filter (กรองประเภทไฟล์ที่อนุญาต)
// --------------------------
/**
 * ใช้สำหรับกรองไฟล์ก่อนอัปโหลด:
 *  - `file_game` ต้องเป็น .zip เท่านั้น
 *  - `images` ต้องเป็น .jpg / .jpeg / .png เท่านั้น
 */
const fileFilter = (req, file, cb) => {
    // 🕹️ กรองไฟล์เกม
    if (file.fieldname === "file_game") {
        const isZip = path.extname(file.originalname).toLowerCase() === ".zip";
        if (!isZip) {
            return cb(new Error("File_Game must be a .zip file."), false);
        }
    }

    // 🖼️ กรองรูปภาพ
    else if (file.fieldname === "images") {
        const filetypes = /jpeg|jpg|png/;
        const mimetypeOK = filetypes.test(file.mimetype);
        const extnameOK = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (!mimetypeOK || !extnameOK) {
            return cb(new Error("Images must be JPEG or PNG."), false);
        }
    }

    // ✅ ผ่านการตรวจสอบทั้งหมด
    cb(null, true);
};


// --------------------------
// 4️⃣ สร้าง Multer Instance (กำหนดค่า Limits เพิ่มเติม)
// --------------------------
/**
 * สร้างอินสแตนซ์ multer พร้อม:
 *  - storage: รูปแบบจัดเก็บ
 *  - fileFilter: ตัวกรองประเภทไฟล์
 *  - limits: กำหนดขนาดสูงสุดของไฟล์/ฟิลด์
 */
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 1024, // ✅ จำกัดขนาดสูงสุดไฟล์ละ 1GB
        fieldSize: 1024 * 1024 * 1024 // ✅ จำกัดขนาดรวมของฟิลด์ที่ส่งมา (1GB)
    }
});


// --------------------------
// 5️⃣ Export Module (CommonJS)
// --------------------------
/**
 * Export ตัวแปร upload เพื่อใช้ใน router:
 * 
 * ตัวอย่างการใช้งาน:
 * router.post('/create', upload.fields([
 *     { name: 'file_game', maxCount: 1 },
 *     { name: 'images', maxCount: 10 }
 * ]), controller.postCreateGame);
 */
module.exports = upload;
