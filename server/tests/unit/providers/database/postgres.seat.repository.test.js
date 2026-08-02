'use strict';

const mockQuery = jest.fn();
const mockTransaction = jest.fn();

jest.mock('@/providers/database/postgres.client', () => ({
    query: mockQuery,
    transaction: mockTransaction,
}));

const repo = require('@/providers/database/postgres.seat.repository');

const runInTx = (callback) => {
    mockTransaction.mockImplementation(async (cb) => cb({ query: mockQuery }));
    return callback();
};

beforeEach(() => {
    jest.clearAllMocks();
});

const SEAT_ROW = {
    id: 's1', seat_section_id: 'ss1', row_name: 'A', seat_number: '1',
    status: 'available', created_at: new Date(1000),
};

const SEAT_MAPPED = {
    id: 's1', seatSectionId: 'ss1', rowName: 'A', seatNumber: '1',
    status: 'available', createdAt: 1000,
};

describe('createSeatMap', () => {
    it('upserts the seat map with a default timestamp', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.createSeatMap('m1', { name: 'Main', totalRows: 10, totalCols: 5 });

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('INSERT INTO seat_maps');
        expect(sql).toContain('ON CONFLICT (id)');
        expect(params).toEqual(['m1', 'Main', 10, 5, expect.any(Date)]);
    });

    it('uses the provided transaction client', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await repo.createSeatMap('m1', { name: 'Main', totalRows: 1, totalCols: 1 }, tx);

        expect(tx.query).toHaveBeenCalledTimes(1);
        expect(mockQuery).not.toHaveBeenCalled();
    });
});

describe('createSeatSections', () => {
    it('inserts each section, defaulting price_multiplier to 1.0', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.createSeatSections([
            { id: 'ss1', seatMapId: 'm1', name: 'VIP' },
            { id: 'ss2', seatMapId: 'm1', name: 'GA', priceMultiplier: 2.0 },
        ]);

        expect(mockQuery).toHaveBeenCalledTimes(2);
        expect(mockQuery.mock.calls[0][1]).toEqual(['ss1', 'm1', 'VIP', 1.0, expect.any(Date)]);
        expect(mockQuery.mock.calls[1][1]).toEqual(['ss2', 'm1', 'GA', 2.0, expect.any(Date)]);
    });
});

describe('createSeats', () => {
    it('inserts each seat with default status and generated code', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.createSeats([
            { id: 's1', seatSectionId: 'ss1', rowName: 'A', seatNumber: '1' },
            { id: 's2', seatSectionId: 'ss1', rowName: 'B', seatNumber: '2', status: 'blocked', code: 'B2' },
        ]);

        expect(mockQuery).toHaveBeenCalledTimes(2);
        expect(mockQuery.mock.calls[0][1]).toEqual([
            's1', 'ss1', 'A', '1', 'available', expect.any(Date), 'A1',
        ]);
        expect(mockQuery.mock.calls[1][1]).toEqual([
            's2', 'ss1', 'B', '2', 'blocked', expect.any(Date), 'B2',
        ]);
    });
});

describe('getSeatsBySection', () => {
    it('queries seats for the section and maps rows', async () => {
        mockQuery.mockResolvedValue({ rows: [SEAT_ROW] });

        await expect(repo.getSeatsBySection('ss1')).resolves.toEqual([SEAT_MAPPED]);

        expect(mockQuery).toHaveBeenCalledWith(
            'SELECT * FROM seats WHERE seat_section_id = $1 ORDER BY row_name, seat_number',
            ['ss1']
        );
    });

    it('returns an empty array when no seats exist', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getSeatsBySection('ss1')).resolves.toEqual([]);
    });
});

