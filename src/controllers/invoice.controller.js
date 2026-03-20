const Invoice = require("../models/Invoice.model");
const ServiceOrder = require("../models/ServiceOrder.model");
const { ORDER_STATUS } = require("../constants/order");
const { ApiRes } = require("../utils/response");

const createInvoiceFromOrder = async (req, res) => {
    const { serviceOrderId } = req.params;

    const serviceOrder = await ServiceOrder.findById(serviceOrderId)
        .populate("customer", "_id email profile.fullName profile.phone")
        .populate("createdBy", "_id email profile.fullName");

    if (!serviceOrder) {
        return ApiRes.notFound(res, "Phiếu dịch vụ không tồn tại");
    }

    if (serviceOrder.createdBy._id.toString() !== req.user.id) {
        return ApiRes.forbidden(res, "Bạn không có quyền tạo hóa đơn cho phiếu dịch vụ này");
    }

    if (serviceOrder.status !== ORDER_STATUS.CHECKOUT) {
        return ApiRes.badRequest(res, "Chỉ có thể tạo hóa đơn khi phiếu dịch vụ ở trạng thái 'Checkout'");
    }

    if (!serviceOrder.finalCost || serviceOrder.finalCost.length === 0) {
        return ApiRes.badRequest(res, "Phiếu dịch vụ chưa có chi phí thực tế");
    }

    const existedInvoice = await Invoice.findOne({ serviceOrder: serviceOrderId })
        .populate("serviceOrder", "_id orderNumber status")
        .populate("customer", "_id email profile.fullName profile.phone")
        .populate("createdBy", "_id email profile.fullName");
    if (existedInvoice) {
        return ApiRes.conflict(res, "Phiếu dịch vụ này đã có hóa đơn");
    }

    const subtotal = serviceOrder.finalCost.reduce((sum, item) => {
        const lineTotal = Number(item.totalPrice || (item.quantity * item.unitPrice) || 0);
        return sum + lineTotal;
    }, 0);

    const totalAmount = subtotal;

    const invoiceNumber = await Invoice.generateInvoiceNumber();
    const invoice = await Invoice.create({
        invoiceNumber,
        serviceOrder: serviceOrder._id,
        customer: serviceOrder.customer._id,
        createdBy: req.user.id,
        items: serviceOrder.finalCost,
        subtotal,
        totalAmount
    });

    const populatedInvoice = await Invoice.findById(invoice._id)
        .populate("serviceOrder", "_id orderNumber status")
        .populate("customer", "_id email profile.fullName profile.phone")
        .populate("createdBy", "_id email profile.fullName");

    return ApiRes.created(res, "Tạo hóa đơn thành công", { invoice: populatedInvoice });
};

const getInvoiceById = async (req, res) => {
    const { invoiceId } = req.params;
    const invoice = await Invoice.findById(invoiceId)
        .populate("serviceOrder", "_id orderNumber status")
        .populate("customer", "_id email profile.fullName profile.phone")
        .populate("createdBy", "_id email profile.fullName");

    if (!invoice) {
        return ApiRes.notFound(res, "Không tìm thấy hóa đơn");
    }

    return ApiRes.success(res, "Lấy chi tiết hóa đơn thành công", { invoice });
};

const getInvoiceByServiceOrder = async (req, res) => {
    const { serviceOrderId } = req.params;
    const invoice = await Invoice.findOne({ serviceOrder: serviceOrderId })
        .populate("serviceOrder", "_id orderNumber status")
        .populate("customer", "_id email profile.fullName profile.phone")
        .populate("createdBy", "_id email profile.fullName");

    if (!invoice) {
        return ApiRes.notFound(res, "Phiếu dịch vụ này chưa có hóa đơn");
    }

    return ApiRes.success(res, "Lấy hóa đơn theo phiếu dịch vụ thành công", { invoice });
};

const getMyInvoices = async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const invoices = await Invoice.find({ customer: req.user.id })
        .populate("serviceOrder", "_id orderNumber status vehicle")
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

    return ApiRes.success(res, "Lấy danh sách hóa đơn của bạn thành công", { invoices });
};

const getAllInvoices = async (req, res) => {
    const { page = 1, limit = 10, invoiceNumber } = req.query;
    const query = {};
    if (invoiceNumber) {
        query.invoiceNumber = { $regex: invoiceNumber, $options: "i" };
    }

    const invoices = await Invoice.find(query)
        .populate("serviceOrder", "_id orderNumber status")
        .populate("customer", "_id email profile.fullName profile.phone")
        .populate("createdBy", "_id email profile.fullName")
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

    return ApiRes.success(res, "Lấy danh sách hóa đơn thành công", {
        invoices,
        page: Number(page),
        limit: Number(limit)
    });
};

const updateInvoicePayment = async (req, res) => {
    const { invoiceId } = req.params;
    const { paymentStatus, paymentMethod, notes } = req.body;

    const invoice = await Invoice.findById(invoiceId).populate("serviceOrder", "_id orderNumber status");
    if (!invoice) {
        return ApiRes.notFound(res, "Không tìm thấy hóa đơn");
    }

    if (paymentStatus) {
        invoice.paymentStatus = paymentStatus;
    }

    if (paymentMethod) {
        invoice.paymentMethod = paymentMethod;
    }

    if (notes !== undefined) {
        invoice.notes = notes;
    }

    invoice.paidAt = invoice.paymentStatus === "Đã thanh toán" ? new Date() : undefined;
    await invoice.save();

    return ApiRes.success(res, "Cập nhật thanh toán hóa đơn thành công", { invoice });
};

module.exports = {
    createInvoiceFromOrder,
    getInvoiceById,
    getInvoiceByServiceOrder,
    getAllInvoices,
    getMyInvoices,
    updateInvoicePayment
};
