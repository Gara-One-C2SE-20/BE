const express = require("express");
const { authorize } = require("../middlewares/rbac.middleware.js");
const { ROLES } = require("../constants/roles.js");
const { validate } = require("../middlewares/validate.middleware.js");
const {
    createInvoiceFromOrderSchema,
    updateInvoicePaymentSchema
} = require("../validators/invoice.validator.js");
const {
    createInvoiceFromOrder,
    getInvoiceById,
    getInvoiceByServiceOrder,
    getAllInvoices,
    getMyInvoices,
    updateInvoicePayment
} = require("../controllers/invoice.controller.js");

const router = express.Router();

router.get("/", authorize(ROLES.ADMIN, ROLES.STAFF), getAllInvoices);
router.get("/my-invoices", authorize(ROLES.CUSTOMER), getMyInvoices);
router.get("/service-order/:serviceOrderId", authorize(ROLES.ADMIN, ROLES.STAFF), getInvoiceByServiceOrder);
router.get("/:invoiceId", authorize(ROLES.ADMIN, ROLES.STAFF), getInvoiceById);

router.post(
    "/from-order/:serviceOrderId",
    authorize(ROLES.STAFF),
    validate(createInvoiceFromOrderSchema),
    createInvoiceFromOrder
);

router.patch(
    "/:invoiceId/payment",
    authorize(ROLES.STAFF),
    validate(updateInvoicePaymentSchema),
    updateInvoicePayment
);

module.exports = router;
