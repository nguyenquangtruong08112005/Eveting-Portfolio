// controllers/payment.controller.js
const ticketService = require('../services/ticket.service');
const paymentService = require('../services/payment.service');
const { db } = require('../config/firebase.config');

/**
 * API Endpoint: (POST /payments/create-order)
 * Mobile app gọi để tạo đơn hàng ZaloPay sau khi đã có vé pending.
 */
const createPaymentOrder = async (req, res) => {
    try {
        const { ticketId } = req.body;
        const userId = req.user.uid;

        if (!ticketId) {
            return res.status(400).send({ error: 'Bad Request: ticketId is required.' });
        }

        // 1. Lấy thông tin vé
        const ticketDoc = await db.collection('Tickets').doc(ticketId).get();
        if (!ticketDoc.exists) {
            return res.status(404).send({ error: 'Ticket not found.' });
        }
        const ticket = ticketDoc.data();

        // 2. Kiểm tra quyền sở hữu và trạng thái vé
        if (ticket.userId !== userId) {
            return res.status(403).send({ error: 'Forbidden: You do not own this ticket.' });
        }
        if (ticket.status !== 'pending') {
            return res.status(409).send({ error: `Conflict: Ticket is not in 'pending' state (status: ${ticket.status}).` });
        }

        // 3. Gọi service để tạo đơn hàng bên ZaloPay
        const zaloPayResponse = await paymentService.createZaloPayOrder(ticket);

        // 4. Trả về zp_trans_token và các thông tin khác cho mobile app
        res.status(200).json(zaloPayResponse);

    } catch (error) {
        console.error("Error in Payment Controller - createPaymentOrder: ", error);
        res.status(500).send({ error: error.message || 'Internal Server Error' });
    }
};


/**
 * API Endpoint: (POST /payments/callback)
 * ZaloPay Server gọi để thông báo kết quả thanh toán.
 */
const handleZaloPayCallback = async (req, res) => {
    try {
        // console.log("--- ZaloPay Webhook Received ---");
        // console.log("Body:", JSON.stringify(req.body, null, 2));

        // 1. Xác thực MAC (đảm bảo request đến từ ZaloPay)
        const isVerified = paymentService.verifyZaloPayCallback(req.body);
        if (!isVerified) {
            // console.error("ZaloPay Webhook: MAC verification failed! Request might be tampered.");
            // Trả về cho ZaloPay biết là có lỗi
            return res.status(200).json({
                return_code: -1,
                return_message: "MAC verification failed"
            });
        }

        // 2. Xử lý logic nghiệp vụ
        const { data } = req.body;
        const dataObj = JSON.parse(data);
        
        // Lấy ticketId mà chúng ta đã nhúng vào
        const embed_data = JSON.parse(dataObj.embed_data);
        const ticketId = embed_data.ticket_id;

        if (dataObj.return_code === 1) {
            // THANH TOÁN THÀNH CÔNG
            // console.log(`Payment confirmed for ticket: ${ticketId}`);
            await ticketService.confirmTicketPayment(ticketId);
        } else {
            // THANH TOÁN THẤT BẠI
            // console.log(`Payment failed for ticket: ${ticketId}. Cancelling...`);
            await ticketService.cancelPendingTicket(ticketId);
        }

        // 3. Trả về kết quả 200 OK cho ZaloPay
        // Báo cho ZaloPay biết là đã nhận và xử lý thành công
        return res.status(200).json({
            return_code: 1,
            return_message: "Callback processed successfully"
        });

    } catch (error) {
        // console.error("Error processing ZaloPay callback:", error);
        // Nếu có lỗi, trả về thông báo lỗi cho ZaloPay
        return res.status(200).json({
            return_code: 0,
            return_message: "Server error processing callback"
        });
    }
};

module.exports = {
    createPaymentOrder,
    handleZaloPayCallback, // Đổi tên hàm cho rõ ràng
};