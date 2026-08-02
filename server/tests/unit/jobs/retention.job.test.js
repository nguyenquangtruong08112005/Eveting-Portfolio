const mockQuery = jest.fn();
const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

const cronCallbacks = {};
const mockCron = {
  schedule: jest.fn((schedule, cb) => {
    cronCallbacks[schedule] = cb;
    return { start: jest.fn(), stop: jest.fn() };
  }),
};

jest.mock('../../../src/alias-bootstrap', () => ({}));
jest.mock('@/shared/logger', () => mockLogger);
jest.mock('../../../src/providers/database/postgres.client', () => ({ query: mockQuery }));
jest.mock('node-cron', () => mockCron);

function resetEnv() {
  delete process.env.RETENTION_DRY_RUN;
  delete process.env.RETENTION_OUTBOX_DAYS;
  delete process.env.RETENTION_BATCH;
  delete process.env.RETENTION_CRON;
}

describe('runOnce', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  afterEach(() => {
    resetEnv();
  });

  it('dry-run skips all deletes', async () => {
    process.env.RETENTION_DRY_RUN = 'true';
    mockQuery
      .mockResolvedValueOnce({ rows: [{ n: 5 }] })
      .mockResolvedValueOnce({ rows: [{ n: 3 }] });
    const { runOnce } = require('../../../src/jobs/retention.job');
    await runOnce();

    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery.mock.calls[0][0]).toMatch(/SELECT.*count\(\*\).*outbox/i);
    expect(mockQuery.mock.calls[1][0]).toMatch(/SELECT.*count\(\*\).*idempotency/i);
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('dryRun=true'));
    expect(mockLogger.info).toHaveBeenCalledWith('[retention] done');
  });

  it('skips all deletes when dry-run by default (env unset)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ n: 1 }] })
      .mockResolvedValueOnce({ rows: [{ n: 1 }] });
    const { runOnce } = require('../../../src/jobs/retention.job');
    await runOnce();

    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('dryRun=true'));
  });

  it('deletes outbox in multiple RETENTION_BATCH batches', async () => {
    process.env.RETENTION_DRY_RUN = 'false';
    process.env.RETENTION_BATCH = '2';
    mockQuery
      .mockResolvedValueOnce({ rows: [{ n: 5 }] })
      .mockResolvedValueOnce({ rowCount: 2 })
      .mockResolvedValueOnce({ rowCount: 2 })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ n: 0 }] });
    const { runOnce } = require('../../../src/jobs/retention.job');
    await runOnce();

    expect(mockQuery).toHaveBeenCalledTimes(5);
    const deleteCalls = mockQuery.mock.calls.filter(c => c[0].includes('DELETE'));
    expect(deleteCalls).toHaveLength(3);
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('total=5'));
    expect(mockLogger.info).toHaveBeenLastCalledWith('[retention] done');
  });

  it('deletes expired idempotency keys when DRY=false', async () => {
    process.env.RETENTION_DRY_RUN = 'false';
    mockQuery
      .mockResolvedValueOnce({ rows: [{ n: 0 }] })
      .mockResolvedValueOnce({ rows: [{ n: 3 }] })
      .mockResolvedValueOnce({});
    const { runOnce } = require('../../../src/jobs/retention.job');
    await runOnce();

    expect(mockQuery).toHaveBeenCalledTimes(3);
    const deleteIdemp = mockQuery.mock.calls[2];
    expect(deleteIdemp[0]).toMatch(/DELETE.*idempotency_keys/i);
    expect(mockLogger.info).toHaveBeenCalledWith('[retention] Deleted expired idempotency keys');
  });

  it('no-ops when both counts are zero', async () => {
    process.env.RETENTION_DRY_RUN = 'false';
    mockQuery
      .mockResolvedValueOnce({ rows: [{ n: 0 }] })
      .mockResolvedValueOnce({ rows: [{ n: 0 }] });
    const { runOnce } = require('../../../src/jobs/retention.job');
    await runOnce();

    expect(mockQuery).toHaveBeenCalledTimes(2);
    const deleteCalls = mockQuery.mock.calls.filter(c => c[0].includes('DELETE'));
    expect(deleteCalls).toHaveLength(0);
    expect(mockLogger.info).toHaveBeenCalledWith('[retention] done');
  });
});

describe('startRetentionCron', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    Object.keys(cronCallbacks).forEach(k => delete cronCallbacks[k]);
  });

  afterEach(() => {
    resetEnv();
  });

  it('schedules cron with default pattern and timezone', () => {
    const { startRetentionCron } = require('../../../src/jobs/retention.job');
    startRetentionCron();

    expect(mockCron.schedule).toHaveBeenCalledTimes(1);
    expect(mockCron.schedule).toHaveBeenCalledWith(
      '30 2 * * *',
      expect.any(Function),
      { scheduled: true, timezone: 'Asia/Ho_Chi_Minh' }
    );
  });

  it('schedules with custom RETENTION_CRON env', () => {
    process.env.RETENTION_CRON = '0 3 * * *';
    const { startRetentionCron } = require('../../../src/jobs/retention.job');
    startRetentionCron();

    expect(mockCron.schedule).toHaveBeenCalledWith(
      '0 3 * * *',
      expect.any(Function),
      { scheduled: true, timezone: 'Asia/Ho_Chi_Minh' }
    );
  });

  it('cron callback logs async failure', async () => {
    process.env.RETENTION_DRY_RUN = 'false';
    const { startRetentionCron } = require('../../../src/jobs/retention.job');
    startRetentionCron();

    mockQuery.mockRejectedValue(new Error('db connection lost'));
    cronCallbacks['30 2 * * *']();
    await new Promise(r => setImmediate(r));

    expect(mockLogger.error).toHaveBeenCalledWith('[retention] Cron run failed: db connection lost');
  });

  it('cron callback does not log error on success', async () => {
    const { startRetentionCron } = require('../../../src/jobs/retention.job');
    startRetentionCron();

    mockQuery
      .mockResolvedValueOnce({ rows: [{ n: 0 }] })
      .mockResolvedValueOnce({ rows: [{ n: 0 }] });
    cronCallbacks['30 2 * * *']();
    await new Promise(r => setImmediate(r));

    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('cron callback runs runOnce and logs completion', async () => {
    const { startRetentionCron } = require('../../../src/jobs/retention.job');
    startRetentionCron();

    mockQuery
      .mockResolvedValueOnce({ rows: [{ n: 0 }] })
      .mockResolvedValueOnce({ rows: [{ n: 0 }] });
    cronCallbacks['30 2 * * *']();
    await new Promise(r => setImmediate(r));

    expect(mockLogger.info).toHaveBeenCalledWith('[retention] done');
  });
});
