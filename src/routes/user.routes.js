const express = require("express");
const { authenticate } = require("../middlewares/auth.middleware.js");
const { authorize } = require("../middlewares/rbac.middleware.js");
const { ROLES } = require("../constants/roles.js");
const { getAllUsers, getMe, updateProfile, getStaffUsers, getCustomerUsers, setActiveCustomerUser, setActiveStaffUser } = require("../controllers/user.controller.js");

const router = express.Router();

router.get("/me", authenticate, getMe);
router.patch("/me", authenticate, updateProfile);


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

module.exports = router;