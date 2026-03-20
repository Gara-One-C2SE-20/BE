const { Readable } = require("stream");
const cloudinary = require("../config/cloudinary");

const uploadToCloudinary = (buffer, folder = "nestora") => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "auto",
                allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"]
            },
            (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(result);
            }
        );

        const readableStream = new Readable();
        readableStream.push(buffer);
        readableStream.push(null);
        readableStream.pipe(uploadStream);
    });
};

const uploadSingleImage = async (file, folder = "nestora") => {
    if (!file) {
        throw new Error("Khong co file duoc upload");
    }

    const result = await uploadToCloudinary(file.buffer, folder);

    return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format
    };
};

const uploadMultipleImages = async (files, folder = "nestora") => {
    if (!files || files.length === 0) {
        throw new Error("Khong co file nao duoc upload");
    }

    const uploadPromises = files.map((file) => uploadToCloudinary(file.buffer, folder));
    const results = await Promise.all(uploadPromises);

    return results.map((result) => ({
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format
    }));
};

const deleteImage = async (publicId) => {
    if (!publicId) {
        throw new Error("Khong co publicId de xoa");
    }

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result !== "ok") {
        throw new Error("Xoa anh that bai");
    }

    return { success: true, message: "Xoa anh thanh cong" };
};

const deleteMultipleImages = async (publicIds) => {
    if (!publicIds || publicIds.length === 0) {
        throw new Error("Khong co publicId nao de xoa");
    }

    const deletePromises = publicIds.map((publicId) => cloudinary.uploader.destroy(publicId));
    const results = await Promise.all(deletePromises);

    return {
        success: true,
        message: `Da xoa ${results.length} anh`,
        results
    };
};

const getImageUrl = (publicId, transformations = {}) => {
    const {
        width,
        height,
        crop = "fill",
        quality = "auto",
        format = "auto"
    } = transformations;

    return cloudinary.url(publicId, {
        width,
        height,
        crop,
        quality,
        format,
        secure: true
    });
};

module.exports = {
    uploadSingleImage,
    uploadMultipleImages,
    deleteImage,
    deleteMultipleImages,
    getImageUrl
};
