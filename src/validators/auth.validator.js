const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự').optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày sinh phải có định dạng YYYY-MM-DD')
    .refine((date) => {
      const dob = new Date(date);
      const now = new Date();
      const age = now.getFullYear() - dob.getFullYear();
      return age >= 0 && age <= 150 && dob <= now;
    }, 'Ngày sinh không hợp lệ')
    .optional()
});

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token là bắt buộc')
});

const verifyEmailSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  otp: z.string().regex(/^\d{6}$/, 'Mã OTP phải gồm 6 chữ số')
});

const resendVerificationOtpSchema = z.object({
  email: z.string().email('Email không hợp lệ')
});

const createStaffSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự').optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày sinh phải có định dạng YYYY-MM-DD')
    .refine((date) => {
      const dob = new Date(date);
      const now = new Date();
      const age = now.getFullYear() - dob.getFullYear();
      return age >= 0 && age <= 150 && dob <= now;
    }, 'Ngày sinh không hợp lệ')
    .optional()
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  verifyEmailSchema,
  resendVerificationOtpSchema,
  createStaffSchema
};
