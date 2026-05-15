const Invoice = require("../models/Invoice.model");
const ServiceOrder = require("../models/ServiceOrder.model");
const { ORDER_STATUS } = require("../constants/order");
const { ApiRes } = require("../utils/response");
const zalopayService = require("../services/zalopay.service");

/**
 * Tạo đơn thanh toán ZaloPay từ invoice
 */
const createZaloPayOrder = async (req, res) => {
    const { invoiceId } = req.params;

    const invoice = await Invoice.findById(invoiceId).populate("serviceOrder");
    if (!invoice) {
        return ApiRes.notFound(res, "Không tìm thấy hóa đơn");
    }

    if (invoice.paymentStatus === "Đã thanh toán") {
        return ApiRes.badRequest(res, "Hóa đơn này đã được thanh toán");
    }

    if (invoice.totalAmount <= 0) {
        return ApiRes.badRequest(res, "Số tiền thanh toán phải lớn hơn 0");
    }

    try {
        const result = await zalopayService.createOrder(invoice);

        if (result.return_code === 1) {
            // Lưu app_trans_id vào invoice
            invoice.zaloPayTransId = result.app_trans_id;
            invoice.paymentMethod = "ZaloPay";
            await invoice.save();

            return ApiRes.success(res, "Tạo đơn thanh toán ZaloPay thành công", {
                order_url: result.order_url,
                app_trans_id: result.app_trans_id,
                zp_trans_token: result.zp_trans_token,
            });
        } else {
            return ApiRes.badRequest(res, `ZaloPay error: ${result.return_message || "Không thể tạo đơn"}`);
        }
    } catch (error) {
        console.error("ZaloPay createOrder error:", error.message);
        return ApiRes.serverError(res, "Lỗi khi tạo đơn thanh toán ZaloPay");
    }
};

/**
 * Callback từ ZaloPay khi thanh toán thành công
 */
const handleZaloPayCallback = async (req, res) => {
    try {
        const { data: dataStr, mac: reqMac } = req.body;

        // Xác minh callback
        const isValid = zalopayService.verifyCallback(dataStr, reqMac);
        if (!isValid) {
            console.warn("ZaloPay callback: MAC verification failed");
            return res.json({ return_code: -1, return_message: "mac not equal" });
        }

        const callbackData = JSON.parse(dataStr);
        const appTransId = callbackData.app_trans_id;

        // Tìm invoice theo app_trans_id
        const invoice = await Invoice.findOne({ zaloPayTransId: appTransId });
        if (!invoice) {
            console.warn("ZaloPay callback: Invoice not found for", appTransId);
            return res.json({ return_code: 0, return_message: "Invoice not found" });
        }

        // Cập nhật trạng thái thanh toán
        invoice.paymentStatus = "Đã thanh toán";
        invoice.paymentMethod = "ZaloPay";
        invoice.paidAt = new Date();
        await invoice.save();

        // Tự động chuyển đơn sang Hoàn thành
        const serviceOrder = await ServiceOrder.findById(invoice.serviceOrder);
        if (serviceOrder && serviceOrder.status === ORDER_STATUS.CHECKOUT) {
            serviceOrder.status = ORDER_STATUS.COMPLETED;
            await serviceOrder.save();
        }

        console.log("ZaloPay callback: Payment successful for", appTransId);
        return res.json({ return_code: 1, return_message: "success" });
    } catch (error) {
        console.error("ZaloPay callback error:", error.message);
        return res.json({ return_code: 0, return_message: error.message });
    }
};

/**
 * Kiểm tra trạng thái thanh toán (FE polling)
 */
const checkPaymentStatus = async (req, res) => {
    const { invoiceId } = req.params;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
        return ApiRes.notFound(res, "Không tìm thấy hóa đơn");
    }

    // Nếu DB đã ghi nhận thanh toán (qua callback)
    if (invoice.paymentStatus === "Đã thanh toán") {
        return ApiRes.success(res, "Đã thanh toán", {
            paymentStatus: "Đã thanh toán",
            isPaid: true,
        });
    }

    // Nếu có app_trans_id, query trực tiếp ZaloPay để kiểm tra
    if (invoice.zaloPayTransId) {
        try {
            const result = await zalopayService.queryOrderStatus(invoice.zaloPayTransId);

            // return_code === 1: thành công
            if (result.return_code === 1) {
                invoice.paymentStatus = "Đã thanh toán";
                invoice.paidAt = new Date();
                await invoice.save();

                // Tự động chuyển đơn sang Hoàn thành
                const serviceOrder = await ServiceOrder.findById(invoice.serviceOrder);
                if (serviceOrder && serviceOrder.status === ORDER_STATUS.CHECKOUT) {
                    serviceOrder.status = ORDER_STATUS.COMPLETED;
                    await serviceOrder.save();
                }

                return ApiRes.success(res, "Đã thanh toán", {
                    paymentStatus: "Đã thanh toán",
                    isPaid: true,
                });
            }

            // return_code === 2: đang xử lý
            if (result.return_code === 2) {
                return ApiRes.success(res, "Đang xử lý thanh toán", {
                    paymentStatus: "Đang xử lý",
                    isPaid: false,
                });
            }
        } catch (error) {
            console.error("ZaloPay query error:", error.message);
        }
    }

    return ApiRes.success(res, "Chưa thanh toán", {
        paymentStatus: "Chưa thanh toán",
        isPaid: false,
    });
};

module.exports = {
    createZaloPayOrder,
    handleZaloPayCallback,
    checkPaymentStatus,
};
