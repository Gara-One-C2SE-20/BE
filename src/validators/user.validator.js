const { z } = require("zod");

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

module.exports = { createStaffSchema, changePasswordSchema };
