

const User = require("../models/User.model");
const ServiceOrder = require("../models/ServiceOrder.model");
const { ROLES } = require("../constants/roles");
const { ORDER_STATUS } = require("../constants/order");
const { ApiRes } = require("../utils/response");

const getServiceOrderById = async (req, res) => {
    const { serviceOrderId } = req.params;
    const serviceOrder = await ServiceOrder.findById(serviceOrderId)
        .populate('customer', '_id email profile.fullName profile.phone')
        .populate('createdBy', '_id email profile.fullName');

    if (!serviceOrder) {
        return ApiRes.notFound(res, "Không tìm thấy phiếu dịch vụ");
    }
    return ApiRes.success(res, "Lấy chi tiết phiếu dịch vụ thành công", { serviceOrder });
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
    return ApiRes.success(res, "Lấy danh sách phiếu dịch vụ thành công", { serviceOrders });
}

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
    return ApiRes.success(res, "Lấy danh sách phiếu dịch vụ thành công", { serviceOrders });
}


const createServiceOrder = async (req, res, next) => {
    const { customer, vehicle, customerRequirements } = req.body;
    const customerInfo = await User.findById(customer);
    if (!customerInfo || customerInfo.role !== ROLES.CUSTOMER) {
        return ApiRes.badRequest(res, "Khách hàng không hợp lệ");
    }

    const orderNumber = await ServiceOrder.generateOrderNumber();
    const existingOrder = await ServiceOrder.findOne({
        "vehicle.vin": vehicle.vin,
        status: { $nin: [ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED] }
    });

    if (existingOrder) {
        return ApiRes.badRequest(res, "Đã tồn tại phiếu dịch vụ cho xe này đang ở trạng thái 'Tiếp nhận' hoặc 'Đang xử lý'");
    }

    const serviceOrder = await ServiceOrder.create({
        orderNumber,
        customer: customer,
        vehicle: vehicle,
        customerRequirements,
        createdBy: req.user.id
    });
    const populatedServiceOrder = await serviceOrder.populate('customer', '_id email profile.fullName profile.phone').populate('createdBy', '_id email profile.fullName');
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
    serviceOrder.status = ORDER_STATUS.PROCESSING;
    serviceOrder.finalCost = serviceOrder.estimateCost;
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
    if (![ORDER_STATUS.PROCESSING, ORDER_STATUS.PROCESSED].includes(serviceOrder.status)) {
        return ApiRes.badRequest(res, "Chỉ có thể cập nhật chi phí cuối cùng khi phiếu dịch vụ ở trạng thái 'Đang xử lý'");
    }
    const updatedServiceOrder = await ServiceOrder.findByIdAndUpdate(serviceOrderId, { finalCost }, { new: true }).populate('customer', '_id email profile.fullName profile.phone').populate('createdBy', '_id email profile.fullName');
    return ApiRes.success(res, "Cập nhật chi phí cuối cùng thành công", { serviceOrder: updatedServiceOrder });
}


const setCompletedStatus = async (req, res) => {
    const { serviceOrderId } = req.params;
    const serviceOrder = await ServiceOrder.findById(serviceOrderId).populate('customer', '_id email profile.fullName profile.phone').populate('createdBy', '_id email profile.fullName');
    if (!serviceOrder) return ApiRes.notFound(res, "Phiếu dịch vụ không tồn tại");
    if (serviceOrder.status !== ORDER_STATUS.PROCESSING) {
        return ApiRes.badRequest(res, "Chỉ có thể hoàn thành phiếu dịch vụ khi ở trạng thái 'Đang xử lý'");
    }
    serviceOrder.status = ORDER_STATUS.COMPLETED;
    await serviceOrder.save();
    return ApiRes.success(res, "Hoàn thành phiếu dịch vụ thành công", { serviceOrder });
}

const setCancelledStatus = async (req, res) => {
    const { serviceOrderId } = req.params;
    const serviceOrder = await ServiceOrder.findById(serviceOrderId).populate('customer', '_id email profile.fullName profile.phone').populate('createdBy', '_id email profile.fullName');
    if (!serviceOrder) throw new Error("Phiếu dịch vụ không tồn tại");
    if (serviceOrder.status === ORDER_STATUS.COMPLETED) {
        throw new Error("Không thể hủy phiếu dịch vụ đã hoàn thành");
    }
    serviceOrder.status = ORDER_STATUS.CANCELLED;
    await serviceOrder.save();
    return ApiRes.success(res, "Hủy phiếu dịch vụ thành công", { serviceOrder });
}



module.exports = {
    getServiceOrderById,
    getAllServiceOrders,
    getStaffServiceOrders,
    createServiceOrder,
    nextStatusInsection,
    putVehicleConditions,
    nextStatusEstimateCost,
    putEstimateCost,
    nextStatusInsection,
    putFinalCost,
    nextStatusProcessing,
    nextStatusProcessed,
    setCompletedStatus,
    setCancelledStatus
};