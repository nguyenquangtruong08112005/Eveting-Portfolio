'use strict';

const mockQuery = jest.fn();
const mockTransaction = jest.fn();

jest.mock('@/providers/database/postgres.client', () => ({
    query: mockQuery,
    transaction: mockTransaction,
}));

const repo = require('@/providers/database/postgres.order.repository');

const runInTx = (callback) => {
    mockTransaction.mockImplementation(async (cb) => cb({ query: mockQuery }));
    return callback();
};

beforeEach(() => {
    jest.clearAllMocks();
});

describe('createOrder', () => {
    it('inserts the order and its items inside a transaction and returns the order id', async () => {
        await runInTx(async () => {
            mockQuery.mockResolvedValue({ rows: [] });
            const order = {
                id: 'o1',
                userId: 'u1',
                items: [
                    { id: 'it1', ticketTypeId: 'tt1', quantity: 2, unitPrice: 50, createdAt: 1000 },
                    { id: 'it2', quantity: 1 },
                ],
            };

            await expect(repo.createOrder(order)).resolves.toBe('o1');

            expect(mockTransaction).toHaveBeenCalledTimes(1);
            expect(mockQuery).toHaveBeenCalledTimes(3);
            const orderSql = mockQuery.mock.calls[0][0];
            const orderParams = mockQuery.mock.calls[0][1];
            expect(orderSql).toContain('INSERT INTO orders');
            expect(orderParams[0]).toBe('o1');
            expect(orderParams[1]).toBe('u1');
            expect(orderParams[2]).toBeNull();
            expect(orderParams[4]).toBe('pending_payment');
            expect(orderParams[11]).toBeNull();
            expect(orderParams[15]).toEqual(expect.any(Date));
            expect(orderParams[17]).toBe('{}');

            const itemSql = mockQuery.mock.calls[1][0];
            const itemParams = mockQuery.mock.calls[1][1];
            expect(itemSql).toContain('INSERT INTO order_items');
            expect(itemParams[0]).toBe('it1');
            expect(itemParams[1]).toBe('o1');
            expect(itemParams[2]).toBe('tt1');
            expect(itemParams[8]).toBe(2);
            expect(itemParams[9]).toBe(50);
            expect(itemParams[13]).toEqual(new Date(1000000));

            expect(mockQuery.mock.calls[2][1][8]).toBe(1);
        });
    });

    it('inserts only the order when there are no items', async () => {
        await runInTx(async () => {
            mockQuery.mockResolvedValue({ rows: [] });

            await repo.createOrder({ id: 'o1', userId: 'u1' });

            expect(mockQuery).toHaveBeenCalledTimes(1);
            expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO orders');
        });
    });

    it('propagates errors thrown by the transaction body', async () => {
        mockTransaction.mockRejectedValue(new Error('db down'));

        await expect(repo.createOrder({ id: 'o1' })).rejects.toThrow('db down');
    });
});

describe('createOrderInTransaction', () => {
    it('uses the provided transaction client', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await repo.createOrderInTransaction(tx, { id: 'o1', userId: 'u1' });

        expect(tx.query).toHaveBeenCalledTimes(1);
        expect(mockQuery).not.toHaveBeenCalled();
        expect(tx.query.mock.calls[0][1][0]).toBe('o1');
    });

    it('falls back to the module query when transaction is omitted', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.createOrderInTransaction(null, { id: 'o1', userId: 'u1' });

        expect(mockQuery).toHaveBeenCalledTimes(1);
        expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO orders');
    });
});

describe('updateOrderTotalsInTransaction', () => {
    it('routes the UPDATE through the transaction client with ordered params', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await repo.updateOrderTotalsInTransaction(tx, 'o1', {
            subtotalAmount: 100,
            discountAmount: 10,
            feeAmount: 5,
            totalAmount: 95,
            updatedAt: 2000,
        });

        expect(mockQuery).not.toHaveBeenCalled();
        const [sql, params] = tx.query.mock.calls[0];
        expect(sql).toContain('UPDATE orders');
        expect(params).toEqual([
            100, 10, 5, 95, new Date(2000000), 'o1',
        ]);
    });

    it('defaults missing totals and uses nowDb when updatedAt is absent', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.updateOrderTotalsInTransaction(null, 'o1', {
            subtotalAmount: 100,
            discountAmount: 0,
            totalAmount: 100,
        });

        const params = mockQuery.mock.calls[0][1];
        expect(params[2]).toBe(0);
        expect(params[4]).toEqual(expect.any(Date));
        expect(params[5]).toBe('o1');
    });
});

