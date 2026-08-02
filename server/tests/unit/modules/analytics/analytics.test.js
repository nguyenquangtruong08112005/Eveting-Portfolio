'use strict';

const mockQuery = jest.fn();
const mockRandomUUID = jest.fn();

jest.mock('@/providers/database/postgres.client', () => ({ query: mockQuery }));
jest.mock('crypto', () => ({ randomUUID: mockRandomUUID }));
jest.mock('@/providers/database/analytics.repository', () => ({
    getAnalyticsByEventId: jest.fn(),
}));
jest.mock('@/modules/analytics/infrastructure/organizer-dashboard.repository', () => {
    const actual = jest.requireActual(
        '@/modules/analytics/infrastructure/organizer-dashboard.repository'
    );
    return actual;
});

const { NotFoundError } = require('@/shared/errors');
const analyticsRepository = require('@/providers/database/analytics.repository');
const service = require('@/modules/analytics/application/service');

const EVENT_ID = 'evt_001';

beforeEach(() => {
    jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Application service
// ---------------------------------------------------------------------------
describe('service.getAnalyticsByEventId', () => {
    it('forwards eventId and returns result from analyticsRepository', async () => {
        const data = { eventId: EVENT_ID, totalRevenue: 100 };
        analyticsRepository.getAnalyticsByEventId.mockResolvedValue(data);
        await expect(service.getAnalyticsByEventId(EVENT_ID)).resolves.toBe(data);
        expect(analyticsRepository.getAnalyticsByEventId).toHaveBeenCalledWith(EVENT_ID);
    });
});

describe('service.recordTraffic', () => {
    const visitorKey = 'vk_abc';
    const source = 'direct';

    it('trims rawData.path to 500 chars and rawData.referrer to 1000', async () => {
        mockRandomUUID.mockReturnValue('uuid123');
        const longPath = 'x'.repeat(600);
        const longRef = 'y'.repeat(1200);
        mockQuery.mockResolvedValue({ rows: [{ id: 't1' }] });

        await service.recordTraffic(EVENT_ID, visitorKey, source, {
            path: longPath,
            referrer: longRef,
        });

        expect(mockQuery).toHaveBeenCalledWith(
            expect.any(String),
            [
                'etl_uuid123',
                EVENT_ID,
                visitorKey,
                source,
                JSON.stringify({ path: longPath.slice(0, 500), referrer: longRef.slice(0, 1000) }),
            ]
        );
    });

    it('omits missing rawData.path and rawData.referrer as undefined', async () => {
        mockRandomUUID.mockReturnValue('uuid456');
        mockQuery.mockResolvedValue({ rows: [{ id: 't2' }] });

        await service.recordTraffic(EVENT_ID, visitorKey, source, {});

        expect(mockQuery).toHaveBeenCalledWith(
            expect.any(String),
            [
                'etl_uuid456',
                EVENT_ID,
                visitorKey,
                source,
                JSON.stringify({}),
            ]
        );
    });

    it('throws NotFoundError when the insert returns no row (event missing)', async () => {
        mockRandomUUID.mockReturnValue('uuid789');
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(
            service.recordTraffic(EVENT_ID, visitorKey, source, {})
        ).rejects.toThrow(NotFoundError);
    });

    it('returns the created traffic row on success', async () => {
        mockRandomUUID.mockReturnValue('uuid012');
        const row = { id: 'etl_uuid012', eventId: EVENT_ID, source, occurredAt: new Date() };
        mockQuery.mockResolvedValue({ rows: [row] });

        const result = await service.recordTraffic(EVENT_ID, visitorKey, source, {});

        expect(result).toEqual(row);
    });
});

describe('service.getRevenueDashboard', () => {
    it('forwards eventId to repository', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ total_revenue: '500', tickets_sold: 10, paid_orders: 3 }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] });

        await service.getRevenueDashboard(EVENT_ID);

        expect(mockQuery).toHaveBeenCalled();
    });
});

