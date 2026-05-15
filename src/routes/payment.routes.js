const express = require("express");
const { authorize } = require("../middlewares/rbac.middleware.js");
const { ROLES } = require("../constants/roles.js");
const {
    createZaloPayOrder,
    handleZaloPayCallback,
    checkPaymentStatus,
} = require("../controllers/payment.controller.js");

const router = express.Router();

// Tạo đơn thanh toán ZaloPay (cần đăng nhập, STAFF/ADMIN)
router.post(
    "/zalopay/create-order/:invoiceId",
    authorize(ROLES.STAFF, ROLES.ADMIN),
    createZaloPayOrder
);

// Callback từ ZaloPay (không cần auth - ZaloPay server gọi)
router.post("/zalopay/callback", handleZaloPayCallback);

// Kiểm tra trạng thái thanh toán (cần đăng nhập)
router.get(
    "/zalopay/status/:invoiceId",
    authorize(ROLES.STAFF, ROLES.ADMIN),
    checkPaymentStatus
);

module.exports = router;