describe('createOrderItemInTransaction', () => {
    it('uses the provided transaction client', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await repo.createOrderItemInTransaction(tx, { id: 'it1', quantity: 2 }, 'o1');

        expect(tx.query).toHaveBeenCalledTimes(1);
        expect(mockQuery).not.toHaveBeenCalled();
        expect(tx.query.mock.calls[0][1][1]).toBe('o1');
    });

    it('falls back to the module query without a transaction', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.createOrderItemInTransaction(null, { id: 'it1', quantity: 2 }, 'o1');

        expect(mockQuery).toHaveBeenCalledTimes(1);
        expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO order_items');
    });
});

describe('getOrderById', () => {
    it('returns null when the order does not exist', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getOrderById('o1')).resolves.toBeNull();

        expect(mockQuery).toHaveBeenCalledWith(
            'SELECT * FROM orders WHERE id = $1',
            ['o1']
        );
    });

    it('hydrates the order with items and payment attempts', async () => {
        mockQuery
            .mockResolvedValueOnce({
                rows: [{
                    id: 'o1', user_id: 'u1', event_id: 'e1', organizer_id: 'org1',
                    status: 'paid', subtotal_amount: '100', discount_amount: '10',
                    fee_amount: '5', total_amount: '95', currency: 'VND',
                    idempotency_key: 'k1', notes: 'n', expires_at: new Date(1000),
                    paid_at: new Date(2000), cancelled_at: null,
                    created_at: new Date(3000), updated_at: new Date(4000),
                    raw_data: { promo: 'X' },
                }],
            })
            .mockResolvedValueOnce({
                rows: [{
                    id: 'it1', order_id: 'o1', ticket_type_id: 'tt1', ticket_type: 'VIP',
                    event_id: 'e1', event_name: 'EV', ticket_id: 't1', seat_id: 's1',
                    quantity: 2, unit_price: '50', subtotal: '100', total_amount: '100',
                    status: 'paid', created_at: new Date(5000),
                }],
            })
            .mockResolvedValueOnce({
                rows: [{
                    id: 'pa1', order_id: 'o1', ticket_id: 't1', status: 'succeeded',
                    payment_method: 'zalopay', provider: 'zalopay', provider_order_id: 'z1',
                    provider_transaction_id: 'zt1', transaction_id: 'tr1', amount: '100',
                    currency: 'VND', request_payload: { a: 1 }, response_payload: null,
                    gateway_response: null, completed_at: new Date(6000),
                    failure_reason: null, created_at: new Date(7000), updated_at: new Date(8000),
                }],
            });

        const result = await repo.getOrderById('o1');

        expect(result).toEqual({
            id: 'o1', userId: 'u1', eventId: 'e1', organizerId: 'org1', status: 'paid',
            subtotalAmount: 100, discountAmount: 10, feeAmount: 5, totalAmount: 95,
            currency: 'VND', idempotencyKey: 'k1', notes: 'n',
            expiresAt: 1000, paidAt: 2000, cancelledAt: null,
            createdAt: 3000, updatedAt: 4000, rawData: { promo: 'X' },
            items: [
                {
                    id: 'it1', orderId: 'o1', ticketTypeId: 'tt1', ticketType: 'VIP',
                    eventId: 'e1', eventName: 'EV', ticketId: 't1', seatId: 's1',
                    quantity: 2, unitPrice: 50, subtotal: 100, totalAmount: 100,
                    status: 'paid', createdAt: 5000,
                },
            ],
            paymentAttempts: [
                {
                    id: 'pa1', orderId: 'o1', ticketId: 't1', status: 'succeeded',
                    paymentMethod: 'zalopay', provider: 'zalopay', providerOrderId: 'z1',
                    providerTransactionId: 'zt1', transactionId: 'tr1', amount: 100,
                    currency: 'VND', requestPayload: { a: 1 }, responsePayload: null,
                    gatewayResponse: null, completedAt: 6000, failureReason: null,
                    createdAt: 7000, updatedAt: 8000,
                },
            ],
        });

        expect(mockQuery.mock.calls[1][0]).toContain('FROM order_items');
        expect(mockQuery.mock.calls[1][1]).toEqual(['o1']);
        expect(mockQuery.mock.calls[2][0]).toContain('FROM payment_attempts');
    });

    it('propagates query failures', async () => {
        mockQuery.mockRejectedValue(new Error('db down'));

        await expect(repo.getOrderById('o1')).rejects.toThrow('db down');
    });
});

