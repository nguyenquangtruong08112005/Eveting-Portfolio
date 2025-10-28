// controllers/payment.controller.js
const ticketService = require('../services/ticket.service');

const handlePaymentCallback = async (req, res) => {
    // Giả định middleware verifyPaymentWebhook đã chạy thành công
    const { ticketId, paymentStatus } = req.body; // Lấy dữ liệu từ cổng thanh toán

    if (!ticketId || !paymentStatus) {
        // Nếu thiếu thông tin cơ bản, trả lỗi Bad Request
        console.error("Payment callback missing ticketId or paymentStatus:", req.body);
        return res.status(400).send({ error: 'Bad Request: Missing ticketId or paymentStatus.' });
    }

    try {
        if (paymentStatus === 'SUCCESS') {
            const updatedTicket = await ticketService.confirmTicketPayment(ticketId);
            console.log(`Payment confirmed for ticket: ${ticketId}`);
            // Trả về 200 OK cùng thông tin vé đã cập nhật
            return res.status(200).json({ message: 'Payment confirmed successfully.', ticket: updatedTicket });

        } else {
            console.log(`Payment failed or cancelled for ticket: ${ticketId}. Attempting to cancel...`);
            const cancelledTicket = await ticketService.cancelPendingTicket(ticketId);

            if (!cancelledTicket) {
                // Trường hợp service trả về null (không tìm thấy vé)
                 console.warn(`Attempted to cancel non-existent ticket: ${ticketId}`);
                 // Vẫn trả về 200 OK để webhook không bị gọi lại, nhưng kèm thông báo lỗi
                 return res.status(200).json({ message: 'Callback processed, but ticket not found during cancellation attempt.' });
            }

            // Trả về 200 OK, kèm trạng thái cuối cùng của vé
             return res.status(200).json({ message: 'Payment failure processed.', ticket: cancelledTicket });
        }
    } catch (error) {
        console.error("Error processing payment callback for ticket:", ticketId, error);
        
        // Phân loại lỗi từ service để trả status code phù hợp hơn
        if (error.message.includes('not found')) {
             // Lỗi này có thể xảy ra ở cả confirm và cancel nếu ID sai ban đầu
             return res.status(404).send({ error: `Ticket not found: ${ticketId}` });
        }
        
        // Với các lỗi khác (lỗi transaction, lỗi logic...), trả 500
        return res.status(500).send({ error: 'Internal Server Error processing callback.' });
    }
};

module.exports = {
    handlePaymentCallback,
};