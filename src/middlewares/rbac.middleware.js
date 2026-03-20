
const { authenticate } = require('./auth.middleware');

function authorize(...allowedRoles) {
    return function (req, res, next) {
        authenticate(req, res, (err) => {
            if (err) return next(err);
            if (!allowedRoles.includes(req.user.role)) {
                return res.status(403).json({ message: "Không đủ quyền truy cập" });
            }
            next();
        });
    };
}

module.exports = { authenticate, authorize };
