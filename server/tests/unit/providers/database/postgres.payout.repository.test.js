'use strict';

const mockQuery = jest.fn();
const mockTransaction = jest.fn();

jest.mock('@/providers/database/postgres.client', () => ({
    query: mockQuery,
    transaction: mockTransaction,
}));

const repo = require('@/providers/database/postgres.payout.repository');

const PAYOUT_ROW = {
    id: 'p1',
    organizer_id: 'org1',
    amount: '5000',
    status: 'processing',
    admin_approval_reason: null,
    keyed_fingerprint: 'fp',
    provider_reference: 'ref',
    provider_message: null,
    created_at: new Date(1000),
    updated_at: new Date(2000),
    completed_at: null,
    raw_data: { note: 'n' },
};

const PAYOUT_MAPPED = {
    id: 'p1',
    organizerId: 'org1',
    amount: 5000,
    status: 'processing',
    adminApprovalReason: null,
    keyedFingerprint: 'fp',
    providerReference: 'ref',
    providerMessage: null,
    createdAt: new Date(1000),
    updatedAt: new Date(2000),
    completedAt: null,
    rawData: { note: 'n' },
};

beforeEach(() => {
    jest.clearAllMocks();
});

describe('getEligibleLedgerEntries', () => {
    it('uses the provided transaction client and maps rows', async () => {
        const tx = { query: jest.fn().mockResolvedValue({
            rows: [{
                id: 'le1', order_id: 'o1', organizer_id: 'org1',
                gross_amount: '100', platform_fee: '10', net_amount: '90',
                created_at: new Date(1000),
            }],
        }) };

        const result = await repo.getEligibleLedgerEntries('org1', new Date(2000), tx);

        expect(mockQuery).not.toHaveBeenCalled();
        expect(tx.query.mock.calls[0][1]).toEqual(['org1', new Date(2000)]);
        expect(tx.query.mock.calls[0][0]).toContain('FOR UPDATE OF le SKIP LOCKED');
        expect(result).toEqual([
            {
                id: 'le1', orderId: 'o1', organizerId: 'org1',
                grossAmount: 100, platformFee: 10, netAmount: 90, createdAt: new Date(1000),
            },
        ]);
    });

    it('returns an empty list when no entries are eligible', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getEligibleLedgerEntries('org1', new Date(2000))).resolves.toEqual([]);
    });
});

describe('createPayout', () => {
    it('inserts a payout with defaults and JSON raw_data', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.createPayout({
            id: 'p1',
            organizerId: 'org1',
            amount: 5000,
            rawData: { note: 'n' },
        });

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('INSERT INTO payouts');
        expect(params).toEqual([
            'p1', 'org1', 5000, 'pending_admin_approval', null, null, null, null,
            expect.any(Date), expect.any(Date), JSON.stringify({ note: 'n' }),
        ]);
    });

    it('honors explicit status and reference fields', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.createPayout({
            id: 'p1', organizerId: 'org1', amount: 1, status: 'processing',
            adminApprovalReason: 'ok', keyedFingerprint: 'fp',
            providerReference: 'ref', providerMessage: 'msg',
        });

        const params = mockQuery.mock.calls[0][1];
        expect(params[3]).toBe('processing');
        expect(params[4]).toBe('ok');
        expect(params[5]).toBe('fp');
        expect(params[6]).toBe('ref');
        expect(params[7]).toBe('msg');
    });
});

describe('createPayoutItem', () => {
    it('inserts the payout item', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.createPayoutItem({ id: 'pi1', payoutId: 'p1', ledgerEntryId: 'le1', amount: 90 });

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('INSERT INTO payout_items');
        expect(params).toEqual(['pi1', 'p1', 'le1', 90, expect.any(Date)]);
    });
});

describe('getPayoutById', () => {
    it('returns null when the payout is missing', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getPayoutById('p1')).resolves.toBeNull();
        expect(mockQuery).toHaveBeenCalledWith(
            'SELECT * FROM payouts WHERE id = $1',
            ['p1']
        );
    });

    it('maps the payout row', async () => {
        mockQuery.mockResolvedValue({ rows: [PAYOUT_ROW] });

        await expect(repo.getPayoutById('p1')).resolves.toEqual(PAYOUT_MAPPED);
    });
});

