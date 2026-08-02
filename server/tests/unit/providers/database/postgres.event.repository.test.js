'use strict';

const mockQuery = jest.fn();

jest.mock('@/providers/database/postgres.client', () => ({
    query: mockQuery,
}));

jest.mock('@/providers/database/ticket-types.helper', () => ({
    loadTicketTypesForEvents: jest.fn(),
    replaceTicketTypes: jest.fn(),
    minPriceFromMap: jest.fn(),
    setAvailable: jest.fn(),
    incrementAvailable: jest.fn(),
}));

jest.mock('@/providers/database/social.helper', () => ({
    loadFeaturedProfileIdsForEvents: jest.fn(),
    replaceFeaturedProfiles: jest.fn(),
}));

jest.mock('@/providers/database/event-builder.helper', () => ({
    loadCustomQuestionsForEvents: jest.fn(),
    listVietnamLocations: jest.fn(),
    hasTicketSalesStarted: jest.fn(),
    loadCustomQuestions: jest.fn(),
    replaceCustomQuestions: jest.fn(),
    getBuyerOrder: jest.fn(),
    replaceOrderAttendees: jest.fn(),
}));

const repo = require('@/providers/database/postgres.event.repository');

const {
    loadTicketTypesForEvents,
    replaceTicketTypes,
    minPriceFromMap,
    setAvailable,
    incrementAvailable,
} = require('@/providers/database/ticket-types.helper');
const {
    loadFeaturedProfileIdsForEvents,
    replaceFeaturedProfiles,
} = require('@/providers/database/social.helper');
const {
    loadCustomQuestionsForEvents,
    listVietnamLocations,
    hasTicketSalesStarted,
    loadCustomQuestions,
    replaceCustomQuestions,
    getBuyerOrder,
    replaceOrderAttendees,
} = require('@/providers/database/event-builder.helper');

beforeEach(() => {
    jest.clearAllMocks();
    loadTicketTypesForEvents.mockResolvedValue({});
    loadFeaturedProfileIdsForEvents.mockResolvedValue({});
    loadCustomQuestionsForEvents.mockResolvedValue({});
    minPriceFromMap.mockReturnValue(0);
});

