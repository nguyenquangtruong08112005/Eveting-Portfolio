const ticketService = require('@/modules/tickets/application/service');
const paymentService = require('@/modules/payments/application/service');
const ticketRepository = require('@/providers/database/ticket.repository');
const orderRepository = require('@/providers/database/order.repository');
const asyncHandler = require('@/shared/middleware/asyncHandler');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const { BadRequestError, NotFoundError, ForbiddenError, ConflictError } = require('@/shared/errors');
const { ORDER_STATUS, PAYMENT_STATUS } = require('@/modules/orders/domain/order-status');
const logger = require('@/shared/logger');

const PROCESSING_STALE_AGE_MS = 5 * 60 * 1000; // 5 minutes — fresh attempts below this age are not failed

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
            const embedTicketIds = embedData.ticket_ids || [];
            const embedTicketId = embedData.ticket_id || existingAttempt.ticketId;

            if (existingAttempt.orderId) {
                // Aggregate path — resolve tickets from DB order items (source of truth)
                const dbItems = await orderRepository.getOrderItemsInTransaction(tx, existingAttempt.orderId);
                const dbTicketIds = dbItems.map(i => i.ticketId).filter(Boolean);

                if (dbTicketIds.length === 0) {
                    console.warn(
                        `[ZaloPay Callback] Order ${existingAttempt.orderId} has no ticket items in DB.`
                    );
                    return { return_code: 0, return_message: 'order has no ticket items' };
                }

                if (embedTicketIds.length > 0) {
                    const embedSet = new Set(embedTicketIds);
                    const embedOnly = embedTicketIds.filter(id => !dbTicketIds.includes(id));
                    const dbOnly = dbTicketIds.filter(id => !embedSet.has(id));
                    if (embedOnly.length > 0 || dbOnly.length > 0) {
                        console.warn(
                            `[ZaloPay Callback] embed_data ticket_ids mismatch with DB for order ${existingAttempt.orderId}. Using DB. embedOnly=${JSON.stringify(embedOnly)} dbOnly=${JSON.stringify(dbOnly)}`
                        );
                    }
                }

                console.log(
                    `[ZaloPay Callback] Aggregate order ${existingAttempt.orderId}, ${dbTicketIds.length} tickets, ZaloID: ${zpTransId}`
                );

                await ticketService.confirmPaymentForOrderInTransaction(tx, existingAttempt.orderId, zpTransId);
            } else if (embedTicketId) {
                // Legacy single ticket path
                console.log(
                    `[ZaloPay Callback] Legacy single ticket: ${embedTicketId}, ZaloID: ${zpTransId}`
                );
                await ticketService.confirmTicketPayment(embedTicketId, zpTransId, tx);
            } else {
                console.warn(
                    `[ZaloPay Callback] No orderId or ticketId in payment_attempt for ${appTransId}`
                );
                return {
                    return_code: 0,
                    return_message: 'no order or ticket reference',
                };
            }

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

