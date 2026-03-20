const express = require("express");
const { authorize } = require("../middlewares/rbac.middleware.js");
const { ROLES } = require("../constants/roles.js");
const { validate } = require("../middlewares/validate.middleware.js");
const {
    createOrderServiceSchema,
    putVehicleConditionsSchema,
    putEstimateCostSchema,
    putFinalCostSchema
} = require("../validators/orderServices.validator.js")

const {
    getServiceOrderById,
    getAllServiceOrders,
    getStaffServiceOrders,
    createServiceOrder,
    nextStatusInsection,
    putVehicleConditions,
    nextStatusEstimateCost,
    putEstimateCost,
    nextStatusProcessing,
    nextStatusProcessed,
    putFinalCost,
    setCompletedStatus,
    setCancelledStatus
} = require("../controllers/serviceOrder.controller.js");


const router = express.Router();

router.get("/get-staff-orders",
    authorize(ROLES.STAFF),
    getStaffServiceOrders
);


router.get("/get-all-orders",
    authorize(ROLES.ADMIN),
    getAllServiceOrders
);

router.post("/create-order-service",
    authorize(ROLES.STAFF),
    validate(createOrderServiceSchema),
    createServiceOrder
);

router.post("/next-status-insection/:serviceOrderId",
    authorize(ROLES.STAFF),
    nextStatusInsection
);

router.put("/update-vehicle-conditions/:serviceOrderId",
    authorize(ROLES.STAFF),
    validate(putVehicleConditionsSchema),
    putVehicleConditions
);

router.post("/next-status-estimate-cost/:serviceOrderId",
    authorize(ROLES.STAFF),
    nextStatusEstimateCost
);

router.put("/update-estimate-cost/:serviceOrderId",
    authorize(ROLES.STAFF),
    validate(putEstimateCostSchema),
    putEstimateCost
);

router.post("/next-status-processing/:serviceOrderId",
    authorize(ROLES.STAFF),
    nextStatusProcessing
);

router.post("/next-status-processed/:serviceOrderId",
    authorize(ROLES.STAFF),
    nextStatusProcessed
);

router.put("/update-final-cost/:serviceOrderId",
    authorize(ROLES.STAFF),
    validate(putFinalCostSchema),
    putFinalCost
);

// Lấy chi tiết phiếu dịch vụ theo ID (đặt cuối để không conflict)
router.get("/:serviceOrderId",
    authorize(ROLES.STAFF),
    getServiceOrderById
);



module.exports = router;