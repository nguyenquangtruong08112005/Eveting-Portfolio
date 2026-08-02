const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
const mockTx = {};

const mockPayoutRepository = {
  getEligibleOrganizers: jest.fn(),
  getProcessingPayouts: jest.fn(),
  getPendingProviderSubmissionPayouts: jest.fn(),
  runTransaction: jest.fn((fn) => fn(mockTx)),
  lockAndUpdatePayout: jest.fn(),
  updatePayoutStatus: jest.fn(),
};

const mockPayoutService = { requestPayout: jest.fn() };
const mockProvider = { submitPayout: jest.fn(), getTransferStatus: jest.fn() };

const cronCallbacks = {};
const mockCron = {
  schedule: jest.fn((schedule, callback) => {
    cronCallbacks[schedule] = callback;
    return { start: jest.fn(), stop: jest.fn() };
  }),
};

jest.mock('../../../src/alias-bootstrap', () => ({}));
jest.mock('@/shared/logger', () => mockLogger);
jest.mock('@/providers/database/payout.repository', () => mockPayoutRepository);
jest.mock('@/modules/payments/application/payout.service', () => mockPayoutService);
jest.mock('@/modules/payments/infrastructure/simulated-payout.provider', () => mockProvider);
jest.mock('node-cron', () => mockCron);

const { runBatch, runReconciliation, startPayoutCron } = require('@/jobs/payout.job');

function makePayout(overrides = {}) {
  return {
    id: 'payout-1',
    organizerId: 'org-1',
    amount: 500000,
    status: 'processing',
    providerReference: 'sim_payout_ref',
    providerMessage: null,
    ...overrides,
  };
}

describe('runBatch', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('returns zeros when no eligible organizers', async () => {
    mockPayoutRepository.getEligibleOrganizers.mockResolvedValue([]);
    expect(await runBatch()).toEqual({ submitted: 0, skipped: 0, errors: 0 });
    expect(mockPayoutService.requestPayout).not.toHaveBeenCalled();
  });

  it('counts submitted, skipped, and errors across organizers', async () => {
    mockPayoutRepository.getEligibleOrganizers.mockResolvedValue(['a', 'b', 'c']);
    mockPayoutService.requestPayout
      .mockResolvedValueOnce({ payout: { status: 'processing' } })
      .mockResolvedValueOnce({ payout: { status: 'pending_admin_approval' } })
      .mockRejectedValueOnce(new Error('fail'));

    expect(await runBatch()).toEqual({ submitted: 1, skipped: 1, errors: 1 });
    expect(mockPayoutService.requestPayout).toHaveBeenCalledTimes(3);
  });

  it('all requests error', async () => {
    mockPayoutRepository.getEligibleOrganizers.mockResolvedValue(['a', 'b']);
    mockPayoutService.requestPayout
      .mockRejectedValueOnce(new Error('e1'))
      .mockRejectedValueOnce(new Error('e2'));

    expect(await runBatch()).toEqual({ submitted: 0, skipped: 0, errors: 2 });
  });
});