describe('getPayoutsByOrganizer', () => {
    it('paginates with limit and offset', async () => {
        mockQuery.mockResolvedValue({ rows: [PAYOUT_ROW] });

        const result = await repo.getPayoutsByOrganizer('org1', 10, 5);

        expect(mockQuery.mock.calls[0][0]).toContain('LIMIT $2 OFFSET $3');
        expect(mockQuery.mock.calls[0][1]).toEqual(['org1', 10, 5]);
        expect(result).toEqual([PAYOUT_MAPPED]);
    });

    it('applies default pagination when omitted', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.getPayoutsByOrganizer('org1');

        expect(mockQuery.mock.calls[0][1]).toEqual(['org1', 20, 0]);
    });
});

describe('updatePayoutStatus', () => {
    it('updates only status and updated_at when no updates are given', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.updatePayoutStatus('p1', 'processing', null);

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toBe(
            'UPDATE payouts SET status = $2, updated_at = $3 WHERE id = $1'
        );
        expect(params).toEqual(['p1', 'processing', expect.any(Date)]);
    });

    it('appends optional update columns with ordered params', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.updatePayoutStatus('p1', 'processing', {
            completedAt: new Date(1000),
            providerReference: 'ref',
            providerMessage: 'msg',
            adminApprovalReason: 'ok',
        });

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('status = $2');
        expect(sql).toContain('completed_at = $4');
        expect(sql).toContain('provider_reference = $5');
        expect(sql).toContain('provider_message = $6');
        expect(sql).toContain('admin_approval_reason = $7');
        expect(params).toEqual([
            'p1', 'processing', expect.any(Date),
            new Date(1000), 'ref', 'msg', 'ok',
        ]);
    });

    it('includes adminApprovalReason when explicitly set to null', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.updatePayoutStatus('p1', 'completed', { adminApprovalReason: null });

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('admin_approval_reason = $4');
        expect(params[3]).toBeNull();
    });
});

describe('upsertBankAccount', () => {
    it('inserts or updates the bank account with ordered params', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.upsertBankAccount('org1', 'enc', '****1234', 'fp');

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('ON CONFLICT (organizer_id)');
        expect(params).toEqual([
            'org1', 'enc', '****1234', 'fp', expect.any(Date), expect.any(Date),
        ]);
    });
});

describe('getBankAccount', () => {
    it('returns null when no bank account exists', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await expect(repo.getBankAccount('org1', tx)).resolves.toBeNull();
        expect(tx.query.mock.calls[0][1]).toEqual(['org1']);
    });

    it('maps the bank account row', async () => {
        const tx = { query: jest.fn().mockResolvedValue({
            rows: [{
                organizer_id: 'org1', encrypted_payload: 'enc', masked_display: '****1234',
                keyed_fingerprint: 'fp', created_at: new Date(1000), updated_at: new Date(2000),
            }],
        }) };

        await expect(repo.getBankAccount('org1', tx)).resolves.toEqual({
            organizerId: 'org1',
            encryptedPayload: 'enc',
            maskedDisplay: '****1234',
            keyedFingerprint: 'fp',
            createdAt: new Date(1000),
            updatedAt: new Date(2000),
        });
    });

    it('falls back to the module query without a transaction', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getBankAccount('org1')).resolves.toBeNull();

        expect(mockQuery).toHaveBeenCalledWith(
            'SELECT * FROM bank_accounts WHERE organizer_id = $1 AND encrypted_payload IS NOT NULL',
            ['org1']
        );
    });
});

describe('getPayoutItems', () => {
    it('maps payout item rows', async () => {
        mockQuery.mockResolvedValue({
            rows: [{
                id: 'pi1', payout_id: 'p1', ledger_entry_id: 'le1',
                amount: '90', created_at: new Date(1000),
            }],
        });

        await expect(repo.getPayoutItems('p1')).resolves.toEqual([
            {
                id: 'pi1', payoutId: 'p1', ledgerEntryId: 'le1',
                amount: 90, createdAt: new Date(1000),
            },
        ]);
    });
});

