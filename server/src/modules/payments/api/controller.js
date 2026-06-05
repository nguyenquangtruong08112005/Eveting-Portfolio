const ticketService = require('@/modules/tickets/application/service');
const paymentService = require('@/modules/payments/application/service');
const ticketRepository = require('@/providers/database/ticket.repository');

/**
 * API Endpoint: (POST /payments/create-order)
 * Mobile app gọi để tạo đơn hàng ZaloPay sau khi đã có vé pending.
 */
const createPaymentOrder = async (req, res) => {
    try {
        const { ticketId } = req.body;
        const userId = req.user.uid;

        if (!ticketId) return res.status(400).send({ error: 'Bad Request: ticketId is required.' });

        const ticket = await ticketRepository.getTicketById(ticketId);
        if (!ticket) return res.status(404).send({ error: 'Ticket not found.' });

        if (ticket.userId !== userId) return res.status(403).send({ error: 'Forbidden.' });
        if (ticket.status !== 'pending' && ticket.status !== 'failed') {
            return res.status(409).send({ error: `Ticket not payable (status: ${ticket.status}).` });
        }

        const zaloResponse = await paymentService.createZaloPayOrder(ticket);

        await ticketRepository.updateTicket(ticketId, {
            zaloAppTransId: zaloResponse.app_trans_id,
            paymentStatus: 'processing',
            lastPaymentAttempt: new Date().toISOString()
        });

        res.status(200).json(zaloResponse);

    } catch (error) {
        console.error("Error createPaymentOrder:", error);
        res.status(500).send({ error: error.message || 'Internal Server Error' });
    }
};

/**
 * API Endpoint: (POST /payments/callback)
 * ZaloPay Server gọi để thông báo kết quả thanh toán.
 * QUY TẮC: MAC HỢP LỆ = THANH TOÁN THÀNH CÔNG.
 */
const handleZaloPayCallback = async (req, res) => {
    let result = {}; // Biến lưu kết quả trả về cho ZaloPay

    try {
        // 1. Log request để debug (tạm tắt khi lên production)
        // console.log("[ZaloPay Callback] Body:", JSON.stringify(req.body));

        // 2. Xác thực MAC (Quan trọng nhất)
        // Logic: Nếu MAC khớp -> Tin tưởng tuyệt đối là ZaloPay báo thành công.
        const isVerified = paymentService.verifyZaloPayCallback(req.body);

        if (!isVerified) {
            console.warn("[ZaloPay Callback] Invalid MAC signature!");
            result.return_code = -1;
            result.return_message = "mac not equal";
        } else {
            // --- TRƯỜNG HỢP THANH TOÁN THÀNH CÔNG ---

            // 3. Parse dữ liệu
            const { data: dataStr } = req.body;
            const dataObj = JSON.parse(dataStr);

            // Lấy ticketId từ embed_data
            // Lưu ý: embed_data cũng là 1 chuỗi JSON string bên trong dataObj
            const embedData = JSON.parse(dataObj.embed_data);
            const ticketId = embedData.ticket_id;
            const zpTransId = dataObj.zp_trans_id; // Mã giao dịch ZaloPay

            console.log(`[ZaloPay Callback] Success Verified. Ticket: ${ticketId}, ZaloID: ${zpTransId}`);

            // 4. Cập nhật Database (Xử lý nghiệp vụ)
            // Gọi service update status = 'paid'
            await ticketService.confirmTicketPayment(ticketId, zpTransId);

            // 5. Báo cho ZaloPay biết mình đã xử lý xong
            result.return_code = 1;
            result.return_message = "success";
        }

    } catch (error) {
        console.error("[ZaloPay Callback] Exception:", error);
        // ZaloPay quy định: Nếu merchant trả về khác 1, ZaloPay sẽ retry callback (tối đa 3 lần)
        result.return_code = 0;
        result.return_message = error.message;
    }

    // 6. Trả response cuối cùng
    return res.json(result);
};

/**
 * API Endpoint: (POST /payments/check-status)
 * Dùng cho Mobile App/Admin kiểm tra chủ động.
 */
const manualCheckPaymentStatus = async (req, res) => {
    try {
        const { ticketId } = req.body;

        const ticket = await ticketRepository.getTicketById(ticketId);
        if (!ticket) return res.status(404).json({error: "Not found"});

        if (ticket.status === 'paid') return res.json({ status: 'paid', message: "Paid confirmed" });
        if (!ticket.zaloAppTransId) return res.status(400).json({ error: "No transaction ID" });

        // Gọi API Query của ZaloPay
        const queryResult = await paymentService.queryZaloPayOrder(ticket.zaloAppTransId);

        // Logic Query thì CÓ return_code
        if (queryResult.return_code === 1) {
            // Nếu query thấy thành công mà DB chưa update -> Update luôn
            await ticketService.confirmTicketPayment(ticketId, queryResult.zp_trans_id || "re-query");
            return res.json({ status: 'paid', raw: queryResult });
        } else if (queryResult.return_code === 2) {
            return res.json({ status: 'failed', raw: queryResult });
        }

        return res.json({ status: 'pending', zalo_code: queryResult.return_code });

    } catch (error) {
        console.error("Error manualCheckPaymentStatus:", error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createPaymentOrder,
    handleZaloPayCallback,
    manualCheckPaymentStatus
};
