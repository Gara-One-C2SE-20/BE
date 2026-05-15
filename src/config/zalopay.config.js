module.exports = {
    app_id: process.env.ZALOPAY_APP_ID || "2554",
    key1: process.env.ZALOPAY_KEY1 || "sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn",
    key2: process.env.ZALOPAY_KEY2 || "trMrHtvjo6myautxDUiAcYsVtaeQ8nhf",
    create_endpoint: process.env.ZALOPAY_CREATE_ENDPOINT || "https://sb-openapi.zalopay.vn/v2/create",
    query_endpoint: process.env.ZALOPAY_QUERY_ENDPOINT || "https://sb-openapi.zalopay.vn/v2/query",
    callback_url: process.env.ZALOPAY_CALLBACK_URL || "http://localhost:3000/api/payment/zalopay/callback",
};