describe('getSeatMapById', () => {
    it('returns null when the map is missing', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getSeatMapById('m1')).resolves.toBeNull();
    });

    it('maps the seat map row', async () => {
        mockQuery.mockResolvedValue({
            rows: [{ id: 'm1', name: 'Main', total_rows: 10, total_cols: 5, created_at: new Date(1000) }],
        });

        await expect(repo.getSeatMapById('m1')).resolves.toEqual({
            id: 'm1', name: 'Main', totalRows: 10, totalCols: 5, createdAt: 1000,
        });
    });
});

describe('getSeatsByMapId', () => {
    it('joins sections and maps rows', async () => {
        mockQuery.mockResolvedValue({ rows: [SEAT_ROW] });

        await expect(repo.getSeatsByMapId('m1')).resolves.toEqual([SEAT_MAPPED]);

        expect(mockQuery.mock.calls[0][0]).toContain('JOIN seat_sections ss');
        expect(mockQuery.mock.calls[0][1]).toEqual(['m1']);
    });
});

describe('updateSeatStatus', () => {
    it('updates the seat status on the transaction client', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await repo.updateSeatStatus('s1', 'held', tx);

        expect(tx.query).toHaveBeenCalledWith(
            'UPDATE seats SET status = $1 WHERE id = $2',
            ['held', 's1']
        );
        expect(mockQuery).not.toHaveBeenCalled();
    });

    it('falls back to the module query without a transaction', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.updateSeatStatus('s1', 'held');

        expect(mockQuery).toHaveBeenCalledWith(
            'UPDATE seats SET status = $1 WHERE id = $2',
            ['held', 's1']
        );
    });
});

describe('getSeatById', () => {
    it('returns null when the seat is missing', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getSeatById('s1')).resolves.toBeNull();
    });

    it('maps the seat row', async () => {
        mockQuery.mockResolvedValue({ rows: [SEAT_ROW] });

        await expect(repo.getSeatById('s1')).resolves.toEqual(SEAT_MAPPED);
    });
});

describe('createSeatHold', () => {
    it('inserts the hold with defaults for timestamps and status', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.createSeatHold({
            id: 'h1', eventId: 'e1', seatId: 's1', userId: 'u1', heldAt: 1000,
        });

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('INSERT INTO seat_holds');
        expect(params).toEqual([
            'h1', 'e1', 's1', 'u1', new Date(1000000), null, 'held', expect.any(Date),
        ]);
    });
});

describe('getSeatHold', () => {
    it('returns null when the hold is missing', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getSeatHold('h1')).resolves.toBeNull();
    });

    it('maps the hold row', async () => {
        mockQuery.mockResolvedValue({
            rows: [{
                id: 'h1', event_id: 'e1', seat_id: 's1', user_id: 'u1',
                held_at: new Date(1000), expires_at: new Date(2000),
                status: 'held', created_at: new Date(3000),
            }],
        });

        await expect(repo.getSeatHold('h1')).resolves.toEqual({
            id: 'h1', eventId: 'e1', seatId: 's1', userId: 'u1',
            heldAt: 1000, expiresAt: 2000, status: 'held', createdAt: 3000,
        });
    });
});

describe('getActiveHoldForSeat', () => {
    it('returns null when no active hold exists', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getActiveHoldForSeat('e1', 's1')).resolves.toBeNull();

        expect(mockQuery.mock.calls[0][0]).toContain("status = 'held' AND expires_at > $3");
        expect(mockQuery.mock.calls[0][1]).toEqual(['e1', 's1', expect.any(Date)]);
    });

    it('maps the active hold row', async () => {
        mockQuery.mockResolvedValue({
            rows: [{
                id: 'h1', event_id: 'e1', seat_id: 's1', user_id: 'u1',
                held_at: new Date(1000), expires_at: new Date(2000),
                status: 'held', created_at: new Date(3000),
            }],
        });

        await expect(repo.getActiveHoldForSeat('e1', 's1')).resolves.toEqual({
            id: 'h1', eventId: 'e1', seatId: 's1', userId: 'u1',
            heldAt: 1000, expiresAt: 2000, status: 'held', createdAt: 3000,
        });
    });
});