describe('getOrderItemsInTransaction', () => {
    it('uses the provided transaction client and maps rows', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await expect(repo.getOrderItemsInTransaction(tx, 'o1')).resolves.toEqual([]);

        expect(tx.query).toHaveBeenCalledWith(
            'SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at',
            ['o1']
        );
        expect(mockQuery).not.toHaveBeenCalled();
    });

    it('falls back to the module query without a transaction', async () => {
        mockQuery.mockResolvedValue({
            rows: [{
                id: 'it1', order_id: 'o1', ticket_type_id: 'tt1', ticket_type: 'VIP',
                event_id: 'e1', event_name: 'EV', ticket_id: null, seat_id: null,
                quantity: 1, unit_price: '10', subtotal: '10', total_amount: '10',
                status: 'paid', created_at: new Date(1000),
            }],
        });

        const result = await repo.getOrderItemsInTransaction(null, 'o1');

        expect(mockQuery).toHaveBeenCalledTimes(1);
        expect(result).toEqual([
            {
                id: 'it1', orderId: 'o1', ticketTypeId: 'tt1', ticketType: 'VIP',
                eventId: 'e1', eventName: 'EV', ticketId: null, seatId: null,
                quantity: 1, unitPrice: 10, subtotal: 10, totalAmount: 10,
                status: 'paid', createdAt: 1000,
            },
        ]);
    });
});

describe('updateOrderStatus', () => {
    it('updates the order status through the transaction when the transition is valid', async () => {
        await runInTx(async () => {
            mockQuery
                .mockResolvedValueOnce({ rows: [{ status: 'pending_payment' }] })
                .mockResolvedValueOnce({ rows: [] });

            await repo.updateOrderStatus('o1', 'paid');

            expect(mockTransaction).toHaveBeenCalledTimes(1);
            expect(mockQuery.mock.calls[0][0]).toContain('FOR UPDATE');
            const [sql, params] = mockQuery.mock.calls[1];
            expect(sql).toContain('UPDATE orders');
            expect(params).toEqual(['paid', expect.any(Date), 'o1']);
        });
    });

    it('throws when moving from a terminal status', async () => {
        await runInTx(async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ status: 'paid' }] });

            await expect(repo.updateOrderStatus('o1', 'cancelled')).rejects.toThrow(
                "Invalid order status transition from terminal status 'paid' to 'cancelled'"
            );
        });
    });

    it('does not throw when the status is unchanged', async () => {
        await runInTx(async () => {
            mockQuery
                .mockResolvedValueOnce({ rows: [{ status: 'paid' }] })
                .mockResolvedValueOnce({ rows: [] });

            await expect(repo.updateOrderStatus('o1', 'paid')).resolves.toBeUndefined();
        });
    });
});

describe('updateOrderStatusInTransaction', () => {
    it('uses the provided transaction client and includes paidAt when given', async () => {
        const tx = { query: jest.fn() };
        tx.query
            .mockResolvedValueOnce({ rows: [{ status: 'pending_payment' }] })
            .mockResolvedValueOnce({ rows: [] });

        await repo.updateOrderStatusInTransaction(tx, 'o1', 'paid', 5000);

        expect(mockQuery).not.toHaveBeenCalled();
        const [sql, params] = tx.query.mock.calls[1];
        expect(sql).toContain('paid_at = $3');
        expect(params).toEqual(['paid', expect.any(Date), new Date(5000000), 'o1']);
    });

    it('falls back to the module query without a transaction', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ status: 'pending_payment' }] })
            .mockResolvedValueOnce({ rows: [] });

        await repo.updateOrderStatusInTransaction(null, 'o1', 'paid');

        expect(mockQuery).toHaveBeenCalledTimes(2);
        expect(mockQuery.mock.calls[1][1]).toEqual(['paid', expect.any(Date), 'o1']);
    });
});

