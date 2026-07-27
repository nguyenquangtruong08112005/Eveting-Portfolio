const ticketService = require('@/modules/tickets/application/service');
const paymentService = require('@/modules/payments/application/service');
const ticketRepository = require('@/providers/database/ticket.repository');
const orderRepository = require('@/providers/database/order.repository');
const asyncHandler = require('@/shared/middleware/asyncHandler');
const { v4: uuidv4 } = require('uuid');
const { BadRequestError, NotFoundError, ForbiddenError, ConflictError } = require('@/shared/errors');
const { ORDER_STATUS, PAYMENT_STATUS } = require('@/modules/orders/domain/order-status');
const logger = require('@/shared/logger');

/**
 * Ensure ticket has an order row for payment_attempts.order_id (NOT NULL FK).
 * Book path usually creates a shadow order; recover if missing.
 */
async function ensureOrderForTicket(ticket, userId) {
    const link = await orderRepository.getTicketOrderLink(ticket.id);
    if (link?.orderId) return link;

    const orderId = `ord_${uuidv4()}`;
    const orderItemId = `oi_${uuidv4()}`;
    const now = Date.now();
    await orderRepository.createOrder({
        id: orderId,
        userId,
        eventId: ticket.eventId || null,
        organizerId: ticket.organizerId || null,
        status: ORDER_STATUS.PENDING_PAYMENT,
        subtotalAmount: Number(ticket.price) || 0,
        totalAmount: Number(ticket.price) || 0,
        currency: 'VND',
        createdAt: now,
        updatedAt: now,
        items: [
            {
                id: orderItemId,
                ticketId: ticket.id,
                ticketType: ticket.type || null,
                eventId: ticket.eventId || null,
                quantity: ticket.quantity || 1,
                unitPrice: Number(ticket.unitPrice ?? ticket.price) || 0,
                subtotal: Number(ticket.price) || 0,
                totalAmount: Number(ticket.price) || 0,
                status: 'pending',
                createdAt: now,
            },
        ],
    });
    await orderRepository.linkTicketToOrder(ticket.id, orderId, orderItemId, null);
    return { orderId, orderItemId, paymentAttemptId: null };
}

const createPaymentOrder = asyncHandler(async (req, res) => {
    const { ticketId, redirectUrl } = req.body;
    const userId = req.user.uid;

    const ticket = await ticketRepository.getTicketById(ticketId);
    if (!ticket) throw new NotFoundError('Ticket not found.');
    if (ticket.userId !== userId) throw new ForbiddenError('Forbidden.');
    if (ticket.status !== 'pending' && ticket.status !== 'failed') {
        throw new ConflictError(`Ticket not payable (status: ${ticket.status}).`);
    }

    // Use redirectUrl as-is — browser can access localhost; callback needs public URL.
    const finalRedirectUrl = redirectUrl;

    const zaloResponse = await paymentService.createZaloPayOrder(ticket, finalRedirectUrl);
    const appTransId = zaloResponse.app_trans_id;
    if (!appTransId) {
        throw new BadRequestError('ZaloPay did not return app_trans_id.');
    }

    // Mig 048: payment SoT is payment_attempts. Ticket update only touches FIELD_MAP + raw_data
    // (zaloAppTransId / paymentStatus go to raw_data, not dropped columns).
    await ticketRepository.updateTicket(ticketId, {
        zaloAppTransId: appTransId,
        paymentStatus: 'processing',
        lastPaymentAttempt: new Date().toISOString(),
        updatedAt: Date.now(),
    });

    const link = await ensureOrderForTicket(ticket, userId);
    const paId = `pa_${uuidv4()}`;
    try {
        await orderRepository.createPaymentAttemptAndLinkTicketAtomic(
            {
                id: paId,
                orderId: link.orderId,
                ticketId,
                status: PAYMENT_STATUS.PROCESSING,
                paymentMethod: 'zalopay',
                provider: 'zalopay',
                providerOrderId: appTransId,
                amount: ticket.price,
                currency: 'VND',
                requestPayload: null,
                responsePayload: zaloResponse,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            },
            ticketId
        );
    } catch (err) {
        // Still return ZaloPay order so client can open pay URL; log for ops
        logger.error(
            `[Payment] Failed to create payment_attempt for ticket ${ticketId}: ${err.message}`
        );
        throw err;
    }

    res.status(200).json(zaloResponse);
});

