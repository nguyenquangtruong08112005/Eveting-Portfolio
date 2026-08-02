'use strict';

const mockQuery = jest.fn();

jest.mock('@/providers/database/postgres.client', () => ({
    query: mockQuery,
}));

const repo = require('@/providers/database/membership.repository');

beforeEach(() => {
    jest.clearAllMocks();
});

afterEach(() => {
    delete process.env.MEMBERSHIP_DATABASE_PROVIDER;
    delete process.env.DATABASE_PROVIDER;
});

describe('membership.repository facade', () => {
    it('re-exports the postgres implementation by default', () => {
        expect(repo).toBe(require('@/providers/database/postgres.membership.repository'));
    });

    it('routes calls to the mocked postgres query boundary', async () => {
        mockQuery.mockResolvedValue({
            rows: [{
                id: 'e1', user_id: 'u1', points: 5, transaction_type: 'earn',
                reference_id: null, created_at: new Date(1000),
            }],
        });

        const result = await repo.getUserPointsLedger('u1');

        expect(result[0]).toEqual({
            id: 'e1', userId: 'u1', points: 5, transactionType: 'earn',
            referenceId: null, createdAt: 1000,
        });
        expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('FROM loyalty_points_ledger'), ['u1']);
    });

    it('honors an explicit postgres provider override', () => {
        process.env.MEMBERSHIP_DATABASE_PROVIDER = 'postgres';

        jest.isolateModules(() => {
            const explicit = require('@/providers/database/membership.repository');
            expect(explicit.getUserPointsLedger).toBeDefined();
        });
    });

    it('throws when the configured provider is not postgres', () => {
        process.env.MEMBERSHIP_DATABASE_PROVIDER = 'memory';

        jest.isolateModules(() => {
            expect(() => require('@/providers/database/membership.repository')).toThrow(
                /not supported for memberships/
            );
        });
    });
});
