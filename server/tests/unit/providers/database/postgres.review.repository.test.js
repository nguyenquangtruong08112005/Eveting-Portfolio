'use strict';

const mockQuery = jest.fn();

jest.mock('@/providers/database/postgres.client', () => ({
    query: mockQuery,
}));

const repo = require('@/providers/database/postgres.review.repository');

beforeEach(() => {
    jest.clearAllMocks();
});

describe('getReviewsByEventId', () => {
    it('counts, pages, and enriches reviews with a deduplicated user lookup', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ count: 2 }] })
            .mockResolvedValueOnce({
                rows: [
                    {
                        id: 'r1', event_id: 'e1', user_id: 'u1', rating: 5, comment: 'Great',
                        created_at: 1000, user_name: 'Row User', user_profile_pic_url: 'pic1',
                    },
                    {
                        id: 'r2', event_id: 'e1', user_id: 'u2', rating: 4, comment: 'Ok',
                        created_at: 900, user_name: null, user_profile_pic_url: null,
                    },
                    {
                        id: 'r3', event_id: 'e1', user_id: 'u2', rating: 3, comment: 'Meh',
                        created_at: 800, user_name: null, user_profile_pic_url: null,
                    },
                ],
            })
            .mockResolvedValueOnce({ rows: [{ exists: true }] })
            .mockResolvedValueOnce({ rows: [{ id: 'u2', name: 'Nguyen A', profile_pic_url: 'pic2' }] });

        const result = await repo.getReviewsByEventId('e1', 1, 10);

        expect(mockQuery).toHaveBeenCalledTimes(4);

        expect(mockQuery.mock.calls[0][0]).toContain('SELECT COUNT(*)::int AS count FROM reviews WHERE event_id = $1');
        expect(mockQuery.mock.calls[0][1]).toEqual(['e1']);

        expect(mockQuery.mock.calls[1][0]).toContain('ORDER BY created_at DESC LIMIT $2 OFFSET $3');
        expect(mockQuery.mock.calls[1][1]).toEqual(['e1', 10, 0]);

        expect(mockQuery.mock.calls[2][0]).toContain('SELECT EXISTS');
        expect(mockQuery.mock.calls[2][1]).toEqual(['auth_users']);

        expect(mockQuery.mock.calls[3][0]).toContain('WHERE a.id IN ($1,$2)');
        expect(mockQuery.mock.calls[3][1]).toEqual(['u1', 'u2']);

        expect(result.reviews).toEqual([
            {
                id: 'r1', eventId: 'e1', userId: 'u1', rating: 5, comment: 'Great', createdAt: 1000,
                user: { name: 'Row User', profilePicUrl: 'pic1' },
            },
            {
                id: 'r2', eventId: 'e1', userId: 'u2', rating: 4, comment: 'Ok', createdAt: 900,
                user: { name: 'Nguyen A', profilePicUrl: 'pic2' },
            },
            {
                id: 'r3', eventId: 'e1', userId: 'u2', rating: 3, comment: 'Meh', createdAt: 800,
                user: { name: 'Nguyen A', profilePicUrl: 'pic2' },
            },
        ]);
        expect(result.pagination).toEqual({ currentPage: 1, limit: 10, totalPages: 1, totalItems: 2 });
    });

    it('falls back to Anonymous and skips the user query when auth_users is missing', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ count: 1 }] })
            .mockResolvedValueOnce({
                rows: [
                    {
                        id: 'r1', event_id: 'e1', user_id: 'u1', rating: 5, comment: 'c',
                        created_at: 1000, user_name: null, user_profile_pic_url: null,
                    },
                ],
            })
            .mockResolvedValueOnce({ rows: [{ exists: false }] });

        const result = await repo.getReviewsByEventId('e1');

        expect(mockQuery).toHaveBeenCalledTimes(3);
        expect(result.reviews[0].user).toEqual({ name: 'Anonymous', profilePicUrl: '' });
        expect(result.pagination).toEqual({ currentPage: 1, limit: 10, totalPages: 1, totalItems: 1 });
    });

    it('returns empty reviews and zero pages when there are no rows', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ count: 0 }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ exists: true }] });

        const result = await repo.getReviewsByEventId('e1', 2, 5);

        expect(mockQuery).toHaveBeenCalledTimes(3);
        expect(result.reviews).toEqual([]);
        expect(result.pagination).toEqual({ currentPage: 2, limit: 5, totalPages: 0, totalItems: 0 });
    });

    it('computes the offset and totalPages from page and limit', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ count: 25 }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ exists: false }] });

        const result = await repo.getReviewsByEventId('e1', 2, 10);

        expect(mockQuery.mock.calls[1][1]).toEqual(['e1', 10, 10]);
        expect(result.pagination).toEqual({ currentPage: 2, limit: 10, totalPages: 3, totalItems: 25 });
    });

    it('propagates query errors', async () => {
        mockQuery.mockRejectedValueOnce(new Error('db down'));

        await expect(repo.getReviewsByEventId('e1')).rejects.toThrow('db down');
    });
});

describe('createReview', () => {
    it('inserts mapped columns and user data', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const reviewData = {
            eventId: 'e1', userId: 'u1', rating: 5, comment: 'Good',
            createdAt: 1000, user: { name: 'A', profilePicUrl: 'p' },
        };

        await expect(repo.createReview('rv1', reviewData)).resolves.toBe(reviewData);

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('INSERT INTO reviews');
        expect(sql).toContain('ON CONFLICT (id) DO UPDATE');
        expect(params).toEqual(['rv1', 'e1', 'u1', 5, 'Good', 1000, 'A', 'p']);
    });

    it('defaults comment and nulls user columns when absent', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.createReview('rv2', { eventId: 'e1', userId: 'u1', rating: 4, createdAt: '1500' });

        expect(mockQuery.mock.calls[0][1]).toEqual(['rv2', 'e1', 'u1', 4, '', 1500, null, null]);
    });

    it('propagates insert errors', async () => {
        mockQuery.mockRejectedValue(new Error('constraint'));

        await expect(repo.createReview('rv1', {})).rejects.toThrow('constraint');
    });
});

describe('checkUserTicketForEvent', () => {
    it('returns false without querying tickets when the table is missing', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ exists: false }] });

        await expect(repo.checkUserTicketForEvent('u1', 'e1')).resolves.toBe(false);

        expect(mockQuery).toHaveBeenCalledTimes(1);
        expect(mockQuery.mock.calls[0][1]).toEqual(['tickets']);
    });

    it('returns true when a qualifying paid or checkedIn ticket exists', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ exists: true }] })
            .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

        await expect(repo.checkUserTicketForEvent('u1', 'e1')).resolves.toBe(true);

        expect(mockQuery.mock.calls[1][0]).toContain('status IN ($3, $4)');
        expect(mockQuery.mock.calls[1][1]).toEqual(['u1', 'e1', 'paid', 'checkedIn']);
    });

    it('returns false when no qualifying ticket exists', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ exists: true }] })
            .mockResolvedValueOnce({ rows: [] });

        await expect(repo.checkUserTicketForEvent('u1', 'e1')).resolves.toBe(false);
    });
});
