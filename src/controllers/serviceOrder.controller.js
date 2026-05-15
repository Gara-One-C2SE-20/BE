

const mongoose = require("mongoose");
const User = require("../models/User.model");
const ServiceOrder = require("../models/ServiceOrder.model");
const Invoice = require("../models/Invoice.model");
const { Vehicle } = require("../models/Vehicle.model");
const { Appointment, APPOINTMENT_STATUS } = require("../models/Appointment.model");
const { ROLES } = require("../constants/roles");
const { ORDER_STATUS } = require("../constants/order");
const { ApiRes } = require("../utils/response");
const { ORDER_CREATION_GRACE_MS } = require("../services/appointment-expiry.service");

const invoiceSelect = "invoiceNumber subtotal discount tax totalAmount paymentStatus paymentMethod paidAt createdAt updatedAt";
const statusesWithInvoice = [ORDER_STATUS.CHECKOUT, ORDER_STATUS.COMPLETED];

const normalizeQuoteItems = (items = []) => {
    return items.map((item) => {
        const quantity = Number(item?.quantity) || 0;
        const unitPrice = Number(item?.unitPrice) || 0;
        return {
            name: item?.name || "",
            unit: item?.unit || "cái",
            quantity,
            unitPrice,
            totalPrice: Number(item?.totalPrice) || quantity * unitPrice
        };
    });
};

const attachInvoiceForCheckout = async (serviceOrder) => {
    if (!serviceOrder || !statusesWithInvoice.includes(serviceOrder.status)) {
        return null;
    }

    const invoice = await Invoice.findOne({ serviceOrder: serviceOrder._id }).select(invoiceSelect);
    return invoice;
};

const attachInvoiceForCheckoutList = async (serviceOrders) => {
    const checkoutOrderIds = serviceOrders
        .filter((order) => statusesWithInvoice.includes(order.status))
        .map((order) => order._id);

    if (checkoutOrderIds.length === 0) {
        return serviceOrders;
    }

    const invoices = await Invoice.find({ serviceOrder: { $in: checkoutOrderIds } }).select(`serviceOrder ${invoiceSelect}`);
    const invoiceMap = new Map(invoices.map((invoice) => [invoice.serviceOrder.toString(), invoice]));

    return serviceOrders.map((order) => {
        const normalizedOrder = order.toObject ? order.toObject() : order;
        if (statusesWithInvoice.includes(normalizedOrder.status)) {
            normalizedOrder.invoice = invoiceMap.get(normalizedOrder._id.toString()) || null;
        }
        return normalizedOrder;
    });
};

const getServiceOrderById = async (req, res) => {
    const { serviceOrderId } = req.params;
    const serviceOrder = await ServiceOrder.findById(serviceOrderId)
        .populate('customer', '_id email profile.fullName profile.phone')
        .populate('createdBy', '_id email profile.fullName');

    if (!serviceOrder) {
        return ApiRes.notFound(res, "Không tìm thấy phiếu dịch vụ");
    }

    const serviceOrderData = serviceOrder.toObject();
    if (statusesWithInvoice.includes(serviceOrder.status)) {
        serviceOrderData.invoice = await attachInvoiceForCheckout(serviceOrder);
    }

    return ApiRes.success(res, "Lấy chi tiết phiếu dịch vụ thành công", { serviceOrder: serviceOrderData });
}

const getAllServiceOrders = async (req, res) => {
    const { page = 1, limit = 10, orderNumber } = req.query;
    const query = {};
    if (orderNumber) {
        query.orderNumber = orderNumber;
    }
    const serviceOrders = await ServiceOrder.find(query)
        .select('orderNumber status vehicle.licensePlate vehicle.brand vehicle.model customer createdBy createdAt updatedAt')
        .populate('customer', '_id email profile.fullName profile.phone')
        .populate('createdBy', '_id email profile.fullName')
        .skip((page - 1) * limit)
        .limit(limit);

    const result = await attachInvoiceForCheckoutList(serviceOrders);
    return ApiRes.success(res, "Lấy danh sách phiếu dịch vụ thành công", { serviceOrders: result });
}

const getMyOrders = async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const serviceOrders = await ServiceOrder.find({ customer: req.user.id })
        .select('orderNumber status vehicle.licensePlate vehicle.brand vehicle.model customerRequirements createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

    const result = await attachInvoiceForCheckoutList(serviceOrders);
    return ApiRes.success(res, "Lấy danh sách đơn của bạn thành công", { serviceOrders: result });
};

