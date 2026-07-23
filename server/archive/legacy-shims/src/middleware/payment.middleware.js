// middleware/payment.middleware.js

const verifyPaymentWebhook = (req, res, next) => {
    const providedSecret = req.headers['x-webhook-secret'] || req.body.secretKey; // Lấy key từ header hoặc body
    const expectedSecret = process.env.PAYMENT_WEBHOOK_SECRET;

    if (!providedSecret || providedSecret !== expectedSecret) {
        console.warn('Webhook received with invalid or missing secret.');
        // Vẫn trả về 200 OK để tránh bị gọi lại, nhưng không xử lý tiếp
        return res.status(200).send({ error: 'Invalid webhook secret.' }); 
    }

    // Nếu secret hợp lệ, cho phép đi tiếp
    next();
};

module.exports = { verifyPaymentWebhook };