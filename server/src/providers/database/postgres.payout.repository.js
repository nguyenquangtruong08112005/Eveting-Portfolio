const { query } = require('./postgres.client');
const { nowDb } = require('./time.helper');

function getClient(tx) {
    return (tx && typeof tx.query === 'function') ? tx : { query };
}

async function getEligibleLedgerEntries(organizerId, cutoff, tx) {
    const client = getClient(tx);
    const result = await client.query(
        `SELECT le.id, le.order_id, le.organizer_id, le.gross_amount, le.platform_fee, le.net_amount, le.created_at
         FROM ledger_entries le
         WHERE le.organizer_id = $1
           AND NOT EXISTS (
               SELECT 1 FROM payout_items pi WHERE pi.ledger_entry_id = le.id
           )
           AND NOT EXISTS (
               SELECT 1
               FROM order_items oi
               JOIN events e ON e.id = oi.event_id
               WHERE oi.order_id = le.order_id
                 AND (e.end_at IS NULL OR e.end_at > $2)
           )
           AND EXISTS (
               SELECT 1
               FROM order_items oi
               JOIN events e ON e.id = oi.event_id
               WHERE oi.order_id = le.order_id
                 AND e.end_at IS NOT NULL
           )
         ORDER BY le.created_at ASC
         FOR UPDATE OF le SKIP LOCKED`,
        [organizerId, cutoff]
    );
    return result.rows.map(r => ({
        id: r.id,
        orderId: r.order_id,
        organizerId: r.organizer_id,
        grossAmount: Number(r.gross_amount),
        platformFee: Number(r.platform_fee),
        netAmount: Number(r.net_amount),
        createdAt: r.created_at,
    }));
}