const getMyOrderById = async (req, res) => {
    const { serviceOrderId } = req.params;
    const serviceOrder = await ServiceOrder.findOne({ _id: serviceOrderId, customer: req.user.id })
        .populate('customer', '_id email profile.fullName profile.phone')
        .populate('createdBy', '_id email profile.fullName');

    if (!serviceOrder) {
        return ApiRes.notFound(res, "Không tìm thấy đơn dịch vụ");
    }

    const serviceOrderData = serviceOrder.toObject();
    if (statusesWithInvoice.includes(serviceOrder.status)) {
        serviceOrderData.invoice = await attachInvoiceForCheckout(serviceOrder);
    }

    return ApiRes.success(res, "Lấy chi tiết đơn thành công", { serviceOrder: serviceOrderData });
};

const getStaffServiceOrders = async (req, res) => {
    const { page = 1, limit = 10, orderNumber } = req.query;
    const query = { createdBy: req.user.id };
    if (orderNumber) {
        query.orderNumber = orderNumber;
    }
    const serviceOrders = await ServiceOrder.find(query)
        .select('orderNumber status vehicle.licensePlate vehicle.brand vehicle.model customer createdBy createdAt updatedAt')
        .populate('customer', '_id email profile.fullName profile.phone')
        .populate('createdBy', '_id email profile.fullName')
        .skip((page - 1) * limit)
        .limit(limit);

    const result = await attachInvoiceForCheckoutList(serviceOrders);
    return ApiRes.success(res, "Lấy danh sách phiếu dịch vụ thành công", { serviceOrders: result });
}


const createServiceOrder = async (req, res, next) => {
    const { customer, vehicle, customerRequirements, appointmentId } = req.body;
    const customerInfo = await User.findById(customer);
    if (!customerInfo || customerInfo.role !== ROLES.CUSTOMER) {
        return ApiRes.badRequest(res, "Khách hàng không hợp lệ");
    }

    let appointmentToLink = null;
    if (appointmentId) {
        if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
            return ApiRes.badRequest(res, "Mã lịch hẹn không hợp lệ");
        }
        appointmentToLink = await Appointment.findById(appointmentId);
        if (!appointmentToLink) {
            return ApiRes.badRequest(res, "Không tìm thấy lịch hẹn");
        }
        if (appointmentToLink.customer.toString() !== customer.toString()) {
            return ApiRes.badRequest(res, "Khách hàng không khớp với lịch hẹn");
        }
        if (appointmentToLink.serviceOrder) {
            return ApiRes.badRequest(res, "Lịch hẹn này đã được gắn phiếu dịch vụ");
        }
        if ([APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.CONVERTED].includes(appointmentToLink.status)) {
            return ApiRes.badRequest(res, "Lịch hẹn không còn hợp lệ để gắn phiếu");
        }
        const orderCreationDeadline = new Date(appointmentToLink.appointmentDate.getTime() + ORDER_CREATION_GRACE_MS);
        if (new Date() > orderCreationDeadline) {
            return ApiRes.badRequest(res, "Đã quá thời hạn gắn phiếu với lịch hẹn này");
        }
    }

    // Sync với Vehicle collection nếu có VIN
    let vehicleData = vehicle;
    if (vehicle.vin) {
        const vinUpper = vehicle.vin.toUpperCase();
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
            const { licensePlate, brand, model, year, color } = vehicle;
            await Vehicle.create({ vin: vinUpper, licensePlate, brand, model, year, color });
            vehicleData = { ...vehicle, vin: vinUpper };
        }
    }

    const orderNumber = await ServiceOrder.generateOrderNumber();
    if (vehicleData.vin) {
        const existingOrder = await ServiceOrder.findOne({
            "vehicle.vin": vehicleData.vin,
            status: { $nin: [ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED] }
        });

        if (existingOrder) {
            return ApiRes.badRequest(res, "Đã tồn tại phiếu dịch vụ cho xe này đang ở trạng thái 'Tiếp nhận' hoặc 'Đang xử lý'");
        }
    }

    const serviceOrder = await ServiceOrder.create({
        orderNumber,
        customer: customer,
        vehicle: vehicleData,
        customerRequirements,
        createdBy: req.user.id
    });

    if (appointmentToLink) {
        appointmentToLink.serviceOrder = serviceOrder._id;
        appointmentToLink.status = APPOINTMENT_STATUS.CONVERTED;
        await appointmentToLink.save();
    }

    const populatedServiceOrder = await serviceOrder.populate([
        { path: 'customer', select: '_id email profile.fullName profile.phone' },
        { path: 'createdBy', select: '_id email profile.fullName' }
    ]);
    return ApiRes.created(res, "Tạo phiếu dịch vụ thành công", { serviceOrder: populatedServiceOrder });
}

