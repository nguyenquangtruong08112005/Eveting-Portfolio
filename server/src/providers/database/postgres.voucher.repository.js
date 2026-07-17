const { query } = require('./postgres.client');

/**
 * Vouchers merged into promotions (3NF N4a / migration 040).
 * Keep this module API stable for callers.
 */

function rowToVoucher(row) {
    if (!row) return null;
    const data = row.data && typeof row.data === 'object' ? row.data : {};
    return {
        id: row.id,
        code: row.code,
        discountType: row.discount_type || data.discountType || data.discount_type || 'percent',
        discountValue: row.discount_value != null
            ? Number(row.discount_value)
            : Number(data.discountValue || data.discount_value || 0),
        maxDiscount: row.max_discount != null
            ? Number(row.max_discount)
            : (data.maxDiscount != null ? Number(data.maxDiscount) : null),
        minOrder: row.min_order != null
            ? Number(row.min_order)
            : Number(data.minOrder || 0),
        usageLimit: row.usage_limit,
        usedCount: row.used_count,
        validFrom: row.valid_from,
        validTo: row.valid_until != null ? row.valid_until : null,
        eventId: row.event_id || null,
        createdAt: row.created_at,
    };
}

const findByCode = async (code) => {
    const result = await query(
        'SELECT * FROM promotions WHERE UPPER(code) = UPPER($1) LIMIT 1',
        [code]
    );
    return rowToVoucher(result.rows[0]);
};

const incrementUsage = async (voucherId) => {
    await query(
        'UPDATE promotions SET used_count = used_count + 1 WHERE id = $1',
        [voucherId]
    );
};

module.exports = { findByCode, incrementUsage };
