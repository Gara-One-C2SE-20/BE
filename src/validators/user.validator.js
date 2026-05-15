const { z } = require("zod");
const { ROLES } = require("../constants/roles.js");

const createStaffSchema = z.object({
    email: z.string().email("Email không hợp lệ"),
    password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
    fullName: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    dateOfBirth: z.string().optional()
});

const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(6, "Mật khẩu hiện tại tối thiểu 6 ký tự"),
        newPassword: z.string().min(6, "Mật khẩu mới tối thiểu 6 ký tự"),
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
        message: "Mật khẩu mới không được trùng mật khẩu hiện tại",
        path: ["newPassword"]
    });

const adminUpdateUserProfileSchema = z.object({
    fullName: z.string().min(2, "Họ tên tối thiểu 2 ký tự").optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    role: z.enum([ROLES.CUSTOMER, ROLES.STAFF], {
        message: "Vai trò chỉ được phép là CUSTOMER hoặc STAFF"
    }).optional(),
    dateOfBirth: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày sinh phải có định dạng YYYY-MM-DD")
        .optional()
}).refine((data) => Object.keys(data).length > 0, {
    message: "Vui lòng cung cấp ít nhất một trường cần cập nhật"
});

module.exports = { createStaffSchema, changePasswordSchema, adminUpdateUserProfileSchema };
