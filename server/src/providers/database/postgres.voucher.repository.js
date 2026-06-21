const { query } = require('./postgres.client');

function rowToVoucher(row) {
    if (!row) return null;
    return {
        id: row.id,
        code: row.code,
        discountType: row.discount_type,
        discountValue: Number(row.discount_value),
        maxDiscount: row.max_discount != null ? Number(row.max_discount) : null,
        minOrder: row.min_order != null ? Number(row.min_order) : 0,
        usageLimit: row.usage_limit,
        usedCount: row.used_count,
        validFrom: row.valid_from,
        validTo: row.valid_to,
        eventId: row.event_id || null,
        createdAt: row.created_at,
    };
}

const findByCode = async (code) => {
    const result = await query(
        'SELECT * FROM vouchers WHERE UPPER(code) = UPPER($1)',
        [code]
    );
    return rowToVoucher(result.rows[0]);
};

const incrementUsage = async (voucherId) => {
    await query(
        'UPDATE vouchers SET used_count = used_count + 1 WHERE id = $1',
        [voucherId]
    );
};

module.exports = { findByCode, incrementUsage };