const createBulkPaymentOrder = asyncHandler(async (req, res) => {
    const { orderId, redirectUrl } = req.body;
    const userId = req.user.uid;

    if (!orderId) throw new BadRequestError('orderId is required.');

    const { paId, app_trans_id, tickets, totalAmount, existingResponse, conflictRetry, existingAttemptId } = await ticketRepository.runTransaction(async (tx) => {
        // Lock order row
        const lockResult = await tx.query(
            'SELECT status FROM orders WHERE id = $1 FOR UPDATE',
            [orderId]
        );
        if (lockResult.rows.length === 0) throw new NotFoundError('Order not found.');
        if (lockResult.rows[0].status !== ORDER_STATUS.PENDING_PAYMENT) {
            if (lockResult.rows[0].status === ORDER_STATUS.PAID) {
                throw new ConflictError('Order already paid.');
            }
            throw new ConflictError(`Order not payable (status: ${lockResult.rows[0].status}).`);
        }

        const orderData = await orderRepository.getOrderInTransaction(tx, orderId);
        if (orderData.userId !== userId) throw new ForbiddenError('Forbidden.');

        // Check for existing active attempt — prevent duplicate ZaloPay order
        const existingAttempt = await orderRepository.getLatestPaymentAttemptByOrderId(orderId, tx, true);
        if (existingAttempt) {
            if (existingAttempt.status === PAYMENT_STATUS.PROCESSING) {
                if (existingAttempt.responsePayload && existingAttempt.responsePayload.order_url) {
                    return { existingResponse: existingAttempt.responsePayload };
                }
                // No response yet — determine freshness
                const age = Date.now() - Number(existingAttempt.createdAt || 0);
                if (age < PROCESSING_STALE_AGE_MS) {
                    return { conflictRetry: true, existingAttemptId: existingAttempt.id };
                }
                await orderRepository.updatePaymentAttemptInTransaction(tx, existingAttempt.id, {
                    status: PAYMENT_STATUS.FAILED,
                    failureReason: 'Stale processing attempt exceeded timeout',
                });
            } else if (existingAttempt.status === PAYMENT_STATUS.SUCCEEDED) {
                throw new ConflictError('Order already paid.');
            }
        }

        // Load items within transaction
        const items = await orderRepository.getOrderItemsInTransaction(tx, orderId);
        const ticketIds = items.map(i => i.ticketId).filter(Boolean);
        if (ticketIds.length === 0) throw new BadRequestError('Order has no ticket items.');

        // Load tickets within transaction
        const loadTickets = await Promise.all(
            ticketIds.map(id => ticketRepository.getTicketInTransaction(tx, id))
        );
        const tickets = loadTickets.filter(Boolean);

        const totalAmount = Number(orderData.totalAmount);

        // Generate app_trans_id for durable attempt
        const app_time = Date.now();
        const app_date = moment(app_time).utcOffset('+07:00').format('YYMMDD');
        const randomSuffix = Math.floor(Math.random() * 100000);
        const cleanOrderId = orderId.replace(/[^a-zA-Z0-9]/g, '');
        const shortId = cleanOrderId.slice(-10);
        const app_trans_id = `${app_date}_${shortId}_${randomSuffix}`;
        const now = Date.now();
        const paId = `pa_${uuidv4()}`;

        // Create payment_attempt + link all tickets in one shot (within the same tx)
        await orderRepository.createPaymentAttemptInTransaction(tx, {
            id: paId,
            orderId,
            ticketId: ticketIds[0],
            status: PAYMENT_STATUS.PROCESSING,
            paymentMethod: 'zalopay',
            provider: 'zalopay',
            providerOrderId: app_trans_id,
            amount: totalAmount,
            currency: 'VND',
            requestPayload: null,
            responsePayload: null,
            createdAt: now,
            updatedAt: now,
        });
        await orderRepository.linkTicketsToOrderInTransaction(tx, ticketIds, orderId, paId);

        return { paId, app_trans_id, tickets, totalAmount };
    });

    if (existingResponse) {
        return res.status(200).json({ ...existingResponse, orderId });
    }
    if (conflictRetry) {
        return res.status(409).json({
            error: 'Payment is being processed. Please retry shortly.',
            attemptId: existingAttemptId,
        });
    }

    const finalRedirectUrl = redirectUrl
        ? (redirectUrl.includes('orderId=') ? redirectUrl : redirectUrl + '&orderId=' + encodeURIComponent(orderId))
        : null;

    let zaloResponse;
    try {
        zaloResponse = await paymentService.createAggregateZaloPayOrder(
            orderId, tickets, totalAmount, userId, finalRedirectUrl, app_trans_id
        );
    } catch (err) {
        await ticketRepository.runTransaction(async (tx) => {
            await orderRepository.getLatestPaymentAttemptByOrderId(orderId, tx, true);
            await orderRepository.updatePaymentAttemptInTransaction(tx, paId, {
                status: PAYMENT_STATUS.FAILED,
                responsePayload: { error: err.message },
                updatedAt: Date.now(),
            });
        });
        throw err;
    }

    // Re-lock and update under transaction to serialize with concurrent requests
    await ticketRepository.runTransaction(async (tx) => {
        await orderRepository.getLatestPaymentAttemptByOrderId(orderId, tx, true);
        await orderRepository.updatePaymentAttemptInTransaction(tx, paId, {
            responsePayload: zaloResponse,
            updatedAt: Date.now(),
        });
    });

    res.status(200).json({ ...zaloResponse, orderId });
});

const checkOrderPaymentStatus = asyncHandler(async (req, res) => {
    const { orderId } = req.body;

    const order = await orderRepository.getOrderById(orderId);
    if (!order) throw new NotFoundError('Order not found.');

    if (order.status === ORDER_STATUS.PAID) {
        return res.json({ status: 'paid', orderId, totalAmount: order.totalAmount });
    }

    const tickets = await orderRepository.getTicketsByOrderId(orderId);
    if (tickets.length === 0) throw new NotFoundError('No tickets found for this order.');

    const allPaid = tickets.every(t => t.status === 'paid' || t.status === 'checkedIn');
    if (allPaid) {
        await orderRepository.updateOrderStatusInTransaction(null, orderId, ORDER_STATUS.PAID, Date.now());
        return res.json({ status: 'paid', orderId, totalAmount: order.totalAmount });
    }

    // Query ZaloPay if we have a provider ID
    const latestAttempt = await orderRepository.getLatestPaymentAttemptByOrderId(orderId, null, true);
    if (latestAttempt && latestAttempt.providerOrderId) {
        const queryResult = await paymentService.queryZaloPayOrder(latestAttempt.providerOrderId);
        if (queryResult.return_code === 1) {
            await ticketService.confirmPaymentForOrder(orderId, [], queryResult.zp_trans_id || 're-query');
            return res.json({ status: 'paid', orderId, totalAmount: order.totalAmount });
        }
    }

    const anyPending = tickets.some(t => t.status === 'pending');
    const anyFailed = tickets.some(t => t.status === 'cancelled');
    if (anyFailed) return res.json({ status: 'failed', orderId });
    if (anyPending) return res.json({ status: 'pending', orderId });
    return res.json({ status: 'unknown', orderId });
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
    createBulkPaymentOrder,
    handleZaloPayCallback,
    manualCheckPaymentStatus,
    checkOrderPaymentStatus,
    handleZaloPayRedirect,
};
