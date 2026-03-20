const express = require("express");
const { authorize } = require("../middlewares/rbac.middleware");
const { ROLES } = require("../constants/roles");
const { validate } = require("../middlewares/validate.middleware");
const {
    createServicePackageSchema,
    updateServicePackageSchema,
    setServicePackageActiveSchema
} = require("../validators/servicePackage.validator");
const {
    getServiceCategories,
    getServicePackages,
    getServicePackageById,
    getServicePackagesForAdmin,
    createServicePackage,
    updateServicePackage,
    setServicePackageActive,
    deleteServicePackage
} = require("../controllers/servicePackage.controller");

const router = express.Router();

router.get("/admin/list", authorize(ROLES.ADMIN), getServicePackagesForAdmin);
router.post("/admin", authorize(ROLES.ADMIN), validate(createServicePackageSchema), createServicePackage);
router.put("/admin/:id", authorize(ROLES.ADMIN), validate(updateServicePackageSchema), updateServicePackage);
router.patch("/admin/:id/active", authorize(ROLES.ADMIN), validate(setServicePackageActiveSchema), setServicePackageActive);
router.delete("/admin/:id", authorize(ROLES.ADMIN), deleteServicePackage);

router.get("/categories", getServiceCategories);
router.get("/", getServicePackages);
router.get("/:id", getServicePackageById);

module.exports = router;
