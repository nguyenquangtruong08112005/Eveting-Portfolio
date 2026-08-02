'use strict';

const mockQuery = jest.fn();

jest.mock('@/providers/database/postgres.client', () => ({
    query: mockQuery,
}));

const repo = require('@/providers/database/review.repository');

beforeEach(() => {
    jest.clearAllMocks();
});

afterEach(() => {
    delete process.env.REVIEW_DATABASE_PROVIDER;
});

describe('review.repository facade', () => {
    it('re-exports the postgres implementation by default', () => {
        expect(repo).toBe(require('@/providers/database/postgres.review.repository'));
    });

    it('routes calls to the mocked postgres query boundary', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.createReview('rv1', { eventId: 'e1', userId: 'u1', rating: 5, createdAt: 1000 });

        expect(mockQuery).toHaveBeenCalledTimes(1);
        expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO reviews');
        expect(mockQuery.mock.calls[0][1]).toEqual(['rv1', 'e1', 'u1', 5, '', 1000, null, null]);
    });

    it('honors an explicit postgres provider override', () => {
        process.env.REVIEW_DATABASE_PROVIDER = 'postgres';

        jest.isolateModules(() => {
            const explicit = require('@/providers/database/review.repository');
            expect(explicit.createReview).toBeDefined();
        });
    });

    it('throws when the configured provider is not postgres', () => {
        process.env.REVIEW_DATABASE_PROVIDER = 'memory';

        jest.isolateModules(() => {
            expect(() => require('@/providers/database/review.repository')).toThrow(
                /not supported for reviews/
            );
        });
    });
});
