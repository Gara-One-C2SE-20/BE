const multer = require('multer');
const path = require('path');
const fs = require('fs')

const ApiRes = require("../utils/response");


const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

const uploadFiles = async (req, res) => {

    if (!req.files || req.files.length === 0) {
        return ApiRes.error(res, "No files were uploaded.");
    }
    const fileInfos = req.files.map(file => ({
        name: file.originalname,
        fileName: file.filename,
    }));
    return ApiRes.success(res, "Upload files thành công", { files: fileInfos });
};

module.exports = {
    uploadDir,
    upload,
    uploadFiles
};