describe('releaseSeatHold', () => {
    it('marks the hold released', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await repo.releaseSeatHold('h1', tx);

        expect(tx.query).toHaveBeenCalledWith(
            "UPDATE seat_holds SET status = 'released' WHERE id = $1",
            ['h1']
        );
        expect(mockQuery).not.toHaveBeenCalled();
    });
});

describe('releaseExpiredHolds', () => {
    it('releases expired holds and returns released ids', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'h1' }, { id: 'h2' }] });

        const result = await repo.releaseExpiredHolds(1000);

        expect(result).toEqual(['h1', 'h2']);
        expect(mockQuery.mock.calls[0][1]).toEqual([new Date(1000000)]);
    });
});

describe('convertHoldToSold', () => {
    it('marks the hold converted', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await repo.convertHoldToSold('h1', tx);

        expect(tx.query).toHaveBeenCalledWith(
            "UPDATE seat_holds SET status = 'converted' WHERE id = $1",
            ['h1']
        );
    });
});

describe('getSeatsWithStatuses', () => {
    it('returns an empty array when the event is missing', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getSeatsWithStatuses('e1')).resolves.toEqual([]);
        expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('returns an empty array when no seat map can be resolved', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ venue_id: null, raw_data: {} }] });

        await expect(repo.getSeatsWithStatuses('e1')).resolves.toEqual([]);
        expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('resolves the seat map from event raw_data and maps statuses', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ venue_id: 'v1', raw_data: { seatMapId: 'm1' } }] })
            .mockResolvedValueOnce({
                rows: [
                    { id: 's1', seat_section_id: 'ss1', row_name: 'A', seat_number: '1', structural_status: 'available', section_name: 'VIP', price_multiplier: '2' },
                    { id: 's2', seat_section_id: 'ss1', row_name: 'A', seat_number: '2', structural_status: 'available', section_name: 'VIP', price_multiplier: '2' },
                    { id: 's3', seat_section_id: 'ss1', row_name: 'A', seat_number: '3', structural_status: 'blocked', section_name: 'VIP', price_multiplier: '2' },
                    { id: 's4', seat_section_id: 'ss1', row_name: 'A', seat_number: '4', structural_status: 'available', section_name: 'VIP', price_multiplier: '2' },
                ],
            })
            .mockResolvedValueOnce({ rows: [{ seat_id: 's1' }] })
            .mockResolvedValueOnce({ rows: [{ seat: 's2' }] });

        const result = await repo.getSeatsWithStatuses('e1');

        expect(mockQuery).toHaveBeenCalledTimes(4);
        expect(mockQuery.mock.calls[1][1]).toEqual(['m1']);
        expect(result).toEqual([
            { id: 's1', seatSectionId: 'ss1', sectionName: 'VIP', priceMultiplier: 2, rowName: 'A', seatNumber: '1', status: 'held' },
            { id: 's2', seatSectionId: 'ss1', sectionName: 'VIP', priceMultiplier: 2, rowName: 'A', seatNumber: '2', status: 'sold' },
            { id: 's3', seatSectionId: 'ss1', sectionName: 'VIP', priceMultiplier: 2, rowName: 'A', seatNumber: '3', status: 'blocked' },
            { id: 's4', seatSectionId: 'ss1', sectionName: 'VIP', priceMultiplier: 2, rowName: 'A', seatNumber: '4', status: 'available' },
        ]);
    });

    it('falls back to the venue data when event raw_data lacks a seat map', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ venue_id: 'v1', raw_data: {} }] })
            .mockResolvedValueOnce({ rows: [{ data: { seat_map_id: 'm1' } }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] });

        await expect(repo.getSeatsWithStatuses('e1')).resolves.toEqual([]);

        expect(mockQuery.mock.calls[2][1]).toEqual(['m1']);
    });
});

