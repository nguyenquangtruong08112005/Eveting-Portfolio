const mockReleaseExpired = jest.fn();
const mockDel = jest.fn();
const mockInvalidateSeatAvailability = jest.fn();
const mockLogger = { info: jest.fn(), error: jest.fn() };
const mockGetIo = jest.fn();
const mockPoolEnd = jest.fn();
const mockGetPool = jest.fn(() => ({ end: mockPoolEnd }));

jest.mock('../../../src/alias-bootstrap', () => ({}));
jest.mock('@/providers/database/seat.repository', () => ({
  releaseExpiredPerformanceSeatHolds: mockReleaseExpired,
}));
jest.mock('@/providers/database/postgres.client', () => ({
  getPool: mockGetPool,
}));
jest.mock('@/shared/socket/socket-server', () => ({
  getIo: mockGetIo,
}));
jest.mock('@/shared/logger', () => mockLogger);
jest.mock('@/shared/cache/cache-provider', () => ({
  del: mockDel,
}));
jest.mock('@/shared/cache/namespace-helpers', () => ({
  invalidateSeatAvailability: mockInvalidateSeatAvailability,
}));

function seat(eventId, performanceId, seatId) {
  return { eventId, performanceId, seatId };
}

function requireWorker() {
  return require('../../../src/jobs/seat-release-worker');
}

