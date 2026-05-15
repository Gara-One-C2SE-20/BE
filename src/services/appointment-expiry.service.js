const { Appointment, APPOINTMENT_STATUS } = require("../models/Appointment.model");

/** Sau giờ hẹn: vẫn cho tạo phiếu dịch vụ trong N ngày */
const ORDER_CREATION_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * PENDING: hết hạn theo slot (expiresAt = giờ hẹn + 30p).
 * CONFIRMED chưa có phiếu: hết hạn sau ORDER_CREATION_GRACE_MS kể từ giờ hẹn.
 */
const expireAppointmentsByRules = async (now = new Date()) => {
    await Appointment.updateMany(
        { status: APPOINTMENT_STATUS.PENDING, expiresAt: { $lt: now } },
        { status: APPOINTMENT_STATUS.EXPIRED }
    );
    const confirmedGraceCutoff = new Date(now.getTime() - ORDER_CREATION_GRACE_MS);
    await Appointment.updateMany(
        {
            status: APPOINTMENT_STATUS.CONFIRMED,
            $or: [{ serviceOrder: null }, { serviceOrder: { $exists: false } }],
            appointmentDate: { $lt: confirmedGraceCutoff }
        },
        { status: APPOINTMENT_STATUS.EXPIRED }
    );
};

module.exports = {
    expireAppointmentsByRules,
    ORDER_CREATION_GRACE_MS
};
