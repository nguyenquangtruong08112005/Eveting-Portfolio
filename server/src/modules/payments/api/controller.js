const ticketService = require('@/modules/tickets/application/service');
const paymentService = require('@/modules/payments/application/service');
const ticketRepository = require('@/providers/database/ticket.repository');
const asyncHandler = require('@/shared/middleware/asyncHandler');
const { BadRequestError, NotFoundError, ForbiddenError, ConflictError } = require('@/shared/errors');

const createPaymentOrder = asyncHandler(async (req, res) => {
    const { ticketId } = req.body;
    const userId = req.user.uid;

    const ticket = await ticketRepository.getTicketById(ticketId);
    if (!ticket) throw new NotFoundError('Ticket not found.');
    if (ticket.userId !== userId) throw new ForbiddenError('Forbidden.');
    if (ticket.status !== 'pending' && ticket.status !== 'failed') {
        throw new ConflictError(`Ticket not payable (status: ${ticket.status}).`);
    }

    const zaloResponse = await paymentService.createZaloPayOrder(ticket);

    await ticketRepository.updateTicket(ticketId, {
        zaloAppTransId: zaloResponse.app_trans_id,
        paymentStatus: 'processing',
        lastPaymentAttempt: new Date().toISOString()
    });

    res.status(200).json(zaloResponse);
});

const handleZaloPayCallback = async (req, res) => {
    let result = {};

    try {
        const isVerified = paymentService.verifyZaloPayCallback(req.body);

        if (!isVerified) {
            console.warn("[ZaloPay Callback] Invalid MAC signature!");
            result.return_code = -1;
            result.return_message = "mac not equal";
        } else {
            const { data: dataStr } = req.body;
            const dataObj = JSON.parse(dataStr);

            const embedData = JSON.parse(dataObj.embed_data);
            const ticketId = embedData.ticket_id;
            const zpTransId = dataObj.zp_trans_id;

            console.log(`[ZaloPay Callback] Success Verified. Ticket: ${ticketId}, ZaloID: ${zpTransId}`);

            await ticketService.confirmTicketPayment(ticketId, zpTransId);

            result.return_code = 1;
            result.return_message = "success";
        }

    } catch (error) {
        console.error("[ZaloPay Callback] Exception:", error);
        result.return_code = 0;
        result.return_message = error.message;
    }

    return res.json(result);
};

const manualCheckPaymentStatus = asyncHandler(async (req, res) => {
    const { ticketId } = req.body;

    const ticket = await ticketRepository.getTicketById(ticketId);
    if (!ticket) throw new NotFoundError('Not found');

    if (ticket.status === 'paid') return res.json({ status: 'paid', message: "Paid confirmed" });
    if (!ticket.zaloAppTransId) throw new BadRequestError("No transaction ID");

    const queryResult = await paymentService.queryZaloPayOrder(ticket.zaloAppTransId);

    if (queryResult.return_code === 1) {
        await ticketService.confirmTicketPayment(ticketId, queryResult.zp_trans_id || "re-query");
        return res.json({ status: 'paid', raw: queryResult });
    } else if (queryResult.return_code === 2) {
        return res.json({ status: 'failed', raw: queryResult });
    }

    return res.json({ status: 'pending', zalo_code: queryResult.return_code });
});

module.exports = {
    createPaymentOrder,
    handleZaloPayCallback,
    manualCheckPaymentStatus
};
