'use strict';

const mockQuery = jest.fn();
const mockTransaction = jest.fn();

jest.mock('@/providers/database/postgres.client', () => ({
    query: mockQuery,
    transaction: mockTransaction,
}));

const repo = require('@/providers/database/postgres.ticket.repository');

beforeEach(() => {
    jest.clearAllMocks();
});

describe('getTicketById', () => {
    it('returns null when the ticket is not found', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getTicketById('t1')).resolves.toBeNull();

        expect(mockQuery).toHaveBeenCalledWith(
            'SELECT * FROM tickets WHERE id = $1',
            ['t1']
        );
    });

    it('returns ticket from raw_data and attaches the id', async () => {
        mockQuery.mockResolvedValue({
            rows: [{ id: 't1', raw_data: { eventId: 'e1', userId: 'u1', status: 'paid' } }],
        });

        const result = await repo.getTicketById('t1');

        expect(result).toEqual({ id: 't1', eventId: 'e1', userId: 'u1', status: 'paid' });
    });

    it('builds the ticket from columns with numeric and date coercion', async () => {
        mockQuery.mockResolvedValue({
            rows: [
                {
                    id: 't1', event_id: 'e1', user_id: 'u1', organizer_id: 'org1', type: 'GA',
                    price: '50000', original_price: '60000', quantity: 2, unit_price: '45000',
                    applied_promo_code: 'PROMO', seat: 'A1', qr_code: 'qr', status: 'paid',
                    purchase_date: new Date(1000), group_id: 'g1', check_in_count: 1,
                    last_check_in_at: new Date(2000), checked_in_at: null,
                    updated_at: new Date(3000), raw_data: {},
                },
            ],
        });

        const result = await repo.getTicketById('t1');

        expect(result).toEqual({
            id: 't1',
            eventId: 'e1',
            userId: 'u1',
            organizerId: 'org1',
            type: 'GA',
            price: 50000,
            originalPrice: 60000,
            quantity: 2,
            unitPrice: 45000,
            appliedPromoCode: 'PROMO',
            seat: 'A1',
            qrCode: 'qr',
            status: 'paid',
            purchaseDate: 1000,
            groupId: 'g1',
            checkInCount: 1,
            lastCheckInAt: 2000,
            updatedAt: 3000,
        });
    });
});

describe('updateTicket', () => {
    it('is a no-op when updates is empty', async () => {
        await repo.updateTicket('t1', {});
        expect(mockQuery).not.toHaveBeenCalled();
    });

    it('maps FIELD_MAP keys to columns, merges raw_data and appends ticketId', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const purchaseDate = new Date(1700000000000);

        await repo.updateTicket('t1', { status: 'paid', purchaseDate, note: 'legacy-field' });

        expect(mockQuery).toHaveBeenCalledTimes(1);
        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toBe(
            'UPDATE tickets SET status = $1, purchase_date = $2, ' +
            "raw_data = COALESCE(raw_data, '{}'::jsonb) || $3::jsonb WHERE id = $4"
        );
        expect(params).toEqual([
            'paid',
            purchaseDate,
            JSON.stringify({ status: 'paid', purchaseDate, note: 'legacy-field' }),
            't1',
        ]);
    });

    it('skips the id key entirely', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.updateTicket('t1', { id: 't2', status: 'paid' });

        const params = mockQuery.mock.calls[0][1];
        expect(params).toEqual(['paid', JSON.stringify({ status: 'paid' }), 't1']);
    });

    it('stores unknown keys only in raw_data without inventing columns', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.updateTicket('t1', { legacyField: 'x' });

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).not.toContain('legacyField');
        expect(sql).toBe(
            'UPDATE tickets SET ' +
            "raw_data = COALESCE(raw_data, '{}'::jsonb) || $1::jsonb WHERE id = $2"
        );
        expect(params).toEqual([JSON.stringify({ legacyField: 'x' }), 't1']);
    });

    it('routes through the provided transaction client', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await repo.updateTicket('t1', { status: 'paid' }, tx);

        expect(tx.query).toHaveBeenCalledTimes(1);
        expect(mockQuery).not.toHaveBeenCalled();
        expect(tx.query.mock.calls[0][1]).toEqual([
            'paid',
            JSON.stringify({ status: 'paid' }),
            't1',
        ]);
    });
});

describe('getPaidTicketsByEventId', () => {
    it('queries paid tickets for the event and maps rows without the doc id', async () => {
        mockQuery.mockResolvedValue({
            rows: [
                { id: 't1', raw_data: { eventId: 'e1', status: 'paid' } },
                { id: 't2', raw_data: { eventId: 'e1', status: 'paid' } },
            ],
        });

        const result = await repo.getPaidTicketsByEventId('e1');

        expect(mockQuery).toHaveBeenCalledWith(
            'SELECT * FROM tickets WHERE event_id = $1 AND status = $2',
            ['e1', 'paid']
        );
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ eventId: 'e1', status: 'paid' });
        expect(result[0].id).toBeUndefined();
    });
});

describe('runTransaction', () => {
    it('delegates to the postgres transaction with the callback', async () => {
        const cb = jest.fn();
        mockTransaction.mockResolvedValue('tx-result');

        await expect(repo.runTransaction(cb)).resolves.toBe('tx-result');

        expect(mockTransaction).toHaveBeenCalledWith(cb);
    });
});

describe('getTicketsByUserId', () => {
    it('queries by user_id and maps rows with the doc id', async () => {
        mockQuery.mockResolvedValue({
            rows: [{ id: 't1', raw_data: { eventId: 'e1', userId: 'u1' } }],
        });

        const result = await repo.getTicketsByUserId('u1');

        expect(mockQuery).toHaveBeenCalledWith(
            'SELECT * FROM tickets WHERE user_id = $1',
            ['u1']
        );
        expect(result).toEqual([{ id: 't1', eventId: 'e1', userId: 'u1' }]);
    });
});