describe('getEventById', () => {
    it('returns null when the event is not found', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getEventById('e1')).resolves.toBeNull();

        expect(mockQuery).toHaveBeenCalledWith(
            'SELECT * FROM events WHERE id = $1 AND deleted_at IS NULL',
            ['e1']
        );
    });

    it('maps a raw_data row and overrides stale relational fields', async () => {
        mockQuery.mockResolvedValue({
            rows: [
                {
                    id: 'e1',
                    raw_data: {
                        name: 'Legacy Name',
                        location: { city: 'HCMC' },
                        date: 999,
                        organizerId: 'ghost',
                        ticketTypes: { VIP: { price: 100 } },
                        featuredProfileIds: ['fp9'],
                        lifecycleStatus: 'submitted',
                    },
                    start_at: new Date(1000),
                    end_at: new Date(2000),
                    created_at: new Date(3000),
                    last_updated_at: new Date(4000),
                    status: 'active',
                    visibility: 'public',
                    category: ['tech'],
                    lifecycle_status: 'approved',
                },
            ],
        });

        const result = await repo.getEventById('e1');

        expect(loadTicketTypesForEvents).toHaveBeenCalledWith({ query: mockQuery }, ['e1']);
        expect(loadFeaturedProfileIdsForEvents).toHaveBeenCalledWith({ query: mockQuery }, ['e1']);
        expect(loadCustomQuestionsForEvents).toHaveBeenCalledWith({ query: mockQuery }, ['e1']);
        expect(result).toEqual({
            id: 'e1',
            name: 'Legacy Name',
            location: { city: 'HCMC' },
            date: 1000,
            endDate: 2000,
            createdAt: 3000,
            lastUpdatedAt: 4000,
            organizerId: null,
            venueId: null,
            venueName: null,
            city: null,
            status: 'active',
            visibility: 'public',
            category: ['tech'],
            isPrivate: false,
            messageForAttendee: '',
            lifecycleStatus: 'approved',
            ticketTypes: {},
            featuredProfileIds: [],
            customQuestions: [],
        });
    });

    it('builds the doc from columns with coercion and a structured address', async () => {
        mockQuery.mockResolvedValue({
            rows: [
                {
                    id: 'e1', name: 'N', description: 'D', image_url: 'img', banner_url: 'bnr',
                    category: ['a'], tags: ['b'], start_at: new Date(1000), end_at: new Date(2000),
                    event_type: 'physical', online_url: 'http', location: { x: 1 }, geohash: 'g',
                    venue_id: 'v1', venue_name: 'VN', city: 'HN', min_price: '50000',
                    video_url: 'vid', is_outdoor: true, organizer_id: 'org1', status: 'active',
                    visibility: 'public', recurring_rule: null, hot_score: '7', view_count: '9',
                    required_age: '18', sponsors: [{ s: 1 }], is_private: true,
                    message_for_attendee: 'm', created_at: new Date(3000), last_updated_at: new Date(4000),
                    province_code: '01', province_name: 'Ha Noi', district_code: '02',
                    district_name: 'Q2', ward_code: '03', ward_name: 'P3', street_address: '1 L',
                },
            ],
        });

        const result = await repo.getEventById('e1');

        expect(result).toEqual({
            id: 'e1', name: 'N', description: 'D', imageUrl: 'img', bannerUrl: 'bnr',
            category: ['a'], tags: ['b'], date: 1000, endDate: 2000, eventType: 'physical',
            onlineUrl: 'http', location: { x: 1 }, geohash: 'g', venueId: 'v1', venueName: 'VN',
            city: 'HN', minPrice: 50000, videoUrl: 'vid', isOutdoor: true, organizerId: 'org1',
            status: 'active', visibility: 'public', recurringRule: null, hotScore: 7,
            viewCount: 9, requiredAge: 18, sponsors: [{ s: 1 }], isPrivate: true,
            messageForAttendee: 'm', createdAt: 3000, lastUpdatedAt: 4000, lifecycleStatus: null,
            addressDetails: {
                street: '1 L', ward: 'P3', district: 'Q2', city: 'Ha Noi',
                provinceCode: '01', districtCode: '02', wardCode: '03',
            },
            vietnamAddress: {
                provinceCode: '01', provinceName: 'Ha Noi', districtCode: '02',
                districtName: 'Q2', wardCode: '03', wardName: 'P3', streetAddress: '1 L',
            },
            ticketTypes: {},
            featuredProfileIds: [],
            customQuestions: [],
        });
    });

    it('propagates query failures', async () => {
        mockQuery.mockRejectedValue(new Error('db down'));

        await expect(repo.getEventById('e1')).rejects.toThrow('db down');
    });
});

describe('getEventDataById', () => {
    it('strips the id from the hydrated event', async () => {
        mockQuery.mockResolvedValue({
            rows: [{ id: 'e1', raw_data: { name: 'X' } }],
        });

        const result = await repo.getEventDataById('e1');

        expect(result).toEqual({
            name: 'X', lifecycleStatus: null, organizerId: null, venueId: null,
            venueName: null, city: null, status: 'pending', visibility: 'private',
            isPrivate: false, messageForAttendee: '', ticketTypes: {},
            featuredProfileIds: [], customQuestions: [],
        });
        expect(result.id).toBeUndefined();
    });
});

describe('getEventRawById', () => {
    it('returns exists false for a missing event', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getEventRawById('e1')).resolves.toEqual({
            exists: false,
            id: null,
            data: null,
        });
    });

    it('returns the hydrated data alongside the id', async () => {
        mockQuery.mockResolvedValue({
            rows: [{ id: 'e1', raw_data: { name: 'X' } }],
        });

        const result = await repo.getEventRawById('e1');

        expect(result.exists).toBe(true);
        expect(result.id).toBe('e1');
        expect(result.data.name).toBe('X');
    });
});

