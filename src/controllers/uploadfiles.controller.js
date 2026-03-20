const multer = require("multer");
const { ApiRes } = require("../utils/response");
const {
    uploadSingleImage,
    uploadMultipleImages,
    deleteImage,
    deleteMultipleImages
} = require("../utils/uploadImage");

const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp"
];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        // Max 5MB per file and max 10 files per request.
        fileSize: 5 * 1024 * 1024,
        files: 10
    },
    fileFilter: (req, file, cb) => {
        if (!allowedMimeTypes.includes(file.mimetype)) {
            cb(new Error("Chi chap nhan file anh JPG, PNG, GIF, WEBP"));
            return;
        }
        cb(null, true);
    }
});

const uploadSingle = async (req, res) => {
    try {
        if (!req.file) {
            return ApiRes.badRequest(res, "Vui long chon file de upload");
        }

        const folder = req.body.folder || "nestora";
        const result = await uploadSingleImage(req.file, folder);

        return ApiRes.success(res, "Upload anh thanh cong", result);
    } catch (error) {
        return ApiRes.serverError(res, error.message, error);
    }
};

const uploadMultiple = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return ApiRes.badRequest(res, "Vui long chon it nhat mot file de upload");
        }

        const folder = req.body.folder || "nestora";
        const results = await uploadMultipleImages(req.files, folder);

        return ApiRes.success(res, `Upload ${results.length} anh thanh cong`, results);
    } catch (error) {
        return ApiRes.serverError(res, error.message, error);
    }
};

const removeSingle = async (req, res) => {
    try {
        const { publicId } = req.body;

        if (!publicId) {
            return ApiRes.badRequest(res, "Thieu publicId de xoa anh");
        }

        const result = await deleteImage(publicId);
        return ApiRes.success(res, "Xoa anh thanh cong", result);
    } catch (error) {
        return ApiRes.serverError(res, error.message, error);
    }
};

const removeMultiple = async (req, res) => {
    try {
        const { publicIds } = req.body;

        if (!Array.isArray(publicIds) || publicIds.length === 0) {
            return ApiRes.badRequest(res, "publicIds phai la mang va khong duoc rong");
        }

        const result = await deleteMultipleImages(publicIds);
        return ApiRes.success(res, "Xoa nhieu anh thanh cong", result);
    } catch (error) {
        return ApiRes.serverError(res, error.message, error);
    }
};

module.exports = {
    upload,
    uploadSingle,
    uploadMultiple,
    removeSingle,
    removeMultiple
};