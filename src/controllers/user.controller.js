const User = require("../models/User.model.js");
const { hashPassword } = require("../utils/hash.js");
const { comparePassword } = require("../utils/hash.js");
const { ApiRes } = require("../utils/response.js");
const { ROLES } = require("../constants/roles.js");


const getMe = async (req, res, next) => {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return ApiRes.notFound(res, "Người dùng không tồn tại");
    return ApiRes.success(res, "Lấy thông tin người dùng thành công", { user });
};

const updateProfile = async (req, res, next) => {
    const { fullName, phone, address, dateOfBirth } = req.body;
    const updateFields = {};
    if (fullName !== undefined) updateFields["profile.fullName"] = fullName;
    if (phone !== undefined) updateFields["profile.phone"] = phone;
    if (address !== undefined) updateFields["profile.address"] = address;
    if (dateOfBirth !== undefined) updateFields["profile.dateOfBirth"] = new Date(dateOfBirth);

    const user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: updateFields },
        { new: true }
    ).select("-password");
    if (!user) return ApiRes.notFound(res, "Người dùng không tồn tại");
    return ApiRes.success(res, "Cập nhật thông tin người dùng thành công", { user });
};

const changePassword = async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return ApiRes.notFound(res, "Người dùng không tồn tại");

    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
        return ApiRes.badRequest(res, "Mật khẩu hiện tại không chính xác");
    }

    const isSamePassword = await comparePassword(newPassword, user.password);
    if (isSamePassword) {
        return ApiRes.badRequest(res, "Mật khẩu mới không được trùng mật khẩu hiện tại");
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    return ApiRes.success(res, "Đổi mật khẩu thành công");
};

// lấy danh sách người dùng
const getCustomerUsers = async (req, res, next) => {
    const { page = 1, limit = 10, phone, fullName, email } = req.query;
    const query = { role: ROLES.CUSTOMER };
    if (phone) query["profile.phone"] = { $regex: phone, $options: "i" };
    if (fullName) query["profile.fullName"] = { $regex: fullName, $options: "i" };
    if (email) query["email"] = { $regex: email, $options: "i" };

    const users = await User.find(query).select("-password").skip((page - 1) * limit).limit(parseInt(limit));
    return ApiRes.success(res, "Lấy danh sách người dùng thành công", { users, page: parseInt(page), limit: parseInt(limit) });
};

const getStaffUsers = async (req, res, next) => {
    const { page = 1, limit = 10, phone, fullName, email } = req.query;
    const query = { role: { $in: [ROLES.ADMIN, ROLES.STAFF] } };
    if (phone) query["profile.phone"] = { $regex: phone, $options: "i" };
    if (fullName) query["profile.fullName"] = { $regex: fullName, $options: "i" };
    if (email) query["email"] = { $regex: email, $options: "i" };
    const users = await User.find(query).select("-password").skip((page - 1) * limit).limit(parseInt(limit));
    return ApiRes.success(res, "Lấy danh sách nhân viên thành công", { users, page: parseInt(page), limit: parseInt(limit) });
}

// set active user
const setActiveCustomerUser = async (req, res, next) => {
    const { userId } = req.params;
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(userId, { isActive }, { new: true }).select("-password");
    if (!user) return ApiRes.notFound(res, "Người dùng không tồn tại");
    return ApiRes.success(res, "Cập nhật trạng thái người dùng thành công", { user });
};

const setActiveStaffUser = async (req, res, next) => {
    const { userId } = req.params;
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(userId, { isActive }, { new: true }).select("-password");
    if (!user) return ApiRes.notFound(res, "Người dùng không tồn tại");
    return ApiRes.success(res, "Cập nhật trạng thái người dùng thành công", { user });
};

const createStaff = async (req, res, next) => {
    const { email, password, fullName, phone, address, dateOfBirth } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return ApiRes.conflict(res, "Email đã được sử dụng");

    const hashedPassword = await hashPassword(password);
    const user = await User.create({
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

    const userObject = user.toObject();
    delete userObject.password;
    return ApiRes.created(res, "Tạo tài khoản nhân viên thành công", { user: userObject });
};

module.exports = { getMe, updateProfile, changePassword, getCustomerUsers, getStaffUsers, setActiveCustomerUser, setActiveStaffUser, createStaff };