describe('processExpiredHolds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('returns empty array when no expired holds', async () => {
    mockReleaseExpired.mockResolvedValue([]);
    const { processExpiredHolds } = requireWorker();
    const result = await processExpiredHolds();
    expect(result).toEqual([]);
    expect(mockReleaseExpired).toHaveBeenCalledTimes(1);
    expect(mockDel).not.toHaveBeenCalled();
    expect(mockInvalidateSeatAvailability).not.toHaveBeenCalled();
    expect(mockGetIo).not.toHaveBeenCalled();
    expect(mockLogger.info).not.toHaveBeenCalled();
  });

  it('groups releases across performance/event combos', async () => {
    mockReleaseExpired.mockResolvedValue([
      seat('e1', 'p1', 's1'),
      seat('e1', 'p1', 's2'),
      seat('e1', 'p2', 's3'),
      seat('e2', 'p1', 's4'),
    ]);
    const mockEmit = jest.fn();
    const mockTo = jest.fn(() => ({ emit: mockEmit }));
    mockGetIo.mockReturnValue({ to: mockTo });

    const { processExpiredHolds } = requireWorker();
    await processExpiredHolds();

    expect(mockDel).toHaveBeenCalledTimes(4);
    expect(mockDel).toHaveBeenCalledWith('seat:status:p1:s1');
    expect(mockDel).toHaveBeenCalledWith('seat:status:p1:s2');
    expect(mockDel).toHaveBeenCalledWith('seat:status:p2:s3');
    expect(mockDel).toHaveBeenCalledWith('seat:status:p1:s4');

    expect(mockInvalidateSeatAvailability).toHaveBeenCalledTimes(3);
    expect(mockInvalidateSeatAvailability).toHaveBeenCalledWith('e1');
    expect(mockInvalidateSeatAvailability).toHaveBeenCalledWith('e2');

    expect(mockGetIo).toHaveBeenCalledTimes(1);
    expect(mockTo).toHaveBeenCalledTimes(3);
    expect(mockTo).toHaveBeenCalledWith('event_e1');
    expect(mockTo).toHaveBeenCalledWith('event_e2');

    expect(mockEmit).toHaveBeenCalledTimes(3);
    expect(mockEmit).toHaveBeenCalledWith('seat:released', {
      eventId: 'e1', performanceId: 'p1', seatIds: ['s1', 's2'], reason: 'EXPIRED',
    });
    expect(mockEmit).toHaveBeenCalledWith('seat:released', {
      eventId: 'e1', performanceId: 'p2', seatIds: ['s3'], reason: 'EXPIRED',
    });
    expect(mockEmit).toHaveBeenCalledWith('seat:released', {
      eventId: 'e2', performanceId: 'p1', seatIds: ['s4'], reason: 'EXPIRED',
    });

    expect(mockLogger.info).toHaveBeenCalledWith(
      '[SeatReleaseWorker] Released 4 expired seat hold(s).'
    );
  });

  it('deletes individual cache keys and invalidates event scopes', async () => {
    mockReleaseExpired.mockResolvedValue([
      seat('ev1', 'pf1', 'sa'),
      seat('ev2', 'pf2', 'sb'),
    ]);
    const mockEmit = jest.fn();
    const mockTo = jest.fn(() => ({ emit: mockEmit }));
    mockGetIo.mockReturnValue({ to: mockTo });

    const { processExpiredHolds } = requireWorker();
    await processExpiredHolds();

    expect(mockDel).toHaveBeenCalledWith('seat:status:pf1:sa');
    expect(mockDel).toHaveBeenCalledWith('seat:status:pf2:sb');
    expect(mockInvalidateSeatAvailability).toHaveBeenCalledWith('ev1');
    expect(mockInvalidateSeatAvailability).toHaveBeenCalledWith('ev2');
  });

  it('emits socket event with correct payload and EXPIRED reason', async () => {
    mockReleaseExpired.mockResolvedValue([seat('e1', 'p1', 's1')]);
    const mockEmit = jest.fn();
    const mockTo = jest.fn(() => ({ emit: mockEmit }));
    mockGetIo.mockReturnValue({ to: mockTo });

    const { processExpiredHolds } = requireWorker();
    await processExpiredHolds();

    expect(mockTo).toHaveBeenCalledWith('event_e1');
    expect(mockEmit).toHaveBeenCalledWith('seat:released', {
      eventId: 'e1',
      performanceId: 'p1',
      seatIds: ['s1'],
      reason: 'EXPIRED',
    });
  });

  it('handles socket unavailable (getIo returns null)', async () => {
    mockReleaseExpired.mockResolvedValue([seat('e1', 'p1', 's1')]);
    mockGetIo.mockReturnValue(null);

    const { processExpiredHolds } = requireWorker();
    const result = await processExpiredHolds();

    expect(result).toHaveLength(1);
    expect(mockDel).toHaveBeenCalledWith('seat:status:p1:s1');
    expect(mockInvalidateSeatAvailability).toHaveBeenCalledWith('e1');
    expect(mockGetIo).toHaveBeenCalledTimes(1);
  });

  it('rethrows repository error and logs error', async () => {
    const err = new Error('DB gone');
    mockReleaseExpired.mockRejectedValue(err);

    const { processExpiredHolds } = requireWorker();
    await expect(processExpiredHolds()).rejects.toThrow('DB gone');
    expect(mockLogger.error).toHaveBeenCalledWith(
      '[SeatReleaseWorker] Failed to release expired holds: DB gone'
    );
    expect(mockDel).not.toHaveBeenCalled();
    expect(mockInvalidateSeatAvailability).not.toHaveBeenCalled();
    expect(mockGetIo).not.toHaveBeenCalled();
  });

  it('guards against concurrent execution', async () => {
    let resolveRelease;
    const hangPromise = new Promise(r => { resolveRelease = r; });
    mockReleaseExpired.mockReturnValueOnce(hangPromise);

    const { processExpiredHolds } = requireWorker();
    const first = processExpiredHolds();
    const second = processExpiredHolds();

    await expect(second).resolves.toEqual([]);
    resolveRelease([seat('e1', 'p1', 's1')]);
    await first;

    expect(mockReleaseExpired).toHaveBeenCalledTimes(1);
  });

  it('reuses cached cache providers across runs', async () => {
    mockReleaseExpired.mockResolvedValue([seat('e1', 'p1', 's1')]);
    mockGetIo.mockReturnValue(null);
    const { processExpiredHolds } = requireWorker();
    await processExpiredHolds();
    await processExpiredHolds();
    expect(mockDel).toHaveBeenCalledTimes(2);
  });
});