describe('getPreviousPayoutsCount', () => {
    it('returns the count from the row', async () => {
        mockQuery.mockResolvedValue({ rows: [{ cnt: 3 }] });

        await expect(repo.getPreviousPayoutsCount('org1')).resolves.toBe(3);
        expect(mockQuery.mock.calls[0][1]).toEqual(['org1']);
    });
});

describe('lockPayoutById', () => {
    it('returns null when the payout is missing', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await expect(repo.lockPayoutById('p1', tx)).resolves.toBeNull();
        expect(tx.query.mock.calls[0][0]).toContain('FOR UPDATE');
    });

    it('maps the locked payout row', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [PAYOUT_ROW] }) };

        await expect(repo.lockPayoutById('p1', tx)).resolves.toEqual(PAYOUT_MAPPED);
    });
});

describe('getOrganizerSettings / upsertOrganizerSettings', () => {
    it('returns null when no settings exist', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getOrganizerSettings('org1')).resolves.toBeNull();
    });

    it('maps the settings row', async () => {
        mockQuery.mockResolvedValue({
            rows: [{ organizer_id: 'org1', platform_fee_rate: '10', created_at: new Date(1000) }],
        });

        await expect(repo.getOrganizerSettings('org1')).resolves.toEqual({
            organizerId: 'org1',
            platformFeeRate: 10,
            createdAt: new Date(1000),
        });
    });

    it('upserts the settings', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await repo.upsertOrganizerSettings('org1', 10);

        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toContain('ON CONFLICT (organizer_id)');
        expect(params).toEqual(['org1', 10, expect.any(Date)]);
    });
});

describe('getEligibleOrganizers', () => {
    it('computes a 7-day cutoff and returns distinct organizer ids', async () => {
        mockQuery.mockResolvedValue({ rows: [{ organizer_id: 'org1' }, { organizer_id: 'org2' }] });

        const result = await repo.getEligibleOrganizers();

        const cutoff = mockQuery.mock.calls[0][1][0];
        expect(cutoff).toBeInstanceOf(Date);
        expect(result).toEqual(['org1', 'org2']);
    });
});

describe('getProcessingPayouts / getPendingProviderSubmissionPayouts', () => {
    it('returns mapped processing payouts', async () => {
        mockQuery.mockResolvedValue({ rows: [PAYOUT_ROW] });

        await expect(repo.getProcessingPayouts()).resolves.toEqual([PAYOUT_MAPPED]);
    });

    it('returns mapped pending provider submission payouts', async () => {
        mockQuery.mockResolvedValue({ rows: [PAYOUT_ROW] });

        await expect(repo.getPendingProviderSubmissionPayouts()).resolves.toEqual([
            PAYOUT_MAPPED,
        ]);
        expect(mockQuery.mock.calls[0][0]).toContain("status = 'pending_provider_submission'");
    });
});

describe('lockAndUpdatePayout', () => {
    it('returns false when the current status does not match', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [PAYOUT_ROW] }) };

        await expect(
            repo.lockAndUpdatePayout('p1', 'pending_admin_approval', 'processing', null, tx)
        ).resolves.toBe(false);

        expect(tx.query).toHaveBeenCalledTimes(1);
    });

    it('locks and updates when the status matches', async () => {
        const tx = { query: jest.fn() };
        tx.query
            .mockResolvedValueOnce({ rows: [{ ...PAYOUT_ROW, status: 'processing' }] })
            .mockResolvedValueOnce({ rows: [] });

        const result = await repo.lockAndUpdatePayout(
            'p1', 'processing', 'completed',
            { providerReference: 'ref' },
            tx
        );

        expect(result).toBe(true);
        expect(tx.query).toHaveBeenCalledTimes(2);
        expect(tx.query.mock.calls[0][0]).toContain('FOR UPDATE');
        expect(tx.query.mock.calls[1][0]).toContain('UPDATE payouts');
        expect(tx.query.mock.calls[1][1]).toEqual([
            'p1', 'completed', expect.any(Date), 'ref',
        ]);
    });

    it('falls back to the module query without a transaction', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ ...PAYOUT_ROW, status: 'processing' }] })
            .mockResolvedValueOnce({ rows: [] });

        await expect(
            repo.lockAndUpdatePayout('p1', 'processing', 'completed')
        ).resolves.toBe(true);

        expect(mockQuery).toHaveBeenCalledTimes(2);
    });
});