describe('getActiveEventsInDateRange', () => {
    it('returns an empty list without querying when a time cannot be converted', async () => {
        await expect(repo.getActiveEventsInDateRange(undefined, new Date())).resolves.toEqual([]);
        expect(mockQuery).not.toHaveBeenCalled();
    });

    it('queries with converted timestamps and the active status', async () => {
        mockQuery.mockResolvedValue({
            rows: [{ id: 'e1', raw_data: { name: 'X' } }],
        });
        const start = new Date(1000);
        const end = new Date(2000);

        const result = await repo.getActiveEventsInDateRange(start, end);

        expect(mockQuery).toHaveBeenCalledWith(
            'SELECT * FROM events WHERE start_at >= $1 AND start_at < $2 AND status = $3 AND deleted_at IS NULL',
            [start, end, 'active']
        );
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('e1');
        expect(result[0]._id).toBe('e1');
    });
});

describe('updateEvent', () => {
    it('is a no-op when updates is empty', async () => {
        await repo.updateEvent('e1', {});
        expect(mockQuery).not.toHaveBeenCalled();
    });

    it('maps FIELD_MAP keys to columns and appends a raw_data merge', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const date = new Date(1700000000000);

        await repo.updateEvent('e1', { name: 'New', date });

        expect(mockQuery).toHaveBeenCalledTimes(1);
        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toBe(
            'UPDATE events SET name = $1, start_at = $2, ' +
            "raw_data = COALESCE(raw_data, '{}'::jsonb) || $3::jsonb WHERE id = $4"
        );
        expect(params).toEqual(['New', date, JSON.stringify({ name: 'New', date }), 'e1']);
    });

    it('builds nested jsonb_set for dotted keys in the column and raw_data', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.updateEvent('e1', { 'location.lat': 5, name: 'New' });

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toBe(
            "UPDATE events SET location = jsonb_set(COALESCE(location, '{}'::jsonb), $1::text[], $2::jsonb), " +
            'name = $3, ' +
            "raw_data = jsonb_set(COALESCE(raw_data, '{}'::jsonb) || $4::jsonb, $5::text[], $6::jsonb) " +
            'WHERE id = $7'
        );
        expect(params).toEqual([
            ['lat'], JSON.stringify(5), 'New',
            JSON.stringify({ name: 'New' }),
            ['location', 'lat'], JSON.stringify(5), 'e1',
        ]);
    });

    it('replaces full ticket types and derives min_price', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        minPriceFromMap.mockReturnValue(100);

        await repo.updateEvent('e1', { ticketTypes: { VIP: { price: 100 } } });

        expect(replaceTicketTypes).toHaveBeenCalledWith(
            { query: mockQuery },
            'e1',
            { VIP: { price: 100 } }
        );
        expect(minPriceFromMap).toHaveBeenCalledWith({ VIP: { price: 100 } });
        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toBe(
            "UPDATE events SET raw_data = COALESCE(raw_data, '{}'::jsonb) || $1::jsonb, " +
            'min_price = $2 WHERE id = $3'
        );
        expect(params).toEqual([
            JSON.stringify({ ticketTypes: { VIP: { price: 100 } } }),
            100,
            'e1',
        ]);
    });

    it('delegates a ticket type dot update to setAvailable', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.updateEvent('e1', { 'ticketTypes.VIP.available': 5 });

        expect(setAvailable).toHaveBeenCalledWith({ query: mockQuery }, 'e1', 'VIP', 5);
        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toBe(
            "UPDATE events SET raw_data = jsonb_set(COALESCE(raw_data, '{}'::jsonb), $1::text[], $2::jsonb) " +
            'WHERE id = $3'
        );
        expect(params).toEqual([
            ['ticketTypes', 'VIP', 'available'], JSON.stringify(5), 'e1',
        ]);
    });

    it('replaces featured profiles relationally', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.updateEvent('e1', { featuredProfileIds: ['fp1', 'fp2'] });

        expect(replaceFeaturedProfiles).toHaveBeenCalledWith(
            { query: mockQuery },
            'e1',
            ['fp1', 'fp2']
        );
        expect(mockQuery.mock.calls[0][1]).toEqual([
            JSON.stringify({ featuredProfileIds: ['fp1', 'fp2'] }),
            'e1',
        ]);
    });

    it('writes lifecycleStatus to its column but keeps it out of raw_data', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.updateEvent('e1', { lifecycleStatus: 'approved' });

        expect(mockQuery).toHaveBeenCalledTimes(1);
        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toBe('UPDATE events SET lifecycle_status = $1 WHERE id = $2');
        expect(params).toEqual(['approved', 'e1']);
    });

    it('routes the UPDATE through the provided transaction client', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await repo.updateEvent('e1', { name: 'New' }, tx);

        expect(tx.query).toHaveBeenCalledTimes(1);
        expect(mockQuery).not.toHaveBeenCalled();
        expect(tx.query.mock.calls[0][0]).toBe(
            "UPDATE events SET name = $1, raw_data = COALESCE(raw_data, '{}'::jsonb) || $2::jsonb WHERE id = $3"
        );
    });
});

