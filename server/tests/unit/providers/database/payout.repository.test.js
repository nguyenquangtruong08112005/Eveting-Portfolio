'use strict';

const mockQuery = jest.fn();

jest.mock('@/providers/database/postgres.client', () => ({
    query: mockQuery,
}));

const repo = require('@/providers/database/payout.repository');

beforeEach(() => {
    jest.clearAllMocks();
});

afterEach(() => {
    delete process.env.DATABASE_PROVIDER;
});

describe('payout.repository facade', () => {
    it('re-exports the postgres implementation by default', () => {
        expect(repo).toBe(require('@/providers/database/postgres.payout.repository'));
    });

    it('routes calls to the mocked postgres query boundary', async () => {
        mockQuery.mockResolvedValue({
            rows: [
                { id: 'p1', organizer_id: 'org1', amount: '5000', status: 'processing' },
            ],
        });

        await expect(repo.getProcessingPayouts()).resolves.toEqual([
            expect.objectContaining({ id: 'p1', organizerId: 'org1', amount: 5000 }),
        ]);

        expect(mockQuery).toHaveBeenCalledWith(
            "SELECT * FROM payouts WHERE status = 'processing' ORDER BY created_at ASC"
        );
    });

    it('throws when the configured provider is not postgres', () => {
        process.env.DATABASE_PROVIDER = 'memory';

        jest.isolateModules(() => {
            expect(() => require('@/providers/database/payout.repository')).toThrow(
                /not supported for payouts/
            );
        });
    });
});