async function createPayout(payout, tx) {
    const client = getClient(tx);
    await client.query(
        `INSERT INTO payouts (id, organizer_id, amount, status, admin_approval_reason, keyed_fingerprint, provider_reference, provider_message, created_at, updated_at, raw_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
            payout.id,
            payout.organizerId,
            payout.amount,
            payout.status || 'pending_admin_approval',
            payout.adminApprovalReason || null,
            payout.keyedFingerprint || null,
            payout.providerReference || null,
            payout.providerMessage || null,
            nowDb(),
            nowDb(),
            JSON.stringify(payout.rawData || {}),
        ]
    );
}

async function createPayoutItem(item, tx) {
    const client = getClient(tx);
    await client.query(
        `INSERT INTO payout_items (id, payout_id, ledger_entry_id, amount, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [item.id, item.payoutId, item.ledgerEntryId, item.amount, nowDb()]
    );
}

async function getPayoutById(payoutId) {
    const result = await query('SELECT * FROM payouts WHERE id = $1', [payoutId]);
    if (result.rows.length === 0) return null;
    return rowToPayout(result.rows[0]);
}

async function getPayoutsByOrganizer(organizerId, limit = 20, offset = 0) {
    const result = await query(
        'SELECT * FROM payouts WHERE organizer_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [organizerId, limit, offset]
    );
    return result.rows.map(rowToPayout);
}

async function updatePayoutStatus(payoutId, status, updates, tx) {
    const client = getClient(tx);
    const sets = ['status = $2', 'updated_at = $3'];
    const params = [payoutId, status, nowDb()];
    let idx = 4;
    if (updates) {
        if (updates.completedAt) {
            sets.push(`completed_at = $${idx}`);
            params.push(updates.completedAt);
            idx++;
        }
        if (updates.providerReference) {
            sets.push(`provider_reference = $${idx}`);
            params.push(updates.providerReference);
            idx++;
        }
        if (updates.providerMessage) {
            sets.push(`provider_message = $${idx}`);
            params.push(updates.providerMessage);
            idx++;
        }
        if (updates.adminApprovalReason !== undefined) {
            sets.push(`admin_approval_reason = $${idx}`);
            params.push(updates.adminApprovalReason);
            idx++;
        }
    }
    await client.query(
        `UPDATE payouts SET ${sets.join(', ')} WHERE id = $1`,
        params
    );
}

async function upsertBankAccount(organizerId, encryptedPayload, maskedDisplay, keyedFingerprint) {
    await query(
        `INSERT INTO bank_accounts (organizer_id, encrypted_payload, masked_display, keyed_fingerprint, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (organizer_id) DO UPDATE SET
             encrypted_payload = $2,
             masked_display = $3,
             keyed_fingerprint = $4,
             updated_at = $5`,
        [organizerId, encryptedPayload, maskedDisplay, keyedFingerprint, nowDb(), nowDb()]
    );
}

async function getBankAccount(organizerId, tx) {
    const client = getClient(tx);
    const result = await client.query(
        'SELECT * FROM bank_accounts WHERE organizer_id = $1 AND encrypted_payload IS NOT NULL',
        [organizerId]
    );
    if (result.rows.length === 0) return null;
    const r = result.rows[0];
    return {
        organizerId: r.organizer_id,
        encryptedPayload: r.encrypted_payload,
        maskedDisplay: r.masked_display,
        keyedFingerprint: r.keyed_fingerprint,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    };
}

async function getPayoutItems(payoutId) {
    const result = await query('SELECT * FROM payout_items WHERE payout_id = $1', [payoutId]);
    return result.rows.map(r => ({
        id: r.id,
        payoutId: r.payout_id,
        ledgerEntryId: r.ledger_entry_id,
        amount: Number(r.amount),
        createdAt: r.created_at,
    }));
}

async function getPreviousPayoutsCount(organizerId, tx) {
    const client = getClient(tx);
    const result = await client.query(
        'SELECT COUNT(*)::int AS cnt FROM payouts WHERE organizer_id = $1',
        [organizerId]
    );
    return result.rows[0].cnt;
}

async function lockPayoutById(payoutId, tx) {
    const client = getClient(tx);
    const result = await client.query(
        'SELECT * FROM payouts WHERE id = $1 FOR UPDATE',
        [payoutId]
    );
    if (result.rows.length === 0) return null;
    return rowToPayout(result.rows[0]);
}

async function getOrganizerSettings(organizerId) {
    const result = await query(
        'SELECT * FROM organizer_settings WHERE organizer_id = $1',
        [organizerId]
    );
    if (result.rows.length === 0) return null;
    return {
        organizerId: result.rows[0].organizer_id,
        platformFeeRate: Number(result.rows[0].platform_fee_rate),
        createdAt: result.rows[0].created_at,
    };
}

async function upsertOrganizerSettings(organizerId, platformFeeRate) {
    await query(
        `INSERT INTO organizer_settings (organizer_id, platform_fee_rate, created_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (organizer_id) DO UPDATE SET platform_fee_rate = $2`,
        [organizerId, platformFeeRate, nowDb()]
    );
}

async function getEligibleOrganizers() {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const result = await query(
        `SELECT DISTINCT le.organizer_id
         FROM ledger_entries le
         WHERE NOT EXISTS (
               SELECT 1 FROM payout_items pi WHERE pi.ledger_entry_id = le.id
           )
           AND EXISTS (
               SELECT 1 FROM order_items oi
               JOIN events e ON e.id = oi.event_id
               WHERE oi.order_id = le.order_id
                 AND e.end_at IS NOT NULL AND e.end_at <= $1
           )
           AND NOT EXISTS (
               SELECT 1 FROM order_items oi
               JOIN events e ON e.id = oi.event_id
               WHERE oi.order_id = le.order_id
                 AND (e.end_at IS NULL OR e.end_at > $1)
           )`,
        [cutoff]
    );
    return result.rows.map(r => r.organizer_id);
}

async function getProcessingPayouts() {
    const result = await query(
        "SELECT * FROM payouts WHERE status = 'processing' ORDER BY created_at ASC"
    );
    return result.rows.map(rowToPayout);
}

async function getPendingProviderSubmissionPayouts() {
    const result = await query(
        "SELECT * FROM payouts WHERE status = 'pending_provider_submission' ORDER BY created_at ASC"
    );
    return result.rows.map(rowToPayout);
}

async function lockAndUpdatePayout(payoutId, fromStatus, toStatus, updates, tx) {
    const client = getClient(tx);
    const locked = await lockPayoutById(payoutId, tx);
    if (!locked || locked.status !== fromStatus) return false;
    await updatePayoutStatus(payoutId, toStatus, updates, tx);
    return true;
}

async function runTransaction(fn) {
    const { transaction } = require('./postgres.client');
    return transaction(fn);
}

async function getPayoutSummaryByOrganizer(organizerId) {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const result = await query(
        `SELECT
           (SELECT COALESCE(SUM(le.net_amount), 0)
            FROM ledger_entries le
            WHERE le.organizer_id = $1
              AND NOT EXISTS (SELECT 1 FROM payout_items pi WHERE pi.ledger_entry_id = le.id)
              AND NOT EXISTS (
                  SELECT 1 FROM order_items oi JOIN events e ON e.id = oi.event_id
                  WHERE oi.order_id = le.order_id AND (e.end_at IS NULL OR e.end_at > $2))
              AND EXISTS (
                  SELECT 1 FROM order_items oi JOIN events e ON e.id = oi.event_id
                  WHERE oi.order_id = le.order_id AND e.end_at IS NOT NULL)
           ) AS eligible_net,
           (SELECT COALESCE(SUM(amount), 0) FROM payouts WHERE organizer_id = $1 AND status = 'pending_admin_approval') AS pending_approval,
           (SELECT COALESCE(SUM(amount), 0) FROM payouts WHERE organizer_id = $1 AND status = 'processing') AS processing,
           (SELECT COALESCE(SUM(amount), 0) FROM payouts WHERE organizer_id = $1 AND status = 'completed') AS completed`,
        [organizerId, cutoff]
    );
    const r = result.rows[0];
    return {
        eligibleNetAmount: Number(r.eligible_net),
        pendingApprovalAmount: Number(r.pending_approval),
        processingAmount: Number(r.processing),
        completedAmount: Number(r.completed),
    };
}

async function getPayoutsByOrganizerPaginated(organizerId, limit = 20, offset = 0) {
    const result = await query(
        'SELECT * FROM payouts WHERE organizer_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [organizerId, limit, offset]
    );
    const countResult = await query(
        'SELECT COUNT(*)::int AS total FROM payouts WHERE organizer_id = $1',
        [organizerId]
    );
    return {
        payouts: result.rows.map(safePayoutDto),
        total: countResult.rows[0].total,
    };
}

async function getAllPayoutsPaginated(limit = 20, offset = 0, status) {
    const baseQuery = 'SELECT * FROM payouts';
    const countQuery = 'SELECT COUNT(*)::int AS total FROM payouts';
    let where = '';
    const params = [];
    const countParams = [];
    if (status) {
        where = ' WHERE status = $1';
        params.push(status);
        countParams.push(status);
    }
    params.push(limit, offset);
    const result = await query(
        `${baseQuery}${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
    );
    const countResult = await query(
        `${countQuery}${where}`,
        countParams
    );
    return {
        payouts: result.rows.map(safePayoutDto),
        total: countResult.rows[0].total,
    };
}

function safePayoutDto(r) {
    return {
        id: r.id,
        organizerId: r.organizer_id,
        amount: Number(r.amount),
        status: r.status,
        providerReference: r.provider_reference,
        providerMessage: r.provider_message,
        adminApprovalReason: r.admin_approval_reason,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        completedAt: r.completed_at,
    };
}

async function getBankAccountSafe(organizerId) {
    const result = await query(
        'SELECT organizer_id, masked_display, created_at, updated_at FROM bank_accounts WHERE organizer_id = $1 AND encrypted_payload IS NOT NULL',
        [organizerId]
    );
    if (result.rows.length === 0) return null;
    const r = result.rows[0];
    return {
        organizerId: r.organizer_id,
        maskedDisplay: r.masked_display,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    };
}

function rowToPayout(r) {
    return {
        id: r.id,
        organizerId: r.organizer_id,
        amount: Number(r.amount),
        status: r.status,
        adminApprovalReason: r.admin_approval_reason,
        keyedFingerprint: r.keyed_fingerprint,
        providerReference: r.provider_reference,
        providerMessage: r.provider_message,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        completedAt: r.completed_at,
        rawData: r.raw_data,
    };
}

module.exports = {
    getOrganizerSettings,
    upsertOrganizerSettings,
    getEligibleLedgerEntries,
    createPayout,
    createPayoutItem,
    getPayoutById,
    getPayoutsByOrganizer,
    updatePayoutStatus,
    upsertBankAccount,
    getBankAccount,
    getPayoutItems,
    getPreviousPayoutsCount,
    lockPayoutById,
    getEligibleOrganizers,
    getProcessingPayouts,
    getPendingProviderSubmissionPayouts,
    lockAndUpdatePayout,
    getPayoutSummaryByOrganizer,
    getPayoutsByOrganizerPaginated,
    getAllPayoutsPaginated,
    getBankAccountSafe,
    runTransaction,
};