describe('getEventInTransaction', () => {
    it('locks the row and hydrates sequentially when the client can be released', async () => {
        const tx = {
            release: jest.fn(),
            query: jest.fn().mockResolvedValue({ rows: [{ id: 'e1', raw_data: { name: 'X' } }] }),
        };

        const result = await repo.getEventInTransaction(tx, 'e1');

        expect(tx.query).toHaveBeenCalledWith(
            'SELECT * FROM events WHERE id = $1 FOR UPDATE',
            ['e1']
        );
        expect(loadTicketTypesForEvents).toHaveBeenCalledWith(tx, ['e1']);
        expect(result.id).toBe('e1');
    });

    it('falls back to the module query when no transaction is provided', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'e1', raw_data: { name: 'X' } }] });

        await expect(repo.getEventInTransaction(null, 'e1')).resolves.toMatchObject({ id: 'e1' });

        expect(mockQuery).toHaveBeenCalledWith(
            'SELECT * FROM events WHERE id = $1 FOR UPDATE',
            ['e1']
        );
    });
});

describe('updateEventInTransaction', () => {
    it('delegates to updateEvent using the transaction client', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await repo.updateEventInTransaction(tx, 'e1', { name: 'New' });

        expect(tx.query).toHaveBeenCalledTimes(1);
        expect(mockQuery).not.toHaveBeenCalled();
    });
});

describe('incrementEventTicketTypeAvailableInTransaction', () => {
    it('increments availability and keeps raw_data in sync on the transaction client', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await repo.incrementEventTicketTypeAvailableInTransaction(tx, 'e1', 'VIP', 3);

        expect(incrementAvailable).toHaveBeenCalledWith(tx, 'e1', 'VIP', 3);
        expect(tx.query).toHaveBeenCalledTimes(1);
        const [sql, params] = tx.query.mock.calls[0];
        expect(sql).toContain("WHEN raw_data ? 'ticketTypes' THEN");
        expect(sql).toContain('jsonb_set');
        expect(params).toEqual([['ticketTypes', 'VIP', 'available'], 3, 'e1']);
    });

    it('falls back to the module query without a transaction', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.incrementEventTicketTypeAvailableInTransaction(null, 'e1', 'VIP', 1);

        expect(incrementAvailable).toHaveBeenCalledWith({ query: mockQuery }, 'e1', 'VIP', 1);
        expect(mockQuery).toHaveBeenCalledTimes(1);
    });
});

