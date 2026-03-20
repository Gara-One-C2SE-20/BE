const { ApiRes } = require('../utils/response');

module.exports = (err, req, res, next) => {
    console.error(err);

    if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return ApiRes.badRequest(res, 'Kich thuoc file vuot qua gioi han 5MB');
        }
        return ApiRes.badRequest(res, err.message || 'Upload file khong hop le');
    }
    
    const statusCode = err.statusCode || 500;
    const message = err.message || "Lỗi hệ thống";
    const errors = err.errors || null;

    return ApiRes.error(res, message, statusCode, errors);
};
