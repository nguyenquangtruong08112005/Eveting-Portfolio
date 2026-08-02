const mockQuery = jest.fn();

jest.mock('@/providers/database/postgres.client', () => ({
  query: mockQuery,
  transaction: jest.fn(),
  getPool: jest.fn(),
}));

jest.mock('uuid', () => ({ v4: jest.fn() }));
jest.mock('@/providers/database/time.helper', () => ({ nowDb: jest.fn() }));

const { v4: uuidv4 } = require('uuid');
const { nowDb } = require('@/providers/database/time.helper');
const { publish } = require('@/shared/events/event-publisher');

describe('event-publisher', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    uuidv4.mockReturnValue('fixed-uuid');
    nowDb.mockReturnValue(new Date('2026-07-31T00:00:00Z'));
    mockQuery.mockResolvedValue(undefined);
  });

  describe('publish', () => {
    it('uses default query client when no transactionClient given', async () => {
      const outboxId = await publish('order.created', { orderId: 1 });

      expect(outboxId).toBe('out_fixed-uuid');
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        `INSERT INTO outbox (id, event_type, payload, status, retry_count, created_at, updated_at)
         VALUES ($1, $2, $3, 'pending', 0, $4, $4)`,
        ['out_fixed-uuid', 'order.created', JSON.stringify({ orderId: 1 }), nowDb()]
      );
    });

    it('uses default query client when transactionClient is null', async () => {
      const outboxId = await publish('order.created', {}, null);

      expect(outboxId).toBe('out_fixed-uuid');
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('uses the provided transactionClient when given a valid queryable', async () => {
      const txnQuery = jest.fn().mockResolvedValue();
      const txnClient = { query: txnQuery };

      const outboxId = await publish('payment.completed', { ref: 'pay-1' }, txnClient);

      expect(outboxId).toBe('out_fixed-uuid');
      expect(txnQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('falls back to default query client when transactionClient lacks query function', async () => {
      const txnClient = {};

      await publish('order.created', {}, txnClient);

      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('falls back to default query client when transactionClient.query is not a function', async () => {
      const txnClient = { query: 'not-a-function' };

      await publish('order.created', {}, txnClient);

      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('propagates error when default query fails', async () => {
      const dbError = new Error('connection lost');
      mockQuery.mockRejectedValue(dbError);

      await expect(publish('order.created', {})).rejects.toThrow('connection lost');
    });

    it('propagates error when transactionClient query fails', async () => {
      const txnQuery = jest.fn().mockRejectedValue(new Error('txn error'));
      const txnClient = { query: txnQuery };

      await expect(publish('order.deleted', {}, txnClient)).rejects.toThrow('txn error');
    });

    it('stringifies the payload to JSON', async () => {
      const payload = { userId: 42, items: ['a', 'b'] };

      await publish('user.updated', payload);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([JSON.stringify(payload)])
      );
    });

    it('generates unique outbox ID per call', async () => {
      uuidv4.mockReturnValueOnce('uuid-a').mockReturnValueOnce('uuid-b');

      const id1 = await publish('e1', {});
      const id2 = await publish('e2', {});

      expect(id1).toBe('out_uuid-a');
      expect(id2).toBe('out_uuid-b');
    });
  });
});