describe('createPaymentAttempt', () => {
    it('inserts a payment attempt with defaults and JSON payloads', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.createPaymentAttempt({
            id: 'pa1',
            orderId: 'o1',
            amount: 100,
            requestPayload: { a: 1 },
        });

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('INSERT INTO payment_attempts');
        expect(params[0]).toBe('pa1');
        expect(params[1]).toBe('o1');
        expect(params[3]).toBe('pending');
        expect(params[9]).toBe(100);
        expect(params[10]).toBe('VND');
        expect(params[11]).toBe(JSON.stringify({ a: 1 }));
        expect(params[12]).toBeNull();
        expect(params[16]).toEqual(expect.any(Date));
    });

    it('propagates query failures', async () => {
        mockQuery.mockRejectedValue(new Error('db down'));

        await expect(repo.createPaymentAttempt({ id: 'pa1' })).rejects.toThrow('db down');
    });
});

describe('createPaymentAttemptInTransaction', () => {
    it('uses the provided transaction client', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await repo.createPaymentAttemptInTransaction(tx, { id: 'pa1', orderId: 'o1' });

        expect(tx.query).toHaveBeenCalledTimes(1);
        expect(mockQuery).not.toHaveBeenCalled();
        expect(tx.query.mock.calls[0][1][0]).toBe('pa1');
    });

    it('falls back to the module query without a transaction', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.createPaymentAttemptInTransaction(null, { id: 'pa1', orderId: 'o1' });

        expect(mockQuery).toHaveBeenCalledTimes(1);
    });
});

describe('updatePaymentAttempt', () => {
    it('builds dynamic SET clauses with ordered params', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ status: 'pending' }] })
            .mockResolvedValueOnce({ rows: [] });

        await repo.updatePaymentAttempt('pa1', {
            status: 'processing',
            provider: 'zalopay',
            requestPayload: { a: 1 },
            completedAt: 5000,
            failureReason: null,
        });

        const [sql, params] = mockQuery.mock.calls[1];
        expect(sql).toContain('status = $1');
        expect(sql).toContain('provider = $2');
        expect(sql).toContain('request_payload = $3::jsonb');
        expect(sql).toContain('completed_at = $4');
        expect(sql).toContain('failure_reason = $5');
        expect(sql).toContain('updated_at = $6');
        expect(sql).toContain('WHERE id = $7');
        expect(params).toEqual([
            'processing', 'zalopay', JSON.stringify({ a: 1 }),
            new Date(5000000), null, expect.any(Date), 'pa1',
        ]);
    });

    it('throws on a transition from a terminal status', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ status: 'succeeded' }] });

        await expect(
            repo.updatePaymentAttempt('pa1', { status: 'pending' })
        ).rejects.toThrow(
            "Invalid payment attempt transition from terminal status 'succeeded' to 'pending'"
        );
    });

    it('is a no-op when no updatable fields are supplied', async () => {
        await repo.updatePaymentAttempt('pa1', {});

        expect(mockQuery).not.toHaveBeenCalled();
    });
});

describe('updatePaymentAttemptInTransaction', () => {
    it('uses the provided transaction client', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await repo.updatePaymentAttemptInTransaction(tx, 'pa1', { provider: 'z' });

        expect(tx.query).toHaveBeenCalledTimes(1);
        expect(mockQuery).not.toHaveBeenCalled();
        const [sql, params] = tx.query.mock.calls[0];
        expect(sql).toContain('provider = $1');
        expect(params).toEqual(['z', expect.any(Date), 'pa1']);
    });

    it('falls back to the module query without a transaction', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.updatePaymentAttemptInTransaction(null, 'pa1', { provider: 'z' });

        expect(mockQuery).toHaveBeenCalledTimes(1);
    });
});

describe('linkTicketToOrder', () => {
    it('updates the ticket with all link fields', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.linkTicketToOrder('t1', 'o1', 'it1', 'pa1');

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('order_id = $1');
        expect(sql).toContain('order_item_id = $2');
        expect(sql).toContain('payment_attempt_id = $3');
        expect(sql).toContain('WHERE id = $4');
        expect(params).toEqual(['o1', 'it1', 'pa1', 't1']);
    });

    it('is a no-op when no link fields are supplied', async () => {
        await repo.linkTicketToOrder('t1');

        expect(mockQuery).not.toHaveBeenCalled();
    });
});

