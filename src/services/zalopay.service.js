const axios = require("axios");
const crypto = require("crypto");
const zalopayConfig = require("../config/zalopay.config");

/**
 * Tạo đơn hàng ZaloPay
 * @param {Object} invoice - Invoice document từ DB
 * @returns {Object} { order_url, app_trans_id, zp_trans_token }
 */
const createOrder = async (invoice) => {
    const transID = Date.now();
    const appTransId = `${formatDate(new Date())}_${transID}`;

    const embedData = JSON.stringify({
        redirecturl: `${process.env.APP_FE_URL || "http://localhost:5173"}/dashboard/xu-ly/${invoice.serviceOrder}?payment=success`,
    });

    const items = JSON.stringify(
        (invoice.items || []).map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.unitPrice,
        }))
    );

    const order = {
        app_id: parseInt(zalopayConfig.app_id),
        app_trans_id: appTransId,
        app_user: "GaraOne",
        app_time: Date.now(),
        amount: Math.round(invoice.totalAmount),
        item: items,
        embed_data: embedData,
        description: `GaraOne - Thanh toán hóa đơn #${invoice.invoiceNumber}`,
        callback_url: zalopayConfig.callback_url,
    };

    // Tạo HMAC: app_id|app_trans_id|app_user|amount|app_time|embed_data|item
    const data = [
        order.app_id,
        order.app_trans_id,
        order.app_user,
        order.amount,
        order.app_time,
        order.embed_data,
        order.item,
    ].join("|");

    order.mac = crypto
        .createHmac("sha256", zalopayConfig.key1)
        .update(data)
        .digest("hex");

    const result = await axios.post(
        zalopayConfig.create_endpoint,
        null,
        { params: order }
    );

    return {
        ...result.data,
        app_trans_id: appTransId,
    };
};

/**
 * Xác minh callback từ ZaloPay
 * @param {string} dataStr - data string từ callback
 * @param {string} requestMac - mac string từ callback
 * @returns {boolean}
 */
const verifyCallback = (dataStr, requestMac) => {
    const mac = crypto
        .createHmac("sha256", zalopayConfig.key2)
        .update(dataStr)
        .digest("hex");
    return mac === requestMac;
};

/**
 * Query trạng thái đơn ZaloPay
 * @param {string} appTransId
 * @returns {Object}
 */
const queryOrderStatus = async (appTransId) => {
    const data = `${zalopayConfig.app_id}|${appTransId}|${zalopayConfig.key1}`;
    const mac = crypto
        .createHmac("sha256", zalopayConfig.key1)
        .update(data)
        .digest("hex");

    const result = await axios.post(
        zalopayConfig.query_endpoint,
        null,
        {
            params: {
                app_id: zalopayConfig.app_id,
                app_trans_id: appTransId,
                mac: mac,
            },
        }
    );

    return result.data;
};

/**
 * Format ngày theo định dạng YYMMDD (GMT+7)
 */
function formatDate(date) {
    const vnDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    const yy = String(vnDate.getUTCFullYear()).slice(-2);
    const mm = String(vnDate.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(vnDate.getUTCDate()).padStart(2, "0");
    return `${yy}${mm}${dd}`;
}

module.exports = {
    createOrder,
    verifyCallback,
    queryOrderStatus,
};
