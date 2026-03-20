const {model, Schema} = require("mongoose");
const {ORDER_STATUS} = require("../constants/order.js")

const vehicleSchema = new Schema({
    licensePlate: { type: String, required: true },
    brand: { type: String },
    model: { type: String },
    color: { type: String },
    vin: { type: String },
    year: { type: Number }
});

const vehicleConditionSchema = new Schema({
    description: { type: String },
    photos: [{ type: String }]
});

const quoteSchema = new Schema({
    name: { type: String, required: true },
    unit : { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true }
});


const invoicePaymentSchema = new Schema({
    status: { type: String, enum: ["Chưa thanh toán", "Đã thanh toán"], default: "Chưa thanh toán" },
    type: { type: String, enum: ["Tiền mặt", "Chuyển khoản"] },
    paidAt: { type: Date }
});

const serviceOrderSchema = new Schema({
    orderNumber: { type: String, required: true, unique: true },
    status: { type: String, enum: Object.values(ORDER_STATUS), default: ORDER_STATUS.RECEIVED },
    customer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    vehicle: vehicleSchema,
    customerRequirements: { type: String, default: "" },

    vehicleCondition: { type: [vehicleConditionSchema], default: [] },
    estimateCost: { type : [quoteSchema], default: [] },
    finalCost: { type : [quoteSchema], default: [] },
    // invoicePayment: { type: invoicePaymentSchema, default: () => ({}) },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

serviceOrderSchema.statics.generateOrderNumber = async function() {
    const prefix = "SO";
    const date = new Date();
    const dateString = date.toISOString().slice(0,10).replace(/-/g, "");

    const lastOrder = await this.findOne({ orderNumber: new RegExp(`^${prefix}${dateString}`) })
        .sort({ orderNumber: -1 })
        .exec();
    let sequenceNumber = 1;
    if (lastOrder) {
        const lastOrderNumber = lastOrder.orderNumber;
        const lastSequence = parseInt(lastOrderNumber.slice(-4));
        sequenceNumber = lastSequence + 1;
    }

    return `${prefix}${dateString}${sequenceNumber.toString().padStart(4, "0")}`;
};

module.exports = model("ServiceOrder", serviceOrderSchema);