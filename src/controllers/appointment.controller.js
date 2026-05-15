const { Appointment, APPOINTMENT_STATUS } = require("../models/Appointment.model");
const ServiceOrder = require("../models/ServiceOrder.model");
const Invoice = require("../models/Invoice.model");
const { Vehicle } = require("../models/Vehicle.model");
const { ORDER_STATUS } = require("../constants/order");
const { ApiRes } = require("../utils/response");
const { expireAppointmentsByRules, ORDER_CREATION_GRACE_MS } = require("../services/appointment-expiry.service");
const { sendAppointmentConfirmationEmail } = require("../services/appointment-email.service");

const SLOT_DURATION_MS = 30 * 60 * 1000; // 30 phút

// Kiểm tra trùng lịch: không cho phép 2 lịch hẹn có khoảng [appointmentDate, expiresAt] giao nhau
const checkConflict = async (appointmentDate, expiresAt, excludeId = null) => {
    const query = {
        status: { $nin: [APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.CONVERTED, APPOINTMENT_STATUS.EXPIRED] },
        appointmentDate: { $lt: expiresAt },
        expiresAt: { $gt: appointmentDate }
    };
    if (excludeId) query._id = { $ne: excludeId };
    return await Appointment.findOne(query);
};

// POST /appointments — Customer đặt lịch
const createAppointment = async (req, res) => {
    const { appointmentDate: dateStr, vehicle, customerRequirements, note } = req.body;

    const appointmentDate = new Date(dateStr);
    if (isNaN(appointmentDate.getTime())) {
        return ApiRes.badRequest(res, "Ngày hẹn không hợp lệ");
    }

    if (appointmentDate <= new Date()) {
        return ApiRes.badRequest(res, "Ngày hẹn phải ở tương lai");
    }

    const expiresAt = new Date(appointmentDate.getTime() + SLOT_DURATION_MS);

    const conflict = await checkConflict(appointmentDate, expiresAt);
    if (conflict) {
        return ApiRes.conflict(res, `Khung giờ này đã có lịch hẹn (${conflict.appointmentDate.toLocaleString("vi-VN")}). Vui lòng chọn giờ khác`);
    }

    const appointment = await Appointment.create({
        customer: req.user.id,
        vehicle,
        customerRequirements,
        note,
        appointmentDate,
        expiresAt
    });

    const populated = await appointment.populate("customer", "_id email profile.fullName profile.phone");
    return ApiRes.created(res, "Đặt lịch hẹn thành công", { appointment: populated });
};

