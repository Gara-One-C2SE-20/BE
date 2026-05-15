const express = require("express");
const { authenticate } = require("../middlewares/auth.middleware.js");
const { authorize } = require("../middlewares/rbac.middleware.js");
const { ROLES } = require("../constants/roles.js");
const { getMe, updateProfile, adminUpdateUserProfile, changePassword, getStaffUsers, getCustomerUsers, setActiveCustomerUser, setActiveStaffUser, createStaff } = require("../controllers/user.controller.js");
const { validate } = require("../middlewares/validate.middleware.js");
const { createStaffSchema, changePasswordSchema, adminUpdateUserProfileSchema } = require("../validators/user.validator.js");

const router = express.Router();

router.get("/me", authenticate, getMe);
router.patch("/me", authenticate, updateProfile);
router.patch("/change-password", authenticate, validate(changePasswordSchema), changePassword);


router.get(
    "/get-customers",
    authenticate,
    authorize(ROLES.ADMIN, ROLES.STAFF),
    getCustomerUsers
);
router.get(
    "/get-staffs",
    authenticate,
    authorize(ROLES.ADMIN),
    getStaffUsers
);

router.patch(
    "/get-customers/:userId/active",
    authenticate,
    authorize(ROLES.ADMIN, ROLES.STAFF),
    setActiveCustomerUser
);
router.patch(
    "/get-staffs/:userId/active",
    authenticate,
    authorize(ROLES.ADMIN),
    setActiveStaffUser
);

router.patch(
    "/:userId/profile",
    authenticate,
    authorize(ROLES.ADMIN),
    validate(adminUpdateUserProfileSchema),
    adminUpdateUserProfile
);

router.post(
    "/create-staff",
    authenticate,
    authorize(ROLES.ADMIN),
    validate(createStaffSchema),
    createStaff
);

module.exports = router;