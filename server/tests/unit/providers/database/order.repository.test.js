'use strict';

const mockQuery = jest.fn();

jest.mock('@/providers/database/postgres.client', () => ({
    query: mockQuery,
}));

const repo = require('@/providers/database/order.repository');

beforeEach(() => {
    jest.clearAllMocks();
});

afterEach(() => {
    delete process.env.ORDER_DATABASE_PROVIDER;
});

describe('order.repository facade', () => {
    it('re-exports the postgres implementation by default', () => {
        expect(repo).toBe(require('@/providers/database/postgres.order.repository'));
    });

    it('routes calls to the mocked postgres query boundary', async () => {
        mockQuery.mockResolvedValue({
            rows: [
                { id: 't1', user_id: 'u1', event_id: 'e1', status: 'paid' },
            ],
        });

        await expect(repo.getTicketsByOrderId('o1')).resolves.toHaveLength(1);

        expect(mockQuery).toHaveBeenCalledWith(
            'SELECT id, user_id, event_id, organizer_id, status, type, price, original_price, quantity, unit_price FROM tickets WHERE order_id = $1 AND deleted_at IS NULL ORDER BY created_at',
            ['o1']
        );
    });

    it('honors an explicit postgres provider override', () => {
        process.env.ORDER_DATABASE_PROVIDER = 'postgres';

        jest.isolateModules(() => {
            const explicit = require('@/providers/database/order.repository');
            expect(explicit.createOrder).toBeDefined();
        });
    });

    it('throws when the configured provider is not postgres', () => {
        process.env.ORDER_DATABASE_PROVIDER = 'memory';

        jest.isolateModules(() => {
            expect(() => require('@/providers/database/order.repository')).toThrow(
                /not supported for orders/
            );
        });
    });
});
