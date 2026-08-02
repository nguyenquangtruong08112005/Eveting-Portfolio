'use strict';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'fixed-uuid') }));

const mockPayoutRepo = {
  upsertBankAccount: jest.fn(),
  runTransaction: jest.fn(),
  getBankAccount: jest.fn(),
  getPreviousPayoutsCount: jest.fn(),
  getEligibleLedgerEntries: jest.fn(),
  createPayout: jest.fn(),
  createPayoutItem: jest.fn(),
  getPayoutById: jest.fn(),
  updatePayoutStatus: jest.fn(),
  lockPayoutById: jest.fn(),
};
jest.mock('@/providers/database/payout.repository', () => mockPayoutRepo);

jest.mock('@/modules/payments/infrastructure/bank-verify.adapter', () => ({
  verifyBankAccount: jest.fn(),
}));

jest.mock('@/modules/payments/infrastructure/simulated-payout.provider', () => ({
  submitPayout: jest.fn(),
}));

jest.mock('@/modules/payments/infrastructure/config/payout.config', () => ({
  getEncryptionKey: jest.fn(() => Buffer.alloc(32, 7)),
}));

const payoutService = require('@/modules/payments/application/payout.service');
const payoutRepo = require('@/providers/database/payout.repository');
const { verifyBankAccount } = require('@/modules/payments/infrastructure/bank-verify.adapter');
const { submitPayout } = require('@/modules/payments/infrastructure/simulated-payout.provider');
const { BadRequestError, ConflictError } = require('@/shared/errors');

const ORGANIZER = 'org_12345678';

describe('registerBankAccount', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws BadRequestError when bank verification fails', async () => {
    verifyBankAccount.mockResolvedValue(false);

    await expect(payoutService.registerBankAccount(ORGANIZER, '1234567890', 'Alice', 'VCB'))
      .rejects.toBeInstanceOf(BadRequestError);
    expect(payoutRepo.upsertBankAccount).not.toHaveBeenCalled();
  });

  it('encrypts, masks and upserts the account on successful verification', async () => {
    verifyBankAccount.mockResolvedValue(true);
    payoutRepo.upsertBankAccount.mockResolvedValue(undefined);

    const result = await payoutService.registerBankAccount(ORGANIZER, '1234567890', 'Alice', 'VCB');

    expect(verifyBankAccount).toHaveBeenCalledWith('1234567890', 'Alice', 'VCB');
    expect(payoutRepo.upsertBankAccount).toHaveBeenCalledTimes(1);
    const [orgId, encrypted, masked, fp] = payoutRepo.upsertBankAccount.mock.calls[0];
    expect(orgId).toBe(ORGANIZER);
    expect(encrypted).toMatch(/^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/);
    expect(masked).toBe('VCB - ****7890');
    expect(fp).toMatch(/^[0-9a-f]{64}$/);
    expect(result).toEqual({ organizerId: ORGANIZER, maskedDisplay: 'VCB - ****7890' });
  });

  it('masks a short account number by appending the raw digits', async () => {
    verifyBankAccount.mockResolvedValue(true);
    payoutRepo.upsertBankAccount.mockResolvedValue(undefined);

    const result = await payoutService.registerBankAccount(ORGANIZER, '1234', 'Alice', 'VCB');

    expect(result.maskedDisplay).toBe('VCB - ****1234');
  });

  it('strips whitespace before masking', async () => {
    verifyBankAccount.mockResolvedValue(true);
    payoutRepo.upsertBankAccount.mockResolvedValue(undefined);

    const result = await payoutService.registerBankAccount(ORGANIZER, '123 456 789', 'Alice', 'VCB');

    expect(result.maskedDisplay).toBe('VCB - ****6789');
  });
});