describe('linkTicketToOrderInTransaction', () => {
    it('uses the provided transaction client', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await repo.linkTicketToOrderInTransaction(tx, 't1', 'o1');

        expect(mockQuery).not.toHaveBeenCalled();
        expect(tx.query.mock.calls[0][1]).toEqual(['o1', 't1']);
    });

    it('falls back to the module query without a transaction', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.linkTicketToOrderInTransaction(null, 't1', 'o1');

        expect(mockQuery).toHaveBeenCalledTimes(1);
    });
});

describe('getTicketOrderLink', () => {
    it('returns null when the ticket has no link', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getTicketOrderLink('t1')).resolves.toBeNull();
        expect(mockQuery).toHaveBeenCalledWith(
            'SELECT order_id, order_item_id, payment_attempt_id FROM tickets WHERE id = $1',
            ['t1']
        );
    });

    it('maps the link columns', async () => {
        mockQuery.mockResolvedValue({
            rows: [{ order_id: 'o1', order_item_id: 'it1', payment_attempt_id: 'pa1' }],
        });

        await expect(repo.getTicketOrderLink('t1')).resolves.toEqual({
            orderId: 'o1',
            orderItemId: 'it1',
            paymentAttemptId: 'pa1',
        });
    });
});

describe('getTicketOrderLinkInTransaction', () => {
    it('uses the provided transaction client', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await expect(repo.getTicketOrderLinkInTransaction(tx, 't1')).resolves.toBeNull();

        expect(tx.query).toHaveBeenCalledTimes(1);
        expect(mockQuery).not.toHaveBeenCalled();
    });
});

describe('createPaymentAttemptAndLinkTicketAtomic', () => {
    it('inserts the attempt and links the ticket inside a transaction', async () => {
        await runInTx(async () => {
            mockQuery.mockResolvedValue({ rows: [] });

            await repo.createPaymentAttemptAndLinkTicketAtomic(
                { id: 'pa1', orderId: 'o1', amount: 100 },
                't1'
            );

            expect(mockTransaction).toHaveBeenCalledTimes(1);
            expect(mockQuery).toHaveBeenCalledTimes(2);
            expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO payment_attempts');
            const linkSql = mockQuery.mock.calls[1][0];
            expect(linkSql).toContain('UPDATE tickets SET payment_attempt_id = $1');
            expect(mockQuery.mock.calls[1][1]).toEqual(['pa1', 't1']);
        });
    });
});

describe('linkTicketsToOrderInTransaction', () => {
    it('links many tickets to an order without a payment attempt', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await repo.linkTicketsToOrderInTransaction(tx, ['t1', 't2'], 'o1');

        const [sql, params] = tx.query.mock.calls[0];
        expect(sql).toContain('order_id = $1');
        expect(sql).toContain('WHERE id = ANY($2)');
        expect(params).toEqual(['o1', ['t1', 't2']]);
    });

    it('includes the payment attempt column when provided', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await repo.linkTicketsToOrderInTransaction(tx, ['t1'], 'o1', 'pa1');

        const [sql, params] = tx.query.mock.calls[0];
        expect(sql).toContain('payment_attempt_id = $2');
        expect(sql).toContain('WHERE id = ANY($3)');
        expect(params).toEqual(['o1', 'pa1', ['t1']]);
    });
});

describe('getLatestPaymentAttemptByOrderId', () => {
    it('returns null when no attempt exists', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getLatestPaymentAttemptByOrderId('o1')).resolves.toBeNull();
    });

    it('uses the locking SQL variant when lock is requested', async () => {
        mockQuery.mockResolvedValue({
            rows: [{ id: 'pa1', order_id: 'o1', amount: '100' }],
        });

        const result = await repo.getLatestPaymentAttemptByOrderId('o1', null, true);

        expect(mockQuery.mock.calls[0][0]).toContain('FOR UPDATE');
        expect(result.amount).toBe(100);
    });

    it('maps the latest attempt when present', async () => {
        mockQuery.mockResolvedValue({
            rows: [{
                id: 'pa1', order_id: 'o1', ticket_id: null, status: 'succeeded',
                payment_method: null, provider: 'zalopay', provider_order_id: 'z1',
                provider_transaction_id: null, transaction_id: null, amount: '100',
                currency: 'VND', completed_at: new Date(1000), failure_reason: null,
                created_at: new Date(2000), updated_at: new Date(3000),
            }],
        });

        const result = await repo.getLatestPaymentAttemptByOrderId('o1');

        expect(result).toEqual({
            id: 'pa1', orderId: 'o1', ticketId: null, status: 'succeeded',
            paymentMethod: null, provider: 'zalopay', providerOrderId: 'z1',
            providerTransactionId: null, transactionId: null, amount: 100,
            currency: 'VND', completedAt: 1000, failureReason: null,
            createdAt: 2000, updatedAt: 3000,
        });
    });
});

