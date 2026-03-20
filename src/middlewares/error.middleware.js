const { ApiRes } = require('../utils/response');

module.exports = (err, req, res, next) => {
    console.error(err);
    
    const statusCode = err.statusCode || 500;
    const message = err.message || "Lỗi hệ thống";
    const errors = err.errors || null;

    return ApiRes.error(res, message, statusCode, errors);
};