const nextStatusInsection = async (req, res) => {
    const { serviceOrderId } = req.params;
    const serviceOrder = await ServiceOrder.findById(serviceOrderId).populate('customer', '_id email profile.fullName profile.phone').populate('createdBy', '_id email profile.fullName');
    if (!serviceOrder) return ApiRes.notFound(res, "Phiếu dịch vụ không tồn tại");
    if (serviceOrder.createdBy._id.toString() !== req.user.id) {
        return ApiRes.forbidden(res, "Bạn không có quyền chuyển trạng thái phiếu dịch vụ này");
    }
    if (serviceOrder.status !== ORDER_STATUS.RECEIVED) {
        return ApiRes.badRequest(res, "Chỉ có thể chuyển trạng thái khi phiếu dịch vụ ở trạng thái 'Tiếp nhận'");
    }
    serviceOrder.status = ORDER_STATUS.INSECTION;
    await serviceOrder.save();
    return ApiRes.success(res, "Chuyển trạng thái 'Kiểm tra' thành công", { serviceOrder });
}


const putVehicleConditions = async (req, res, next) => {
    const { serviceOrderId } = req.params;
    const { vehicleConditions } = req.body;

    const serviceOrder = await ServiceOrder.findById(serviceOrderId);
    if (!serviceOrder) return ApiRes.notFound(res, "Phiếu dịch vụ không tồn tại");
    if (serviceOrder.createdBy._id.toString() !== req.user.id) {
        return ApiRes.forbidden(res, "Bạn không có quyền cập nhật tình trạng xe cho phiếu dịch vụ này");
    }
    if (serviceOrder.status !== ORDER_STATUS.INSECTION) {
        return ApiRes.badRequest(res, "Chỉ có thể cập nhật tình trạng xe khi phiếu dịch vụ ở trạng thái 'Kiểm tra'");
    }
    const updatedServiceOrder = await ServiceOrder.findByIdAndUpdate(serviceOrderId, { vehicleCondition: vehicleConditions }, { new: true }).populate('customer', '_id email profile.fullName profile.phone').populate('createdBy', '_id email profile.fullName');
    return ApiRes.success(res, "Cập nhật tình trạng xe thành công", { serviceOrder: updatedServiceOrder });
}

const nextStatusEstimateCost = async (req, res) => {
    const { serviceOrderId } = req.params;
    const serviceOrder = await ServiceOrder.findById(serviceOrderId).populate('customer', '_id email profile.fullName profile.phone').populate('createdBy', '_id email profile.fullName');
    if (!serviceOrder) return ApiRes.notFound(res, "Phiếu dịch vụ không tồn tại");
    if (serviceOrder.createdBy._id.toString() !== req.user.id) {
        return ApiRes.forbidden(res, "Bạn không có quyền chuyển trạng thái phiếu dịch vụ này");
    }
    if (serviceOrder.status !== ORDER_STATUS.INSECTION) {
        return ApiRes.badRequest(res, "Chỉ có thể chuyển trạng thái khi phiếu dịch vụ ở trạng thái 'Kiểm tra'");
    }
    serviceOrder.status = ORDER_STATUS.ESTIMATECOST;
    await serviceOrder.save();
    return ApiRes.success(res, "Chuyển trạng thái 'Dự báo chi phí' thành công", { serviceOrder });
}

const putEstimateCost = async (req, res, next) => {
    const { serviceOrderId } = req.params;
    const { estimateCost } = req.body;
    const serviceOrder = await ServiceOrder.findById(serviceOrderId).populate('customer', '_id email profile.fullName profile.phone').populate('createdBy', '_id email profile.fullName');
    if (!serviceOrder) return ApiRes.notFound(res, "Phiếu dịch vụ không tồn tại");

    if (serviceOrder.createdBy._id.toString() !== req.user.id) {
        return ApiRes.forbidden(res, "Bạn không có quyền cập nhật chi phí dự kiến cho phiếu dịch vụ này");
    }

    if (serviceOrder.status !== ORDER_STATUS.ESTIMATECOST) {
        return ApiRes.badRequest(res, "Chỉ có thể cập nhật chi phí dự kiến khi phiếu dịch vụ ở trạng thái 'Dự báo chi phí'");
    }
    const updatedServiceOrder = await ServiceOrder.findByIdAndUpdate(serviceOrderId, { estimateCost }, { new: true }).populate('customer', '_id email profile.fullName profile.phone').populate('createdBy', '_id email profile.fullName');
    return ApiRes.success(res, "Cập nhật chi phí dự kiến thành công", { serviceOrder: updatedServiceOrder });
}

