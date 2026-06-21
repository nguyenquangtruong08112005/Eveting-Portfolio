const axios = require('axios');
const crypto = require('crypto');
const moment = require('moment');
const config = require('@/modules/payments/infrastructure/config/zalopay.config');
const { BadGatewayError, ServiceUnavailableError } = require('@/shared/errors');

const createZaloPayOrder = async (ticket, redirectUrl) => {
    const embed_data = {
        ticket_id: ticket.id
    };

    if (redirectUrl) {
        embed_data.redirecturl = redirectUrl;
    }

    const items = [{
        itemid: ticket.eventId || "unknown_event",
        itemname: "Vé sự kiện",
        itemprice: ticket.price,
        itemquantity: 1
    }];

    const app_time = Date.now();
    const app_date = moment(app_time).utcOffset('+07:00').format('YYMMDD');

    const randomSuffix = Math.floor(Math.random() * 100000);

    const cleanTicketId = ticket.id.replace(/[^a-zA-Z0-9]/g, '');
    const shortTicketId = cleanTicketId.slice(-10);

    const app_trans_id = `${app_date}_${shortTicketId}_${randomSuffix}`;

    const amount = Math.floor(ticket.price);

    const order = {
        app_id: config.app_id,
        app_trans_id: app_trans_id,
        app_user: ticket.userId,
        app_time: app_time,
        amount: amount,
        item: JSON.stringify(items),
        embed_data: JSON.stringify(embed_data),
        description: `Thanh toan ve ${shortTicketId}`,
        bank_code: "",
    };

    const data = [config.app_id, order.app_trans_id, order.app_user, order.amount, order.app_time, order.embed_data, order.item].join("|");
    const hmac = crypto.createHmac("sha256", config.key1);
    order.mac = hmac.update(data).digest("hex");

    let result;
    try {
        console.log(`[ZaloPay] Creating order: ${app_trans_id} (Length: ${app_trans_id.length})`);
        const { data: responseData } = await axios.post(config.endpoint, new URLSearchParams(order), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        result = responseData;
    } catch (error) {
        console.error("[ZaloPay] API Error:", error.message);
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
            throw new ServiceUnavailableError(`ZaloPay service unreachable: ${error.message}`);
        }
        throw new BadGatewayError(`ZaloPay API failure: ${error.message}`);
    }

    if (result.return_code !== 1) {
        console.error("[ZaloPay] Create Failed:", result);
        throw new BadGatewayError(`${result.return_message} (SubCode: ${result.sub_return_code})`);
    }

    return {
        ...result,
        app_trans_id: app_trans_id,
        order_url: result.order_url
    };
};

const queryZaloPayOrder = async (app_trans_id) => {
    const dataString = `${config.app_id}|${app_trans_id}|${config.key1}`;
    const mac = crypto.createHmac("sha256", config.key1).update(dataString).digest("hex");

    const postData = {
        app_id: config.app_id,
        app_trans_id: app_trans_id,
        mac: mac
    };

    const queryEndpoint = "https://sb-openapi.zalopay.vn/v2/query";

    let result;
    try {
        const { data: responseData } = await axios.post(queryEndpoint, new URLSearchParams(postData), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        result = responseData;
    } catch (error) {
        console.error("[ZaloPay] Query Error:", error.message);
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
            throw new ServiceUnavailableError(`ZaloPay query service unreachable: ${error.message}`);
        }
        throw new BadGatewayError(`ZaloPay query failure: ${error.message}`);
    }

    return result;
};

const verifyZaloPayCallback = (body) => {
    try {
        const { data, mac } = body;
        const hmac = crypto.createHmac("sha256", config.key2);
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
    queryZaloPayOrder
};