describe('getPaymentAttemptByProviderOrderId', () => {
    it('queries without a lock by default and maps the row', async () => {
        mockQuery.mockResolvedValue({
            rows: [{ id: 'pa1', order_id: 'o1', amount: '50' }],
        });

        const result = await repo.getPaymentAttemptByProviderOrderId('z1');

        expect(mockQuery.mock.calls[0][0]).not.toContain('FOR UPDATE');
        expect(mockQuery.mock.calls[0][1]).toEqual(['z1']);
        expect(result.amount).toBe(50);
    });

    it('appends FOR UPDATE when lock is requested and returns null on empty rows', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(
            repo.getPaymentAttemptByProviderOrderId('z1', null, true)
        ).resolves.toBeNull();

        expect(mockQuery.mock.calls[0][0]).toContain('FOR UPDATE');
    });
});

describe('getLatestPaymentAttemptByTicketId', () => {
    it('uses the locking SQL when lock is requested', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(
            repo.getLatestPaymentAttemptByTicketId('t1', null, true)
        ).resolves.toBeNull();

        expect(mockQuery.mock.calls[0][0]).toContain('FOR UPDATE');
    });

    it('maps the row when present', async () => {
        mockQuery.mockResolvedValue({
            rows: [{ id: 'pa1', order_id: 'o1', amount: '10', status: 'pending' }],
        });

        const result = await repo.getLatestPaymentAttemptByTicketId('t1');

        expect(mockQuery.mock.calls[0][1]).toEqual(['t1']);
        expect(result.status).toBe('pending');
    });
});

describe('getTicketsByOrderId', () => {
    it('returns the raw ticket rows for the order', async () => {
        mockQuery.mockResolvedValue({
            rows: [{ id: 't1', user_id: 'u1', status: 'paid' }],
        });

        const result = await repo.getTicketsByOrderId('o1');

        expect(mockQuery.mock.calls[0][1]).toEqual(['o1']);
        expect(result).toEqual([{ id: 't1', user_id: 'u1', status: 'paid' }]);
    });
});

describe('createLedgerEntryInTransaction', () => {
    it('skips silently when the organizer id is missing', async () => {
        await repo.createLedgerEntryInTransaction(null, { id: 'le1', orderId: 'o1' });

        expect(mockQuery).not.toHaveBeenCalled();
    });

    it('skips when the organizer is not an active auth user', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await repo.createLedgerEntryInTransaction(null, {
            id: 'le1', orderId: 'o1', organizerId: 'org1', netAmount: 90,
        });

        expect(mockQuery).toHaveBeenCalledTimes(1);
        expect(mockQuery.mock.calls[0][0]).toContain('FROM auth_users');
    });

    it('inserts the ledger entry and updates organizer and platform balances', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] });

        await repo.createLedgerEntryInTransaction(null, {
            id: 'le1', orderId: 'o1', organizerId: 'org1',
            grossAmount: 100, platformFee: 10, netAmount: 90, createdAt: 1000,
        });

        expect(mockQuery).toHaveBeenCalledTimes(4);
        const ledgerSql = mockQuery.mock.calls[1][0];
        const ledgerParams = mockQuery.mock.calls[1][1];
        expect(ledgerSql).toContain('INSERT INTO ledger_entries');
        expect(ledgerParams).toEqual([
            'le1', 'o1', 'org1', 100, 10, 90, new Date(1000000),
        ]);
        expect(mockQuery.mock.calls[2][0]).toContain('INSERT INTO organizer_balances');
        expect(mockQuery.mock.calls[2][1]).toEqual(['org1', 90, expect.any(Date)]);
        expect(mockQuery.mock.calls[3][0]).toContain('INSERT INTO platform_fees');
        expect(mockQuery.mock.calls[3][1]).toEqual([10, expect.any(Date)]);
    });
});

