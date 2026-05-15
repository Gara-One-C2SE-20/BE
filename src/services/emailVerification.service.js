const crypto = require("crypto");
const { sendMail } = require("./mail.service.js");

const OTP_LENGTH = 6;
const OTP_EXPIRES_MINUTES = 10;

const generateOtp = () => String(crypto.randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");

const hashOtp = (otp) => crypto.createHash("sha256").update(String(otp).trim()).digest("hex");

const createVerificationPayload = () => {
    const otp = generateOtp();
    return {
        otp,
        codeHash: hashOtp(otp),
        expiresAt: new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000)
    };
};

const sendVerificationEmail = async (email, otp) => {
    const subject = "Mã OTP xác minh tài khoản GaraOne";
    const text = [
        "Chào bạn,",
        `Mã OTP xác minh tài khoản của bạn là: ${otp}`,
        `Mã có hiệu lực trong ${OTP_EXPIRES_MINUTES} phút.`,
        "Nếu bạn không yêu cầu tạo tài khoản, hãy bỏ qua email này."
    ].join("\n");

    const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
            <p>Chào bạn,</p>
            <p>Mã OTP xác minh tài khoản của bạn là:</p>
            <div style="font-size:28px;font-weight:700;letter-spacing:6px;padding:16px 20px;border:1px solid #e5e7eb;display:inline-block;background:#f9fafb">${otp}</div>
            <p>Mã có hiệu lực trong ${OTP_EXPIRES_MINUTES} phút.</p>
            <p>Nếu bạn không yêu cầu tạo tài khoản, hãy bỏ qua email này.</p>
        </div>
    `;

    await sendMail({
        to: email,
        subject,
        text,
        html
    });
};

module.exports = {
    createVerificationPayload,
    hashOtp,
    sendVerificationEmail
};