describe('startPolling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.resetModules();
    delete process.env.SEAT_RELEASE_WORKER_ENABLED;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('logs disabled and returns when SEAT_RELEASE_WORKER_ENABLED=false', () => {
    process.env.SEAT_RELEASE_WORKER_ENABLED = 'false';
    const { startPolling } = requireWorker();
    startPolling();
    expect(mockLogger.info).toHaveBeenCalledWith(
      '[SeatReleaseWorker] Worker disabled via SEAT_RELEASE_WORKER_ENABLED=false'
    );
    expect(mockReleaseExpired).not.toHaveBeenCalled();
  });

  it('calls processExpiredHolds immediately and schedules repeat', async () => {
    mockReleaseExpired.mockResolvedValue([]);
    const { startPolling, POLL_INTERVAL_MS } = requireWorker();

    startPolling();
    expect(mockReleaseExpired).toHaveBeenCalledTimes(1);

    await Promise.resolve();
    await Promise.resolve();

    expect(jest.getTimerCount()).toBe(1);

    jest.advanceTimersByTime(POLL_INTERVAL_MS - 1);
    await Promise.resolve();
    await Promise.resolve();
    expect(mockReleaseExpired).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1);
    await Promise.resolve();
    await Promise.resolve();

    expect(mockReleaseExpired).toHaveBeenCalledTimes(2);
    expect(jest.getTimerCount()).toBe(1);
  });

  it('does not schedule a timer in --once mode', async () => {
    const origArgv = process.argv;
    process.argv = [...origArgv, '--once'];
    try {
      mockReleaseExpired.mockResolvedValue([]);
      const { startPolling } = requireWorker();
      startPolling();
      await Promise.resolve();
      await Promise.resolve();
      expect(mockReleaseExpired).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      process.argv = origArgv;
    }
  });

  it('swallows a failed poll and keeps polling on the next interval', async () => {
    mockReleaseExpired.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce([]);
    const { startPolling, POLL_INTERVAL_MS } = requireWorker();

    startPolling();
    expect(mockReleaseExpired).toHaveBeenCalledTimes(1);

    await Promise.resolve();
    await Promise.resolve();

    expect(mockLogger.error).toHaveBeenCalledWith(
      '[SeatReleaseWorker] Failed to release expired holds: boom'
    );
    expect(jest.getTimerCount()).toBe(1);

    jest.advanceTimersByTime(POLL_INTERVAL_MS);
    await Promise.resolve();
    await Promise.resolve();

    expect(mockReleaseExpired).toHaveBeenCalledTimes(2);
    expect(jest.getTimerCount()).toBe(1);
  });

  it('does not reschedule after a failed poll in --once mode', async () => {
    const origArgv = process.argv;
    process.argv = [...origArgv, '--once'];
    try {
      mockReleaseExpired.mockRejectedValueOnce(new Error('boom'));
      const { startPolling } = requireWorker();

      startPolling();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockReleaseExpired).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      process.argv = origArgv;
    }
  });

  it('does not start polling or schedule timers when required as a module', async () => {
    jest.isolateModules(() => {
      requireWorker();
    });
    await Promise.resolve();
    expect(mockReleaseExpired).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe('stopPolling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.resetModules();
    delete process.env.SEAT_RELEASE_WORKER_ENABLED;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('clears timer so no further polls occur', async () => {
    mockReleaseExpired.mockResolvedValue([]);
    const { startPolling, stopPolling, POLL_INTERVAL_MS } = requireWorker();

    startPolling();
    await Promise.resolve();
    await Promise.resolve();

    expect(jest.getTimerCount()).toBe(1);

    stopPolling();
    expect(jest.getTimerCount()).toBe(0);

    mockReleaseExpired.mockClear();

    jest.advanceTimersByTime(POLL_INTERVAL_MS * 10);
    await Promise.resolve();

    expect(mockReleaseExpired).not.toHaveBeenCalled();
  });

  it('no-ops when no timer is active', () => {
    const { stopPolling } = requireWorker();
    expect(() => stopPolling()).not.toThrow();
  });
});