describe('getOrganizerSettingsInTransaction', () => {
    it('returns null when no settings exist', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await expect(repo.getOrganizerSettingsInTransaction(tx, 'org1')).resolves.toBeNull();
        expect(tx.query).toHaveBeenCalledWith(
            'SELECT * FROM organizer_settings WHERE organizer_id = $1',
            ['org1']
        );
    });

    it('maps the settings row', async () => {
        const tx = { query: jest.fn().mockResolvedValue({
            rows: [{ organizer_id: 'org1', platform_fee_rate: '10', created_at: new Date(1000) }],
        }) };

        await expect(repo.getOrganizerSettingsInTransaction(tx, 'org1')).resolves.toEqual({
            organizerId: 'org1',
            platformFeeRate: 10,
            createdAt: 1000,
        });
    });
});

describe('createOrganizerSettings', () => {
    it('upserts the settings with default timestamp', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.createOrganizerSettings({ organizerId: 'org1', platformFeeRate: 10 });

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('INSERT INTO organizer_settings');
        expect(sql).toContain('ON CONFLICT (organizer_id)');
        expect(params).toEqual(['org1', 10, expect.any(Date)]);
    });
});

describe('getOrderInTransaction', () => {
    it('returns null when the order is missing', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await expect(repo.getOrderInTransaction(tx, 'o1')).resolves.toBeNull();
        expect(tx.query).toHaveBeenCalledWith('SELECT * FROM orders WHERE id = $1', ['o1']);
    });

    it('maps the order row', async () => {
        const tx = { query: jest.fn().mockResolvedValue({
            rows: [{
                id: 'o1', user_id: 'u1', event_id: 'e1', organizer_id: 'org1',
                status: 'paid', subtotal_amount: '100', discount_amount: '10',
                fee_amount: '5', total_amount: '95', currency: 'VND',
                idempotency_key: 'k1', notes: 'n', expires_at: new Date(1000),
                paid_at: new Date(2000), cancelled_at: null, created_at: new Date(3000),
                updated_at: new Date(4000), raw_data: {},
            }],
        }) };

        const result = await repo.getOrderInTransaction(tx, 'o1');

        expect(result.subtotalAmount).toBe(100);
        expect(result.paidAt).toBe(2000);
        expect(result.rawData).toEqual({});
    });
});

describe('getLedgerEntriesByOrganizer', () => {
    it('maps the joined ledger rows', async () => {
        mockQuery.mockResolvedValue({
            rows: [{
                id: 'le1', orderId: 'o1', organizerId: 'org1', gross: '100',
                fee: '10', net: '90', date: 1000, eventName: 'EV',
            }],
        });

        const result = await repo.getLedgerEntriesByOrganizer('org1');

        expect(mockQuery.mock.calls[0][1]).toEqual(['org1']);
        expect(result).toEqual([
            {
                id: 'le1', orderId: 'o1', organizerId: 'org1',
                gross: 100, fee: 10, net: 90, date: 1000, eventName: 'EV',
            },
        ]);
    });
});

describe('getOrganizerBalance / getPlatformFeeBalance', () => {
    it('returns zeroed balances when no row exists', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getOrganizerBalance('org1')).resolves.toEqual({ balance: 0, updatedAt: 0 });
        await expect(repo.getPlatformFeeBalance()).resolves.toEqual({ balance: 0, updatedAt: 0 });
    });

    it('maps the balance row', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ balance: '100', updated_at: 5000 }] });
        mockQuery.mockResolvedValueOnce({ rows: [{ balance: '200', updated_at: 6000 }] });

        await expect(repo.getOrganizerBalance('org1')).resolves.toEqual({
            balance: 100,
            updatedAt: 5000,
        });
        await expect(repo.getPlatformFeeBalance()).resolves.toEqual({
            balance: 200,
            updatedAt: 6000,
        });
    });
});

describe('getOrganizerBalanceInTransaction / getPlatformFeeBalanceInTransaction', () => {
    it('routes through the transaction client', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await expect(repo.getOrganizerBalanceInTransaction(tx, 'org1')).resolves.toEqual({
            balance: 0,
            updatedAt: 0,
        });
        await expect(repo.getPlatformFeeBalanceInTransaction(tx)).resolves.toEqual({
            balance: 0,
            updatedAt: 0,
        });

        expect(tx.query).toHaveBeenCalledTimes(2);
        expect(mockQuery).not.toHaveBeenCalled();
    });
});
