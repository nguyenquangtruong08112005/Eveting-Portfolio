'use strict';

const mockQuery = jest.fn();

jest.mock('@/providers/database/postgres.client', () => ({
    query: mockQuery,
}));

const repo = require('@/providers/database/postgres.membership.repository');

beforeEach(() => {
    jest.clearAllMocks();
});

describe('getUserMembershipInTransaction', () => {
    it('queries through the provided transaction client and maps the row', async () => {
        const tx = { query: jest.fn() };
        tx.query.mockResolvedValueOnce({
            rows: [{
                user_id: 'u1', tier_id: 'tier_gold', points_balance: '10', lifetime_points: '25',
                updated_at: new Date(1000), name: 'gold', discount_percentage: '5',
            }],
        });

        const result = await repo.getUserMembershipInTransaction(tx, 'u1');

        expect(tx.query).toHaveBeenCalledTimes(1);
        expect(mockQuery).not.toHaveBeenCalled();
        expect(tx.query.mock.calls[0][0]).toContain('JOIN membership_tiers mt ON um.tier_id = mt.id');
        expect(tx.query.mock.calls[0][1]).toEqual(['u1']);
        expect(result).toEqual({
            userId: 'u1',
            tierId: 'tier_gold',
            tierName: 'gold',
            discountPercentage: 5,
            pointsBalance: 10,
            lifetimePoints: 25,
            updatedAt: 1000,
        });
    });

    it('falls back to the module query when no transaction is provided', async () => {
        mockQuery.mockResolvedValue({
            rows: [{
                user_id: 'u1', tier_id: 'tier_standard', points_balance: 0, lifetime_points: 0,
                updated_at: new Date(1000), name: 'standard', discount_percentage: 0,
            }],
        });

        const result = await repo.getUserMembershipInTransaction(null, 'u1');

        expect(mockQuery).toHaveBeenCalledTimes(1);
        expect(result.userId).toBe('u1');
    });

    it('returns the default standard membership when the user does not exist', async () => {
        const tx = { query: jest.fn() };
        tx.query
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] });

        const result = await repo.getUserMembershipInTransaction(tx, 'ghost');

        expect(tx.query).toHaveBeenCalledTimes(2);
        expect(tx.query.mock.calls[1][0]).toBe('SELECT 1 FROM auth_users WHERE id = $1');
        expect(tx.query.mock.calls[1][1]).toEqual(['ghost']);
        expect(result).toEqual({
            userId: 'ghost',
            tierId: 'tier_standard',
            tierName: 'standard',
            discountPercentage: 0,
            pointsBalance: 0,
            lifetimePoints: 0,
            updatedAt: expect.any(Date),
        });
    });

    it('inserts a standard membership and re-selects when the user exists', async () => {
        const tx = { query: jest.fn() };
        tx.query
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({
                rows: [{
                    user_id: 'u1', tier_id: 'tier_standard', points_balance: 0, lifetime_points: 0,
                    updated_at: new Date(1000), name: 'standard', discount_percentage: 0,
                }],
            });

        const result = await repo.getUserMembershipInTransaction(tx, 'u1');

        expect(tx.query.mock.calls[2][0]).toContain('INSERT INTO user_memberships');
        expect(tx.query.mock.calls[2][1]).toEqual(['u1', expect.any(Date)]);
        expect(result.userId).toBe('u1');
        expect(result.tierName).toBe('standard');
    });

    it('returns null when the insert produces no membership row', async () => {
        const tx = { query: jest.fn() };
        tx.query
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] });

        await expect(repo.getUserMembershipInTransaction(tx, 'u1')).resolves.toBeNull();
    });

    it('propagates query failures', async () => {
        mockQuery.mockRejectedValue(new Error('db down'));

        await expect(repo.getUserMembershipInTransaction(null, 'u1')).rejects.toThrow('db down');
    });
});

describe('createUserMembershipInTransaction', () => {
    it('skips the insert when the user does not exist', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await repo.createUserMembershipInTransaction(tx, 'ghost');

        expect(tx.query).toHaveBeenCalledTimes(1);
    });

    it('inserts with the default tier when the user exists', async () => {
        const tx = { query: jest.fn() };
        tx.query
            .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
            .mockResolvedValue({ rows: [] });

        await repo.createUserMembershipInTransaction(tx, 'u1');

        expect(tx.query.mock.calls[1][0]).toContain('INSERT INTO user_memberships');
        expect(tx.query.mock.calls[1][1]).toEqual(['u1', 'tier_standard', expect.any(Date)]);
    });

    it('honors a custom tier id', async () => {
        const tx = { query: jest.fn() };
        tx.query
            .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
            .mockResolvedValue({ rows: [] });

        await repo.createUserMembershipInTransaction(tx, 'u1', 'tier_gold');

        expect(tx.query.mock.calls[1][1][1]).toBe('tier_gold');
    });
});