describe('service.getTrafficDashboard', () => {
    it('forwards eventId to repository', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ clicks: 0, unique_visitors: 0 }] })
            .mockResolvedValueOnce({ rows: [{ buyers: 0 }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] });

        await service.getTrafficDashboard(EVENT_ID);

        expect(mockQuery).toHaveBeenCalled();
    });
});

describe('service.getCheckInDashboard', () => {
    const baseAccess = { role: 'CHECK_IN_STAFF', scopes: [] };

    it('passes null allowedTicketTypes for non-staff', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await service.getCheckInDashboard(EVENT_ID, { role: 'user' });

        expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [EVENT_ID]);
    });

    it('passes null allowedTicketTypes for staff with event-wide scope', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const access = {
            role: 'CHECK_IN_STAFF',
            scopes: [{ eventId: EVENT_ID, ticketTypeId: null }],
        };

        await service.getCheckInDashboard(EVENT_ID, access);

        expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [EVENT_ID]);
    });

    it('passes allowedTicketTypes array for staff without event-wide scope', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const access = {
            role: 'CHECK_IN_STAFF',
            scopes: [
                { eventId: EVENT_ID, ticketTypeId: 'tt_1' },
                { eventId: EVENT_ID, ticketTypeId: 'tt_2' },
            ],
        };

        await service.getCheckInDashboard(EVENT_ID, access);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.any(String),
            [EVENT_ID, ['tt_1', 'tt_2']]
        );
    });

    it('ignores scopes for other events', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const access = {
            role: 'CHECK_IN_STAFF',
            scopes: [
                { eventId: 'evt_other', ticketTypeId: 'tt_x' },
                { eventId: EVENT_ID, ticketTypeId: 'tt_1' },
            ],
        };

        await service.getCheckInDashboard(EVENT_ID, access);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.any(String),
            [EVENT_ID, ['tt_1']]
        );
    });

    it('passes null allowedTicketTypes when filtered scopes are empty', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const access = {
            role: 'CHECK_IN_STAFF',
            scopes: [{ eventId: 'evt_other', ticketTypeId: 'tt_x' }],
        };

        await service.getCheckInDashboard(EVENT_ID, access);

        expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [EVENT_ID]);
    });

    it('passes null allowedTicketTypes when no access object provided', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await service.getCheckInDashboard(EVENT_ID);

        expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [EVENT_ID]);
    });
});

// ---------------------------------------------------------------------------
// Organizer dashboard repository
// ---------------------------------------------------------------------------
describe('repository.recordTraffic', () => {
    const repo = require('@/modules/analytics/infrastructure/organizer-dashboard.repository');
    const visitorKey = 'vk_1';
    const source = 'social';
    const rawData = { path: '/test' };

    it('returns the created row', async () => {
        mockRandomUUID.mockReturnValue('etl_abc');
        const row = { id: 'etl_abc', eventId: EVENT_ID, source, occurredAt: new Date() };
        mockQuery.mockResolvedValue({ rows: [row] });

        const result = await repo.recordTraffic(EVENT_ID, visitorKey, source, rawData);

        expect(result).toEqual(row);
    });

    it('returns null when event does not exist', async () => {
        mockRandomUUID.mockReturnValue('etl_def');
        mockQuery.mockResolvedValue({ rows: [] });

        const result = await repo.recordTraffic(EVENT_ID, visitorKey, source, rawData);

        expect(result).toBeNull();
    });

    it('serialises rawData as JSON string in the query', async () => {
        mockRandomUUID.mockReturnValue('etl_ghi');
        mockQuery.mockResolvedValue({ rows: [{ id: 'etl_ghi' }] });

        await repo.recordTraffic(EVENT_ID, visitorKey, source, rawData);

        const callArgs = mockQuery.mock.calls[0][1];
        expect(callArgs[4]).toBe(JSON.stringify(rawData));
    });
});

