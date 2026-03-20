const { z } = require("zod");

const servicePackageBaseSchema = z.object({
    serviceId: z.string().min(2, "Mã dịch vụ tối thiểu 2 ký tự").optional(),
    name: z.string().min(2, "Tên dịch vụ tối thiểu 2 ký tự"),
    categoryId: z.string().min(2, "Mã danh mục tối thiểu 2 ký tự").optional(),
    category: z.string().min(2, "Tên danh mục tối thiểu 2 ký tự"),
    description: z.string().min(5, "Mô tả tối thiểu 5 ký tự"),
    includes: z.array(z.string().min(1)).optional(),
    details: z.array(z.string().min(1)).optional(),
    duration: z.string().min(1, "Thời gian thực hiện là bắt buộc"),
    warranty: z.string().min(1, "Thông tin bảo hành là bắt buộc"),
    image: z.string().optional(),
    price: z.number().min(0, "Giá phải lớn hơn hoặc bằng 0").optional(),
    priceLabel: z.string().optional(),
    popularity: z.number().min(0, "Độ phổ biến tối thiểu 0").max(100, "Độ phổ biến tối đa 100").optional(),
    isFeatured: z.boolean().optional(),
    isActive: z.boolean().optional()
});

const createServicePackageSchema = servicePackageBaseSchema;

const updateServicePackageSchema = servicePackageBaseSchema.partial().refine(
    (data) => Object.keys(data).length > 0,
    "Dữ liệu cập nhật không được để trống"
);

const setServicePackageActiveSchema = z.object({
    isActive: z.boolean({ message: "isActive phải là true hoặc false" })
});

module.exports = {
    createServicePackageSchema,
    updateServicePackageSchema,
    setServicePackageActiveSchema
};