describe('updateUserMembershipPointsAndTierInTransaction', () => {
    it('skips the update when the user does not exist', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await repo.updateUserMembershipPointsAndTierInTransaction(tx, 'ghost', 1, 1);

        expect(tx.query).toHaveBeenCalledTimes(1);
    });

    it('updates points and lifetime points without a tier change', async () => {
        const tx = { query: jest.fn() };
        tx.query
            .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
            .mockResolvedValue({ rows: [] });

        await repo.updateUserMembershipPointsAndTierInTransaction(tx, 'u1', 5, 10);

        const [sql, params] = tx.query.mock.calls[1];
        expect(sql).toContain('points_balance = points_balance + $2');
        expect(sql).not.toContain('tier_id = $4');
        expect(params).toEqual(['u1', 5, 10, expect.any(Date)]);
        expect(sql).toContain('WHERE user_id = $1');
    });

    it('updates the tier when a new tier id is supplied', async () => {
        const tx = { query: jest.fn() };
        tx.query
            .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
            .mockResolvedValue({ rows: [] });

        await repo.updateUserMembershipPointsAndTierInTransaction(tx, 'u1', 5, 10, 'tier_gold');

        const [sql, params] = tx.query.mock.calls[1];
        expect(sql).toContain('tier_id = $4');
        expect(params).toEqual(['u1', 5, 10, 'tier_gold', expect.any(Date)]);
    });
});

describe('logLoyaltyPointsEntryInTransaction', () => {
    it('skips the insert when the user does not exist', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await repo.logLoyaltyPointsEntryInTransaction(tx, { userId: 'ghost', points: 5 });

        expect(tx.query).toHaveBeenCalledTimes(1);
    });

    it('inserts a ledger entry with all ordered parameters', async () => {
        const tx = { query: jest.fn() };
        tx.query
            .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
            .mockResolvedValue({ rows: [] });
        const createdAt = new Date(1000);

        await repo.logLoyaltyPointsEntryInTransaction(tx, {
            id: 'e1', userId: 'u1', points: 5, transactionType: 'earn', referenceId: 'r1', createdAt,
        });

        const [sql, params] = tx.query.mock.calls[1];
        expect(sql).toContain('INSERT INTO loyalty_points_ledger');
        expect(params).toEqual(['e1', 'u1', 5, 'earn', 'r1', createdAt]);
    });

    it('defaults missing reference and createdAt values', async () => {
        const tx = { query: jest.fn() };
        tx.query
            .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
            .mockResolvedValue({ rows: [] });

        await repo.logLoyaltyPointsEntryInTransaction(tx, {
            id: 'e1', userId: 'u1', points: 5, transactionType: 'redeem',
        });

        const params = tx.query.mock.calls[1][1];
        expect(params[4]).toBeNull();
        expect(params[5]).toEqual(expect.any(Date));
    });
});

describe('getMembershipTiersInTransaction', () => {
    it('maps tier rows ordered by minimum points', async () => {
        const tx = { query: jest.fn() };
        tx.query.mockResolvedValueOnce({
            rows: [
                {
                    id: 't1', name: 'standard', min_points_required: '0', discount_percentage: '0',
                    perks: ['a'], created_at: new Date(1000),
                },
                {
                    id: 't2', name: 'gold', min_points_required: '100', discount_percentage: '5',
                    perks: null, created_at: new Date(2000),
                },
            ],
        });

        const result = await repo.getMembershipTiersInTransaction(tx);

        expect(tx.query).toHaveBeenCalledTimes(1);
        expect(tx.query.mock.calls[0][0]).toContain('ORDER BY min_points_required ASC');
        expect(result).toEqual([
            {
                id: 't1', name: 'standard', minPointsRequired: 0, discountPercentage: 0,
                perks: ['a'], createdAt: 1000,
            },
            {
                id: 't2', name: 'gold', minPointsRequired: 100, discountPercentage: 5,
                perks: null, createdAt: 2000,
            },
        ]);
    });

    it('returns an empty array when there are no tiers', async () => {
        const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        await expect(repo.getMembershipTiersInTransaction(tx)).resolves.toEqual([]);
    });
});

describe('getUserPointsLedger', () => {
    it('maps ledger rows ordered by most recent first', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    id: 'e1', user_id: 'u1', points: '10', transaction_type: 'earn',
                    reference_id: 'r1', created_at: new Date(2000),
                },
                {
                    id: 'e2', user_id: 'u1', points: '5', transaction_type: 'redeem',
                    reference_id: null, created_at: new Date(1000),
                },
            ],
        });

        const result = await repo.getUserPointsLedger('u1');

        expect(mockQuery).toHaveBeenCalledTimes(1);
        expect(mockQuery.mock.calls[0][0]).toContain('ORDER BY created_at DESC');
        expect(mockQuery.mock.calls[0][1]).toEqual(['u1']);
        expect(result).toEqual([
            {
                id: 'e1', userId: 'u1', points: 10, transactionType: 'earn',
                referenceId: 'r1', createdAt: 2000,
            },
            {
                id: 'e2', userId: 'u1', points: 5, transactionType: 'redeem',
                referenceId: null, createdAt: 1000,
            },
        ]);
    });

    it('returns an empty array when there are no entries', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(repo.getUserPointsLedger('u1')).resolves.toEqual([]);
    });

    it('propagates query failures', async () => {
        mockQuery.mockRejectedValue(new Error('db down'));

        await expect(repo.getUserPointsLedger('u1')).rejects.toThrow('db down');
    });
});