describe('repository.getRevenueDashboard', () => {
    const repo = require('@/modules/analytics/infrastructure/organizer-dashboard.repository');

    it('maps numeric fields and includes salesTimeline and ticketTypes', async () => {
        mockQuery
            .mockResolvedValueOnce({
                rows: [{ total_revenue: '250.50', tickets_sold: 5, paid_orders: 2 }],
            })
            .mockResolvedValueOnce({
                rows: [
                    { bucket: '2025-01-01', revenue: '100', orders: 1 },
                    { bucket: '2025-01-02', revenue: '150.5', orders: 1 },
                ],
            })
            .mockResolvedValueOnce({ rows: [] });

        const result = await repo.getRevenueDashboard(EVENT_ID);

        expect(result.eventId).toBe(EVENT_ID);
        expect(result.totalRevenue).toBe(250.5);
        expect(result.ticketsSold).toBe(5);
        expect(result.paidOrders).toBe(2);
        expect(result.salesTimeline).toHaveLength(2);
        expect(result.salesTimeline[0]).toEqual({
            timestamp: '2025-01-01',
            revenue: 100,
            orders: 1,
        });
        expect(result.salesTimeline[1]).toEqual({
            timestamp: '2025-01-02',
            revenue: 150.5,
            orders: 1,
        });
        expect(result.ticketTypes).toEqual([]);
    });

    it('computes sellRate as percentage when capacity > 0 and 0 when capacity is 0', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ total_revenue: '0', tickets_sold: 0, paid_orders: 0 }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({
                rows: [
                    {
                        ticketTypeId: 'tt_1', code: 'VIP', name: 'VIP', price: '100',
                        capacity: '10', available: '2', sold: 3, locked: 5,
                    },
                    {
                        ticketTypeId: 'tt_2', code: 'FREE', name: 'Free', price: '0',
                        capacity: '0', available: '0', sold: 0, locked: 0,
                    },
                ],
            });

        const result = await repo.getRevenueDashboard(EVENT_ID);

        expect(result.ticketTypes[0].sellRate).toBe(30);
        expect(result.ticketTypes[1].sellRate).toBe(0);
        expect(result.ticketTypes[0].capacity).toBe(10);
        expect(result.ticketTypes[1].capacity).toBe(0);
    });

    it('uses correct parameterised SQL with eventId', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ total_revenue: '0', tickets_sold: 0, paid_orders: 0 }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] });

        await repo.getRevenueDashboard(EVENT_ID);

        expect(mockQuery).toHaveBeenCalledTimes(3);
        mockQuery.mock.calls.forEach(([sql, params]) => {
            expect(sql).toContain('$1');
            expect(params).toEqual([EVENT_ID]);
        });
    });
});

describe('repository.getTrafficDashboard', () => {
    const repo = require('@/modules/analytics/infrastructure/organizer-dashboard.repository');

    it('maps overview, buyers, timeline and sources', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ clicks: 100, unique_visitors: 30 }] })
            .mockResolvedValueOnce({ rows: [{ buyers: 5 }] })
            .mockResolvedValueOnce({
                rows: [
                    { bucket: '2025-01-01', clicks: 60, unique_visitors: 20 },
                    { bucket: '2025-01-02', clicks: 40, unique_visitors: 15 },
                ],
            })
            .mockResolvedValueOnce({
                rows: [
                    { source: 'direct', clicks: 70 },
                    { source: 'social', clicks: 30 },
                ],
            });

        const result = await repo.getTrafficDashboard(EVENT_ID);

        expect(result.eventId).toBe(EVENT_ID);
        expect(result.clicks).toBe(100);
        expect(result.uniqueVisitors).toBe(30);
        expect(result.buyers).toBe(5);
        expect(result.accessTimeline).toHaveLength(2);
        expect(result.accessTimeline[0]).toEqual({
            timestamp: '2025-01-01',
            clicks: 60,
            uniqueVisitors: 20,
        });
        expect(result.sources).toEqual([
            { source: 'direct', clicks: 70 },
            { source: 'social', clicks: 30 },
        ]);
    });

    it('returns conversionRate 0 when no unique visitors', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ clicks: 0, unique_visitors: 0 }] })
            .mockResolvedValueOnce({ rows: [{ buyers: 0 }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] });

        const result = await repo.getTrafficDashboard(EVENT_ID);

        expect(result.conversionRate).toBe(0);
    });

    it('computes conversionRate when visitors exist', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ clicks: 200, unique_visitors: 50 }] })
            .mockResolvedValueOnce({ rows: [{ buyers: 10 }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] });

        const result = await repo.getTrafficDashboard(EVENT_ID);

        expect(result.conversionRate).toBe(20);
    });

    it('uses parameterised SQL with eventId', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ clicks: 0, unique_visitors: 0 }] })
            .mockResolvedValueOnce({ rows: [{ buyers: 0 }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] });

        await repo.getTrafficDashboard(EVENT_ID);

        expect(mockQuery).toHaveBeenCalledTimes(4);
        mockQuery.mock.calls.forEach(([sql, params]) => {
            expect(sql).toContain('$1');
            expect(params).toEqual([EVENT_ID]);
        });
    });
});

