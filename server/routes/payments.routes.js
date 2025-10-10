const express = require('express');
const router = express.Router();

// [POST] /payments/callback - Xử lý webhook từ cổng thanh toán
router.post('/callback', (req, res) => {
    // Logic: Cập nhật status của Ticket từ 'pending' sang 'paid' dựa trên thông tin từ webhook
    res.status(200).send('Payment callback received.');
});

module.exports = router;