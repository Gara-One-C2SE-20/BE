const express = require("express");
const { authorize, authenticate } = require("../middlewares/rbac.middleware");
const { ROLES } = require("../constants/roles");
const { validate } = require("../middlewares/validate.middleware");
const { createAppointmentSchema } = require("../validators/appointment.validator");
const {
    createAppointment,
    getMyAppointments,
    getAllAppointments,
    getAppointmentById,
    cancelAppointment,
    confirmAppointment,
    createOrderFromAppointment
} = require("../controllers/appointment.controller");

const router = express.Router();

// Customer: đặt lịch
router.post("/", authorize(ROLES.CUSTOMER), validate(createAppointmentSchema), createAppointment);

// Customer: xem lịch của mình
router.get("/my-appointments", authorize(ROLES.CUSTOMER), getMyAppointments);

// Customer: hủy lịch
router.patch("/:id/cancel", authorize(ROLES.CUSTOMER), cancelAppointment);

// Staff/Admin: xem tất cả lịch
router.get("/", authorize(ROLES.ADMIN, ROLES.STAFF), getAllAppointments);

// Staff/Admin: chi tiết lịch hẹn
router.get("/:id", authorize(ROLES.ADMIN, ROLES.STAFF), getAppointmentById);

// Staff: xác nhận lịch hẹn
router.patch("/:id/confirm", authorize(ROLES.STAFF), confirmAppointment);

// Staff: tạo order từ lịch hẹn còn hạn
router.post("/:id/create-order", authorize(ROLES.STAFF), createOrderFromAppointment);

module.exports = router;
