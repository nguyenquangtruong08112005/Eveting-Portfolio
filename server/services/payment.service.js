// services/payment.service.js
const axios = require('axios');
const crypto = require('crypto');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/zaloPay.config');

/**
 * Tạo một đơn hàng thanh toán mới với ZaloPay.
 * @param {object} ticket - Document vé (đang ở trạng thái 'pending').
 * @returns {Promise<object>} Thông tin ZaloPay trả về (chứa zp_trans_token).
 */
const createZaloPayOrder = async (ticket) => {

    // --- BẮT ĐẦU SỬA LỖI ---

    // 1. Đảm bảo Timezone GMT+7 cho ngày tháng và thời gian
    const app_time = Date.now();
    const app_date = moment(app_time).utcOffset('+07:00').format('YYMMDD');

    // 2. Đảm bảo độ dài app_trans_id < 40 ký tự
    // Lấy 12 ký tự cuối của UUID (ví dụ: c87a9fce41e5)
    const unique_id = ticket.id.replace('tkt_', '').split('-').pop();
    const app_trans_id = `${app_date}_${unique_id}`; // Tổng độ dài: 7 + 12 = 19 (An toàn)

    // 3. Đảm bảo amount là SỐ NGUYÊN
    const amount = Math.floor(ticket.price);

    // --- KẾT THÚC SỬA LỖI ---

    const order = {
        app_id: config.app_id,
        app_trans_id: app_trans_id, // <-- Dùng biến đã sửa
        app_user: ticket.userId,
        app_time: app_time, // <-- Dùng biến đã sửa
        amount: amount,     // <-- Dùng biến đã sửa
        item: JSON.stringify([{ itemid: ticket.eventId, itemname: "Vé sự kiện" }]),
        embed_data: JSON.stringify({
            ticket_id: ticket.id // Gửi ticketId qua đây để ZaloPay trả về trong callback
        }),
        description: `Thanh toán vé sự kiện (ID: ${ticket.id})`,
        bank_code: "",
        callback_url: config.callback_url,
    };

    // --- Tạo Chữ Ký (Signature) ---
    // Dữ liệu = app_id|app_trans_id|app_user|amount|app_time|embed_data|item
    const data = [order.app_id, order.app_trans_id, order.app_user, order.amount, order.app_time, order.embed_data, order.item].join("|");
    const hmac = crypto.createHmac("sha256", config.key1); // Dùng Key1
    order.mac = hmac.update(data).digest("hex");

    try {
        const { data: zaloPayResponse } = await axios.post(config.endpoint, null, { params: order });

        // ZaloPay trả về return_code = 1 là thành công
        if (zaloPayResponse.return_code !== 1) {
            console.error("ZaloPay trả về lỗi khi tạo đơn hàng:", zaloPayResponse);
            throw new Error(zaloPayResponse.return_message || 'ZaloPay returned an error.');
        }

        zaloPayResponse.app_trans_id = app_trans_id; // Gửi kèm app_trans_id về cho client
        return zaloPayResponse;

    } catch (error) {
        console.error("Lỗi khi tạo đơn hàng ZaloPay:", error.response?.data || error.message);
        throw new Error('Không thể tạo đơn hàng thanh toán ZaloPay.');
    }
};

/**
 * Xác thực tính toàn vẹn của callback từ ZaloPay.
 * @param {object} body - Toàn bộ body mà ZaloPay gửi về.
 * @returns {boolean} True nếu hợp lệ, False nếu giả mạo.
 */
const verifyZaloPayCallback = (body) => {
    try {
        const { data, mac } = body;
        const hmac = crypto.createHmac("sha256", config.key2); // Dùng Key2
        const calculatedMac = hmac.update(data).digest("hex");

        return calculatedMac === mac;
    } catch (error) {
        console.error("Lỗi xác thực ZaloPay callback:", error.message);
        return false;
    }
};

module.exports = {
    createZaloPayOrder,
    verifyZaloPayCallback,
};