describe('createPerformance', () => {
    it('inserts the performance with defaults and returns the returned row', async () => {
        mockQuery.mockResolvedValue({
            rows: [{ id: 'perf1', event_id: 'e1', status: 'SCHEDULED' }],
        });

        const result = await repo.createPerformance({
            id: 'perf1', eventId: 'e1', seatMapId: 'm1', startsAt: 1000,
        });

        expect(result).toEqual({ id: 'perf1', event_id: 'e1', status: 'SCHEDULED' });
        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('INSERT INTO performances');
        expect(params).toEqual([
            'perf1', 'e1', 'm1', new Date(1000000), null, 'SCHEDULED', false,
            expect.any(Date),
        ]);
    });
});

describe('materializePerformanceSeats', () => {
    it('maps the returned materialized seats', async () => {
        mockQuery.mockResolvedValue({
            rows: [{ id: 'pseat_1', seat_id: 's1', status: 'AVAILABLE' }],
        });

        const result = await repo.materializePerformanceSeats('perf1');

        expect(mockQuery.mock.calls[0][1]).toEqual(['perf1']);
        expect(mockQuery.mock.calls[0][0]).toContain('ON CONFLICT');
        expect(result).toEqual([{ id: 'pseat_1', seatId: 's1', status: 'AVAILABLE' }]);
    });
});

describe('getPerformanceSeatAvailability', () => {
    it('returns null when no performance matches', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getPerformanceSeatAvailability('e1')).resolves.toBeNull();
        expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('maps the performance and its seats', async () => {
        mockQuery
            .mockResolvedValueOnce({
                rows: [{
                    id: 'perf1', event_id: 'e1', seat_map_id: 'm1',
                    starts_at: new Date(1000), ends_at: new Date(2000),
                    status: 'SCHEDULED', is_default: true,
                }],
            })
            .mockResolvedValueOnce({
                rows: [
                    {
                        id: 'pseat_1', seat_id: 's1', status: 'HELD', hold_expires_at: new Date(3000),
                        price: null, ticket_type_id: 'tt1', code: 'A1', row_name: 'A',
                        seat_number: '1', x: null, y: null, metadata: {},
                        section_id: 'ss1', section_name: 'VIP', section_color: 'gold',
                        section_sort_order: 1, price_multiplier: '2',
                    },
                    {
                        id: 'pseat_2', seat_id: 's2', status: 'AVAILABLE', hold_expires_at: null,
                        price: '50000', ticket_type_id: null, code: 'A2', row_name: 'A',
                        seat_number: '2', x: '5', y: '6', metadata: null,
                        section_id: 'ss1', section_name: 'VIP', section_color: 'gold',
                        section_sort_order: 1, price_multiplier: '2',
                    },
                ],
            });

        const result = await repo.getPerformanceSeatAvailability('e1', 'perf1');

        expect(mockQuery.mock.calls[0][1]).toEqual(['e1', 'perf1']);
        expect(mockQuery.mock.calls[1][1]).toEqual(['perf1']);
        expect(result).toEqual({
            eventId: 'e1',
            performanceId: 'perf1',
            seatMapId: 'm1',
            startsAt: 1000,
            endsAt: 2000,
            performanceStatus: 'SCHEDULED',
            seats: [
                {
                    id: 'pseat_1', seatId: 's1', code: 'A1', rowName: 'A', seatNumber: '1',
                    sectionId: 'ss1', sectionName: 'VIP', sectionColor: 'gold',
                    sectionSortOrder: 1, priceMultiplier: 2, price: null, ticketTypeId: 'tt1',
                    x: null, y: null, metadata: {}, status: 'HELD',
                    holdExpiresAt: 3000,
                },
                {
                    id: 'pseat_2', seatId: 's2', code: 'A2', rowName: 'A', seatNumber: '2',
                    sectionId: 'ss1', sectionName: 'VIP', sectionColor: 'gold',
                    sectionSortOrder: 1, priceMultiplier: 2, price: 50000, ticketTypeId: null,
                    x: 5, y: 6, metadata: {}, status: 'AVAILABLE',
                    holdExpiresAt: null,
                },
            ],
        });
    });
});

