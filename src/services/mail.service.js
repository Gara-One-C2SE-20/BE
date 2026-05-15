let transporter = null;

const getTransporter = () => {
    if (transporter) {
        return transporter;
    }

    let nodemailer;

    try {
        nodemailer = require("nodemailer");
    } catch (error) {
        throw new Error("Chưa cài nodemailer. Hãy chạy npm install trước khi gửi email.");
    }

    const mailUser = process.env.MAIL_USER;
    const mailAppPassword = (process.env.MAIL_APP_PASS || "").replace(/\s+/g, "");

    if (!mailUser || !mailAppPassword) {
        throw new Error("Thiếu cấu hình MAIL_USER hoặc MAIL_APP_PASS");
    }

    transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: mailUser,
            pass: mailAppPassword
        }
    });

    return transporter;
};

const sendMail = async ({ to, subject, text, html }) => {
    const mailUser = process.env.MAIL_USER;

    return getTransporter().sendMail({
        from: mailUser,
        to,
        subject,
        text,
        html
    });
};

module.exports = { sendMail };