describe('getPayoutSummaryByOrganizer', () => {
    it('maps the aggregated amounts', async () => {
        mockQuery.mockResolvedValue({
            rows: [{
                eligible_net: '100', pending_approval: '10',
                processing: '20', completed: '70',
            }],
        });

        const result = await repo.getPayoutSummaryByOrganizer('org1');

        expect(mockQuery.mock.calls[0][1][0]).toBe('org1');
        expect(mockQuery.mock.calls[0][1][1]).toBeInstanceOf(Date);
        expect(result).toEqual({
            eligibleNetAmount: 100,
            pendingApprovalAmount: 10,
            processingAmount: 20,
            completedAmount: 70,
        });
    });
});

describe('getPayoutsByOrganizerPaginated', () => {
    it('returns payouts and the total count', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [PAYOUT_ROW] })
            .mockResolvedValueOnce({ rows: [{ total: 1 }] });

        const result = await repo.getPayoutsByOrganizerPaginated('org1', 10, 0);

        expect(mockQuery.mock.calls[0][1]).toEqual(['org1', 10, 0]);
        expect(result).toEqual({
            payouts: [{
                id: 'p1', organizerId: 'org1', amount: 5000, status: 'processing',
                providerReference: 'ref', providerMessage: null,
                adminApprovalReason: null, createdAt: new Date(1000),
                updatedAt: new Date(2000), completedAt: null,
            }],
            total: 1,
        });
    });
});

describe('getAllPayoutsPaginated', () => {
    it('pages without a status filter', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [PAYOUT_ROW] })
            .mockResolvedValueOnce({ rows: [{ total: 5 }] });

        const result = await repo.getAllPayoutsPaginated(10, 0);

        expect(mockQuery.mock.calls[0][0]).toBe(
            'SELECT * FROM payouts ORDER BY created_at DESC LIMIT $1 OFFSET $2'
        );
        expect(mockQuery.mock.calls[0][1]).toEqual([10, 0]);
        expect(mockQuery.mock.calls[1][0]).toBe(
            'SELECT COUNT(*)::int AS total FROM payouts'
        );
        expect(mockQuery.mock.calls[1][1]).toEqual([]);
        expect(result.payouts).toHaveLength(1);
        expect(result.total).toBe(5);
    });

    it('adds the status filter to both queries with ordered params', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ total: 0 }] });

        await repo.getAllPayoutsPaginated(10, 0, 'processing');

        expect(mockQuery.mock.calls[0][0]).toBe(
            'SELECT * FROM payouts WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3'
        );
        expect(mockQuery.mock.calls[0][1]).toEqual(['processing', 10, 0]);
        expect(mockQuery.mock.calls[1][0]).toBe(
            'SELECT COUNT(*)::int AS total FROM payouts WHERE status = $1'
        );
        expect(mockQuery.mock.calls[1][1]).toEqual(['processing']);
    });
});

describe('getBankAccountSafe', () => {
    it('returns null when no account exists', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getBankAccountSafe('org1')).resolves.toBeNull();
    });

    it('maps only the safe fields', async () => {
        mockQuery.mockResolvedValue({
            rows: [{
                organizer_id: 'org1', masked_display: '****1234',
                created_at: new Date(1000), updated_at: new Date(2000),
            }],
        });

        await expect(repo.getBankAccountSafe('org1')).resolves.toEqual({
            organizerId: 'org1',
            maskedDisplay: '****1234',
            createdAt: new Date(1000),
            updatedAt: new Date(2000),
        });
    });
});

describe('runTransaction', () => {
    it('delegates to the postgres transaction with the callback', async () => {
        const cb = jest.fn();
        mockTransaction.mockResolvedValue('tx-result');

        await expect(repo.runTransaction(cb)).resolves.toBe('tx-result');

        expect(mockTransaction).toHaveBeenCalledWith(cb);
    });
});
