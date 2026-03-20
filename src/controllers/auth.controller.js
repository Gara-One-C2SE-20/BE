const User = require("../models/User.model.js");
const { hashPassword, comparePassword } = require("../utils/hash.js");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../utils/jwt.js");
const { ROLES } = require("../constants/roles.js");
const { ApiRes } = require("../utils/response.js");

exports.register = async (req, res, next) => {
    try {
        const { email, password, fullName, phone, address, dateOfBirth } = req.body;
        
        const exists = await User.findOne({ email });
        if (exists) return ApiRes.conflict(res, "Email đã được sử dụng");

        const hashedPassword = await hashPassword(password);
        
        const user = await User.create({
            email,
            password: hashedPassword,
            role: ROLES.CUSTOMER,
            profile: { 
                fullName, 
                phone, 
                address, 
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined 
            }
        });

        const userObject = user.toObject();
        delete userObject.password;

        return ApiRes.created(res, "Đăng ký thành công", { user: userObject });
    } catch (error) {
        next(error);
    }
};

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) return ApiRes.unauthorized(res, "Email hoặc mật khẩu không đúng");

        if (!user.isActive) return ApiRes.forbidden(res, "Tài khoản đã bị khóa");

        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) return ApiRes.unauthorized(res, "Email hoặc mật khẩu không đúng");

        const payload = {
            id: user._id,
            email: user.email,
            role: user.role
        };

        const accessToken = signAccessToken(payload);
        const refreshToken = signRefreshToken({ id: user._id });

        const userObject = user.toObject();
        delete userObject.password;

        return ApiRes.success(res, "Đăng nhập thành công", {
            accessToken,
            refreshToken,
            user: userObject
        });
    } catch (error) {
        next(error);
    }
};

exports.refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) return ApiRes.badRequest(res, "Refresh token không được cung cấp");

        try {
            const decoded = verifyRefreshToken(refreshToken);
            
            const user = await User.findById(decoded.id);
            if (!user) return ApiRes.notFound(res, "Người dùng không tồn tại");
            if (!user.isActive) return ApiRes.forbidden(res, "Tài khoản đã bị khóa");

            const payload = {
                id: user._id,
                email: user.email,
                role: user.role
            };

            const accessToken = signAccessToken(payload);
            const newRefreshToken = signRefreshToken({ id: user._id });
            
            return ApiRes.success(res, "Làm mới token thành công", { 
                accessToken, 
                refreshToken: newRefreshToken 
            });
        } catch (err) {
            return ApiRes.unauthorized(res, "Refresh token không hợp lệ hoặc đã hết hạn");
        }
    } catch (error) {
        next(error);
    }
};

exports.createStaff = async (req, res, next) => {
    try {
        const { email, password, fullName, phone, address, dateOfBirth } = req.body;
        const adminId = req.user.id;
        
        const admin = await User.findById(adminId);
        if (!admin || admin.role !== ROLES.ADMIN) {
            return ApiRes.forbidden(res, "Không có quyền thực hiện thao tác này");
        }

        const exists = await User.findOne({ email });
        if (exists) return ApiRes.conflict(res, "Email đã được sử dụng");

        const hashedPassword = await hashPassword(password);
        
        const staff = await User.create({
            email,
            password: hashedPassword,
            role: ROLES.STAFF,
            profile: { 
                fullName, 
                phone, 
                address, 
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined 
            }
        });

        const staffObject = staff.toObject();
        delete staffObject.password;

        return ApiRes.created(res, "Tạo tài khoản staff thành công", { staff: staffObject });
    } catch (error) {
        next(error);
    }
};