describe('runReconciliation', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('returns zeros when nothing to reconcile or recover', async () => {
    mockPayoutRepository.getProcessingPayouts.mockResolvedValue([]);
    mockPayoutRepository.getPendingProviderSubmissionPayouts.mockResolvedValue([]);

    expect(await runReconciliation()).toEqual({ recovered: 0, completed: 0, failed: 0 });
  });

  describe('pending recovery (Phase 1)', () => {
    it('recovers pending payout and transitions to processing', async () => {
      const p = makePayout({ id: 'pd', status: 'pending_provider_submission', providerReference: null });
      mockPayoutRepository.getProcessingPayouts.mockResolvedValue([]);
      mockPayoutRepository.getPendingProviderSubmissionPayouts.mockResolvedValue([p]);
      mockPayoutRepository.lockAndUpdatePayout.mockResolvedValueOnce(true);
      mockProvider.submitPayout.mockResolvedValueOnce({ providerReference: 'r1', status: 'PROCESSING', providerMessage: 'ok' });

      expect(await runReconciliation()).toEqual({ recovered: 1, completed: 0, failed: 0 });
      expect(mockProvider.submitPayout).toHaveBeenCalledWith('org-1', 500000);
      expect(mockPayoutRepository.updatePayoutStatus).toHaveBeenCalledWith('pd', 'processing', expect.objectContaining({ providerReference: 'r1' }));
    });

    it('skips recovery when lock not acquired', async () => {
      const p = makePayout({ id: 'pd', status: 'pending_provider_submission', providerReference: null });
      mockPayoutRepository.getProcessingPayouts.mockResolvedValue([]);
      mockPayoutRepository.getPendingProviderSubmissionPayouts.mockResolvedValue([p]);
      mockPayoutRepository.lockAndUpdatePayout.mockResolvedValueOnce(false);

      expect(await runReconciliation()).toEqual({ recovered: 0, completed: 0, failed: 0 });
      expect(mockProvider.submitPayout).not.toHaveBeenCalled();
    });

    it('marks failed when submitPayout throws during recovery', async () => {
      const p = makePayout({ id: 'pd', status: 'pending_provider_submission', providerReference: null });
      mockPayoutRepository.getProcessingPayouts.mockResolvedValue([]);
      mockPayoutRepository.getPendingProviderSubmissionPayouts.mockResolvedValue([p]);
      mockPayoutRepository.lockAndUpdatePayout.mockResolvedValueOnce(true);
      mockProvider.submitPayout.mockRejectedValueOnce(new Error('timeout'));

      const result = await runReconciliation();
      expect(result.recovered).toBe(1);
      expect(mockPayoutRepository.updatePayoutStatus).toHaveBeenCalledWith('pd', 'failed', { providerMessage: 'Payout submission failed' });
    });

    it('catches runTransaction rejection during recovery', async () => {
      const p = makePayout({ id: 'pd', status: 'pending_provider_submission', providerReference: null });
      mockPayoutRepository.getProcessingPayouts.mockResolvedValue([]);
      mockPayoutRepository.getPendingProviderSubmissionPayouts.mockResolvedValue([p]);
      mockPayoutRepository.runTransaction.mockRejectedValueOnce(new Error('tx failed'));

      expect(await runReconciliation()).toEqual({ recovered: 0, completed: 0, failed: 0 });
    });

    it('catches error when marking failed status update rejects', async () => {
      const p = makePayout({ id: 'pd', status: 'pending_provider_submission', providerReference: null });
      mockPayoutRepository.getProcessingPayouts.mockResolvedValue([]);
      mockPayoutRepository.getPendingProviderSubmissionPayouts.mockResolvedValue([p]);
      mockPayoutRepository.lockAndUpdatePayout.mockResolvedValueOnce(true);
      mockProvider.submitPayout.mockRejectedValueOnce(new Error('timeout'));
      mockPayoutRepository.updatePayoutStatus.mockRejectedValueOnce(new Error('db error'));

      expect(await runReconciliation()).toEqual({ recovered: 0, completed: 0, failed: 0 });
    });

    it('falls back to failed status when the processing update rejects', async () => {
      const p = makePayout({ id: 'pd', status: 'pending_provider_submission', providerReference: null });
      mockPayoutRepository.getProcessingPayouts.mockResolvedValue([]);
      mockPayoutRepository.getPendingProviderSubmissionPayouts.mockResolvedValue([p]);
      mockPayoutRepository.lockAndUpdatePayout.mockResolvedValueOnce(true);
      mockProvider.submitPayout.mockResolvedValueOnce({ providerReference: 'r1', providerMessage: 'ok' });
      mockPayoutRepository.updatePayoutStatus
        .mockRejectedValueOnce(new Error('write failed'))
        .mockResolvedValueOnce();

      expect(await runReconciliation()).toEqual({ recovered: 1, completed: 0, failed: 0 });
      expect(mockPayoutRepository.updatePayoutStatus).toHaveBeenNthCalledWith(
        1, 'pd', 'processing', expect.objectContaining({ providerReference: 'r1' })
      );
      expect(mockPayoutRepository.updatePayoutStatus).toHaveBeenNthCalledWith(
        2, 'pd', 'failed', { providerMessage: 'Payout submission failed' }
      );
    });
  });

  describe('provider status reconciliation (Phase 2)', () => {
    it('completes processing payout on COMPLETED status', async () => {
      const p = makePayout({ id: 'p1', status: 'processing', providerReference: 'sim_ref' });
      mockPayoutRepository.getProcessingPayouts.mockResolvedValue([p]);
      mockPayoutRepository.getPendingProviderSubmissionPayouts.mockResolvedValue([]);
      mockProvider.getTransferStatus.mockResolvedValueOnce({ status: 'COMPLETED', providerMessage: 'done' });
      mockPayoutRepository.lockAndUpdatePayout.mockResolvedValueOnce(true);

      expect(await runReconciliation()).toEqual({ recovered: 0, completed: 1, failed: 0 });
      expect(mockPayoutRepository.lockAndUpdatePayout).toHaveBeenCalledWith(
        'p1', 'processing', 'completed',
        expect.objectContaining({ completedAt: expect.any(Date), providerMessage: 'done' }),
        mockTx
      );
    });

    it('fails processing payout on FAILED status', async () => {
      const p = makePayout({ id: 'p1', status: 'processing', providerReference: 'sim_ref' });
      mockPayoutRepository.getProcessingPayouts.mockResolvedValue([p]);
      mockPayoutRepository.getPendingProviderSubmissionPayouts.mockResolvedValue([]);
      mockProvider.getTransferStatus.mockResolvedValueOnce({ status: 'FAILED', providerMessage: 'insufficient funds' });
      mockPayoutRepository.lockAndUpdatePayout.mockResolvedValueOnce(true);

      expect(await runReconciliation()).toEqual({ recovered: 0, completed: 0, failed: 1 });
      expect(mockPayoutRepository.lockAndUpdatePayout).toHaveBeenCalledWith(
        'p1', 'processing', 'failed',
        expect.objectContaining({ providerMessage: 'insufficient funds' }),
        mockTx
      );
    });

    it('skips payout when getTransferStatus throws', async () => {
      const p = makePayout({ id: 'p1', status: 'processing', providerReference: 'sim_ref' });
      mockPayoutRepository.getProcessingPayouts.mockResolvedValue([p]);
      mockPayoutRepository.getPendingProviderSubmissionPayouts.mockResolvedValue([]);
      mockProvider.getTransferStatus.mockRejectedValueOnce(new Error('timeout'));

      expect(await runReconciliation()).toEqual({ recovered: 0, completed: 0, failed: 0 });
      expect(mockPayoutRepository.lockAndUpdatePayout).not.toHaveBeenCalled();
    });

    it('ignores UNKNOWN provider status', async () => {
      const p = makePayout({ id: 'p1', status: 'processing', providerReference: 'unknown_ref' });
      mockPayoutRepository.getProcessingPayouts.mockResolvedValue([p]);
      mockPayoutRepository.getPendingProviderSubmissionPayouts.mockResolvedValue([]);
      mockProvider.getTransferStatus.mockResolvedValueOnce({ status: 'UNKNOWN', providerMessage: '?' });

      expect(await runReconciliation()).toEqual({ recovered: 0, completed: 0, failed: 0 });
      expect(mockPayoutRepository.lockAndUpdatePayout).not.toHaveBeenCalled();
    });

    it('handles lock failure in Phase 2 reconciliation gracefully', async () => {
      const p = makePayout({ id: 'p1', status: 'processing', providerReference: 'sim_ref' });
      mockPayoutRepository.getProcessingPayouts.mockResolvedValue([p]);
      mockPayoutRepository.getPendingProviderSubmissionPayouts.mockResolvedValue([]);
      mockProvider.getTransferStatus.mockResolvedValueOnce({ status: 'COMPLETED', providerMessage: 'done' });
      mockPayoutRepository.lockAndUpdatePayout.mockResolvedValueOnce(false);

      expect(await runReconciliation()).toEqual({ recovered: 0, completed: 0, failed: 0 });
    });

    it('does not count a FAILED payout when its lock is not acquired', async () => {
      const p = makePayout({ id: 'p1', status: 'processing', providerReference: 'sim_ref' });
      mockPayoutRepository.getProcessingPayouts.mockResolvedValue([p]);
      mockPayoutRepository.getPendingProviderSubmissionPayouts.mockResolvedValue([]);
      mockProvider.getTransferStatus.mockResolvedValueOnce({ status: 'FAILED', providerMessage: 'insufficient funds' });
      mockPayoutRepository.lockAndUpdatePayout.mockResolvedValueOnce(false);

      expect(await runReconciliation()).toEqual({ recovered: 0, completed: 0, failed: 0 });
    });
  });

  describe('snapshot isolation and mixed workloads', () => {
    it('newly recovered payouts are not reconciled in the same run', async () => {
      const proc = makePayout({ id: 'proc', status: 'processing', providerReference: 'ref_old' });
      const pend = makePayout({ id: 'pend', status: 'pending_provider_submission', providerReference: null });
      mockPayoutRepository.getProcessingPayouts.mockResolvedValue([proc]);
      mockPayoutRepository.getPendingProviderSubmissionPayouts.mockResolvedValue([pend]);
      // Recovery Phase 1
      mockPayoutRepository.lockAndUpdatePayout.mockResolvedValueOnce(true);
      mockProvider.submitPayout.mockResolvedValueOnce({ providerReference: 'ref_new', status: 'PROCESSING', providerMessage: 'ok' });
      mockPayoutRepository.updatePayoutStatus.mockResolvedValueOnce();
      // Reconciliation Phase 2 — only proc is reconciled
      mockProvider.getTransferStatus.mockResolvedValueOnce({ status: 'COMPLETED', providerMessage: 'done' });
      mockPayoutRepository.lockAndUpdatePayout.mockResolvedValueOnce(true);

      const result = await runReconciliation();
      expect(result).toEqual({ recovered: 1, completed: 1, failed: 0 });
      expect(mockProvider.getTransferStatus).toHaveBeenCalledTimes(1);
      expect(mockProvider.getTransferStatus).toHaveBeenCalledWith('ref_old');
    });

    it('handles mixed results across multiple payouts', async () => {
      const p1 = makePayout({ id: 'p1', status: 'processing', providerReference: 'r1' });
      const p2 = makePayout({ id: 'p2', status: 'processing', providerReference: 'r2' });
      const pd1 = makePayout({ id: 'pd1', status: 'pending_provider_submission', providerReference: null, organizerId: 'o1' });
      mockPayoutRepository.getProcessingPayouts.mockResolvedValue([p1, p2]);
      mockPayoutRepository.getPendingProviderSubmissionPayouts.mockResolvedValue([pd1]);
      // Recovery
      mockPayoutRepository.lockAndUpdatePayout.mockResolvedValueOnce(true);
      mockProvider.submitPayout.mockResolvedValueOnce({ providerReference: 'r3', status: 'PROCESSING', providerMessage: 'ok' });
      mockPayoutRepository.updatePayoutStatus.mockResolvedValueOnce();
      // Reconciliation
      mockProvider.getTransferStatus
        .mockResolvedValueOnce({ status: 'COMPLETED', providerMessage: 'a' })
        .mockResolvedValueOnce({ status: 'FAILED', providerMessage: 'b' });
      mockPayoutRepository.lockAndUpdatePayout
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      expect(await runReconciliation()).toEqual({ recovered: 1, completed: 1, failed: 1 });
    });
  });
});

