const { z } = require("zod");

const createInvoiceFromOrderSchema = z.object({
    discount: z.number().min(0).optional(),
    tax: z.number().min(0).optional(),
    notes: z.string().optional()
});

const updateInvoicePaymentSchema = z.object({
    paymentStatus: z.enum(["Chưa thanh toán", "Đã thanh toán"]).optional(),
    paymentMethod: z.enum(["Tiền mặt", "Chuyển khoản"]).optional(),
    notes: z.string().optional()
});

module.exports = {
    createInvoiceFromOrderSchema,
    updateInvoicePaymentSchema
};