const nextStatusProcessing = async (req, res) => {
    const { serviceOrderId } = req.params;
    const serviceOrder = await ServiceOrder.findById(serviceOrderId).populate('customer', '_id email profile.fullName profile.phone').populate('createdBy', '_id email profile.fullName');
    if (!serviceOrder) return ApiRes.notFound(res, "Phiếu dịch vụ không tồn tại");
    if (serviceOrder.createdBy._id.toString() !== req.user.id) {
        return ApiRes.forbidden(res, "Bạn không có quyền chuyển trạng thái phiếu dịch vụ này");
    }
    if (serviceOrder.status !== ORDER_STATUS.ESTIMATECOST) {
        return ApiRes.badRequest(res, "Chỉ có thể chuyển trạng thái khi phiếu dịch vụ ở trạng thái 'Dự báo chi phí'");
    }
    if (!serviceOrder.estimateCost || serviceOrder.estimateCost.length === 0) {
        return ApiRes.badRequest(res, "Cần cập nhật chi phí dự kiến trước khi chuyển sang trạng thái 'Đang xử lý'");
    }
    serviceOrder.status = ORDER_STATUS.PROCESSING;
    await serviceOrder.save();
    return ApiRes.success(res, "Chuyển trạng thái 'Đang xử lý' thành công", { serviceOrder });
}

const nextStatusProcessed = async (req, res) => {
    const { serviceOrderId } = req.params;
    const serviceOrder = await ServiceOrder.findById(serviceOrderId).populate('customer', '_id email profile.fullName profile.phone').populate('createdBy', '_id email profile.fullName');
    if (!serviceOrder) return ApiRes.notFound(res, "Phiếu dịch vụ không tồn tại");
    if (serviceOrder.createdBy._id.toString() !== req.user.id) {
        return ApiRes.forbidden(res, "Bạn không có quyền chuyển trạng thái phiếu dịch vụ này");
    }
    if (serviceOrder.status !== ORDER_STATUS.PROCESSING) {
        return ApiRes.badRequest(res, "Chỉ có thể chuyển trạng thái khi phiếu dịch vụ ở trạng thái 'Đang xử lý'");
    }

    if ((!serviceOrder.finalCost || serviceOrder.finalCost.length === 0) && (serviceOrder.estimateCost || []).length > 0) {
        serviceOrder.finalCost = normalizeQuoteItems(serviceOrder.estimateCost);
    }

    serviceOrder.status = ORDER_STATUS.PROCESSED;
    await serviceOrder.save();
    return ApiRes.success(res, "Chuyển trạng thái 'Xử lý xong' thành công", { serviceOrder });
}


const putFinalCost = async (req, res, next) => {
    const { serviceOrderId } = req.params;
    const { finalCost } = req.body;
    const serviceOrder = await ServiceOrder.findById(serviceOrderId).populate('customer', '_id email profile.fullName profile.phone').populate('createdBy', '_id email profile.fullName');
    if (!serviceOrder) return ApiRes.notFound(res, "Phiếu dịch vụ không tồn tại");
    if (serviceOrder.createdBy._id.toString() !== req.user.id) {
        return ApiRes.forbidden(res, "Bạn không có quyền cập nhật chi phí cuối cùng cho phiếu dịch vụ này");
    }
    if (serviceOrder.status !== ORDER_STATUS.PROCESSED) {
        return ApiRes.badRequest(res, "Chỉ có thể cập nhật chi phí thực tế khi phiếu dịch vụ ở trạng thái 'Xử lý xong'");
    }

    const existedInvoice = await Invoice.findOne({ serviceOrder: serviceOrderId }).select('_id invoiceNumber');
    if (existedInvoice) {
        return ApiRes.badRequest(res, "Không thể cập nhật chi phí thực tế sau khi hóa đơn đã được tạo");
    }

    const updatedServiceOrder = await ServiceOrder.findByIdAndUpdate(
        serviceOrderId,
        { finalCost },
        { new: true }
    ).populate('customer', '_id email profile.fullName profile.phone').populate('createdBy', '_id email profile.fullName');

    return ApiRes.success(res, "Cập nhật chi phí thực tế thành công", {
        serviceOrder: updatedServiceOrder
    });
}

