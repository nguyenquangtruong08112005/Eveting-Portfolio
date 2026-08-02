'use strict';

const mockQuery = jest.fn();

jest.mock('@/providers/database/postgres.client', () => ({
    query: mockQuery,
}));

const repo = require('@/providers/database/postgres.analytics.repository');

beforeEach(() => {
    jest.clearAllMocks();
});

describe('getAnalyticsByEventId', () => {
    it('returns null when no analytics row exists', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getAnalyticsByEventId('e1')).resolves.toBeNull();

        expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM analytics WHERE id = $1', ['e1']);
    });

    it('passes through a hydrated raw_data object', async () => {
        const raw = { totalRevenue: 500, ticketsSold: { VIP: 2 } };
        mockQuery.mockResolvedValue({ rows: [{ id: 'e1', raw_data: raw }] });

        const result = await repo.getAnalyticsByEventId('e1');

        expect(result).toEqual(raw);
    });

    it('parses raw_data when it is stored as a JSON string', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'e1', raw_data: JSON.stringify({ views: 10 }) }] });

        await expect(repo.getAnalyticsByEventId('e1')).resolves.toEqual({ views: 10 });
    });

    it('builds an analytics object from columns when raw_data is empty', async () => {
        mockQuery.mockResolvedValue({
            rows: [{
                id: 'e1',
                event_id: 'e1',
                raw_data: {},
                total_revenue: '500',
                tickets_sold: '{"VIP":2}',
                daily_sales: { '2026-01-01': 2 },
                check_ins: '7',
                views: '9',
                views_over_time: '{"2026-01-01":3}',
                last_updated_at: new Date(1700000000000),
            }],
        });

        const result = await repo.getAnalyticsByEventId('e1');

        expect(result).toEqual({
            eventId: 'e1',
            totalRevenue: 500,
            ticketsSold: { VIP: 2 },
            dailySales: { '2026-01-01': 2 },
            checkIns: 7,
            views: 9,
            viewsOverTime: { '2026-01-01': 3 },
            lastUpdatedAt: 1700000000000,
        });
    });

    it('defaults maps and falls back to id when event_id is absent', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'eX', total_revenue: '0' }] });

        const result = await repo.getAnalyticsByEventId('eX');

        expect(result).toEqual({
            eventId: 'eX',
            totalRevenue: 0,
            ticketsSold: {},
            dailySales: {},
            viewsOverTime: {},
        });
    });

    it('propagates query failures', async () => {
        mockQuery.mockRejectedValue(new Error('db down'));

        await expect(repo.getAnalyticsByEventId('e1')).rejects.toThrow('db down');
    });
});

describe('updateAnalyticsForConfirmPaymentInTransaction', () => {
    it('issues an upsert with ordered parameters on the provided transaction', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await repo.updateAnalyticsForConfirmPaymentInTransaction(tx, 'e1', {
            price: 500,
            ticketType: 'VIP',
            quantity: 2,
            dailyTimestamp: '2026-01-01',
        });

        expect(tx.query).toHaveBeenCalledTimes(1);
        expect(mockQuery).not.toHaveBeenCalled();

        const [sql, params] = tx.query.mock.calls[0];
        expect(sql).toContain('INSERT INTO analytics');
        expect(sql).toContain('ON CONFLICT (id) DO UPDATE');
        expect(sql).toContain(
            'jsonb_build_object($7::text, COALESCE((analytics.tickets_sold->>$7)::int, 0) + $8::int)'
        );
        expect(params[0]).toBe('e1');
        expect(params[1]).toBe(500);
        expect(params[2]).toBe(JSON.stringify({ VIP: 2 }));
        expect(params[3]).toBe(JSON.stringify({ '2026-01-01': 2 }));
        expect(params[4]).toEqual(expect.any(Date));
        expect(params[5]).toBe(JSON.stringify({
            eventId: 'e1',
            totalRevenue: 500,
            ticketsSold: { VIP: 2 },
            dailySales: { '2026-01-01': 2 },
            lastUpdatedAt: params[9],
        }));
        expect(params[6]).toBe('VIP');
        expect(params[7]).toBe(2);
        expect(params[8]).toBe('2026-01-01');
        expect(params[9]).toEqual(expect.any(Number));
    });

    it('falls back to the module query and defaults quantity and price', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.updateAnalyticsForConfirmPaymentInTransaction(null, 'e1', {
            ticketType: 'VIP',
            dailyTimestamp: '2026-01-01',
        });

        const params = mockQuery.mock.calls[0][1];
        expect(params[1]).toBe(0);
        expect(params[2]).toBe(JSON.stringify({ VIP: 1 }));
        expect(params[3]).toBe(JSON.stringify({ '2026-01-01': 1 }));
        expect(params[5]).toBe(JSON.stringify({
            eventId: 'e1',
            totalRevenue: 0,
            ticketsSold: { VIP: 1 },
            dailySales: { '2026-01-01': 1 },
            lastUpdatedAt: params[9],
        }));
        expect(params[7]).toBe(1);
    });

    it('propagates query failures from the transaction', async () => {
        const tx = { query: jest.fn().mockRejectedValue(new Error('tx failed')) };

        await expect(
            repo.updateAnalyticsForConfirmPaymentInTransaction(tx, 'e1', {
                ticketType: 'VIP',
                dailyTimestamp: '2026-01-01',
            })
        ).rejects.toThrow('tx failed');
    });
});

