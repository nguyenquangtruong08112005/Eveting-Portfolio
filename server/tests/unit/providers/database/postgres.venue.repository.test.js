'use strict';

const mockQuery = jest.fn();

jest.mock('@/providers/database/postgres.client', () => ({ query: mockQuery }));

const repo = require('@/providers/database/postgres.venue.repository');

beforeEach(() => {
    jest.clearAllMocks();
});

describe('getAllVenues', () => {
    it('returns mapped rows from a parameterless SELECT', async () => {
        mockQuery.mockResolvedValue({
            rows: [
                {
                    id: 'v1', name: 'Arena', data: {}, address: '12 Ly Thuong Kiet',
                    city: 'HCMC', district: 'Q1', country: 'VN',
                    lat: '10.5', lng: '106.5', capacity: '500',
                },
            ],
        });

        const result = await repo.getAllVenues();

        expect(mockQuery).toHaveBeenCalledTimes(1);
        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('SELECT id, name, data, address, city, district, country, lat, lng, capacity');
        expect(sql).toContain('FROM venues WHERE deleted_at IS NULL');
        expect(sql).toContain('ORDER BY name');
        expect(params).toBeUndefined();
        expect(result).toEqual([
            {
                id: 'v1', name: 'Arena', address: '12 Ly Thuong Kiet', city: 'HCMC',
                district: 'Q1', country: 'VN', lat: 10.5, lng: 106.5, capacity: 500,
            },
        ]);
    });

    it('falls back to data bag for missing columns and coerces numerics', async () => {
        mockQuery.mockResolvedValue({
            rows: [
                {
                    id: 'v2', name: 'Studio', data: { city: 'HN', lat: '21.0', note: 'bag-note' },
                    address: null, city: null, district: 'Cau Giay', country: null,
                    lat: null, lng: null, capacity: null,
                },
            ],
        });

        const result = await repo.getAllVenues();

        expect(result[0]).toEqual(expect.objectContaining({
            id: 'v2',
            name: 'Studio',
            city: 'HN',
            district: 'Cau Giay',
            country: 'VN',
            lat: 21,
            note: 'bag-note',
        }));
    });

    it('returns an empty array when no rows', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        await expect(repo.getAllVenues()).resolves.toEqual([]);
    });
});

describe('createVenue', () => {
    it('inserts first-class columns and serializes the data bag as jsonb', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const venueData = {
            name: 'Grand Hall',
            address: '1 Nguyen Hue',
            city: 'HCMC',
            district: 'Q1',
            country: 'VN',
            lat: '10.77',
            lng: '106.7',
            capacity: '800',
            seatMapTemplate: 'template-a',
        };

        await repo.createVenue('v_1', venueData);

        expect(mockQuery).toHaveBeenCalledTimes(1);
        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('INSERT INTO venues');
        expect(sql).toContain('ON CONFLICT (id) DO UPDATE');
        expect(sql).toContain('VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10)');
        expect(params).toEqual([
            'v_1',
            'Grand Hall',
            JSON.stringify({ seatMapTemplate: 'template-a' }),
            '1 Nguyen Hue',
            'HCMC',
            'Q1',
            'VN',
            10.77,
            106.7,
            800,
        ]);
    });

    it('falls back to bag fields and defaults when first-class columns are absent', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const venueData = { seatMapTemplate: 't', address: 'bag-addr', lat: '5' };

        await repo.createVenue('v_2', venueData);

        const params = mockQuery.mock.calls[0][1];
        expect(params).toEqual([
            'v_2',
            '',
            JSON.stringify({ seatMapTemplate: 't' }),
            'bag-addr',
            null,
            null,
            'VN',
            5,
            null,
            null,
        ]);
    });
});

describe('getVenueById', () => {
    it('returns null when the venue is not found', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getVenueById('missing')).resolves.toBeNull();

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('WHERE id = $1 AND deleted_at IS NULL'),
            ['missing']
        );
    });

    it('returns the mapped venue when found', async () => {
        mockQuery.mockResolvedValue({
            rows: [
                {
                    id: 'v1', name: 'A', data: {}, address: null, city: 'HN',
                    district: null, country: null, lat: null, lng: '106.6', capacity: '10',
                },
            ],
        });

        const result = await repo.getVenueById('v1');

        expect(result).toEqual(expect.objectContaining({
            id: 'v1', name: 'A', city: 'HN', country: 'VN', lng: 106.6, capacity: 10,
        }));
    });
});

