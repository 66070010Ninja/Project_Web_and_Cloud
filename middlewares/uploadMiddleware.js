import multer from "multer";

const upload = multer().diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public')
    },
    filemane: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix)
    }
})

export default upload;