'use strict';

const mockQuery = jest.fn();

jest.mock('@/providers/database/postgres.client', () => ({
    query: mockQuery,
}));

const repo = require('@/providers/database/analytics.repository');

beforeEach(() => {
    jest.clearAllMocks();
});

afterEach(() => {
    delete process.env.ANALYTICS_DATABASE_PROVIDER;
    delete process.env.DATABASE_PROVIDER;
});

describe('analytics.repository facade', () => {
    it('re-exports the postgres implementation by default', () => {
        expect(repo).toBe(require('@/providers/database/postgres.analytics.repository'));
    });

    it('routes calls to the mocked postgres query boundary', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getAnalyticsByEventId('e1')).resolves.toBeNull();

        expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM analytics WHERE id = $1', ['e1']);
    });

    it('throws when the analytics database provider is not postgres', () => {
        process.env.ANALYTICS_DATABASE_PROVIDER = 'memory';

        jest.isolateModules(() => {
            expect(() => require('@/providers/database/analytics.repository')).toThrow(
                /not supported for analytics/
            );
        });
    });

    it('throws when the default database provider is not postgres', () => {
        process.env.DATABASE_PROVIDER = 'memory';

        jest.isolateModules(() => {
            expect(() => require('@/providers/database/analytics.repository')).toThrow(
                /not supported for analytics/
            );
        });
    });
});
