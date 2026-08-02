'use strict';

const mockQuery = jest.fn();

jest.mock('@/providers/database/postgres.client', () => ({
    query: mockQuery,
}));

const repo = require('@/providers/database/postgres.media.repository');

beforeEach(() => {
    jest.clearAllMocks();
});

describe('hasEligibleTicket', () => {
    it('returns false when the tickets table does not exist', async () => {
        mockQuery.mockResolvedValue({ rows: [{ exists: false }] });

        await expect(repo.hasEligibleTicket('u1', 'e1')).resolves.toBe(false);

        expect(mockQuery).toHaveBeenCalledTimes(1);
        expect(mockQuery.mock.calls[0][1]).toEqual(['tickets']);
    });

    it('returns true when the user holds an eligible ticket', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ exists: true }] })
            .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

        await expect(repo.hasEligibleTicket('u1', 'e1')).resolves.toBe(true);

        const [sql, params] = mockQuery.mock.calls[1];
        expect(sql).toContain("status IN ('paid', 'checkedIn')");
        expect(sql).toContain('LIMIT 1');
        expect(params).toEqual(['u1', 'e1']);
    });

    it('returns false when no eligible ticket is found', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ exists: true }] })
            .mockResolvedValueOnce({ rows: [] });

        await expect(repo.hasEligibleTicket('u1', 'e1')).resolves.toBe(false);
    });

    it('propagates query failures', async () => {
        mockQuery.mockRejectedValue(new Error('db down'));

        await expect(repo.hasEligibleTicket('u1', 'e1')).rejects.toThrow('db down');
    });
});

describe('getEventOrganizerId', () => {
    it('returns null when the events table does not exist', async () => {
        mockQuery.mockResolvedValue({ rows: [{ exists: false }] });

        await expect(repo.getEventOrganizerId('e1')).resolves.toBeNull();

        expect(mockQuery.mock.calls[0][1]).toEqual(['events']);
    });

    it('returns the organizer id when found', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ exists: true }] })
            .mockResolvedValueOnce({ rows: [{ organizer_id: 'u9' }] });

        await expect(repo.getEventOrganizerId('e1')).resolves.toBe('u9');

        expect(mockQuery.mock.calls[1][1]).toEqual(['e1']);
    });

    it('returns null when the event or organizer id is missing', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ exists: true }] }).mockResolvedValueOnce({ rows: [] });
        await expect(repo.getEventOrganizerId('e1')).resolves.toBeNull();

        mockQuery.mockResolvedValueOnce({ rows: [{ exists: true }] }).mockResolvedValueOnce({ rows: [{ organizer_id: null }] });
        await expect(repo.getEventOrganizerId('e1')).resolves.toBeNull();
    });
});

describe('getEventMediaPage', () => {
    const mediaRow = (id, userId, createdAt) => ({
        id, user_id: userId, event_id: 'e1', url: 'u-' + id, type: 'photo', caption: 'c', created_at: createdAt,
    });

    it('paginates media and enriches unique users from auth_users', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ count: 3 }] })
            .mockResolvedValueOnce({
                rows: [
                    mediaRow('m1', 'u1', 1000),
                    mediaRow('m2', 'u1', 2000),
                    mediaRow('m3', 'u2', 3000),
                ],
            })
            .mockResolvedValueOnce({ rows: [{ exists: true }] })
            .mockResolvedValueOnce({
                rows: [
                    { id: 'u1', name: 'A', profile_pic_url: 'pa' },
                    { id: 'u2', name: 'B', profile_pic_url: 'pb' },
                ],
            });

        const result = await repo.getEventMediaPage('e1', 2, 10);

        expect(mockQuery).toHaveBeenCalledTimes(4);
        expect(mockQuery.mock.calls[0][1]).toEqual(['e1']);
        expect(mockQuery.mock.calls[1][1]).toEqual(['e1', 10, 10]);
        expect(mockQuery.mock.calls[2][1]).toEqual(['auth_users']);
        expect(mockQuery.mock.calls[3][0]).toContain('WHERE a.id IN ($1,$2)');
        expect(mockQuery.mock.calls[3][1]).toEqual(['u1', 'u2']);

        expect(result.pagination).toEqual({ currentPage: 2, limit: 10, totalPages: 1, totalItems: 3 });
        expect(result.media).toHaveLength(3);
        expect(result.media[0]).toEqual({
            id: 'm1', userId: 'u1', eventId: 'e1', url: 'u-m1', type: 'photo', caption: 'c',
            createdAt: 1000, user: { id: 'u1', name: 'A', profilePicUrl: 'pa' },
        });
        expect(result.media[2].user).toEqual({ id: 'u2', name: 'B', profilePicUrl: 'pb' });
    });

    it('deduplicates repeated user ids in the enrichment query', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ count: 2 }] })
            .mockResolvedValueOnce({
                rows: [mediaRow('m1', 'u1', 1000), mediaRow('m2', 'u1', 2000)],
            })
            .mockResolvedValueOnce({ rows: [{ exists: true }] })
            .mockResolvedValueOnce({ rows: [{ id: 'u1', name: 'A', profile_pic_url: 'pa' }] });

        const result = await repo.getEventMediaPage('e1');

        expect(mockQuery.mock.calls[3][0]).toContain('WHERE a.id IN ($1)');
        expect(mockQuery.mock.calls[3][1]).toEqual(['u1']);
        expect(result.media[0].user).toEqual({ id: 'u1', name: 'A', profilePicUrl: 'pa' });
    });

    it('falls back to null user fields when auth_users is missing', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ count: 1 }] })
            .mockResolvedValueOnce({ rows: [mediaRow('m1', 'u1', 1000)] })
            .mockResolvedValueOnce({ rows: [{ exists: false }] });

        const result = await repo.getEventMediaPage('e1');

        expect(mockQuery).toHaveBeenCalledTimes(3);
        expect(result.media[0].user).toEqual({ id: null, name: null, profilePicUrl: null });
    });

    it('returns empty pagination when there is no media', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ count: 0 }] })
            .mockResolvedValueOnce({ rows: [] });

        const result = await repo.getEventMediaPage('e1');

        expect(result.media).toEqual([]);
        expect(result.pagination).toEqual({ currentPage: 1, limit: 20, totalPages: 0, totalItems: 0 });
    });

    it('propagates query failures', async () => {
        mockQuery.mockRejectedValue(new Error('db down'));

        await expect(repo.getEventMediaPage('e1')).rejects.toThrow('db down');
    });
});

describe('createEventMediaBatch', () => {
    it('upserts each item with ordered parameters and a caption default', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.createEventMediaBatch([
            { id: 'm1', media: { userId: 'u1', eventId: 'e1', url: 'u', type: 'photo', caption: 'c', createdAt: 1000 } },
            { id: 'm2', media: { userId: 'u2', eventId: 'e1', url: 'u2', type: 'video', createdAt: '2000' } },
        ]);

        expect(mockQuery).toHaveBeenCalledTimes(2);
        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('INSERT INTO event_media');
        expect(sql).toContain('ON CONFLICT (id) DO UPDATE SET');
        expect(params).toEqual(['m1', 'u1', 'e1', 'u', 'photo', 'c', 1000]);

        const params2 = mockQuery.mock.calls[1][1];
        expect(params2).toEqual(['m2', 'u2', 'e1', 'u2', 'video', '', 2000]);
    });
});
