const ticketService = require('@/modules/tickets/application/service');
const paymentService = require('@/modules/payments/application/service');
const ticketRepository = require('@/providers/database/ticket.repository');
const orderRepository = require('@/providers/database/order.repository');
const asyncHandler = require('@/shared/middleware/asyncHandler');
const { v4: uuidv4 } = require('uuid');
const { BadRequestError, NotFoundError, ForbiddenError, ConflictError } = require('@/shared/errors');
const { PAYMENT_STATUS } = require('@/modules/orders/domain/order-status');
const logger = require('@/shared/logger');

const createPaymentOrder = asyncHandler(async (req, res) => {
    const { ticketId, redirectUrl } = req.body;
    const userId = req.user.uid;

    const ticket = await ticketRepository.getTicketById(ticketId);
    if (!ticket) throw new NotFoundError('Ticket not found.');
    if (ticket.userId !== userId) throw new ForbiddenError('Forbidden.');
    if (ticket.status !== 'pending' && ticket.status !== 'failed') {
        throw new ConflictError(`Ticket not payable (status: ${ticket.status}).`);
    }

    let finalRedirectUrl = redirectUrl;
    if (redirectUrl && (redirectUrl.startsWith('http://localhost') || redirectUrl.startsWith('http://127.0.0.1'))) {
        const appPublicUrl = process.env.APP_PUBLIC_URL || 'http://localhost:3000';
        finalRedirectUrl = `${appPublicUrl}/payments/redirect-handler?targetUrl=${encodeURIComponent(redirectUrl)}`;
    }

    const zaloResponse = await paymentService.createZaloPayOrder(ticket, finalRedirectUrl);

    await ticketRepository.updateTicket(ticketId, {
        zaloAppTransId: zaloResponse.app_trans_id,
        paymentStatus: 'processing',
        lastPaymentAttempt: new Date().toISOString()
    });

    // ── Shadow payment_attempt creation (atomic) ──
    try {
        const link = await orderRepository.getTicketOrderLink(ticketId);
        if (link && link.orderId) {
            const paId = `pa_${uuidv4()}`;
            await orderRepository.createPaymentAttemptAndLinkTicketAtomic({
                id: paId,
                orderId: link.orderId,
                ticketId,
                status: PAYMENT_STATUS.PROCESSING,
                paymentMethod: 'zalopay',
                provider: 'zalopay',
                providerOrderId: zaloResponse.app_trans_id,
                amount: ticket.price,
                currency: 'VND',
                requestPayload: null,
                responsePayload: zaloResponse,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            }, ticketId);
        }
    } catch (err) {
        logger.error(`[ShadowPayment] Failed to create payment_attempt for ticket ${ticketId}: ${err.message}`);
    }
    // ── End shadow payment_attempt creation ──

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
            return res.json(result);
        }

        const { data: dataStr } = req.body;
        const dataObj = JSON.parse(dataStr);

        const appTransId = dataObj.app_trans_id;
        const zpTransId = dataObj.zp_trans_id;

        const callbackResult = await ticketRepository.runTransaction(async (tx) => {
            // Lock the payment attempt row
            const existingAttempt = await orderRepository.getPaymentAttemptByProviderOrderId(appTransId, tx, true);
            if (!existingAttempt) {
                console.warn(`[ZaloPay Callback] Payment attempt for provider order ${appTransId} not found.`);
                return {
                    return_code: 0,
                    return_message: "payment attempt not found"
                };
            }

            // Webhook Idempotency Check
            if (existingAttempt.status === PAYMENT_STATUS.SUCCEEDED) {
                console.log(`[ZaloPay Callback] Transaction ${appTransId} already succeeded. Skipping.`);
                return {
                    return_code: 1,
                    return_message: "success"
                };
            }

            // State Machine Guard Check (Terminal states block)
            if (existingAttempt.status === PAYMENT_STATUS.FAILED || existingAttempt.status === PAYMENT_STATUS.CANCELLED) {
                console.warn(`[ZaloPay Callback] Transaction ${appTransId} is in terminal state '${existingAttempt.status}'. Cannot overwrite.`);
                return {
                    return_code: 0,
                    return_message: `Cannot overwrite terminal status: ${existingAttempt.status}`
                };
            }

            const embedData = JSON.parse(dataObj.embed_data);
            const ticketId = embedData.ticket_id;

            console.log(`[ZaloPay Callback] Success Verified. Ticket: ${ticketId}, ZaloID: ${zpTransId}`);

            await ticketService.confirmTicketPayment(ticketId, zpTransId, tx);

            return {
                return_code: 1,
                return_message: "success"
            };
        });

        return res.json(callbackResult);

    } catch (error) {
        console.error("[ZaloPay Callback] Exception:", error);
        result.return_code = 0;
        result.return_message = error.message;
        return res.json(result);
    }
};

const manualCheckPaymentStatus = asyncHandler(async (req, res) => {
    const { ticketId } = req.body;

    const ticket = await ticketRepository.getTicketById(ticketId);
    if (!ticket) throw new NotFoundError('Not found');

    if (ticket.status === 'paid') return res.json({ status: 'paid', message: "Paid confirmed" });
    if (!ticket.zaloAppTransId) throw new BadRequestError("No transaction ID");

    const queryResult = await paymentService.queryZaloPayOrder(ticket.zaloAppTransId);

    const result = await ticketRepository.runTransaction(async (tx) => {
        // Lock the payment attempt row
        const existingAttempt = await orderRepository.getPaymentAttemptByProviderOrderId(ticket.zaloAppTransId, tx, true);
        if (!existingAttempt) {
            throw new NotFoundError('Payment attempt not found.');
        }

        // State Machine Guard check
        if (existingAttempt.status === PAYMENT_STATUS.SUCCEEDED) {
            return { status: 'paid', message: "Paid confirmed (already succeeded)", raw: queryResult };
        }
        if (existingAttempt.status === PAYMENT_STATUS.FAILED) {
            return { status: 'failed', message: "Payment failed (already failed)", raw: queryResult };
        }
        if (existingAttempt.status === PAYMENT_STATUS.CANCELLED) {
            return { status: 'cancelled', message: "Payment cancelled (already cancelled)", raw: queryResult };
        }

        if (queryResult.return_code === 1) {
            await ticketService.confirmTicketPayment(ticketId, queryResult.zp_trans_id || "re-query", tx);
            return { status: 'paid', raw: queryResult };
        } else if (queryResult.return_code === 2) {
            await ticketService.failTicketPayment(ticketId, 'ZaloPay reported failure', tx);
            return { status: 'failed', raw: queryResult };
        }

        return { status: 'pending', zalo_code: queryResult.return_code };
    });

    return res.json(result);
});

const handleZaloPayRedirect = asyncHandler(async (req, res) => {
    const { targetUrl } = req.query;
    if (!targetUrl) {
        return res.redirect('/');
    }

    try {
        const urlObj = new URL(targetUrl);
        for (const [key, value] of Object.entries(req.query)) {
            if (key !== 'targetUrl') {
                urlObj.searchParams.set(key, value);
            }
        }
        return res.redirect(urlObj.toString());
    } catch (err) {
        logger.error(`[RedirectHandler] Invalid targetUrl: ${targetUrl}`);
        return res.redirect('/');
    }
});

module.exports = {
    createPaymentOrder,
    handleZaloPayCallback,
    manualCheckPaymentStatus,
    handleZaloPayRedirect
};
