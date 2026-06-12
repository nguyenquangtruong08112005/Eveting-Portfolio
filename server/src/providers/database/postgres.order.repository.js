const { query, transaction } = require('./postgres.client');
const { ORDER_STATUS, PAYMENT_STATUS } = require('@/modules/orders/domain/order-status');

const createOrder = async (order) => {
    return transaction(async (client) => {
        await client.query(
            `INSERT INTO orders (
                id, user_id, event_id, organizer_id, status,
                subtotal_amount, discount_amount, fee_amount, total_amount,
                currency, idempotency_key, notes,
                expires_at, paid_at, cancelled_at,
                created_at, updated_at, raw_data
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
            [
                order.id,
                order.userId,
                order.eventId || null,
                order.organizerId || null,
                order.status || ORDER_STATUS.PENDING_PAYMENT,
                order.subtotalAmount || 0,
                order.discountAmount || 0,
                order.feeAmount || 0,
                order.totalAmount || 0,
                order.currency || 'VND',
                order.idempotencyKey || null,
                order.notes || null,
                order.expiresAt || null,
                order.paidAt || null,
                order.cancelledAt || null,
                order.createdAt || Date.now(),
                order.updatedAt || Date.now(),
                JSON.stringify(order.rawData || {}),
            ]
        );

        if (order.items && order.items.length > 0) {
            for (const item of order.items) {
                await client.query(
                    `INSERT INTO order_items (
                        id, order_id, ticket_type_id, ticket_type,
                        event_id, event_name, ticket_id, seat_id,
                        quantity, unit_price, subtotal, total_amount, status, created_at
                     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
                    [
                        item.id,
                        order.id,
                        item.ticketTypeId || null,
                        item.ticketType || null,
                        item.eventId || null,
                        item.eventName || null,
                        item.ticketId || null,
                        item.seatId || null,
                        item.quantity || 1,
                        item.unitPrice || 0,
                        item.subtotal || 0,
                        item.totalAmount || 0,
                        item.status || null,
                        item.createdAt || Date.now(),
                    ]
                );
            }
        }

        return order.id;
    });
};