describe('getPerformanceSeatLayout', () => {
    it('returns null when the layout is missing', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getPerformanceSeatLayout('e1', 'perf1')).resolves.toBeNull();
        expect(mockQuery.mock.calls[0][1]).toEqual(['e1', 'perf1']);
    });

    it('maps the layout row', async () => {
        mockQuery.mockResolvedValue({
            rows: [{
                id: 'perf1', event_id: 'e1', seat_map_id: 'm1',
                layout_schema: { rows: [] }, version: 2,
            }],
        });

        await expect(repo.getPerformanceSeatLayout('e1', 'perf1')).resolves.toEqual({
            eventId: 'e1', performanceId: 'perf1', seatMapId: 'm1',
            layout: { rows: [] }, version: 2,
        });
    });
});

describe('savePerformanceSeatLayout', () => {
    it('wraps in a transaction when none is provided', async () => {
        await runInTx(async () => {
            mockQuery
                .mockResolvedValueOnce({
                    rows: [{ id: 'perf1', event_id: 'e1', seat_map_id: 'm1' }],
                })
                .mockResolvedValueOnce({
                    rows: [{ layout_schema: { rows: [] }, version: 2 }],
                });

            const result = await repo.savePerformanceSeatLayout('e1', 'perf1', { rows: [] });

            expect(mockTransaction).toHaveBeenCalledTimes(1);
            expect(result).toEqual({
                eventId: 'e1', performanceId: 'perf1', seatMapId: 'm1',
                layout: { rows: [] }, version: 2,
            });
        });
    });

    it('returns null when the performance is missing', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await expect(
            repo.savePerformanceSeatLayout('e1', 'perf1', { rows: [] }, tx)
        ).resolves.toBeNull();

        expect(tx.query.mock.calls[0][0]).toContain('FOR UPDATE');
    });

    it('updates the seat map layout and bumps the version on the transaction client', async () => {
        const tx = { query: jest.fn() };
        tx.query
            .mockResolvedValueOnce({ rows: [{ id: 'perf1', event_id: 'e1', seat_map_id: 'm1' }] })
            .mockResolvedValueOnce({ rows: [{ layout_schema: { rows: [] }, version: 3 }] });

        const result = await repo.savePerformanceSeatLayout('e1', 'perf1', { rows: [] }, tx);

        expect(mockQuery).not.toHaveBeenCalled();
        expect(tx.query).toHaveBeenCalledTimes(2);
        expect(tx.query.mock.calls[1][1]).toEqual([JSON.stringify({ rows: [] }), 'm1']);
        expect(result.version).toBe(3);
    });
});

