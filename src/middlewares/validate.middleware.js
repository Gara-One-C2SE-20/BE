const { ApiRes } = require('../utils/response');

const validate =
  (schema, property = "body") =>
  (req, res, next) => {
    try {
      req[property] = schema.parse(req[property]);
      next();
    } catch (err) {
      const errors = err.issues?.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      })) || [];
      return ApiRes.badRequest(res, "Dữ liệu không hợp lệ", errors);
    }
  };

module.exports = { validate };
