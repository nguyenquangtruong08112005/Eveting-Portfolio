jest.mock('@/shared/logger', () => ({ info: jest.fn() }));
jest.mock('uuid', () => ({ v4: jest.fn() }));
jest.mock('@/providers/database/time.helper', () => ({
  nowDb: jest.fn(),
  nowMs: jest.fn(),
}));

const logger = require('@/shared/logger');
const { v4: uuidv4 } = require('uuid');
const { nowDb, nowMs } = require('@/providers/database/time.helper');
const { logAction } = require('@/shared/audit/audit-logger');

const mockTx = { query: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  uuidv4.mockReturnValue('mock-uuid');
  nowDb.mockReturnValue(new Date('2026-07-31T12:00:00Z'));
  nowMs.mockReturnValue(1722432000000);
  mockTx.query.mockResolvedValue({ rowCount: 1 });
});

describe('logAction', () => {
  const base = {
    userId: 'user-1',
    action: 'UPDATE',
    resourceType: 'event',
    resourceId: 'evt-1',
    changes: { name: 'old' },
    ipAddress: '127.0.0.1',
  };

  it('inserts audit_log row with correct values', async () => {
    const result = await logAction(mockTx, base);
    expect(mockTx.query).toHaveBeenCalledTimes(1);
    const [sql, params] = mockTx.query.mock.calls[0];
    expect(sql).toContain('INSERT INTO audit_logs');
    expect(params[0]).toBe('aud_mock-uuid');
    expect(params[1]).toBe('user-1');
    expect(params[2]).toBe('UPDATE');
    expect(params[3]).toBe('event');
    expect(params[4]).toBe('evt-1');
    expect(params[5]).toBe('{"name":"old"}');
    expect(params[6]).toBe('127.0.0.1');
    expect(result).toBe('aud_mock-uuid');
  });

  it('passes null user_id when userId is null or empty', async () => {
    await logAction(mockTx, { ...base, userId: '' });
    expect(mockTx.query.mock.calls[0][1][1]).toBeNull();

    mockTx.query.mockClear();
    await logAction(mockTx, { ...base, userId: null });
    expect(mockTx.query.mock.calls[0][1][1]).toBeNull();
  });

  it('passes null changes when changes is null', async () => {
    await logAction(mockTx, { ...base, changes: null });
    expect(mockTx.query.mock.calls[0][1][5]).toBeNull();
  });

  it('passes null ipAddress when not provided', async () => {
    const { ipAddress, ...noIp } = base;
    await logAction(mockTx, noIp);
    expect(mockTx.query.mock.calls[0][1][6]).toBeNull();
  });

  it('logs audit record via logger.info', async () => {
    await logAction(mockTx, base);
    expect(logger.info).toHaveBeenCalledWith(
      '[Audit Log] UPDATE on event:evt-1',
      expect.objectContaining({
        type: 'audit',
        auditId: 'aud_mock-uuid',
        userId: 'user-1',
        action: 'UPDATE',
        resourceType: 'event',
        resourceId: 'evt-1',
        changes: { name: 'old' },
        ipAddress: '127.0.0.1',
        createdAt: 1722432000000,
      })
    );
  });

  it('uses nowDb and nowMs helpers', async () => {
    await logAction(mockTx, base);
    expect(nowDb).toHaveBeenCalled();
    expect(nowMs).toHaveBeenCalled();
  });
});