describe('repository.getCheckInDashboard', () => {
    const repo = require('@/modules/analytics/infrastructure/organizer-dashboard.repository');

    it('returns dashboard with ticket types, rates and totals without filter', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    ticketTypeId: 'tt_1', ticketTypeName: 'VIP',
                    sold: 10, entries: 7, exits: 2,
                },
                {
                    ticketTypeId: 'tt_2', ticketTypeName: 'GA',
                    sold: 20, entries: 15, exits: 5,
                },
            ],
        });

        const result = await repo.getCheckInDashboard(EVENT_ID);

        expect(result.eventId).toBe(EVENT_ID);
        expect(result.sold).toBe(30);
        expect(result.joined).toBe(22);
        expect(result.exited).toBe(7);
        expect(result.currentlyInside).toBe(15);
        expect(result.ticketTypes).toHaveLength(2);

        expect(result.ticketTypes[0]).toEqual({
            ticketTypeId: 'tt_1',
            ticketTypeName: 'VIP',
            sold: 10,
            entries: 7,
            exits: 2,
            currentlyInside: 5,
            checkInRate: 70,
        });
        expect(result.ticketTypes[1].currentlyInside).toBe(10);
        expect(result.ticketTypes[1].checkInRate).toBe(75);
    });

    it('returns zero checkInRate when sold is 0', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    ticketTypeId: 'tt_1', ticketTypeName: 'Empty',
                    sold: 0, entries: 0, exits: 0,
                },
            ],
        });

        const result = await repo.getCheckInDashboard(EVENT_ID);

        expect(result.ticketTypes[0].checkInRate).toBe(0);
        expect(result.ticketTypes[0].currentlyInside).toBe(0);
        expect(result.sold).toBe(0);
    });

    it('applies allowedTicketTypes filter and adds $2 parameter', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await repo.getCheckInDashboard(EVENT_ID, ['tt_a', 'tt_b']);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('ANY($2::text[])'),
            [EVENT_ID, ['tt_a', 'tt_b']]
        );
    });

    it('does not add filter when allowedTicketTypes is null', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await repo.getCheckInDashboard(EVENT_ID, null);

        const sql = mockQuery.mock.calls[0][0];
        const params = mockQuery.mock.calls[0][1];
        expect(sql).not.toContain('ANY($2');
        expect(params).toEqual([EVENT_ID]);
    });

    it('does not add filter when allowedTicketTypes is empty array', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await repo.getCheckInDashboard(EVENT_ID, []);

        const sql = mockQuery.mock.calls[0][0];
        const params = mockQuery.mock.calls[0][1];
        expect(sql).not.toContain('ANY($2');
        expect(params).toEqual([EVENT_ID]);
    });

    it('computes currentlyInside with Math.max(0, entries - exits)', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    ticketTypeId: 'tt_1', ticketTypeName: 'Normal',
                    sold: 5, entries: 1, exits: 3,
                },
            ],
        });

        const result = await repo.getCheckInDashboard(EVENT_ID);

        expect(result.ticketTypes[0].currentlyInside).toBe(0);
    });

    it('uses parameterised SQL with eventId', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await repo.getCheckInDashboard(EVENT_ID);

        expect(mockQuery).toHaveBeenCalledTimes(1);
        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('$1');
        expect(params).toEqual([EVENT_ID]);
    });
});