describe('getEventsByOrganizerId', () => {
    it('pages with default limit and no status filter', async () => {
        mockQuery.mockResolvedValue({
            rows: [
                {
                    id: 'e1', name: 'N', start_at: new Date(1000), banner_url: 'b',
                    status: 'pending', view_count: 5,
                },
            ],
        });

        const result = await repo.getEventsByOrganizerId('org1');

        expect(mockQuery).toHaveBeenCalledWith(
            'SELECT * FROM events WHERE organizer_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
            ['org1', 20, 0]
        );
        expect(result).toEqual([
            {
                id: 'e1', name: 'N', date: 1000, bannerUrl: 'b', status: 'pending',
                lifecycleStatus: null, legacyStatus: 'pending', viewCount: 5,
            },
        ]);
    });

    it('applies the status filter and offsets pagination', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.getEventsByOrganizerId('org1', { page: 2, limit: 10, status: 'active' });

        expect(mockQuery).toHaveBeenCalledWith(
            'SELECT * FROM events WHERE organizer_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4',
            ['org1', 'active', 10, 10]
        );
    });

    it('prefers lifecycle_status over the legacy status', async () => {
        mockQuery.mockResolvedValue({
            rows: [
                {
                    id: 'e1', name: 'N', start_at: null, banner_url: null,
                    status: 'pending', lifecycle_status: 'draft', view_count: 0,
                },
            ],
        });

        const result = await repo.getEventsByOrganizerId('org1');

        expect(result[0].status).toBe('draft');
        expect(result[0].lifecycleStatus).toBe('draft');
        expect(result[0].legacyStatus).toBe('pending');
    });

    it('returns an empty list for no rows', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getEventsByOrganizerId('org1')).resolves.toEqual([]);
    });
});

describe('getEventEntriesByOrganizer', () => {
    it('maps rows to id and date entries', async () => {
        mockQuery.mockResolvedValue({
            rows: [{ id: 'e1', start_at: new Date(1000) }],
        });

        const result = await repo.getEventEntriesByOrganizer('org1');

        expect(mockQuery).toHaveBeenCalledWith(
            'SELECT id, start_at FROM events WHERE organizer_id = $1',
            ['org1']
        );
        expect(result).toEqual([{ id: 'e1', date: 1000 }]);
    });

    it('returns an empty list for no rows', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getEventEntriesByOrganizer('org1')).resolves.toEqual([]);
    });
});