describe('requestPayout', () => {
  const payoutId = 'payout_fixed-uuid';
  const tx = { query: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockImplementation(() => 1688000000000);
    payoutRepo.runTransaction.mockImplementation(async (fn) => fn(tx));
    payoutRepo.getBankAccount.mockResolvedValue({ organizerId: ORGANIZER, maskedDisplay: 'VCB - ****7890' });
    payoutRepo.getPreviousPayoutsCount.mockResolvedValue(1);
    payoutRepo.getEligibleLedgerEntries.mockResolvedValue([{ id: 'le_1', netAmount: 200000 }]);
    payoutRepo.getPayoutById.mockResolvedValue({
      id: payoutId,
      organizerId: ORGANIZER,
      amount: 200000,
      status: 'pending_admin_approval',
    });
  });

  afterEach(() => Date.now.mockRestore());

  it('rejects when no bank account is registered', async () => {
    payoutRepo.getBankAccount.mockResolvedValue(null);

    await expect(payoutService.requestPayout(ORGANIZER)).rejects.toBeInstanceOf(BadRequestError);
    expect(payoutRepo.createPayout).not.toHaveBeenCalled();
  });

  it('rejects when there are no eligible ledger entries', async () => {
    payoutRepo.getEligibleLedgerEntries.mockResolvedValue([]);

    await expect(payoutService.requestPayout(ORGANIZER))
      .rejects.toThrow('No eligible ledger entries for payout.');
    expect(payoutRepo.createPayout).not.toHaveBeenCalled();
  });

  it('rejects when the locked total is below the minimum amount', async () => {
    payoutRepo.getEligibleLedgerEntries.mockResolvedValue([{ id: 'le_1', netAmount: 50000 }]);

    await expect(payoutService.requestPayout(ORGANIZER))
      .rejects.toThrow('Minimum payout amount is 100000. Locked total: 50000');
  });

  it('routes the first payout to pending_admin_approval without provider dispatch', async () => {
    payoutRepo.getPreviousPayoutsCount.mockResolvedValue(0);
    payoutRepo.getPayoutById.mockResolvedValue({
      id: payoutId,
      organizerId: ORGANIZER,
      amount: 200000,
      status: 'pending_admin_approval',
    });

    const result = await payoutService.requestPayout(ORGANIZER);

    expect(payoutRepo.createPayout).toHaveBeenCalledWith(expect.objectContaining({
      id: payoutId,
      organizerId: ORGANIZER,
      amount: 200000,
      status: 'pending_admin_approval',
      providerReference: null,
      providerMessage: null,
      rawData: { isFirstPayout: true, requiresAdminApproval: true },
      keyedFingerprint: expect.any(String),
    }), tx);
    expect(payoutRepo.createPayoutItem).toHaveBeenCalledWith({
      id: 'pi_fixed-uuid',
      payoutId,
      ledgerEntryId: 'le_1',
      amount: 200000,
    }, tx);
    expect(submitPayout).not.toHaveBeenCalled();
    expect(result.providerResult).toBeUndefined();
    expect(result.payout.status).toBe('pending_admin_approval');
  });

  it('routes a high-touch amount to pending_admin_approval', async () => {
    payoutRepo.getEligibleLedgerEntries.mockResolvedValue([{ id: 'le_1', netAmount: 10000000 }]);
    payoutRepo.getPayoutById.mockResolvedValue({
      id: payoutId,
      organizerId: ORGANIZER,
      amount: 10000000,
      status: 'pending_admin_approval',
    });

    const result = await payoutService.requestPayout(ORGANIZER);

    expect(payoutRepo.createPayout).toHaveBeenCalledWith(expect.objectContaining({
      status: 'pending_admin_approval',
      rawData: { isFirstPayout: false, requiresAdminApproval: true },
    }), tx);
    expect(submitPayout).not.toHaveBeenCalled();
    expect(result.payout.amount).toBe(10000000);
  });

  it('routes a regular payout to the provider when the total is above the minimum', async () => {
    payoutRepo.getPayoutById
      .mockResolvedValueOnce({
        id: payoutId,
        organizerId: ORGANIZER,
        amount: 200000,
        status: 'pending_provider_submission',
      })
      .mockResolvedValueOnce({
        id: payoutId,
        organizerId: ORGANIZER,
        amount: 200000,
        status: 'processing',
        providerReference: 'ref_1',
        providerMessage: 'sent',
      });
    submitPayout.mockResolvedValue({ providerReference: 'ref_1', providerMessage: 'sent' });

    const result = await payoutService.requestPayout(ORGANIZER);

    expect(payoutRepo.createPayout).toHaveBeenCalledWith(expect.objectContaining({
      status: 'pending_provider_submission',
      rawData: { isFirstPayout: false, requiresAdminApproval: false },
    }), tx);
    expect(submitPayout).toHaveBeenCalledWith(ORGANIZER, 200000);
    expect(payoutRepo.updatePayoutStatus).toHaveBeenCalledWith(payoutId, 'processing', {
      providerReference: 'ref_1',
      providerMessage: 'sent',
    });
    expect(result.payout.status).toBe('processing');
    expect(result.providerResult.providerReference).toBe('ref_1');
  });

  it('creates one payout item per eligible ledger entry', async () => {
    payoutRepo.getEligibleLedgerEntries.mockResolvedValue([
      { id: 'le_1', netAmount: 60000 },
      { id: 'le_2', netAmount: 90000 },
    ]);
    payoutRepo.getPayoutById.mockResolvedValue({
      id: payoutId,
      organizerId: ORGANIZER,
      amount: 150000,
      status: 'pending_admin_approval',
    });

    await payoutService.requestPayout(ORGANIZER);

    expect(payoutRepo.createPayout).toHaveBeenCalledWith(expect.objectContaining({ amount: 150000 }), tx);
    expect(payoutRepo.createPayoutItem).toHaveBeenCalledTimes(2);
    expect(payoutRepo.createPayoutItem.mock.calls[0][0]).toEqual(expect.objectContaining({
      id: 'pi_fixed-uuid',
      payoutId,
      ledgerEntryId: 'le_1',
      amount: 60000,
    }));
    expect(payoutRepo.createPayoutItem.mock.calls[1][0]).toEqual(expect.objectContaining({
      ledgerEntryId: 'le_2',
      amount: 90000,
    }));
  });

  it('maps a duplicate payout fingerprint to ConflictError', async () => {
    payoutRepo.runTransaction.mockRejectedValue({ code: '23505', constraint: 'idx_payouts_fingerprint' });

    const err = await payoutService.requestPayout(ORGANIZER).catch((e) => e);

    expect(err).toBeInstanceOf(ConflictError);
    expect(err.message).toBe('Duplicate payout submission detected.');
  });

  it('maps a duplicate ledger allocation to ConflictError', async () => {
    payoutRepo.runTransaction.mockRejectedValue({ code: '23505', constraint: 'idx_payout_items_ledger_entry' });

    const err = await payoutService.requestPayout(ORGANIZER).catch((e) => e);

    expect(err).toBeInstanceOf(ConflictError);
    expect(err.message).toBe('A ledger entry has already been allocated to a payout.');
  });

  it('rethrows a 23505 with an unknown constraint', async () => {
    const dup = { code: '23505', constraint: 'some_other_index' };
    payoutRepo.runTransaction.mockRejectedValue(dup);

    await expect(payoutService.requestPayout(ORGANIZER)).rejects.toBe(dup);
  });

  it('rethrows non-unique-constraint errors', async () => {
    const boom = new Error('ledger unavailable');
    payoutRepo.runTransaction.mockRejectedValue(boom);

    await expect(payoutService.requestPayout(ORGANIZER)).rejects.toBe(boom);
  });
});