const handleZaloPayCallback = async (req, res) => {
    let result = {};

    try {
        const isVerified = paymentService.verifyZaloPayCallback(req.body);

        if (!isVerified) {
            console.warn('[ZaloPay Callback] Invalid MAC signature!');
            result.return_code = -1;
            result.return_message = 'mac not equal';
            return res.json(result);
        }

        const { data: dataStr } = req.body;
        const dataObj = JSON.parse(dataStr);

        const appTransId = dataObj.app_trans_id;
        const zpTransId = dataObj.zp_trans_id;

        const callbackResult = await ticketRepository.runTransaction(async (tx) => {
            const existingAttempt = await orderRepository.getPaymentAttemptByProviderOrderId(
                appTransId,
                tx,
                true
            );
            if (!existingAttempt) {
                console.warn(
                    `[ZaloPay Callback] Payment attempt for provider order ${appTransId} not found.`
                );
                return {
                    return_code: 0,
                    return_message: 'payment attempt not found',
                };
            }

            if (existingAttempt.status === PAYMENT_STATUS.SUCCEEDED) {
                console.log(
                    `[ZaloPay Callback] Transaction ${appTransId} already succeeded. Skipping.`
                );
                return {
                    return_code: 1,
                    return_message: 'success',
                };
            }

            if (
                existingAttempt.status === PAYMENT_STATUS.FAILED ||
                existingAttempt.status === PAYMENT_STATUS.CANCELLED
            ) {
                console.warn(
                    `[ZaloPay Callback] Transaction ${appTransId} is in terminal state '${existingAttempt.status}'. Cannot overwrite.`
                );
                return {
                    return_code: 0,
                    return_message: `Cannot overwrite terminal status: ${existingAttempt.status}`,
                };
            }

            const embedData = JSON.parse(dataObj.embed_data);
            const ticketId = embedData.ticket_id || existingAttempt.ticketId;

            console.log(
                `[ZaloPay Callback] Success Verified. Ticket: ${ticketId}, ZaloID: ${zpTransId}`
            );

            await ticketService.confirmTicketPayment(ticketId, zpTransId, tx);

            return {
                return_code: 1,
                return_message: 'success',
            };
        });

        return res.json(callbackResult);
    } catch (error) {
        console.error('[ZaloPay Callback] Exception:', error);
        result.return_code = 0;
        result.return_message = error.message;
        return res.json(result);
    }
};

const manualCheckPaymentStatus = asyncHandler(async (req, res) => {
    const { ticketId } = req.body;

    const ticket = await ticketRepository.getTicketById(ticketId);
    if (!ticket) throw new NotFoundError('Not found');

    if (ticket.status === 'paid') return res.json({ status: 'paid', message: 'Paid confirmed' });

    // Best-effort provider order ID for ZaloPay query (refreshed under lock later)
    const initialAttempt = await orderRepository.getLatestPaymentAttemptByTicketId(ticketId);
    const providerOrderId =
        initialAttempt?.providerOrderId || ticket.zaloAppTransId || null;
    if (!providerOrderId) {
        throw new BadRequestError('No payment transaction ID for this ticket.');
    }

    const queryResult = await paymentService.queryZaloPayOrder(providerOrderId);

    const result = await ticketRepository.runTransaction(async (tx) => {
        // Lock the latest payment attempt under transaction to serialise
        // concurrent check-status and callback races
        const latestAttempt = await orderRepository.getLatestPaymentAttemptByTicketId(
            ticketId,
            tx,
            true
        );
        if (!latestAttempt) {
            throw new NotFoundError('Payment attempt not found.');
        }

        // Re-check terminal state after acquiring the lock
        if (latestAttempt.status === PAYMENT_STATUS.SUCCEEDED) {
            return { status: 'paid', message: 'Paid confirmed (already succeeded)', raw: queryResult };
        }
        if (latestAttempt.status === PAYMENT_STATUS.FAILED) {
            return { status: 'failed', message: 'Payment failed (already failed)', raw: queryResult };
        }
        if (latestAttempt.status === PAYMENT_STATUS.CANCELLED) {
            return {
                status: 'cancelled',
                message: 'Payment cancelled (already cancelled)',
                raw: queryResult,
            };
        }

        if (queryResult.return_code === 1) {
            await ticketService.confirmTicketPayment(
                ticketId,
                queryResult.zp_trans_id || 're-query',
                tx
            );
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
    handleZaloPayRedirect,
};