const setCheckoutStatus = async (req, res) => {
    const { serviceOrderId } = req.params;

    const serviceOrder = await ServiceOrder.findById(serviceOrderId)
        .populate('customer', '_id email profile.fullName profile.phone')
        .populate('createdBy', '_id email profile.fullName');

    if (!serviceOrder) {
        return ApiRes.notFound(res, "Phiếu dịch vụ không tồn tại");
    }
    if (serviceOrder.createdBy._id.toString() !== req.user.id) {
        return ApiRes.forbidden(res, "Bạn không có quyền checkout phiếu dịch vụ này");
    }
    if (serviceOrder.status !== ORDER_STATUS.PROCESSED) {
        return ApiRes.badRequest(res, "Chỉ có thể checkout khi phiếu dịch vụ ở trạng thái 'Xử lý xong'");
    }
    if (!serviceOrder.finalCost || serviceOrder.finalCost.length === 0) {
        return ApiRes.badRequest(res, "Cần cập nhật chi phí thực tế trước khi checkout");
    }

    const existedInvoice = await Invoice.findOne({ serviceOrder: serviceOrderId });
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

    serviceOrder.status = ORDER_STATUS.CHECKOUT;
    await serviceOrder.save();

    const populatedInvoice = await Invoice.findById(invoice._id)
        .select(invoiceSelect)
        .populate("serviceOrder", "_id orderNumber status")
        .populate("customer", "_id email profile.fullName profile.phone")
        .populate("createdBy", "_id email profile.fullName");

    return ApiRes.success(res, "Checkout và tạo hóa đơn thành công", {
        serviceOrder,
        invoice: populatedInvoice
    });
};


const setCompletedStatus = async (req, res) => {
    const { serviceOrderId } = req.params;
    const { paymentMethod } = req.body || {};
    const serviceOrder = await ServiceOrder.findById(serviceOrderId).populate('customer', '_id email profile.fullName profile.phone').populate('createdBy', '_id email profile.fullName');
    if (!serviceOrder) return ApiRes.notFound(res, "Phiếu dịch vụ không tồn tại");
    if (serviceOrder.status !== ORDER_STATUS.CHECKOUT) {
        return ApiRes.badRequest(res, "Chỉ có thể hoàn thành phiếu dịch vụ khi ở trạng thái 'Checkout'");
    }
    if (!serviceOrder.finalCost || serviceOrder.finalCost.length === 0) {
        return ApiRes.badRequest(res, "Cần cập nhật chi phí thực tế trước khi hoàn thành phiếu dịch vụ");
    }

    const invoice = await Invoice.findOne({ serviceOrder: serviceOrderId });
    if (!invoice) {
        return ApiRes.badRequest(res, "Vui lòng tạo hóa đơn trước khi hoàn thành phiếu dịch vụ");
    }

    invoice.paymentStatus = "Đã thanh toán";
    if (paymentMethod) {
        invoice.paymentMethod = paymentMethod;
    }
    invoice.paidAt = new Date();
    await invoice.save();

    serviceOrder.status = ORDER_STATUS.COMPLETED;
    await serviceOrder.save();

    const populatedInvoice = await Invoice.findById(invoice._id)
        .select(invoiceSelect)
        .populate("serviceOrder", "_id orderNumber status")
        .populate("customer", "_id email profile.fullName profile.phone")
        .populate("createdBy", "_id email profile.fullName");

    return ApiRes.success(res, "Hoàn thành phiếu dịch vụ thành công. Hóa đơn đã được xác nhận hoàn tất", {
        serviceOrder,
        invoice: populatedInvoice
    });
}

const setCancelledStatus = async (req, res) => {
    const { serviceOrderId } = req.params;
    const serviceOrder = await ServiceOrder.findById(serviceOrderId).populate('customer', '_id email profile.fullName profile.phone').populate('createdBy', '_id email profile.fullName');
    if (!serviceOrder) return ApiRes.notFound(res, "Phiếu dịch vụ không tồn tại");
    if (serviceOrder.createdBy._id.toString() !== req.user.id) {
        return ApiRes.forbidden(res, "Bạn không có quyền hủy phiếu dịch vụ này");
    }
    if (serviceOrder.status === ORDER_STATUS.COMPLETED) {
        return ApiRes.badRequest(res, "Không thể hủy phiếu dịch vụ đã hoàn thành");
    }
    serviceOrder.status = ORDER_STATUS.CANCELLED;
    await serviceOrder.save();
    return ApiRes.success(res, "Hủy phiếu dịch vụ thành công", { serviceOrder });
}



module.exports = {
    getServiceOrderById,
    getAllServiceOrders,
    getStaffServiceOrders,
    getMyOrders,
    getMyOrderById,
    createServiceOrder,
    nextStatusInsection,
    putVehicleConditions,
    nextStatusEstimateCost,
    putEstimateCost,
    putFinalCost,
    setCheckoutStatus,
    nextStatusProcessing,
    nextStatusProcessed,
    setCompletedStatus,
    setCancelledStatus
};