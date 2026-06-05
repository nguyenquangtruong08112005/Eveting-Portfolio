const axios = require('axios');
const crypto = require('crypto');
const moment = require('moment');
const config = require('../config/zaloPay.config');

/**
 * Tạo một đơn hàng thanh toán mới với ZaloPay.
 * @param {object} ticket - Document vé (đang ở trạng thái 'pending').
 * @returns {Promise<object>} Thông tin ZaloPay trả về (chứa zp_trans_token).
 */
const createZaloPayOrder = async (ticket) => {
    const embed_data = {
        ticket_id: ticket.id // Gửi ticketId qua đây để ZaloPay trả về trong callback
    };

    const items = [{
        itemid: ticket.eventId || "unknown_event",
        itemname: "Vé sự kiện",
        itemprice: ticket.price,
        itemquantity: 1
    }];

    // 1. Đảm bảo Timezone GMT+7
    const app_time = Date.now();
    const app_date = moment(app_time).utcOffset('+07:00').format('YYMMDD');

    // 2. Tạo app_trans_id duy nhất (Format: YYMMDD_xxxx)
    // FIX LỖI 401: ZaloPay giới hạn app_trans_id tối đa 40 ký tự.
    // Log cũ của bạn dài 50 ký tự do chứa full UUID.
    // Giải pháp: Chỉ lấy 8 ký tự cuối của Ticket ID + loại bỏ ký tự đặc biệt.
    
    const randomSuffix = Math.floor(Math.random() * 100000); // 5 số ngẫu nhiên
    
    // Lấy ID gốc, bỏ 'tkt_', bỏ '-', lấy 10 ký tự cuối cùng
    const cleanTicketId = ticket.id.replace(/[^a-zA-Z0-9]/g, ''); 
    const shortTicketId = cleanTicketId.slice(-10); 

    // Format: YYMMDD_ticketPart_random (Ví dụ: 251120_a1b2c3d4e5_12345)
    // Độ dài: 6 + 1 + 10 + 1 + 5 = 23 ký tự (An toàn < 40)
    const app_trans_id = `${app_date}_${shortTicketId}_${randomSuffix}`; 

    // 3. Đảm bảo amount là số nguyên
    const amount = Math.floor(ticket.price);

    const order = {
        app_id: config.app_id,
        app_trans_id: app_trans_id,
        app_user: ticket.userId,
        app_time: app_time,
        amount: amount,
        item: JSON.stringify(items),
        embed_data: JSON.stringify(embed_data),
        description: `Thanh toan ve ${shortTicketId}`, // Description cũng không nên quá dài
        bank_code: "", // Để trống để user chọn ngân hàng hoặc ví
        callback_url: config.callback_url,
    };

    // --- Tạo Chữ Ký (Signature) cho Create Order ---
    // app_id|app_trans_id|app_user|amount|app_time|embed_data|item
    const data = [config.app_id, order.app_trans_id, order.app_user, order.amount, order.app_time, order.embed_data, order.item].join("|");
    const hmac = crypto.createHmac("sha256", config.key1);
    order.mac = hmac.update(data).digest("hex");

    try {
        console.log(`[ZaloPay] Creating order: ${app_trans_id} (Length: ${app_trans_id.length})`);
        const { data: result } = await axios.post(config.endpoint, null, { params: order });

        if (result.return_code !== 1) {
            console.error("[ZaloPay] Create Failed:", result);
            // Ném lỗi chi tiết ra để controller bắt được
            throw new Error(`${result.return_message} (SubCode: ${result.sub_return_code})`);
        }

        // Trả về cả app_trans_id để Controller lưu vào DB
        return {
            ...result,
            app_trans_id: app_trans_id,
            order_url: result.order_url
        };

    } catch (error) {
        // console.error("[ZaloPay] API Error:", error.message);
        throw error; // Rethrow để controller xử lý
    }
};

/**
 * Truy vấn trạng thái đơn hàng từ ZaloPay (Query Status).
 * Dùng để kiểm tra thủ công hoặc Cronjob khi không nhận được callback.
 * @param {string} app_trans_id - Mã giao dịch phía Merchant (Ví dụ: 251120_xxxx)
 * @returns {Promise<object>} Kết quả truy vấn từ ZaloPay.
 */
const queryZaloPayOrder = async (app_trans_id) => {
    try {
        // Công thức MAC Query: app_id|app_trans_id|key1
        const dataString = `${config.app_id}|${app_trans_id}|${config.key1}`;
        const mac = crypto.createHmac("sha256", config.key1).update(dataString).digest("hex");

        const postData = {
            app_id: config.app_id,
            app_trans_id: app_trans_id,
            mac: mac
        };

        const queryEndpoint = "https://sb-openapi.zalopay.vn/v2/query"; // Sandbox Query URL
        // Note: Kiểm tra lại endpoint query trong config thực tế nếu khác Sandbox

        const { data: result } = await axios.post(queryEndpoint, null, { params: postData });
        
        return result;
    } catch (error) {
        console.error("[ZaloPay] Query Error:", error.message);
        throw error;
    }
};

/**
 * Xác thực tính toàn vẹn của callback từ ZaloPay.
 * @param {object} body - Toàn bộ body mà ZaloPay gửi về.
 * @returns {boolean} True nếu hợp lệ.
 */
const verifyZaloPayCallback = (body) => {
    try {
        const { data, mac } = body;
        const hmac = crypto.createHmac("sha256", config.key2); // Dùng Key2 cho Callback
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
    queryZaloPayOrder // Export thêm hàm này
};