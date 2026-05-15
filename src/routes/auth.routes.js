const express = require("express");
const {
    register,
    login,
    refreshToken,
    verifyEmail,
    resendVerificationOtp,
    createStaff
} = require("../controllers/auth.controller.js");
const { authenticate, authorize } = require("../middlewares/rbac.middleware.js");
const { validate } = require("../middlewares/validate.middleware.js");
const {
    registerSchema,
    loginSchema,
    refreshTokenSchema,
    verifyEmailSchema,
    resendVerificationOtpSchema,
    createStaffSchema
} = require("../validators/auth.validator.js");
const { ROLES } = require("../constants/roles.js");

const router = express.Router();

router.post(
    "/register",
    validate(registerSchema),
    register
);

router.post(
    "/login",
    validate(loginSchema),
    login
);

router.post(
    "/refresh-token",
    validate(refreshTokenSchema),
    refreshToken
);

router.post(
    "/verify-email",
    validate(verifyEmailSchema),
    verifyEmail
);

router.post(
    "/resend-verification-otp",
    validate(resendVerificationOtpSchema),
    resendVerificationOtp
);

router.post(
    "/create-staff",
    authorize(ROLES.ADMIN),
    validate(createStaffSchema),
    createStaff
);

module.exports = router;
