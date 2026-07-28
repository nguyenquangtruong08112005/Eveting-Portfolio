const { query, transaction } = require('@/providers/database/postgres.client');

function mapProfile(row) {
    if (!row) return null;
    return {
        organizerId: row.organizer_id,
        fullName: row.full_name,
        encryptedBankAccount: row.encrypted_bank_account,
        maskedBankAccount: row.masked_bank_account,
        bankFingerprint: row.bank_fingerprint,
        bankName: row.bank_name,
        bankBranch: row.bank_branch,
        redInvoiceEnabled: row.red_invoice_enabled,
        businessType: row.business_type,
        address: row.registered_address,
        taxNumber: row.tax_number,
        verificationStatus: row.verification_status,
        verificationNote: row.verification_note,
        kycRequired: row.kyc_required,
        kycRevision: row.kyc_revision,
        verifiedAt: row.verified_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

async function getByOrganizerId(organizerId, tx = null) {
    const client = tx && typeof tx.query === 'function' ? tx : { query };
    const result = await client.query(
        'SELECT * FROM organizer_payment_profiles WHERE organizer_id = $1',
        [organizerId]
    );
    return mapProfile(result.rows[0]);
}

async function upsert(profile) {
    const result = await query(
        `INSERT INTO organizer_payment_profiles (
            organizer_id,
            full_name,
            encrypted_bank_account,
            masked_bank_account,
            bank_fingerprint,
            bank_name,
            bank_branch,
            red_invoice_enabled,
            business_type,
            registered_address,
            tax_number
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (organizer_id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            encrypted_bank_account = EXCLUDED.encrypted_bank_account,
            masked_bank_account = EXCLUDED.masked_bank_account,
            bank_fingerprint = EXCLUDED.bank_fingerprint,
            bank_name = EXCLUDED.bank_name,
            bank_branch = EXCLUDED.bank_branch,
            red_invoice_enabled = EXCLUDED.red_invoice_enabled,
            business_type = EXCLUDED.business_type,
            registered_address = EXCLUDED.registered_address,
            tax_number = EXCLUDED.tax_number
         RETURNING *`,
        [
            profile.organizerId,
            profile.fullName,
            profile.encryptedBankAccount,
            profile.maskedBankAccount,
            profile.bankFingerprint,
            profile.bankName,
            profile.bankBranch,
            profile.redInvoiceEnabled,
            profile.businessType,
            profile.address,
            profile.taxNumber,
        ]
    );
    return mapProfile(result.rows[0]);
}

async function setVerificationStatus(organizerId, status, note) {
    return transaction(async (tx) => {
        const result = await tx.query(
            `UPDATE organizer_payment_profiles
             SET verification_status = $2,
                 verification_note = $3,
                 kyc_required = CASE WHEN $2 = 'VERIFIED' THEN false ELSE true END,
                 verified_at = CASE WHEN $2 = 'VERIFIED' THEN NOW() ELSE NULL END,
                 updated_at = NOW()
             WHERE organizer_id = $1
             RETURNING *`,
            [organizerId, status, note || null]
        );
        if (!result.rows.length) return null;
        const profile = mapProfile(result.rows[0]);
        if (status === 'VERIFIED') {
            await tx.query(
                `INSERT INTO bank_accounts (
                    organizer_id, encrypted_payload, masked_display,
                    keyed_fingerprint, created_at, updated_at
                 ) VALUES ($1, $2, $3, $4, NOW(), NOW())
                 ON CONFLICT (organizer_id) DO UPDATE SET
                    encrypted_payload = EXCLUDED.encrypted_payload,
                    masked_display = EXCLUDED.masked_display,
                    keyed_fingerprint = EXCLUDED.keyed_fingerprint,
                    updated_at = NOW()`,
                [
                    organizerId,
                    profile.encryptedBankAccount,
                    `${profile.bankName} - ${profile.maskedBankAccount}`,
                    profile.bankFingerprint,
                ]
            );
        }
        return profile;
    });
}

async function getInvoiceOrderContext(orderId) {
    const result = await query(
        `SELECT
            o.id AS order_id,
            o.user_id AS requester_user_id,
            o.event_id,
            e.organizer_id,
            opp.red_invoice_enabled,
            au.email AS organizer_email,
            COALESCE(NULLIF(op.company_name, ''), NULLIF(up.name, ''), au.email)
                AS organizer_name
         FROM orders o
         JOIN events e ON e.id = o.event_id
         JOIN auth_users au ON au.id = e.organizer_id
         LEFT JOIN user_profiles up ON up.id = e.organizer_id
         LEFT JOIN organizer_profiles op ON op.user_id = e.organizer_id
         LEFT JOIN organizer_payment_profiles opp
            ON opp.organizer_id = e.organizer_id
         WHERE o.id = $1
           AND o.deleted_at IS NULL
           AND e.deleted_at IS NULL`,
        [orderId]
    );
    return result.rows[0] || null;
}

async function createTaxInvoiceRequest(request, tx) {
    const result = await tx.query(
        `INSERT INTO tax_invoice_requests (
            id, order_id, event_id, organizer_id, requester_user_id,
            company_name, tax_number, billing_address, recipient_email
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING
            id,
            order_id AS "orderId",
            event_id AS "eventId",
            organizer_id AS "organizerId",
            requester_user_id AS "requesterUserId",
            company_name AS "companyName",
            tax_number AS "taxNumber",
            billing_address AS "billingAddress",
            recipient_email AS "recipientEmail",
            status,
            created_at AS "createdAt"`,
        [
            request.id,
            request.orderId,
            request.eventId,
            request.organizerId,
            request.requesterUserId,
            request.companyName,
            request.taxNumber,
            request.billingAddress,
            request.recipientEmail,
        ]
    );
    return result.rows[0];
}

async function listTaxInvoiceRequests(eventId, status, limit, offset) {
    const params = [eventId];
    let statusClause = '';
    if (status) {
        params.push(status);
        statusClause = ` AND tir.status = $${params.length}`;
    }
    params.push(limit, offset);
    const result = await query(
        `SELECT
            tir.id,
            tir.order_id AS "orderId",
            tir.company_name AS "companyName",
            tir.tax_number AS "taxNumber",
            tir.billing_address AS "billingAddress",
            tir.recipient_email AS "recipientEmail",
            tir.status,
            tir.created_at AS "createdAt",
            COUNT(*) OVER()::int AS total
         FROM tax_invoice_requests tir
         WHERE tir.event_id = $1${statusClause}
         ORDER BY tir.created_at DESC, tir.id
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
    );
    return {
        total: result.rows[0]?.total || 0,
        requests: result.rows.map(({ total, ...row }) => row),
    };
}

module.exports = {
    runTransaction: transaction,
    getByOrganizerId,
    upsert,
    setVerificationStatus,
    getInvoiceOrderContext,
    createTaxInvoiceRequest,
    listTaxInvoiceRequests,
};
