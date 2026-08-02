'use strict';

const mockQuery = jest.fn();

jest.mock('@/providers/database/postgres.client', () => ({
    query: mockQuery,
}));

const repo = require('@/providers/database/idempotency.repository');

beforeEach(() => {
    jest.clearAllMocks();
});

afterEach(() => {
    delete process.env.DATABASE_PROVIDER;
});

describe('idempotency.repository facade', () => {
    it('re-exports the postgres implementation by default', () => {
        expect(repo).toBe(require('@/providers/database/postgres.idempotency.repository'));
    });

    it('routes calls to the mocked postgres query boundary', async () => {
        mockQuery.mockResolvedValue({
            rows: [{
                id: 'i1', key: 'k1', user_id: 'u1', endpoint: '/orders',
                request_hash: 'h', status: 'COMPLETED', response_code: 200,
                response_body: {}, created_at: new Date(1000), expires_at: new Date(2000),
            }],
        });

        await expect(repo.getByKey('k1')).resolves.toMatchObject({ id: 'i1', key: 'k1' });

        expect(mockQuery).toHaveBeenCalledWith(
            'SELECT * FROM idempotency_keys WHERE key = $1',
            ['k1']
        );
    });

    it('throws when the configured provider is not postgres', () => {
        process.env.DATABASE_PROVIDER = 'memory';

        jest.isolateModules(() => {
            expect(() => require('@/providers/database/idempotency.repository')).toThrow(
                /not supported for idempotency/
            );
        });
    });
});