const getOrderById = async (orderId) => {
    const orderResult = await query('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (orderResult.rows.length === 0) return null;

    const row = orderResult.rows[0];
    const order = {
        id: row.id,
        userId: row.user_id,
        eventId: row.event_id,
        organizerId: row.organizer_id,
        status: row.status,
        subtotalAmount: row.subtotal_amount != null ? Number(row.subtotal_amount) : 0,
        discountAmount: row.discount_amount != null ? Number(row.discount_amount) : 0,
        feeAmount: row.fee_amount != null ? Number(row.fee_amount) : 0,
        totalAmount: row.total_amount != null ? Number(row.total_amount) : 0,
        currency: row.currency,
        idempotencyKey: row.idempotency_key,
        notes: row.notes,
        expiresAt: row.expires_at != null ? Number(row.expires_at) : null,
        paidAt: row.paid_at != null ? Number(row.paid_at) : null,
        cancelledAt: row.cancelled_at != null ? Number(row.cancelled_at) : null,
        createdAt: row.created_at != null ? Number(row.created_at) : null,
        updatedAt: row.updated_at != null ? Number(row.updated_at) : null,
        rawData: row.raw_data || {},
        items: [],
        paymentAttempts: [],
    };

    const itemsResult = await query(
        'SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at',
        [orderId]
    );
    order.items = itemsResult.rows.map(r => ({
        id: r.id,
        orderId: r.order_id,
        ticketTypeId: r.ticket_type_id,
        ticketType: r.ticket_type,
        eventId: r.event_id,
        eventName: r.event_name,
        ticketId: r.ticket_id,
        seatId: r.seat_id,
        quantity: r.quantity != null ? Number(r.quantity) : 1,
        unitPrice: r.unit_price != null ? Number(r.unit_price) : 0,
        subtotal: r.subtotal != null ? Number(r.subtotal) : 0,
        totalAmount: r.total_amount != null ? Number(r.total_amount) : 0,
        status: r.status,
        createdAt: r.created_at != null ? Number(r.created_at) : null,
    }));

    const attemptsResult = await query(
        'SELECT * FROM payment_attempts WHERE order_id = $1 ORDER BY created_at',
        [orderId]
    );
    order.paymentAttempts = attemptsResult.rows.map(r => ({
        id: r.id,
        orderId: r.order_id,
        ticketId: r.ticket_id,
        status: r.status,
        paymentMethod: r.payment_method,
        provider: r.provider,
        providerOrderId: r.provider_order_id,
        providerTransactionId: r.provider_transaction_id,
        transactionId: r.transaction_id,
        amount: r.amount != null ? Number(r.amount) : 0,
        currency: r.currency,
        requestPayload: r.request_payload || null,
        responsePayload: r.response_payload || null,
        gatewayResponse: r.gateway_response || null,
        completedAt: r.completed_at != null ? Number(r.completed_at) : null,
        failureReason: r.failure_reason,
        createdAt: r.created_at != null ? Number(r.created_at) : null,
        updatedAt: r.updated_at != null ? Number(r.updated_at) : null,
    }));

    return order;
};

const updateOrderStatus = async (orderId, status) => {
    await query(
        'UPDATE orders SET status = $1, updated_at = $2 WHERE id = $3',
        [status, Date.now(), orderId]
    );
};

const createPaymentAttempt = async (attempt) => {
    await query(
        `INSERT INTO payment_attempts (
            id, order_id, ticket_id, status, payment_method,
            provider, provider_order_id, provider_transaction_id, transaction_id,
            amount, currency,
            request_payload, response_payload, gateway_response,
            completed_at, failure_reason,
            created_at, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        [
            attempt.id,
            attempt.orderId,
            attempt.ticketId || null,
            attempt.status || PAYMENT_STATUS.PENDING,
            attempt.paymentMethod || null,
            attempt.provider || null,
            attempt.providerOrderId || null,
            attempt.providerTransactionId || null,
            attempt.transactionId || null,
            attempt.amount || 0,
            attempt.currency || 'VND',
            attempt.requestPayload ? JSON.stringify(attempt.requestPayload) : null,
            attempt.responsePayload ? JSON.stringify(attempt.responsePayload) : null,
            attempt.gatewayResponse ? JSON.stringify(attempt.gatewayResponse) : null,
            attempt.completedAt || null,
            attempt.failureReason || null,
            attempt.createdAt || Date.now(),
            attempt.updatedAt || Date.now(),
        ]
    );
};

const updatePaymentAttempt = async (attemptId, updates) => {
    const sets = [];
    const params = [];
    let idx = 1;

    if (updates.status !== undefined) {
        sets.push(`status = $${idx}`);
        params.push(updates.status);
        idx++;
    }
    if (updates.provider !== undefined) {
        sets.push(`provider = $${idx}`);
        params.push(updates.provider);
        idx++;
    }
    if (updates.providerOrderId !== undefined) {
        sets.push(`provider_order_id = $${idx}`);
        params.push(updates.providerOrderId);
        idx++;
    }
    if (updates.providerTransactionId !== undefined) {
        sets.push(`provider_transaction_id = $${idx}`);
        params.push(updates.providerTransactionId);
        idx++;
    }
    if (updates.transactionId !== undefined) {
        sets.push(`transaction_id = $${idx}`);
        params.push(updates.transactionId);
        idx++;
    }
    if (updates.requestPayload !== undefined) {
        sets.push(`request_payload = $${idx}::jsonb`);
        params.push(JSON.stringify(updates.requestPayload));
        idx++;
    }
    if (updates.responsePayload !== undefined) {
        sets.push(`response_payload = $${idx}::jsonb`);
        params.push(JSON.stringify(updates.responsePayload));
        idx++;
    }
    if (updates.gatewayResponse !== undefined) {
        sets.push(`gateway_response = $${idx}::jsonb`);
        params.push(JSON.stringify(updates.gatewayResponse));
        idx++;
    }
    if (updates.completedAt !== undefined) {
        sets.push(`completed_at = $${idx}`);
        params.push(updates.completedAt);
        idx++;
    }
    if (updates.failureReason !== undefined) {
        sets.push(`failure_reason = $${idx}`);
        params.push(updates.failureReason);
        idx++;
    }

    if (sets.length === 0) return;

    sets.push(`updated_at = $${idx}`);
    params.push(Date.now());
    idx++;
    params.push(attemptId);

    await query(
        `UPDATE payment_attempts SET ${sets.join(', ')} WHERE id = $${idx}`,
        params
    );
};

const linkTicketToOrder = async (ticketId, orderId, orderItemId, paymentAttemptId) => {
    const sets = [];
    const params = [];
    let idx = 1;

    if (orderId !== undefined) {
        sets.push(`order_id = $${idx}`);
        params.push(orderId);
        idx++;
    }
    if (orderItemId !== undefined) {
        sets.push(`order_item_id = $${idx}`);
        params.push(orderItemId);
        idx++;
    }
    if (paymentAttemptId !== undefined) {
        sets.push(`payment_attempt_id = $${idx}`);
        params.push(paymentAttemptId);
        idx++;
    }

    if (sets.length === 0) return;

    params.push(ticketId);
    await query(
        `UPDATE tickets SET ${sets.join(', ')} WHERE id = $${idx}`,
        params
    );
};

module.exports = {
    createOrder,
    getOrderById,
    updateOrderStatus,
    createPaymentAttempt,
    updatePaymentAttempt,
    linkTicketToOrder,
};