describe('getVenueRawById', () => {
    it('returns exists false when the venue is missing', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getVenueRawById('missing')).resolves.toEqual({
            exists: false,
            id: null,
            data: null,
        });
    });

    it('strips the id from the returned data bag', async () => {
        mockQuery.mockResolvedValue({
            rows: [
                {
                    id: 'v1', name: 'A', data: { note: 'n' }, address: 'X',
                    city: 'HN', district: 'D', country: 'VN', lat: null, lng: null, capacity: null,
                },
            ],
        });

        const result = await repo.getVenueRawById('v1');

        expect(result.exists).toBe(true);
        expect(result.id).toBe('v1');
        expect(result.data).toEqual(expect.objectContaining({
            name: 'A', address: 'X', city: 'HN', note: 'n',
        }));
        expect(result.data.id).toBeUndefined();
    });
});

describe('updateVenue', () => {
    it('returns null and skips the update when the venue does not exist', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.updateVenue('missing', { name: 'X' })).resolves.toBeNull();

        expect(mockQuery).toHaveBeenCalledTimes(1);
        expect(mockQuery.mock.calls[0][0]).toContain('SELECT');
    });

    it('merges existing data, updates columns and returns the refreshed venue', async () => {
        const existingRow = {
            id: 'v1', name: 'Old', data: { seatMapTemplate: 'sm', note: 'keep' },
            address: 'A', city: 'HN', district: 'D', country: 'VN',
            lat: '10', lng: '106', capacity: '100',
        };
        const updatedRow = { ...existingRow, name: 'New', capacity: '150' };
        mockQuery
            .mockResolvedValueOnce({ rows: [existingRow] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [updatedRow] });

        const result = await repo.updateVenue('v1', { name: 'New', capacity: 150 });

        expect(result.name).toBe('New');
        expect(result.capacity).toBe(150);
        expect(mockQuery).toHaveBeenCalledTimes(3);

        const [sql, params] = mockQuery.mock.calls[1];
        expect(sql).toContain('UPDATE venues SET');
        expect(sql).toContain('WHERE id = $1 AND deleted_at IS NULL');
        expect(params).toEqual([
            'v1',
            'New',
            JSON.stringify({ seatMapTemplate: 'sm', note: 'keep' }),
            'A',
            'HN',
            'D',
            'VN',
            10,
            106,
            150,
        ]);
    });
});

describe('deleteVenue', () => {
    it('returns true when the soft delete returns a row', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'v1' }] });

        await expect(repo.deleteVenue('v1')).resolves.toBe(true);

        expect(mockQuery).toHaveBeenCalledTimes(1);
        expect(mockQuery.mock.calls[0][0]).toContain('UPDATE venues SET deleted_at = NOW()');
        expect(mockQuery.mock.calls[0][1]).toEqual(['v1']);
    });

    it('falls back to a hard delete when the soft delete affects no rows', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ id: 'v1' }] });

        await expect(repo.deleteVenue('v1')).resolves.toBe(true);

        expect(mockQuery).toHaveBeenCalledTimes(2);
        expect(mockQuery.mock.calls[1][0]).toContain('DELETE FROM venues WHERE id = $1');
        expect(mockQuery.mock.calls[1][1]).toEqual(['v1']);
    });

    it('falls back to a hard delete when the soft delete throws', async () => {
        mockQuery
            .mockRejectedValueOnce(new Error('column deleted_at does not exist'))
            .mockResolvedValueOnce({ rows: [{ id: 'v1' }] });

        await expect(repo.deleteVenue('v1')).resolves.toBe(true);

        expect(mockQuery).toHaveBeenCalledTimes(2);
        expect(mockQuery.mock.calls[1][0]).toContain('DELETE FROM venues');
    });

    it('returns false when both deletes affect no rows', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] });

        await expect(repo.deleteVenue('v1')).resolves.toBe(false);
        expect(mockQuery).toHaveBeenCalledTimes(2);
    });
});