describe('holdPerformanceSeats', () => {
    it('wraps in a transaction when none is provided', async () => {
        await runInTx(async () => {
            mockQuery
                .mockResolvedValueOnce({
                    rows: [{ id: 'pseat_1', seat_id: 's1', status: 'AVAILABLE', hold_expires_at: null }],
                })
                .mockResolvedValueOnce({ rows: [{ id: 'pseat_1', seat_id: 's1', hold_expires_at: new Date(2000000) }] })
                .mockResolvedValueOnce({ rows: [] });

            const result = await repo.holdPerformanceSeats({
                eventId: 'e1', performanceId: 'perf1', userId: 'u1',
                holdToken: 'tok', seatIds: ['s1'], expiresAt: 2000,
            });

            expect(mockTransaction).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ held: true, seats: [{ id: 'pseat_1', seatId: 's1', expiresAt: 2000000 }] });
        });
    });

    it('rejects when some seats are missing from the lock set', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        const result = await repo.holdPerformanceSeats(
            { eventId: 'e1', performanceId: 'perf1', userId: 'u1', holdToken: 'tok', seatIds: ['s1', 's2'], expiresAt: 2000 },
            tx
        );

        expect(result).toEqual({ held: false, unavailableSeatIds: ['s1', 's2'] });
        expect(tx.query).toHaveBeenCalledTimes(1);
    });

    it('rejects seats that are HELD and not expired', async () => {
        const tx = { query: jest.fn().mockResolvedValue({
            rows: [
                { id: 'pseat_1', seat_id: 's1', status: 'HELD', hold_expires_at: new Date(Number.MAX_SAFE_INTEGER) },
                { id: 'pseat_2', seat_id: 's2', status: 'HELD', hold_expires_at: new Date(Number.MAX_SAFE_INTEGER) },
            ],
        }) };

        const result = await repo.holdPerformanceSeats(
            { eventId: 'e1', performanceId: 'perf1', userId: 'u1', holdToken: 'tok', seatIds: ['s1', 's2'], expiresAt: 2000 },
            tx
        );

        expect(result).toEqual({ held: false, unavailableSeatIds: ['s1', 's2'] });
    });

    it('holds seats, releases expired holds, and records seat_holds', async () => {
        const tx = { query: jest.fn() };
        tx.query
            .mockResolvedValueOnce({
                rows: [
                    { id: 'pseat_1', seat_id: 's1', status: 'HELD', hold_expires_at: new Date(100) },
                    { id: 'pseat_2', seat_id: 's2', status: 'AVAILABLE', hold_expires_at: null },
                ],
            })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ id: 'pseat_1', seat_id: 's1', hold_expires_at: new Date(2000000) }] })
            .mockResolvedValueOnce({ rows: [] });

        const result = await repo.holdPerformanceSeats(
            { eventId: 'e1', performanceId: 'perf1', userId: 'u1', holdToken: 'tok', seatIds: ['s2', 's1'], expiresAt: 2000 },
            tx
        );

        expect(result).toEqual({
            held: true,
            seats: [{ id: 'pseat_1', seatId: 's1', expiresAt: 2000000 }],
        });
        expect(tx.query).toHaveBeenCalledTimes(4);
        expect(tx.query.mock.calls[1][0]).toContain("SET status = 'expired'");
        expect(tx.query.mock.calls[2][0]).toContain("SET\n             status = 'HELD'");
        expect(tx.query.mock.calls[2][1]).toEqual([
            'u1', 'tok', new Date(2000000), 'perf1', ['s1', 's2'],
        ]);
        expect(tx.query.mock.calls[3][0]).toContain('INSERT INTO seat_holds');
    });
});

describe('releasePerformanceSeatHold', () => {
    it('wraps in a transaction when none is provided', async () => {
        await runInTx(async () => {
            mockQuery
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            const result = await repo.releasePerformanceSeatHold({
                eventId: 'e1', performanceId: 'perf1', userId: 'u1',
                holdToken: 'tok', seatIds: null,
            });

            expect(mockTransaction).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ released: true, seatIds: [] });
        });
    });

    it('returns released false when not all requested seats are held', async () => {
        const tx = { query: jest.fn().mockResolvedValue({
            rows: [{ id: 'pseat_1', seat_id: 's1' }],
        }) };

        const result = await repo.releasePerformanceSeatHold(
            { eventId: 'e1', performanceId: 'perf1', userId: 'u1', holdToken: 'tok', seatIds: ['s1', 's2'] },
            tx
        );

        expect(result).toEqual({ released: false, seatIds: [] });
    });

    it('returns released false when another token owns the holds', async () => {
        const tx = { query: jest.fn() };
        tx.query
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

        const result = await repo.releasePerformanceSeatHold(
            { eventId: 'e1', performanceId: 'perf1', userId: 'u1', holdToken: 'tok', seatIds: null },
            tx
        );

        expect(result).toEqual({ released: false, seatIds: [] });
    });

    it('returns released true with no seats when nothing is held', async () => {
        const tx = { query: jest.fn() };
        tx.query
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] });

        const result = await repo.releasePerformanceSeatHold(
            { eventId: 'e1', performanceId: 'perf1', userId: 'u1', holdToken: 'tok', seatIds: null },
            tx
        );

        expect(result).toEqual({ released: true, seatIds: [] });
    });

    it('releases the held seats and their seat_holds', async () => {
        const tx = { query: jest.fn() };
        tx.query
            .mockResolvedValueOnce({
                rows: [{ id: 'pseat_1', seat_id: 's1' }, { id: 'pseat_2', seat_id: 's2' }],
            })
            .mockResolvedValueOnce({ rows: [{ seat_id: 's1' }, { seat_id: 's2' }] })
            .mockResolvedValueOnce({ rows: [] });

        const result = await repo.releasePerformanceSeatHold(
            { eventId: 'e1', performanceId: 'perf1', userId: 'u1', holdToken: 'tok', seatIds: ['s2', 's1'] },
            tx
        );

        expect(result).toEqual({ released: true, seatIds: ['s1', 's2'] });
        expect(tx.query.mock.calls[1][0]).toContain("status = 'AVAILABLE'");
        expect(tx.query.mock.calls[1][1]).toEqual([['pseat_1', 'pseat_2']]);
        expect(tx.query.mock.calls[2][1]).toEqual([['pseat_1', 'pseat_2'], 'u1', 'tok']);
    });
});

