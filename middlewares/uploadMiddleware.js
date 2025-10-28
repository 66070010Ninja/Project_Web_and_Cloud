// ==========================
// uploadMiddleware.js
// (CommonJS Syntax + รองรับ Local & S3 Upload)
// ==========================

// --------------------------
// 1️⃣ Import Dependencies
// --------------------------
const multer = require("multer"); // สำหรับจัดการอัปโหลดไฟล์
const path = require("path");     // จัดการเส้นทางไฟล์
const AWS = require("aws-sdk");   // ใช้เชื่อมต่อกับ Amazon S3
const multerS3 = require("multer-s3"); // สำหรับอัปโหลดไฟล์ขึ้น S3

// --------------------------
// 2️⃣ ตั้งค่า AWS SDK
// --------------------------
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || "ap-southeast-1", // 🇹🇭 ตัวอย่าง: Singapore region
});

// สร้าง instance ของ S3
const s3 = new AWS.S3();

// --------------------------
// 3️⃣ เลือก Storage Engine (Local / S3)
// --------------------------
const useS3 = process.env.USE_S3 === "true"; // ✅ เปิด/ปิด S3 ผ่าน env

// ✅ Local Disk Storage (เดิม)
const localStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.fieldname === "file_game") {
            cb(null, path.join(__dirname, "../public/game/file"));
        } else if (file.fieldname === "images") {
            cb(null, path.join(__dirname, "../public/game/img"));
        } else if (file.fieldname === "Profile_Image") {
            cb(null, path.join(__dirname, "../public/user/img"));
        } else {
            cb(null, path.join(__dirname, "../public"));
        }
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
});

// ✅ S3 Storage (ใหม่)
const s3Storage = multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME, // ชื่อ bucket ของคุณ
    contentType: multerS3.AUTO_CONTENT_TYPE,
    acl: "public-read", // หรือ private ถ้าไม่อยากให้เข้าตรง URL ได้
    metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);

        // ✅ แยก folder ตามประเภทไฟล์
        let folder = "";
        if (file.fieldname === "file_game") folder = "game/file/";
        else if (file.fieldname === "images") folder = "game/img/";
        else if (file.fieldname === "Profile_Image") folder = "user/img/";
        else folder = "misc/";

        cb(null, `${folder}${file.fieldname}-${uniqueSuffix}${ext}`);
    },
});

// --------------------------
// 4️⃣ File Filter (กรองประเภทไฟล์)
// --------------------------
const fileFilter = (req, file, cb) => {
    if (file.fieldname === "file_game") {
        const isZip = path.extname(file.originalname).toLowerCase() === ".zip";
        if (!isZip) return cb(new Error("File_Game must be a .zip file."), false);
    } else if (file.fieldname === "images" || file.fieldname === "Profile_Image") {
        const filetypes = /jpeg|jpg|png/;
        const mimetypeOK = filetypes.test(file.mimetype);
        const extnameOK = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (!mimetypeOK || !extnameOK) return cb(new Error("Images must be JPEG or PNG."), false);
    }
    cb(null, true);
};

// --------------------------
// 5️⃣ Multer Instance (รวมทุก config)
// --------------------------
const upload = multer({
    storage: useS3 ? s3Storage : localStorage, // ✅ auto switch
    fileFilter: fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 1024, // 1GB
        fieldSize: 1024 * 1024 * 1024, // 1GB
    },
});

// --------------------------
// 6️⃣ Export
// --------------------------
/**
 * วิธีใช้:
 * 
 * router.post('/create', upload.fields([
 *     { name: 'file_game', maxCount: 1 },
 *     { name: 'images', maxCount: 10 },
 *     { name: 'Profile_Image', maxCount: 1 }
 * ]), controller.postCreateGame);
 */
module.exports = upload;