describe('getTicketInTransaction', () => {
    it('uses the transaction client when provided', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await expect(repo.getTicketInTransaction(tx, 't1')).resolves.toBeNull();

        expect(tx.query).toHaveBeenCalledWith('SELECT * FROM tickets WHERE id = $1', ['t1']);
        expect(mockQuery).not.toHaveBeenCalled();
    });

    it('falls back to the module query when transaction is omitted', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getTicketInTransaction(null, 't1')).resolves.toBeNull();

        expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM tickets WHERE id = $1', ['t1']);
    });
});

describe('createTicketInTransaction', () => {
    it('keeps the organizer id when it exists in auth_users', async () => {
        const tx = { query: jest.fn() };
        tx.query
            .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
            .mockResolvedValueOnce({ rows: [] });

        const purchaseDate = new Date(1700000000000);
        const ticketData = {
            eventId: 'e1',
            userId: 'u1',
            organizerId: 'org1',
            type: 'VIP',
            price: 100,
            originalPrice: 50,
            quantity: 2,
            unitPrice: 90,
            appliedPromoCode: 'PROMO',
            seat: 'A1',
            qrCode: 'qr',
            status: 'paid',
            purchaseDate,
            groupId: 'g1',
            checkInCount: 1,
        };

        await repo.createTicketInTransaction(tx, 't1', ticketData);

        expect(tx.query).toHaveBeenCalledTimes(2);
        expect(tx.query.mock.calls[0][0]).toContain('SELECT 1 FROM auth_users WHERE id = $1');
        expect(tx.query.mock.calls[0][1]).toEqual(['org1']);

        const [sql, params] = tx.query.mock.calls[1];
        expect(sql).toContain('INSERT INTO tickets');
        expect(sql).toContain('ON CONFLICT (id) DO UPDATE');
        expect(params).toEqual([
            't1', 'e1', 'u1', 'org1', 'VIP', 100, 50, 2, 90, 'PROMO',
            'A1', 'qr', 'paid', purchaseDate, 'g1', 1, null, null, expect.any(Date),
            JSON.stringify({ ...ticketData, organizerId: 'org1' }),
        ]);
    });

    it('nulls an organizer id not present in auth_users', async () => {
        const tx = { query: jest.fn() };
        tx.query
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] });

        await repo.createTicketInTransaction(tx, 't1', {
            eventId: 'e1', userId: 'u1', organizerId: 'ghost',
        });

        const params = tx.query.mock.calls[1][1];
        expect(params[3]).toBeNull();
        expect(params[19]).toBe(JSON.stringify({
            eventId: 'e1', userId: 'u1', organizerId: null,
        }));
    });

    it('skips the auth lookup for an empty organizer id', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await repo.createTicketInTransaction(tx, 't1', {
            eventId: 'e1', userId: 'u1', organizerId: '',
        });

        expect(tx.query).toHaveBeenCalledTimes(1);
        expect(tx.query.mock.calls[0][1][3]).toBeNull();
    });
});

describe('createTicket', () => {
    it('applies default status, price, quantity and timestamps without a transaction', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.createTicket('t1', { eventId: 'e1', userId: 'u1', type: 'GA' });

        expect(mockQuery).toHaveBeenCalledTimes(1);
        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('INSERT INTO tickets');
        expect(params[3]).toBeNull();
        expect(params[5]).toBe(0);
        expect(params[6]).toBe(0);
        expect(params[7]).toBe(1);
        expect(params[8]).toBe(0);
        expect(params[12]).toBe('pending');
        expect(params[13]).toEqual(expect.any(Date));
        expect(params[15]).toBe(0);
        expect(params[18]).toEqual(expect.any(Date));
        expect(params[19]).toBe(JSON.stringify({
            eventId: 'e1', userId: 'u1', type: 'GA', organizerId: null,
        }));
    });

    it('checks a ghost organizer id against auth_users before inserting', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] });

        await repo.createTicket('t1', {
            eventId: 'e1', userId: 'u1', organizerId: 'ghost', type: 'GA',
        });

        expect(mockQuery).toHaveBeenCalledTimes(2);
        expect(mockQuery.mock.calls[0][0]).toContain('SELECT 1 FROM auth_users');
        expect(mockQuery.mock.calls[1][0]).toContain('INSERT INTO tickets');
        expect(mockQuery.mock.calls[1][1][3]).toBeNull();
    });
});

describe('updateTicketInTransaction', () => {
    it('delegates to updateTicket using the transaction client', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await repo.updateTicketInTransaction(tx, 't1', { status: 'checkedIn' });

        expect(tx.query).toHaveBeenCalledTimes(1);
        expect(mockQuery).not.toHaveBeenCalled();
        expect(tx.query.mock.calls[0][1]).toEqual([
            'checkedIn',
            JSON.stringify({ status: 'checkedIn' }),
            't1',
        ]);
    });
});

describe('getAttendeeTicketsByEventId', () => {
    it('queries paid and checkedIn tickets for the event', async () => {
        mockQuery.mockResolvedValue({
            rows: [{ id: 't1', raw_data: { eventId: 'e1' } }],
        });

        const result = await repo.getAttendeeTicketsByEventId('e1');

        expect(mockQuery).toHaveBeenCalledWith(
            'SELECT * FROM tickets WHERE event_id = $1 AND status IN ($2, $3)',
            ['e1', 'paid', 'checkedIn']
        );
        expect(result).toEqual([{ eventId: 'e1' }]);
    });
});