describe('convertPerformanceSeatHoldToSold', () => {
    it('wraps in a transaction when none is provided', async () => {
        await runInTx(async () => {
            mockQuery
                .mockResolvedValueOnce({
                    rows: [{ id: 'pseat_1', seat_id: 's1' }],
                })
                .mockResolvedValueOnce({ rows: [{ seat_id: 's1' }] })
                .mockResolvedValueOnce({ rows: [] });

            const result = await repo.convertPerformanceSeatHoldToSold({
                eventId: 'e1', performanceId: 'perf1', userId: 'u1',
                holdToken: 'tok', seatIds: ['s1'],
            });

            expect(mockTransaction).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ converted: true, seatIds: ['s1'] });
        });
    });

    it('returns converted false when not all seats are held', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        const result = await repo.convertPerformanceSeatHoldToSold(
            { eventId: 'e1', performanceId: 'perf1', userId: 'u1', holdToken: 'tok', seatIds: ['s1', 's2'] },
            tx
        );

        expect(result).toEqual({ converted: false, seatIds: [] });
    });

    it('converts the held seats to sold and marks seat_holds converted', async () => {
        const tx = { query: jest.fn() };
        tx.query
            .mockResolvedValueOnce({ rows: [{ id: 'pseat_1', seat_id: 's1' }] })
            .mockResolvedValueOnce({ rows: [{ seat_id: 's1' }] })
            .mockResolvedValueOnce({ rows: [] });

        const result = await repo.convertPerformanceSeatHoldToSold(
            { eventId: 'e1', performanceId: 'perf1', userId: 'u1', holdToken: 'tok', seatIds: ['s1'] },
            tx
        );

        expect(result).toEqual({ converted: true, seatIds: ['s1'] });
        expect(tx.query.mock.calls[1][0]).toContain("status = 'SOLD'");
        expect(tx.query.mock.calls[2][1]).toEqual([['pseat_1'], 'u1', 'tok']);
    });
});

describe('releaseExpiredPerformanceSeatHolds', () => {
    it('runs inside a transaction and maps the released rows', async () => {
        await runInTx(async () => {
            mockQuery.mockResolvedValue({
                rows: [
                    { id: 'pseat_1', performance_id: 'perf1', seat_id: 's1', event_id: 'e1' },
                ],
            });

            const result = await repo.releaseExpiredPerformanceSeatHolds(50);

            expect(mockTransaction).toHaveBeenCalledTimes(1);
            expect(mockQuery.mock.calls[0][1]).toEqual([50]);
            expect(result).toEqual([
                { id: 'pseat_1', eventId: 'e1', performanceId: 'perf1', seatId: 's1' },
            ]);
        });
    });
});
