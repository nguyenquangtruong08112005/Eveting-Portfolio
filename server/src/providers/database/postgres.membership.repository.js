const { query } = require('./postgres.client');
const { toDb, fromDb, nowDb } = require('./time.helper');

function rowToMembership(row) {
    if (!row) return null;
    return {
        userId: row.user_id,
        tierId: row.tier_id,
        tierName: row.name,
        discountPercentage: Number(row.discount_percentage),
        pointsBalance: Number(row.points_balance),
        lifetimePoints: Number(row.lifetime_points),
        updatedAt: fromDb(row.updated_at)
    };
}

function rowToTier(row) {
    if (!row) return null;
    return {
        id: row.id,
        name: row.name,
        minPointsRequired: Number(row.min_points_required),
        discountPercentage: Number(row.discount_percentage),
        perks: row.perks,
        createdAt: fromDb(row.created_at)
    };
}

function rowToLedgerEntry(row) {
    if (!row) return null;
    return {
        id: row.id,
        userId: row.user_id,
        points: Number(row.points),
        transactionType: row.transaction_type,
        referenceId: row.reference_id,
        createdAt: fromDb(row.created_at)
    };
}

const getUserMembershipInTransaction = async (transaction, userId) => {
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    const selectSql = `
        SELECT um.user_id, um.tier_id, um.points_balance, um.lifetime_points, um.updated_at,
               mt.name, mt.discount_percentage, mt.perks
        FROM user_memberships um
        JOIN membership_tiers mt ON um.tier_id = mt.id
        WHERE um.user_id = $1
    `;
    const result = await client.query(selectSql, [userId]);
    if (result.rows.length > 0) {
        return rowToMembership(result.rows[0]);
    }

    // Check user existence first to prevent aborting transaction on foreign key violations
    const userCheck = await client.query('SELECT 1 FROM auth_users WHERE id = $1', [userId]);
    const now = nowDb();
    if (userCheck.rows.length === 0) {
        return {
            userId,
            tierId: 'tier_standard',
            tierName: 'standard',
            discountPercentage: 0,
            pointsBalance: 0,
            lifetimePoints: 0,
            updatedAt: now
        };
    }

    // User exists, insert standard membership row
    await client.query(
        `INSERT INTO user_memberships (user_id, tier_id, points_balance, lifetime_points, updated_at)
         VALUES ($1, 'tier_standard', 0, 0, $2)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, now]
    );

    const afterInsertResult = await client.query(selectSql, [userId]);
    if (afterInsertResult.rows.length > 0) {
        return rowToMembership(afterInsertResult.rows[0]);
    }
    return null;
};

const createUserMembershipInTransaction = async (transaction, userId, tierId = 'tier_standard') => {
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    const userCheck = await client.query('SELECT 1 FROM auth_users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) return;

    const now = nowDb();
    await client.query(
        `INSERT INTO user_memberships (user_id, tier_id, points_balance, lifetime_points, updated_at)
         VALUES ($1, $2, 0, 0, $3)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, tierId, now]
    );
};

const updateUserMembershipPointsAndTierInTransaction = async (transaction, userId, pointsDiff, lifetimePointsDiff, newTierId = null) => {
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    const userCheck = await client.query('SELECT 1 FROM auth_users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) return;

    const now = nowDb();
    if (newTierId) {
        await client.query(
            `UPDATE user_memberships
             SET points_balance = points_balance + $2,
                 lifetime_points = lifetime_points + $3,
                 tier_id = $4,
                 updated_at = $5
             WHERE user_id = $1`,
            [userId, pointsDiff, lifetimePointsDiff, newTierId, now]
        );
    } else {
        await client.query(
            `UPDATE user_memberships
             SET points_balance = points_balance + $2,
                 lifetime_points = lifetime_points + $3,
                 updated_at = $4
             WHERE user_id = $1`,
            [userId, pointsDiff, lifetimePointsDiff, now]
        );
    }
};

const logLoyaltyPointsEntryInTransaction = async (transaction, entryData) => {
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    const userCheck = await client.query('SELECT 1 FROM auth_users WHERE id = $1', [entryData.userId]);
    if (userCheck.rows.length === 0) return;

    await client.query(
        `INSERT INTO loyalty_points_ledger (id, user_id, points, transaction_type, reference_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
            entryData.id,
            entryData.userId,
            entryData.points,
            entryData.transactionType,
            entryData.referenceId || null,
            entryData.createdAt || nowDb()
        ]
    );
};

const getMembershipTiersInTransaction = async (transaction) => {
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    const result = await client.query(
        `SELECT id, name, min_points_required, discount_percentage, perks, created_at
         FROM membership_tiers
         ORDER BY min_points_required ASC`
    );
    return result.rows.map(rowToTier);
};

const getUserPointsLedger = async (userId) => {
    const result = await query(
        `SELECT id, user_id, points, transaction_type, reference_id, created_at
         FROM loyalty_points_ledger
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
    );
    return result.rows.map(rowToLedgerEntry);
};

module.exports = {
    getUserMembershipInTransaction,
    createUserMembershipInTransaction,
    updateUserMembershipPointsAndTierInTransaction,
    logLoyaltyPointsEntryInTransaction,
    getMembershipTiersInTransaction,
    getUserPointsLedger,
};