describe('incrementCheckInInTransaction', () => {
    it('upserts a check-in with ordered parameters on the transaction client', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await repo.incrementCheckInInTransaction(tx, 'e1');

        expect(tx.query).toHaveBeenCalledTimes(1);
        expect(mockQuery).not.toHaveBeenCalled();

        const [sql, params] = tx.query.mock.calls[0];
        expect(sql).toContain('INSERT INTO analytics');
        expect(sql).toContain('check_ins = COALESCE(analytics.check_ins, 0) + 1');
        expect(sql).toContain("'lastUpdatedAt', $4::bigint");
        expect(params[0]).toBe('e1');
        expect(params[1]).toEqual(expect.any(Date));
        expect(params[2]).toBe(JSON.stringify({ eventId: 'e1', checkIns: 1, lastUpdatedAt: params[3] }));
        expect(params[3]).toEqual(expect.any(Number));
    });

    it('falls back to the module query without a transaction', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.incrementCheckInInTransaction(null, 'e1');

        expect(mockQuery).toHaveBeenCalledTimes(1);
        const params = mockQuery.mock.calls[0][1];
        expect(params[0]).toBe('e1');
        expect(params[2]).toBe(JSON.stringify({ eventId: 'e1', checkIns: 1, lastUpdatedAt: params[3] }));
    });

    it('propagates query failures', async () => {
        mockQuery.mockRejectedValue(new Error('db down'));

        await expect(repo.incrementCheckInInTransaction(null, 'e1')).rejects.toThrow('db down');
    });
});

describe('getAnalyticsByEventIds', () => {
    it('returns an empty list without querying when no ids are given', async () => {
        await expect(repo.getAnalyticsByEventIds([])).resolves.toEqual([]);
        await expect(repo.getAnalyticsByEventIds(null)).resolves.toEqual([]);
        expect(mockQuery).not.toHaveBeenCalled();
    });

    it('maps each analytics row', async () => {
        mockQuery.mockResolvedValue({
            rows: [
                { id: 'a1', raw_data: { totalRevenue: 100 } },
                { id: 'a2', total_revenue: '200' },
            ],
        });

        const result = await repo.getAnalyticsByEventIds(['a1', 'a2']);

        expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM analytics WHERE id = ANY($1)', [['a1', 'a2']]);
        expect(result).toEqual([
            { totalRevenue: 100 },
            { eventId: 'a2', totalRevenue: 200, ticketsSold: {}, dailySales: {}, viewsOverTime: {} },
        ]);
    });

    it('propagates query failures', async () => {
        mockQuery.mockRejectedValue(new Error('db down'));

        await expect(repo.getAnalyticsByEventIds(['a1'])).rejects.toThrow('db down');
    });
});

describe('createAnalytics', () => {
    it('inserts an upsert with ordered parameters', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const data = {
            eventId: 'e2',
            totalRevenue: 100,
            ticketsSold: { VIP: 1 },
            dailySales: { '2026-01-01': 1 },
            checkIns: 3,
            views: 4,
            viewsOverTime: { '2026-01-01': 2 },
            lastUpdatedAt: 1700000000000,
        };

        await repo.createAnalytics('e1', data);

        expect(mockQuery).toHaveBeenCalledTimes(1);
        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('INSERT INTO analytics');
        expect(sql).toContain('ON CONFLICT (id) DO UPDATE');
        expect(params[0]).toBe('e1');
        expect(params[1]).toBe('e2');
        expect(params[2]).toBe(100);
        expect(params[3]).toBe(JSON.stringify({ VIP: 1 }));
        expect(params[4]).toBe(JSON.stringify({ '2026-01-01': 1 }));
        expect(params[5]).toBe(3);
        expect(params[6]).toBe(4);
        expect(params[7]).toBe(JSON.stringify({ '2026-01-01': 2 }));
        expect(params[8]).toEqual(new Date(1700000000000));
        expect(params[9]).toBe(JSON.stringify(data));
    });

    it('defaults missing fields to empty maps and nowDb', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.createAnalytics('e1', {});

        const params = mockQuery.mock.calls[0][1];
        expect(params[1]).toBe('e1');
        expect(params[2]).toBe(0);
        expect(params[3]).toBe('{}');
        expect(params[4]).toBe('{}');
        expect(params[5]).toBe(0);
        expect(params[6]).toBe(0);
        expect(params[7]).toBe('{}');
        expect(params[8]).toEqual(expect.any(Date));
        expect(params[9]).toBe('{}');
    });

    it('propagates query failures', async () => {
        mockQuery.mockRejectedValue(new Error('db down'));

        await expect(repo.createAnalytics('e1', {})).rejects.toThrow('db down');
    });
});
