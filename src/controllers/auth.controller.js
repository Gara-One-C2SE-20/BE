const User = require("../models/User.model.js");
const { hashPassword, comparePassword } = require("../utils/hash.js");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../utils/jwt.js");
const { ROLES } = require("../constants/roles.js");
const { ApiRes } = require("../utils/response.js");
const { createVerificationPayload, hashOtp, sendVerificationEmail } = require("../services/emailVerification.service.js");

const buildProfile = ({ fullName, phone, address, dateOfBirth }) => ({
    fullName,
    phone,
    address,
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined
});

const prepareVerificationState = () => {
    const verificationPayload = createVerificationPayload();

    return {
        emailVerification: {
            codeHash: verificationPayload.codeHash,
            expiresAt: verificationPayload.expiresAt,
            attempts: 0,
            sentAt: new Date()
        },
        otp: verificationPayload.otp
    };
};

const clearVerificationState = () => ({
    codeHash: null,
    expiresAt: null,
    attempts: 0,
    sentAt: null
});

exports.register = async (req, res, next) => {
    try {
        const { email, password, fullName, phone, address, dateOfBirth } = req.body;

        const exists = await User.findOne({ email });
        if (exists && exists.isEmailVerified !== false) {
            return ApiRes.conflict(res, "Email đã được sử dụng");
        }

        if (exists && exists.role !== ROLES.CUSTOMER) {
            return ApiRes.conflict(res, "Email đã được sử dụng");
        }

        const hashedPassword = await hashPassword(password);

        const verificationState = prepareVerificationState();
        const profile = buildProfile({ fullName, phone, address, dateOfBirth });

        let user;
        let isNewUser = false;

        if (exists) {
            user = exists;
            user.password = hashedPassword;
            user.role = ROLES.CUSTOMER;
            user.profile = profile;
            user.isActive = true;
            user.isEmailVerified = false;
            user.emailVerification = verificationState.emailVerification;
        } else {
            isNewUser = true;
            user = await User.create({
                email,
                password: hashedPassword,
                role: ROLES.CUSTOMER,
                profile,
                isEmailVerified: false,
                emailVerification: verificationState.emailVerification
            });
        }

        if (exists) {
            await user.save();
        }

        try {
            await sendVerificationEmail(email, verificationState.otp);
        } catch (mailError) {
            if (isNewUser) {
                await User.deleteOne({ _id: user._id });
            }
            throw mailError;
        }

        const userObject = user.toObject();
        delete userObject.password;
        delete userObject.emailVerification;

        return ApiRes.created(res, "Đăng ký thành công, vui lòng kiểm tra email để xác minh tài khoản", {
            user: userObject,
            requiresEmailVerification: true
        });
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
        if (user.isEmailVerified === false) return ApiRes.forbidden(res, "Vui lòng xác minh email trước khi đăng nhập");

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
        delete userObject.emailVerification;

        return ApiRes.success(res, "Đăng nhập thành công", {
            accessToken,
            refreshToken,
            user: userObject
        });
    } catch (error) {
        next(error);
    }
};

exports.verifyEmail = async (req, res, next) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ email });
        if (!user) return ApiRes.notFound(res, "Không tìm thấy tài khoản");

        if (user.isEmailVerified !== false) {
            return ApiRes.success(res, "Email đã được xác minh trước đó");
        }

        const verification = user.emailVerification || {};
        if (!verification.codeHash || !verification.expiresAt) {
            return ApiRes.badRequest(res, "Mã OTP đã hết hạn, vui lòng yêu cầu gửi lại mã mới");
        }

        if (verification.expiresAt && new Date(verification.expiresAt) < new Date()) {
            user.emailVerification = clearVerificationState();
            await user.save();
            return ApiRes.badRequest(res, "Mã OTP đã hết hạn, vui lòng yêu cầu gửi lại mã mới");
        }

        if ((verification.attempts || 0) >= 5) {
            user.emailVerification = clearVerificationState();
            await user.save();
            return ApiRes.badRequest(res, "Bạn đã nhập sai quá nhiều lần, vui lòng yêu cầu gửi lại mã mới");
        }

        if (hashOtp(otp) !== verification.codeHash) {
            user.emailVerification.attempts = (verification.attempts || 0) + 1;
            await user.save();
            return ApiRes.badRequest(res, "Mã OTP không đúng");
        }

        user.isEmailVerified = true;
        user.emailVerification = clearVerificationState();
        await user.save();

        return ApiRes.success(res, "Xác minh email thành công");
    } catch (error) {
        next(error);
    }
};

exports.resendVerificationOtp = async (req, res, next) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) return ApiRes.notFound(res, "Không tìm thấy tài khoản");

        if (user.isEmailVerified !== false) {
            return ApiRes.conflict(res, "Email đã được xác minh rồi");
        }

        const verificationState = prepareVerificationState();
        user.emailVerification = verificationState.emailVerification;
        await user.save();

        await sendVerificationEmail(email, verificationState.otp);

        return ApiRes.success(res, "Đã gửi lại mã OTP xác minh về email");
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
            isEmailVerified: true,
            emailVerification: clearVerificationState(),
            profile: {
                fullName,
                phone,
                address,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined
            }
        });

        const staffObject = staff.toObject();
        delete staffObject.password;
        delete staffObject.emailVerification;

        return ApiRes.created(res, "Tạo tài khoản staff thành công", { staff: staffObject });
    } catch (error) {
        next(error);
    }
};
