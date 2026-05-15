const { sendMail } = require("./mail.service.js");

const BRAND = {
    primary: "#1a1f2e",
    primaryDark: "#0f1320",
    accent: "#e85a1b",
    accentDark: "#c64715",
    success: "#198754",
    lightBg: "#f8f9fa",
    border: "#dee2e6",
    text: "#1a1f2e",
    muted: "#6c757d",
    white: "#ffffff"
};

const escapeHtml = (value) => {
    if (value === null || value === undefined) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
};

const formatDateTimeVN = (date) => {
    if (!date) return "-";
    try {
        const d = new Date(date);
        const time = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
        const dateStr = d.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
        return `${time} - ${dateStr}`;
    } catch {
        return String(date);
    }
};

const renderInfoRow = (label, value) => `
    <tr>
        <td style="padding:10px 16px;border-bottom:1px solid ${BRAND.border};color:${BRAND.muted};font-size:13px;width:42%;vertical-align:top;">${escapeHtml(label)}</td>
        <td style="padding:10px 16px;border-bottom:1px solid ${BRAND.border};color:${BRAND.text};font-size:14px;font-weight:600;">${escapeHtml(value || "-")}</td>
    </tr>
`;

const buildAppointmentConfirmationHtml = ({ customerName, customerEmail, appointment, supportPhone, supportEmail }) => {
    const apptDate = formatDateTimeVN(appointment.appointmentDate);
    const vehicle = appointment.vehicle || {};
    const vehicleLine = [vehicle.brand, vehicle.model].filter(Boolean).join(" ") || "-";
    const requirements = appointment.customerRequirements?.trim() || "Chưa có yêu cầu cụ thể";
    const note = appointment.note?.trim();
    const appointmentCode = appointment._id ? String(appointment._id).slice(-8).toUpperCase() : "-";

    return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>Xác nhận lịch hẹn - GaraOne</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.lightBg};font-family:'Segoe UI',Roboto,Arial,sans-serif;color:${BRAND.text};">
    <div style="display:none;max-height:0;overflow:hidden;">Lịch hẹn của bạn tại GaraOne đã được xác nhận. Hẹn gặp bạn vào ${apptDate}.</div>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${BRAND.lightBg};padding:32px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background:${BRAND.white};border:1px solid ${BRAND.border};box-shadow:0 4px 16px rgba(26,31,46,0.08);">
                    <tr>
                        <td style="background:linear-gradient(135deg,${BRAND.primary} 0%,${BRAND.primaryDark} 100%);padding:28px 32px;color:${BRAND.white};">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="vertical-align:middle;">
                                        <div style="display:inline-block;background:${BRAND.accent};color:${BRAND.white};font-weight:800;font-size:18px;letter-spacing:1px;padding:8px 14px;">GARAONE</div>
                                    </td>
                                    <td align="right" style="vertical-align:middle;color:#cbd5e1;font-size:12px;">
                                        Mã lịch hẹn<br/>
                                        <span style="color:${BRAND.white};font-weight:700;font-size:14px;letter-spacing:1px;">#${escapeHtml(appointmentCode)}</span>
                                    </td>
                                </tr>
                            </table>
                            <h1 style="margin:20px 0 6px 0;font-size:24px;font-weight:700;line-height:1.3;">Lịch hẹn của bạn đã được xác nhận</h1>
                            <p style="margin:0;color:#cbd5e1;font-size:14px;">Cảm ơn bạn đã tin tưởng GaraOne. Chúng tôi đã sẵn sàng phục vụ.</p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:28px 32px 8px 32px;">
                            <p style="margin:0 0 8px 0;font-size:15px;">Xin chào <strong style="color:${BRAND.primary}">${escapeHtml(customerName || "Quý khách")}</strong>,</p>
                            <p style="margin:0 0 18px 0;font-size:14px;line-height:1.6;color:#374151;">
                                Lịch hẹn dịch vụ của bạn tại <strong>GaraOne</strong> đã được nhân viên xác nhận thành công.
                                Vui lòng kiểm tra thông tin chi tiết bên dưới và có mặt đúng giờ để chúng tôi phục vụ bạn tốt nhất.
                            </p>

                            <div style="background:${BRAND.lightBg};border-left:4px solid ${BRAND.accent};padding:14px 18px;margin:0 0 20px 0;">
                                <p style="margin:0;font-size:12px;color:${BRAND.muted};text-transform:uppercase;letter-spacing:1px;">Thời gian hẹn</p>
                                <p style="margin:4px 0 0 0;font-size:18px;font-weight:700;color:${BRAND.primary};">${escapeHtml(apptDate)}</p>
                            </div>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:0 32px;">
                            <h3 style="margin:0 0 10px 0;font-size:14px;color:${BRAND.primary};text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid ${BRAND.accent};display:inline-block;padding-bottom:4px;">Thông tin khách hàng</h3>
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.border};margin-top:6px;">
                                ${renderInfoRow("Họ và tên", customerName)}
                                ${renderInfoRow("Email", customerEmail)}
                                ${renderInfoRow("Số điện thoại", appointment.customer?.profile?.phone)}
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:24px 32px 0 32px;">
                            <h3 style="margin:0 0 10px 0;font-size:14px;color:${BRAND.primary};text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid ${BRAND.accent};display:inline-block;padding-bottom:4px;">Thông tin xe</h3>
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.border};margin-top:6px;">
                                ${renderInfoRow("Biển số", vehicle.licensePlate)}
                                ${renderInfoRow("Hãng / Dòng xe", vehicleLine)}
                                ${renderInfoRow("Màu xe", vehicle.color)}
                                ${renderInfoRow("Năm sản xuất", vehicle.year)}
                                ${vehicle.vin ? renderInfoRow("Số VIN", vehicle.vin) : ""}
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:24px 32px 0 32px;">
                            <h3 style="margin:0 0 10px 0;font-size:14px;color:${BRAND.primary};text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid ${BRAND.accent};display:inline-block;padding-bottom:4px;">Yêu cầu của khách hàng</h3>
                            <div style="border:1px solid ${BRAND.border};padding:14px 16px;font-size:14px;color:${BRAND.text};white-space:pre-wrap;line-height:1.6;">${escapeHtml(requirements)}</div>
                            ${note ? `
                                <p style="margin:14px 0 6px 0;font-size:13px;color:${BRAND.muted};"><strong>Ghi chú:</strong></p>
                                <div style="border-left:3px solid ${BRAND.muted};padding:8px 14px;background:${BRAND.lightBg};font-size:13px;color:${BRAND.text};white-space:pre-wrap;line-height:1.6;">${escapeHtml(note)}</div>
                            ` : ""}
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:28px 32px 0 32px;">
                            <div style="background:${BRAND.primary};color:${BRAND.white};padding:20px 22px;">
                                <p style="margin:0 0 10px 0;font-size:14px;font-weight:700;color:${BRAND.accent};text-transform:uppercase;letter-spacing:1px;">Lưu ý quan trọng</p>
                                <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.7;color:#e2e8f0;">
                                    <li>Vui lòng có mặt trước giờ hẹn <strong>5-10 phút</strong> để làm thủ tục tiếp nhận.</li>
                                    <li>Mang theo <strong>giấy đăng ký xe</strong> và <strong>giấy tờ tùy thân</strong> để thuận tiện cho việc đối chiếu.</li>
                                    <li>Nếu cần thay đổi lịch, vui lòng liên hệ trước ít nhất <strong>2 giờ</strong> qua hotline.</li>
                                </ul>
                            </div>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:28px 32px;text-align:center;">
                            <p style="margin:0 0 6px 0;font-size:13px;color:${BRAND.muted};">Bạn cần hỗ trợ?</p>
                            <p style="margin:0;font-size:14px;color:${BRAND.text};">
                                Hotline: <a href="tel:${escapeHtml(supportPhone)}" style="color:${BRAND.accent};text-decoration:none;font-weight:700;">${escapeHtml(supportPhone)}</a>
                                &nbsp;•&nbsp;
                                Email: <a href="mailto:${escapeHtml(supportEmail)}" style="color:${BRAND.accent};text-decoration:none;font-weight:700;">${escapeHtml(supportEmail)}</a>
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="background:${BRAND.primaryDark};padding:18px 32px;text-align:center;color:#94a3b8;font-size:12px;">
                            <p style="margin:0 0 4px 0;color:${BRAND.white};font-weight:700;letter-spacing:1px;">GARAONE — Dịch vụ chăm sóc xe chuyên nghiệp</p>
                            <p style="margin:0;">© ${new Date().getFullYear()} GaraOne. Email này được gửi tự động, vui lòng không trả lời trực tiếp.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
};