describe('createEvent', () => {
    it('inserts a full payload with ordered params and relational hooks', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const date = new Date(1700000000000);
        const endDate = new Date(1703600000000);
        const eventData = {
            name: 'Concert',
            description: 'Desc',
            category: ['music'],
            tags: ['live'],
            date,
            endDate,
            eventType: 'physical',
            location: { lat: 10.7, lng: 106.6 },
            venueId: 'v1',
            venueName: 'Arena',
            city: 'HCMC',
            minPrice: 150,
            videoUrl: 'vid',
            isOutdoor: true,
            organizerId: 'org1',
            status: 'active',
            visibility: 'public',
            recurringRule: { freq: 'weekly' },
            hotScore: 7,
            viewCount: 12,
            requiredAge: 18,
            sponsors: [{ name: 'Nike' }],
            isPrivate: false,
            messageForAttendee: 'hi',
            provinceCode: '01',
            provinceName: 'HN',
            districtCode: '02',
            districtName: 'Q2',
            wardCode: '03',
            wardName: 'P3',
            streetAddress: '1 L',
            ticketTypes: { VIP: { price: 500 } },
            featuredProfileIds: ['fp1'],
        };

        await repo.createEvent('e1', eventData);

        expect(mockQuery).toHaveBeenCalledTimes(1);
        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('INSERT INTO events');
        expect(sql).toContain('ON CONFLICT (id) DO UPDATE');
        expect(sql).toContain('lifecycle_status = COALESCE(EXCLUDED.lifecycle_status, events.lifecycle_status)');
        expect(params).toHaveLength(40);
        expect(params[0]).toBe('e1');
        expect(params[1]).toBe('Concert');
        expect(params[2]).toBe('Desc');
        expect(params[5]).toEqual(['music']);
        expect(params[6]).toEqual(['live']);
        expect(params[7]).toEqual(date);
        expect(params[8]).toEqual(endDate);
        expect(params[9]).toBe('physical');
        expect(params[11]).toBe(JSON.stringify({ lat: 10.7, lng: 106.6 }));
        expect(params[13]).toBe('v1');
        expect(params[15]).toBe('HCMC');
        expect(params[16]).toBe(150);
        expect(params[19]).toBe('org1');
        expect(params[20]).toBe('active');
        expect(params[21]).toBe('public');
        expect(params[22]).toBe(JSON.stringify({ freq: 'weekly' }));
        expect(params[23]).toBe(7);
        expect(params[24]).toBe(12);
        expect(params[25]).toBe(18);
        expect(params[26]).toBe(JSON.stringify([{ name: 'Nike' }]));
        expect(params[27]).toEqual(expect.any(Date));
        expect(params[29]).toBe(false);
        expect(params[30]).toBe('hi');
        expect(params[31]).toBe('01');
        expect(params[38]).toBe(JSON.stringify(eventData));
        expect(params[39]).toBe('published');

        expect(replaceTicketTypes).toHaveBeenCalledWith(
            { query: mockQuery },
            'e1',
            { VIP: { price: 500 } }
        );
        expect(replaceFeaturedProfiles).toHaveBeenCalledWith({ query: mockQuery }, 'e1', ['fp1']);
    });

    it('defaults lifecycle, legacy status, and scalar fields', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.createEvent('e1', { name: 'X' });

        const params = mockQuery.mock.calls[0][1];
        expect(params[5]).toEqual([]);
        expect(params[6]).toEqual([]);
        expect(params[16]).toBe(0);
        expect(params[20]).toBe('pending');
        expect(params[21]).toBe('private');
        expect(params[23]).toBe(0);
        expect(params[24]).toBe(0);
        expect(params[26]).toBe('[]');
        expect(params[27]).toEqual(expect.any(Date));
        expect(params[38]).toBe(JSON.stringify({ name: 'X' }));
        expect(params[39]).toBe('draft');
        expect(minPriceFromMap).toHaveBeenCalled();
    });

    it('uses the transaction client and passes it to relational helpers', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await repo.createEvent('e1', { name: 'X' }, tx);

        expect(tx.query).toHaveBeenCalledTimes(1);
        expect(mockQuery).not.toHaveBeenCalled();
        expect(replaceTicketTypes).toHaveBeenCalledWith(tx, 'e1', {});
        expect(replaceFeaturedProfiles).toHaveBeenCalledWith(tx, 'e1', []);
    });
});

describe('getPublicEventsPage', () => {
    it('counts and pages upcoming public events with a projection', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ count: 2 }] })
            .mockResolvedValueOnce({
                rows: [{ id: 'e1', raw_data: { name: 'X', date: 1000 } }],
            });

        const result = await repo.getPublicEventsPage(1, 20);

        expect(mockQuery.mock.calls[0][0]).toContain('SELECT COUNT(*)::int AS count FROM events');
        expect(mockQuery.mock.calls[0][1]).toEqual(['public', 'active', expect.any(Date)]);
        expect(mockQuery.mock.calls[1][0]).toContain('SELECT * FROM events');
        expect(mockQuery.mock.calls[1][0]).toContain('ORDER BY start_at ASC');
        expect(mockQuery.mock.calls[1][0]).toContain('LIMIT $4 OFFSET $5');
        expect(mockQuery.mock.calls[1][1]).toEqual(['public', 'active', expect.any(Date), 20, 0]);

        expect(result.totalItems).toBe(2);
        expect(result.entries).toEqual([{
            id: 'e1',
            data: { id: 'e1', name: 'X', date: 1000, city: null, venueName: null },
        }]);
    });

    it('returns empty entries for no rows', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ count: 0 }] })
            .mockResolvedValueOnce({ rows: [] });

        const result = await repo.getPublicEventsPage(2, 10);

        expect(result.entries).toEqual([]);
        expect(result.totalItems).toBe(0);
        expect(mockQuery.mock.calls[1][1]).toEqual(['public', 'active', expect.any(Date), 10, 10]);
    });

    it('propagates count query failures', async () => {
        mockQuery.mockRejectedValue(new Error('db down'));

        await expect(repo.getPublicEventsPage(1, 20)).rejects.toThrow('db down');
    });
});