describe('adminApprovePayout', () => {
  const payoutId = 'payout_1';
  const tx = { query: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    payoutRepo.runTransaction.mockImplementation(async (fn) => fn(tx));
    payoutRepo.lockPayoutById.mockResolvedValue({
      id: payoutId,
      organizerId: ORGANIZER,
      amount: 150000,
      status: 'pending_admin_approval',
    });
    payoutRepo.getPayoutById
      .mockResolvedValueOnce({
        id: payoutId,
        organizerId: ORGANIZER,
        amount: 150000,
        status: 'pending_provider_submission',
        adminApprovalReason: 'ok',
      })
      .mockResolvedValueOnce({
        id: payoutId,
        organizerId: ORGANIZER,
        amount: 150000,
        status: 'processing',
        providerReference: 'ref_1',
        providerMessage: 'sent',
      });
    submitPayout.mockResolvedValue({ providerReference: 'ref_1', providerMessage: 'sent' });
  });

  it('rejects when the payout does not exist', async () => {
    payoutRepo.lockPayoutById.mockResolvedValue(null);

    await expect(payoutService.adminApprovePayout(payoutId, 'ok'))
      .rejects.toBeInstanceOf(BadRequestError);
    expect(payoutRepo.updatePayoutStatus).not.toHaveBeenCalled();
  });

  it('rejects when the payout is not in pending_admin_approval', async () => {
    payoutRepo.lockPayoutById.mockResolvedValue({
      id: payoutId,
      organizerId: ORGANIZER,
      amount: 150000,
      status: 'processing',
    });

    const err = await payoutService.adminApprovePayout(payoutId, 'ok').catch((e) => e);

    expect(err).toBeInstanceOf(ConflictError);
    expect(err.message).toContain("only pending_admin_approval can be approved");
    expect(payoutRepo.updatePayoutStatus).not.toHaveBeenCalled();
  });

  it('approves, submits to the provider and marks the payout as processing', async () => {
    const result = await payoutService.adminApprovePayout(payoutId, '  looks good  ');

    expect(payoutRepo.updatePayoutStatus).toHaveBeenCalledWith(
      payoutId,
      'pending_provider_submission',
      { adminApprovalReason: 'looks good' },
      tx
    );
    expect(submitPayout).toHaveBeenCalledWith(ORGANIZER, 150000);
    expect(payoutRepo.updatePayoutStatus).toHaveBeenCalledWith(payoutId, 'processing', {
      providerReference: 'ref_1',
      providerMessage: 'sent',
    });
    expect(result.status).toBe('processing');
  });

  it('stores an empty approval reason when the reason is only whitespace', async () => {
    await payoutService.adminApprovePayout(payoutId, '   ');

    expect(payoutRepo.updatePayoutStatus).toHaveBeenCalledWith(
      payoutId,
      'pending_provider_submission',
      { adminApprovalReason: '' },
      tx
    );
  });

  it('stores a null approval reason when the reason is not a string', async () => {
    await payoutService.adminApprovePayout(payoutId, 12345);

    expect(payoutRepo.updatePayoutStatus).toHaveBeenCalledWith(
      payoutId,
      'pending_provider_submission',
      { adminApprovalReason: null },
      tx
    );
  });

  it('stores a null approval reason when the reason is missing', async () => {
    await payoutService.adminApprovePayout(payoutId);

    expect(payoutRepo.updatePayoutStatus).toHaveBeenCalledWith(
      payoutId,
      'pending_provider_submission',
      { adminApprovalReason: null },
      tx
    );
  });

  it('rejects when the payout state changed before provider dispatch', async () => {
    payoutRepo.getPayoutById.mockReset();
    payoutRepo.getPayoutById.mockResolvedValueOnce({
      id: payoutId,
      organizerId: ORGANIZER,
      amount: 150000,
      status: 'pending_admin_approval',
    });

    const err = await payoutService.adminApprovePayout(payoutId, 'ok').catch((e) => e);

    expect(err).toBeInstanceOf(ConflictError);
    expect(err.message).toContain('before provider dispatch');
    expect(submitPayout).not.toHaveBeenCalled();
  });
});