const buildAppointmentConfirmationText = ({ customerName, appointment, supportPhone, supportEmail }) => {
    const apptDate = formatDateTimeVN(appointment.appointmentDate);
    const vehicle = appointment.vehicle || {};
    const vehicleLine = [vehicle.brand, vehicle.model].filter(Boolean).join(" ") || "-";
    const requirements = appointment.customerRequirements?.trim() || "Chưa có yêu cầu cụ thể";

    return [
        `GARAONE - XÁC NHẬN LỊCH HẸN`,
        ``,
        `Xin chào ${customerName || "Quý khách"},`,
        ``,
        `Lịch hẹn của bạn tại GaraOne đã được xác nhận.`,
        ``,
        `THỜI GIAN HẸN: ${apptDate}`,
        ``,
        `THÔNG TIN XE:`,
        `- Biển số: ${vehicle.licensePlate || "-"}`,
        `- Xe: ${vehicleLine}`,
        `- Màu: ${vehicle.color || "-"}`,
        `- Năm SX: ${vehicle.year || "-"}`,
        ``,
        `YÊU CẦU:`,
        requirements,
        ``,
        `Vui lòng có mặt trước giờ hẹn 5-10 phút và mang theo giấy tờ xe.`,
        ``,
        `Hỗ trợ: ${supportPhone} - ${supportEmail}`,
        ``,
        `Cảm ơn bạn đã tin tưởng GaraOne!`
    ].join("\n");
};