describe('searchPublicEvents', () => {
    it('supports the legacy string form with pagination', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ count: 1 }] })
            .mockResolvedValueOnce({ rows: [{ id: 'e1', raw_data: { name: 'Party' } }] });

        const result = await repo.searchPublicEvents('party', 1, 10);

        const [countSql, countParams] = mockQuery.mock.calls[0];
        const [listSql, listParams] = mockQuery.mock.calls[1];
        expect(countSql).toContain(
            '(name ILIKE $4 OR description ILIKE $4 OR city ILIKE $4 OR venue_name ILIKE $4)'
        );
        expect(countParams).toEqual(['public', 'active', expect.any(Date), '%party%']);
        expect(listSql).toContain('ORDER BY start_at ASC LIMIT $5 OFFSET $6');
        expect(listParams).toEqual(['public', 'active', expect.any(Date), '%party%', 10, 0]);
        expect(result).toEqual({
            entries: [{
                id: 'e1',
                data: { id: 'e1', name: 'Party', city: null, venueName: null },
            }],
            totalItems: 1,
        });
    });

    it('normalizes an object filter payload and orders parameters', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ count: 3 }] })
            .mockResolvedValueOnce({ rows: [] });

        await repo.searchPublicEvents({
            q: 'concert',
            category: 'theater',
            city: 'HCMC',
            dateFrom: 1000,
            endDate: 2000,
            minPrice: '50',
            maxPrice: '100',
            hasVideo: 'true',
            page: 2,
            limit: 5,
        });

        const expectedBase = [
            'public', 'active', expect.any(Date),
            '%concert%', 'arts', '%arts%', '%HCMC%',
            1000, 1, 2000, 2, 50, 100,
        ];
        const [countSql, countParams] = mockQuery.mock.calls[0];
        const [listSql, listParams] = mockQuery.mock.calls[1];

        expect(countSql).toContain('category @> ARRAY[$5]::text[] OR category::text ILIKE $6');
        expect(countSql).toContain('AND city ILIKE $7');
        expect(countSql).toContain('AND (date >= $8 OR start_at >= to_timestamp($9))');
        expect(countSql).toContain('AND (date <= $10 OR start_at <= to_timestamp($11))');
        expect(countSql).toContain('AND min_price >= $12');
        expect(countSql).toContain('AND min_price <= $13');
        expect(countSql).toContain("AND video_url IS NOT NULL AND video_url != ''");
        expect(countParams).toEqual(expectedBase);
        expect(listSql).toContain('LIMIT $14 OFFSET $15');
        expect(listParams).toEqual([...expectedBase, 5, 5]);
    });
});

describe('queryActivePublicEventsByGeoBounds', () => {
    it('queries each bound and flattens hydrated results', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'e1', raw_data: { name: 'A' } }] });

        const result = await repo.queryActivePublicEventsByGeoBounds([['aa', 'zz'], ['ba', 'bz']]);

        expect(mockQuery).toHaveBeenCalledTimes(2);
        expect(mockQuery.mock.calls[0][1]).toEqual(['active', 'public', 'aa', 'zz']);
        expect(mockQuery.mock.calls[1][1]).toEqual(['active', 'public', 'ba', 'bz']);
        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('e1');
        expect(result[0].data.name).toBe('A');
        expect(result[0].data.id).toBeUndefined();
    });

    it('returns an empty list for no rows', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(
            repo.queryActivePublicEventsByGeoBounds([['aa', 'zz']])
        ).resolves.toEqual([]);
    });
});