describe('startPayoutCron', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(cronCallbacks).forEach((k) => delete cronCallbacks[k]);
  });

  it('logs disabled when PAYOUT_WORKERS_ENABLED=false', () => {
    process.env.PAYOUT_WORKERS_ENABLED = 'false';
    startPayoutCron();
    expect(mockCron.schedule).not.toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith('[payout] PAYOUT_WORKERS_ENABLED=false, cron disabled');
  });

  it('schedules batch and reconcile crons when enabled', () => {
    process.env.PAYOUT_WORKERS_ENABLED = 'true';
    startPayoutCron();
    expect(mockCron.schedule).toHaveBeenCalledTimes(2);
    expect(mockCron.schedule).toHaveBeenCalledWith(
      '0 0 * * 0', expect.any(Function), { scheduled: true, timezone: 'Asia/Ho_Chi_Minh' }
    );
    expect(mockCron.schedule).toHaveBeenCalledWith(
      '*/5 * * * *', expect.any(Function), { scheduled: true, timezone: 'Asia/Ho_Chi_Minh' }
    );
  });

  it('enabled by default when PAYOUT_WORKERS_ENABLED is unset', () => {
    delete process.env.PAYOUT_WORKERS_ENABLED;
    startPayoutCron();
    expect(mockCron.schedule).toHaveBeenCalledTimes(2);
  });

  describe('cron callback error handling', () => {
    it('batch cron logs error when runBatch rejects', async () => {
      process.env.PAYOUT_WORKERS_ENABLED = 'true';
      startPayoutCron();
      mockPayoutRepository.getEligibleOrganizers.mockRejectedValue(new Error('down'));
      cronCallbacks['0 0 * * 0']();
      await new Promise((r) => setImmediate(r));
      expect(mockLogger.error).toHaveBeenCalledWith('[payout-batch] Cron run failed');
    });

    it('batch cron does not log error on success', async () => {
      process.env.PAYOUT_WORKERS_ENABLED = 'true';
      startPayoutCron();
      mockPayoutRepository.getEligibleOrganizers.mockResolvedValue([]);
      cronCallbacks['0 0 * * 0']();
      await new Promise((r) => setImmediate(r));
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('reconcile cron logs error when runReconciliation rejects', async () => {
      process.env.PAYOUT_WORKERS_ENABLED = 'true';
      startPayoutCron();
      mockPayoutRepository.getProcessingPayouts.mockRejectedValue(new Error('down'));
      cronCallbacks['*/5 * * * *']();
      await new Promise((r) => setImmediate(r));
      expect(mockLogger.error).toHaveBeenCalledWith('[payout-reconcile] Cron run failed');
    });

    it('reconcile cron does not log error on success', async () => {
      process.env.PAYOUT_WORKERS_ENABLED = 'true';
      startPayoutCron();
      mockPayoutRepository.getProcessingPayouts.mockResolvedValue([]);
      mockPayoutRepository.getPendingProviderSubmissionPayouts.mockResolvedValue([]);
      cronCallbacks['*/5 * * * *']();
      await new Promise((r) => setImmediate(r));
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });
});

describe('module entry guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.PAYOUT_WORKERS_ENABLED;
  });

  it('does not schedule crons when imported as a module', () => {
    jest.isolateModules(() => {
      require('@/jobs/payout.job');
    });
    expect(mockCron.schedule).not.toHaveBeenCalled();
  });
});
