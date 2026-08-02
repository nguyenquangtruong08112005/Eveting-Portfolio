'use strict';

const mockQuery = jest.fn();
const mockTransaction = jest.fn();

jest.mock('@/providers/database/postgres.client', () => ({
    query: mockQuery,
    transaction: mockTransaction,
}));

const repo = require('@/providers/database/rbac.repository');

beforeEach(() => {
    jest.clearAllMocks();
});

afterEach(() => {
    delete process.env.RBAC_DATABASE_PROVIDER;
    delete process.env.DATABASE_PROVIDER;
});

describe('rbac.repository facade', () => {
    it('re-exports the postgres implementation by default', () => {
        expect(repo).toBe(require('@/providers/database/postgres.rbac.repository'));
    });

    it('routes calls to the mocked postgres query boundary', async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: 'r1', name: 'admin' }] });

        await expect(repo.findRoleByName('admin')).resolves.toEqual({ id: 'r1', name: 'admin' });
        expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM roles WHERE name = $1', ['admin']);
    });

    it('throws when the database provider is not postgres', () => {
        process.env.DATABASE_PROVIDER = 'memory';

        jest.isolateModules(() => {
            expect(() => require('@/providers/database/rbac.repository')).toThrow(
                /not supported for RBAC/
            );
        });
    });
});
