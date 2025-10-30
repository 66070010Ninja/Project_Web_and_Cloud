// ==========================
// uploadMiddleware.js (AWS SDK v3 + Local & S3 Upload)
// ==========================

// --------------------------
// 1️⃣ Import Dependencies
// --------------------------
const multer = require("multer");
const path = require("path");
const { S3Client } = require("@aws-sdk/client-s3");
const multerS3 = require("multer-s3");

// --------------------------
// 2️⃣ ตั้งค่า AWS SDK v3
// --------------------------
const s3 = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-1"
});

// --------------------------
// 3️⃣ เลือก Storage Engine (Local / S3)
// --------------------------
const useS3 = process.env.USE_S3 === "true";

// ✅ Local Disk Storage
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

// ✅ S3 Storage (AWS SDK v3)
const s3Storage = multerS3({
  s3: s3,
  bucket: process.env.AWS_S3_BUCKET_NAME,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  acl: "public-read",
  metadata: (req, file, cb) => {
    cb(null, { fieldName: file.fieldname });
  },
  key: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);

    let folder = "";
    if (file.fieldname === "file_game") folder = "game/file/";
    else if (file.fieldname === "images") folder = "game/img/";
    else if (file.fieldname === "Profile_Image") folder = "user/img/";
    else folder = "misc/";

    cb(null, `${folder}${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// --------------------------
// 4️⃣ File Filter
// --------------------------
const fileFilter = (req, file, cb) => {
  if (file.fieldname === "file_game") {
    const isZip = path.extname(file.originalname).toLowerCase() === ".zip";
    if (!isZip) return cb(new Error("File_Game must be a .zip file."), false);
  } else if (file.fieldname === "images" || file.fieldname === "Profile_Image") {
    const filetypes = /jpeg|jpg|png/;
    const mimetypeOK = filetypes.test(file.mimetype);
    const extnameOK = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (!mimetypeOK || !extnameOK)
      return cb(new Error("Images must be JPEG or PNG."), false);
  }
  cb(null, true);
};

// --------------------------
// 5️⃣ Multer Instance
// --------------------------
const upload = multer({
  storage: useS3 ? s3Storage : localStorage,
  fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB
    fieldSize: 1024 * 1024 * 1024,
  },
});

// --------------------------
// 6️⃣ Export
// --------------------------
module.exports = upload;
