const express = require("express");
const { authorize } = require("../middlewares/rbac.middleware");
const { ROLES } = require("../constants/roles");
const { validate } = require("../middlewares/validate.middleware");
const { createVehicleSchema, updateVehicleSchema } = require("../validators/vehicle.validator");
const { getAllVehicles, createVehicle, getVehicleByVin, updateVehicle } = require("../controllers/vehicle.controller");

const router = express.Router();

router.get("/", authorize(ROLES.ADMIN, ROLES.STAFF), getAllVehicles);
router.post("/", authorize(ROLES.ADMIN, ROLES.STAFF), validate(createVehicleSchema), createVehicle);
router.get("/:vin", authorize(ROLES.ADMIN, ROLES.STAFF), getVehicleByVin);
router.put("/:vin", authorize(ROLES.ADMIN, ROLES.STAFF), validate(updateVehicleSchema), updateVehicle);

module.exports = router;
