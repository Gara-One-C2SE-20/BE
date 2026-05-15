
const {z} = require('zod');

const createOrderServiceSchema = z.object({
    customer : z.string().min(8, "Id khách hàng không được để trống"), // objectId
    customerRequirements: z.string().optional(),
    /** Gắn phiếu với lịch hẹn sau khi nhân viên đã kiểm tra form tiếp nhận */
    appointmentId: z.string().trim().min(1).optional(),
    vehicle: z.object({
        licensePlate: z.string().min(1, "Biển số xe không được để trống"),
        brand: z.string().optional(),
        model: z.string().optional(),
        color: z.string().optional(),
        vin: z.string().optional(),
        year: z.number().optional()
    }),
});

const putVehicleConditionsSchema = z.object({
    vehicleConditions: z.array(
        z.object({
            description: z.string().optional(),
            photos: z.array(z.string()).optional()
        })
    ).min(1, "Phải có ít nhất một tình trạng xe")
});

const quoteSchema = z.object({
    name: z.string().min(1, "Tên dịch vụ/linh kiện không được để trống"),
    unit : z.string().min(1, "Đơn vị không được để trống"),
    quantity: z.number().min(1, "Số lượng phải lớn hơn 0"),
    unitPrice: z.number().min(0, "Đơn giá phải lớn hơn hoặc bằng 0"),
    totalPrice: z.number().min(0, "Tổng giá phải lớn hơn hoặc bằng 0")
});

const putEstimateCostSchema = z.object({
    estimateCost: z.array(
        quoteSchema
    ).min(1, "Phải có ít nhất một mục chi phí dự kiến")
});

const putFinalCostSchema = z.object({
    finalCost: z.array(quoteSchema).optional()
}); 



module.exports = {
    createOrderServiceSchema,
    putVehicleConditionsSchema,
    putEstimateCostSchema,
    putFinalCostSchema,
};
