const { query } = require('./postgres.client');
const eventRepository = require('./postgres.event.repository');
const { fromDb, nowDb, toDb } = require('./time.helper');

function rowToPromotion(row) {
    return {
        id: row.id,
        organizerId: row.organizer_id,
        code: row.code,
        eventId: row.event_id,
        validFrom: fromDb(row.valid_from),
        validUntil: fromDb(row.valid_until),
        usageLimit: row.usage_limit,
        usedCount: row.used_count,
        isPublic: row.is_public,
        createdAt: fromDb(row.created_at),
        ...row.data
    };
}

const ACTIVE_PROMOTIONS_SQL = `
    SELECT id, organizer_id, code, event_id, valid_from, valid_until,
           usage_limit, used_count, is_public, data, created_at
    FROM promotions
    WHERE is_public = true
      AND valid_until > $1
      AND used_count < usage_limit
`;

const getActivePromotions = async () => {
    const result = await query(ACTIVE_PROMOTIONS_SQL, [nowDb()]);
    return result.rows.map(rowToPromotion);
};

const getPromotionsByOrganizer = async (organizerId) => {
    const result = await query(
        `SELECT id, organizer_id, code, event_id, valid_from, valid_until,
                usage_limit, used_count, is_public, data, created_at
         FROM promotions
         WHERE organizer_id = $1
         ORDER BY created_at DESC`,
        [organizerId]
    );
    return result.rows.map(rowToPromotion);
};

const findByCode = async (code) => {
    const result = await query(
        `SELECT id, organizer_id, code, event_id, valid_from, valid_until,
                usage_limit, used_count, is_public, data, created_at
         FROM promotions WHERE code = $1 LIMIT 1`,
        [code]
    );
    if (result.rows.length === 0) return null;
    return rowToPromotion(result.rows[0]);
};

const getEventById = async (eventId) => {
    return eventRepository.getEventById(eventId);
};

const getPromotionById = async (promoId) => {
    const result = await query(
        `SELECT id, organizer_id, code, event_id, valid_from, valid_until,
                usage_limit, used_count, is_public, data, created_at
         FROM promotions WHERE id = $1`,
        [promoId]
    );
    if (result.rows.length === 0) return null;
    return rowToPromotion(result.rows[0]);
};

const createPromotion = async (promoId, promoData) => {
    const { organizerId, code, eventId, validFrom, validUntil, usageLimit, usedCount, isPublic, createdAt, ...rest } = promoData;
    await query(
        `INSERT INTO promotions (id, organizer_id, code, event_id, valid_from, valid_until, usage_limit, used_count, is_public, created_at, data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           organizer_id = EXCLUDED.organizer_id,
           code = EXCLUDED.code,
           event_id = EXCLUDED.event_id,
           valid_from = EXCLUDED.valid_from,
           valid_until = EXCLUDED.valid_until,
           usage_limit = EXCLUDED.usage_limit,
           used_count = EXCLUDED.used_count,
           is_public = EXCLUDED.is_public,
           created_at = EXCLUDED.created_at,
           data = EXCLUDED.data`,
        [promoId, organizerId, code, eventId || null, toDb(validFrom), toDb(validUntil), usageLimit, usedCount, isPublic, toDb(createdAt) || nowDb(), JSON.stringify(rest)]
    );
};

const updatePromotion = async (promoId, updates) => {
    const colSets = [];
    const dataUpdates = {};
    const params = [];
    let idx = 1;

    if (updates.usageLimit !== undefined) {
        colSets.push(`usage_limit = $${idx++}`);
        params.push(updates.usageLimit);
    }
    if (updates.validFrom !== undefined) {
        colSets.push(`valid_from = $${idx++}`);
        params.push(toDb(updates.validFrom));
    }
    if (updates.validUntil !== undefined) {
        colSets.push(`valid_until = $${idx++}`);
        params.push(toDb(updates.validUntil));
    }
    if (updates.isPublic !== undefined) {
        colSets.push(`is_public = $${idx++}`);
        params.push(updates.isPublic);
    }

    const dataKeys = Object.keys(updates).filter(function(k) {
        return ['usageLimit', 'validFrom', 'validUntil', 'isPublic', 'id'].indexOf(k) === -1;
    });
    for (var i = 0; i < dataKeys.length; i++) {
        dataUpdates[dataKeys[i]] = updates[dataKeys[i]];
    }
    if (Object.keys(dataUpdates).length > 0) {
        colSets.push(`data = data || $${idx++}::jsonb`);
        params.push(JSON.stringify(dataUpdates));
    }

    if (colSets.length === 0) return;

    params.push(promoId);
    await query(
        `UPDATE promotions SET ${colSets.join(', ')} WHERE id = $${idx}`,
        params
    );
};

const deletePromotion = async (promoId) => {
    await query('DELETE FROM promotions WHERE id = $1', [promoId]);
};

// NOTE: This uses the passed transaction client when provided,
// with a global-query fallback only outside a transaction.
const findPromoByCodeInTransaction = async (transaction, promoCode, lock = false) => {
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    const queryStr = `
        SELECT id, organizer_id, code, event_id, valid_from, valid_until,
               usage_limit, used_count, is_public, data, created_at
        FROM promotions WHERE code = $1 LIMIT 1
        ${lock ? 'FOR UPDATE' : ''}
    `;
    const result = await client.query(queryStr, [promoCode]);
    if (result.rows.length === 0) return null;
    const promo = rowToPromotion(result.rows[0]);
    return { ...promo, _id: promo.id };
};

// NOTE: This uses the passed transaction client when provided,
// with a global-query fallback only outside a transaction.
const incrementPromotionUsedCountInTransaction = async (transaction, promoId) => {
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    await client.query(
        'UPDATE promotions SET used_count = used_count + 1 WHERE id = $1',
        [promoId]
    );
};

const decrementPromotionUsedCountInTransaction = async (transaction, promoId) => {
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    await client.query(
        'UPDATE promotions SET used_count = CASE WHEN used_count > 0 THEN used_count - 1 ELSE 0 END WHERE id = $1',
        [promoId]
    );
};

module.exports = {
    getActivePromotions,
    getPromotionsByOrganizer,
    findByCode,
    getEventById,
    getPromotionById,
    createPromotion,
    updatePromotion,
    deletePromotion,
    findPromoByCodeInTransaction,
    incrementPromotionUsedCountInTransaction,
    decrementPromotionUsedCountInTransaction,
};