describe('getEventLifecycleOwnership', () => {
    it('returns null when the event is missing', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getEventLifecycleOwnership('e1')).resolves.toBeNull();
    });

    it('returns the raw ownership row', async () => {
        const row = {
            id: 'e1', organizer_id: 'org1', lifecycle_status: 'draft',
            status: 'pending', visibility: 'private',
        };
        mockQuery.mockResolvedValue({ rows: [row] });

        const result = await repo.getEventLifecycleOwnership('e1');

        expect(result).toBe(row);
        expect(mockQuery).toHaveBeenCalledWith(
            'SELECT id, organizer_id, lifecycle_status, status, visibility FROM events WHERE id = $1 AND deleted_at IS NULL',
            ['e1']
        );
    });
});

describe('getRecommendedEventsRelational', () => {
    it('applies interests, exclusions, and a limit', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.getRecommendedEventsRelational(['music'], ['e9'], 3);

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('(category && $4 OR tags && $4)');
        expect(sql).toContain('AND NOT (id = ANY($5))');
        expect(sql).toContain('ORDER BY hot_score DESC, start_at ASC LIMIT $6');
        expect(params).toEqual(['active', 'public', expect.any(Date), ['music'], ['e9'], 3]);
    });

    it('defaults to a limit of 10 without interest or exclusion filters', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.getRecommendedEventsRelational();

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('LIMIT $4');
        expect(sql).not.toContain('ANY(');
        expect(params).toEqual(['active', 'public', expect.any(Date), 10]);
    });
});

describe('getPopularDestinations', () => {
    it('aggregates cities with event counts', async () => {
        mockQuery.mockResolvedValue({
            rows: [{ city: 'HCMC', event_count: 4 }],
        });

        const result = await repo.getPopularDestinations(10);

        expect(mockQuery.mock.calls[0][0]).toContain('GROUP BY city');
        expect(mockQuery.mock.calls[0][0]).toContain('LIMIT $1');
        expect(mockQuery.mock.calls[0][1]).toEqual([10]);
        expect(result).toEqual([{ name: 'HCMC', query: 'HCMC', eventCount: 4 }]);
    });
});

describe('event-builder delegations', () => {
    it('listVietnamLocations delegates to the helper', async () => {
        listVietnamLocations.mockResolvedValue('locs');

        await expect(
            repo.listVietnamLocations({ level: 'province' })
        ).resolves.toBe('locs');

        expect(listVietnamLocations).toHaveBeenCalledWith({ level: 'province' });
    });

    it('hasTicketSalesStarted delegates to the helper', async () => {
        hasTicketSalesStarted.mockResolvedValue(true);

        await expect(repo.hasTicketSalesStarted('e1', 'tx')).resolves.toBe(true);

        expect(hasTicketSalesStarted).toHaveBeenCalledWith('tx', 'e1');
    });

    it('getCustomQuestions delegates to the helper', async () => {
        loadCustomQuestions.mockResolvedValue([{ id: 'q1' }]);

        const result = await repo.getCustomQuestions('e1', 'tx');

        expect(result).toEqual([{ id: 'q1' }]);
        expect(loadCustomQuestions).toHaveBeenCalledWith('tx', 'e1');
    });

    it('replaceCustomQuestionsInTransaction delegates to the helper', async () => {
        await repo.replaceCustomQuestionsInTransaction('tx', 'e1', [{ id: 'q1' }]);

        expect(replaceCustomQuestions).toHaveBeenCalledWith('tx', 'e1', [{ id: 'q1' }]);
    });

    it('getBuyerOrderInTransaction delegates to the helper', async () => {
        getBuyerOrder.mockResolvedValue({ id: 'o1' });

        const result = await repo.getBuyerOrderInTransaction('tx', 'e1', 'o1', 'u1');

        expect(result).toEqual({ id: 'o1' });
        expect(getBuyerOrder).toHaveBeenCalledWith('tx', 'e1', 'o1', 'u1');
    });

    it('replaceOrderAttendeesInTransaction delegates to the helper', async () => {
        const attendees = [{ id: 'a1' }];

        await repo.replaceOrderAttendeesInTransaction('tx', 'e1', 'o1', attendees, { q1: 'A' });

        expect(replaceOrderAttendees).toHaveBeenCalledWith('tx', 'e1', 'o1', attendees, { q1: 'A' });
    });
});
