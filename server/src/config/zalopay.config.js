// Lấy thông tin cấu hình từ .env
const config = {
    app_id: process.env.ZALOPAY_APP_ID,
    key1: process.env.ZALOPAY_KEY1,
    key2: process.env.ZALOPAY_KEY2,
    endpoint: process.env.ZALOPAY_ENDPOINT,
    callback_url: `${process.env.APP_PUBLIC_URL}/payments/callback`
};

module.exports = config;
            