// GET /appointments/my-appointments — Customer xem lịch của mình
const getMyAppointments = async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const now = new Date();

    await expireAppointmentsByRules(now);

    const appointments = await Appointment.find({ customer: req.user.id })
        .sort({ appointmentDate: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate({ path: "serviceOrder", select: "orderNumber status" })
        .lean();

    const serviceOrderIds = appointments
        .map((a) => (a.serviceOrder && a.serviceOrder._id ? a.serviceOrder._id : a.serviceOrder))
        .filter(Boolean);

    let invoiceByOrderId = new Map();
    if (serviceOrderIds.length > 0) {
        const invoices = await Invoice.find({ serviceOrder: { $in: serviceOrderIds } })
            .select("serviceOrder paymentStatus paidAt")
            .lean();
        invoiceByOrderId = new Map(
            invoices.map((inv) => [inv.serviceOrder.toString(), inv])
        );
    }

    const appointmentsWithPayment = appointments.map((apt) => {
        const orderRef = apt.serviceOrder;
        const orderId = orderRef && orderRef._id ? orderRef._id.toString() : null;
        if (!orderId) {
            return { ...apt, hasServiceOrder: false, invoicePaymentStatus: null };
        }
        const inv = invoiceByOrderId.get(orderId);
        return {
            ...apt,
            hasServiceOrder: true,
            invoicePaymentStatus: inv?.paymentStatus || null
        };
    });

    return ApiRes.success(res, "Lấy danh sách lịch hẹn thành công", { appointments: appointmentsWithPayment });
};

// GET /appointments — Staff/Admin xem tất cả lịch
const getAllAppointments = async (req, res) => {
    const { page = 1, limit = 10, status, date } = req.query;
    const now = new Date();

    await expireAppointmentsByRules(now);

    const query = {};
    if (status) query.status = status;
    if (date) {
        const start = new Date(date);
        const end = new Date(date);
        end.setDate(end.getDate() + 1);
        query.appointmentDate = { $gte: start, $lt: end };
    }

    const appointments = await Appointment.find(query)
        .populate("customer", "_id email profile.fullName profile.phone")
        .populate("serviceOrder", "_id orderNumber status")
        .sort({ appointmentDate: 1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

    return ApiRes.success(res, "Lấy danh sách lịch hẹn thành công", { appointments });
};

// GET /appointments/:id — Chi tiết lịch hẹn
const getAppointmentById = async (req, res) => {
    const { id } = req.params;
    const now = new Date();

    await expireAppointmentsByRules(now);

    const appointment = await Appointment.findById(id)
        .populate("customer", "_id email profile.fullName profile.phone")
        .populate("serviceOrder", "_id orderNumber status");

    if (!appointment) return ApiRes.notFound(res, "Không tìm thấy lịch hẹn");

    return ApiRes.success(res, "Lấy chi tiết lịch hẹn thành công", { appointment });
};

// PATCH /appointments/:id/cancel — Customer hủy lịch
const cancelAppointment = async (req, res) => {
    const { id } = req.params;
    const appointment = await Appointment.findById(id);
    if (!appointment) return ApiRes.notFound(res, "Không tìm thấy lịch hẹn");

    if (appointment.customer.toString() !== req.user.id) {
        return ApiRes.forbidden(res, "Bạn không có quyền hủy lịch hẹn này");
    }

    if ([APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.CONVERTED, APPOINTMENT_STATUS.EXPIRED].includes(appointment.status)) {
        return ApiRes.badRequest(res, "Lịch hẹn này không thể hủy");
    }

    appointment.status = APPOINTMENT_STATUS.CANCELLED;
    await appointment.save();
    return ApiRes.success(res, "Hủy lịch hẹn thành công", { appointment });
};

// PATCH /appointments/:id/confirm — Staff xác nhận lịch hẹn
const confirmAppointment = async (req, res) => {
    const { id } = req.params;
    const appointment = await Appointment.findById(id).populate("customer", "_id email profile.fullName profile.phone");
    if (!appointment) return ApiRes.notFound(res, "Không tìm thấy lịch hẹn");

    if (appointment.status !== APPOINTMENT_STATUS.PENDING) {
        return ApiRes.badRequest(res, "Chỉ có thể xác nhận lịch hẹn ở trạng thái 'Chờ xác nhận'");
    }

    if (appointment.expiresAt < new Date()) {
        appointment.status = APPOINTMENT_STATUS.EXPIRED;
        await appointment.save();
        return ApiRes.badRequest(res, "Lịch hẹn đã hết hạn");
    }

    appointment.status = APPOINTMENT_STATUS.CONFIRMED;
    await appointment.save();

    // Gửi email xác nhận lịch hẹn cho khách hàng (non-blocking, không ảnh hưởng response)
    sendAppointmentConfirmationEmail(appointment).catch((err) => {
        console.error("[confirmAppointment] sendAppointmentConfirmationEmail error:", err?.message || err);
    });

    return ApiRes.success(res, "Xác nhận lịch hẹn thành công", { appointment });
};

// POST /appointments/:id/create-order — Staff tạo order từ lịch hẹn còn hạn
const createOrderFromAppointment = async (req, res) => {
    const { id } = req.params;
    const now = new Date();

    await expireAppointmentsByRules(now);

    const appointment = await Appointment.findById(id).populate("customer", "_id email profile.fullName profile.phone");
    if (!appointment) return ApiRes.notFound(res, "Không tìm thấy lịch hẹn");

    if (appointment.status === APPOINTMENT_STATUS.CANCELLED) {
        return ApiRes.badRequest(res, "Lịch hẹn đã bị hủy");
    }
    if (appointment.status === APPOINTMENT_STATUS.CONVERTED) {
        return ApiRes.badRequest(res, "Lịch hẹn này đã được tạo đơn rồi");
    }

    const orderCreationDeadline = new Date(appointment.appointmentDate.getTime() + ORDER_CREATION_GRACE_MS);
    if (now > orderCreationDeadline) {
        return ApiRes.badRequest(
            res,
            "Đã quá thời hạn tạo phiếu từ lịch hẹn (quá 7 ngày kể từ giờ hẹn). Vui lòng tạo phiếu dịch vụ thủ công cho khách."
        );
    }

    // Kiểm tra xe đang có order đang xử lý chưa (chỉ khi có VIN)
    const vinRaw = appointment.vehicle?.vin;
    if (vinRaw && String(vinRaw).trim()) {
        const existingOrder = await ServiceOrder.findOne({
            "vehicle.vin": String(vinRaw).trim().toUpperCase(),
            status: { $nin: [ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED] }
        });
        if (existingOrder) {
            return ApiRes.badRequest(res, "Xe này đang có phiếu dịch vụ đang xử lý");
        }
    }

    // Sync Vehicle collection nếu có VIN
    let vehicleData = appointment.vehicle.toObject ? appointment.vehicle.toObject() : appointment.vehicle;
    if (vehicleData.vin) {
        const vinUpper = vehicleData.vin.toUpperCase();
        const existingVehicle = await Vehicle.findOne({ vin: vinUpper });
        if (existingVehicle) {
            vehicleData = {
                vin: existingVehicle.vin,
                licensePlate: existingVehicle.licensePlate,
                brand: existingVehicle.brand,
                model: existingVehicle.model,
                year: existingVehicle.year,
                color: existingVehicle.color
            };
        } else {
            const { licensePlate, brand, model, year, color } = vehicleData;
            await Vehicle.create({ vin: vinUpper, licensePlate, brand, model, year, color });
            vehicleData = { ...vehicleData, vin: vinUpper };
        }
    }

    const orderNumber = await ServiceOrder.generateOrderNumber();
    const serviceOrder = await ServiceOrder.create({
        orderNumber,
        customer: appointment.customer._id,
        vehicle: vehicleData,
        customerRequirements: appointment.customerRequirements,
        createdBy: req.user.id
    });

    appointment.status = APPOINTMENT_STATUS.CONVERTED;
    appointment.serviceOrder = serviceOrder._id;
    await appointment.save();

    const populatedOrder = await serviceOrder.populate([
        { path: "customer", select: "_id email profile.fullName profile.phone" },
        { path: "createdBy", select: "_id email profile.fullName" }
    ]);

    return ApiRes.created(res, "Tạo phiếu dịch vụ từ lịch hẹn thành công", {
        serviceOrder: populatedOrder,
        appointment
    });
};

module.exports = {
    createAppointment,
    getMyAppointments,
    getAllAppointments,
    getAppointmentById,
    cancelAppointment,
    confirmAppointment,
    createOrderFromAppointment
};
