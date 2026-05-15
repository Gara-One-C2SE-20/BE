const { model, Schema } = require("mongoose");

const invoiceItemSchema = new Schema({
    name: { type: String, required: true },
    unit: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true }
}, { _id: false });

const invoiceSchema = new Schema({
    invoiceNumber: { type: String, required: true, unique: true },
    serviceOrder: { type: Schema.Types.ObjectId, ref: "ServiceOrder", required: true, unique: true },
    customer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [invoiceItemSchema], default: [] },
    subtotal: { type: Number, required: true, default: 0 },
    discount: { type: Number, required: true, default: 0 },
    tax: { type: Number, required: true, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },
    paymentStatus: {
        type: String,
        enum: ["Chưa thanh toán", "Đã thanh toán"],
        default: "Chưa thanh toán"
    },
    paymentMethod: {
        type: String,
        enum: ["Tiền mặt", "Chuyển khoản", "ZaloPay"],
        default: "Tiền mặt"
    },
    paidAt: { type: Date },
    notes: { type: String, default: "" },
    zaloPayTransId: { type: String, default: null }
}, { timestamps: true });

invoiceSchema.statics.generateInvoiceNumber = async function () {
    const prefix = "INV";
    const date = new Date();
    const dateString = date.toISOString().slice(0, 10).replace(/-/g, "");

    const lastInvoice = await this.findOne({
        invoiceNumber: new RegExp(`^${prefix}${dateString}`)
    }).sort({ invoiceNumber: -1 });

    let sequenceNumber = 1;
    if (lastInvoice) {
        const lastSequence = parseInt(lastInvoice.invoiceNumber.slice(-4), 10);
        sequenceNumber = lastSequence + 1;
    }

    return `${prefix}${dateString}${sequenceNumber.toString().padStart(4, "0")}`;
};

module.exports = model("Invoice", invoiceSchema);