/**
 * Gửi email xác nhận lịch hẹn cho khách hàng.
 * Không throw để tránh ảnh hưởng flow chính của controller — chỉ log lỗi.
 */
const sendAppointmentConfirmationEmail = async (appointment) => {
    const apptId = appointment?._id ? String(appointment._id) : "unknown";
    console.log(`[appointment-email] Bắt đầu gửi email xác nhận cho lịch hẹn ${apptId}`);

    try {
        // Phòng trường hợp customer chưa được populate (chỉ là ObjectId) — re-populate
        let customer = appointment.customer;
        const isPopulated = customer && typeof customer === "object" && customer.email !== undefined;

        if (!isPopulated) {
            console.log(`[appointment-email] customer chưa populate, đang nạp lại...`);
            const User = require("../models/User.model");
            const customerId = customer?._id || customer;
            customer = await User.findById(customerId).select("_id email profile.fullName profile.phone").lean();
        }

        const to = customer?.email;
        if (!to) {
            console.warn(`[appointment-email] BỎ QUA: thiếu email khách hàng (appointment=${apptId})`);
            return { sent: false, reason: "missing_email" };
        }

        // Kiểm tra cấu hình mail
        const mailUser = process.env.MAIL_USER;
        const mailPass = process.env.MAIL_APP_PASS;
        if (!mailUser || !mailPass) {
            console.error(`[appointment-email] LỖI CẤU HÌNH: thiếu MAIL_USER hoặc MAIL_APP_PASS trong .env`);
            return { sent: false, reason: "missing_mail_config" };
        }

        const customerName = customer?.profile?.fullName || customer?.email;
        const supportPhone = process.env.SUPPORT_HOTLINE || "1900 1234";
        const supportEmail = process.env.SUPPORT_EMAIL || mailUser || "support@garaone.vn";

        // Chuẩn bị một bản appointment "an toàn" cho template (đảm bảo có customer populated)
        const appointmentForTemplate = {
            ...(appointment.toObject ? appointment.toObject() : appointment),
            customer
        };

        const html = buildAppointmentConfirmationHtml({
            customerName,
            customerEmail: to,
            appointment: appointmentForTemplate,
            supportPhone,
            supportEmail
        });

        const text = buildAppointmentConfirmationText({
            customerName,
            appointment: appointmentForTemplate,
            supportPhone,
            supportEmail
        });

        console.log(`[appointment-email] Đang gửi tới: ${to} (appointment=${apptId})`);

        const info = await sendMail({
            to,
            subject: `[GaraOne] Lịch hẹn của bạn đã được xác nhận - ${formatDateTimeVN(appointment.appointmentDate)}`,
            text,
            html
        });

        console.log(`[appointment-email] GỬI THÀNH CÔNG tới ${to} (messageId=${info?.messageId || "n/a"}, response=${info?.response || "n/a"})`);
        return { sent: true, messageId: info?.messageId };
    } catch (error) {
        console.error(`[appointment-email] GỬI THẤT BẠI (appointment=${apptId}):`, error?.message || error);
        if (error?.stack) console.error(error.stack);
        return { sent: false, reason: "send_error", error: error?.message };
    }
};

module.exports = {
    sendAppointmentConfirmationEmail
};
