const { model, Schema } = require("mongoose");

const APPOINTMENT_STATUS = {
    PENDING: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    CANCELLED: "Đã hủy",
    CONVERTED: "Đã tạo đơn",
    EXPIRED: "Hết hạn"
};

const vehicleSchema = new Schema({
    licensePlate: { type: String },
    brand: { type: String },
    model: { type: String },
    color: { type: String },
    vin: { type: String },
    year: { type: Number }
}, { _id: false });

const appointmentSchema = new Schema({
    customer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    vehicle: { type: vehicleSchema, required: true },
    customerRequirements: { type: String, default: "" },
    appointmentDate: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    status: {
        type: String,
        enum: Object.values(APPOINTMENT_STATUS),
        default: APPOINTMENT_STATUS.PENDING
    },
    serviceOrder: { type: Schema.Types.ObjectId, ref: "ServiceOrder", default: null },
    note: { type: String, default: "" }
}, { timestamps: true });

module.exports = { Appointment: model("Appointment", appointmentSchema), APPOINTMENT_STATUS };
