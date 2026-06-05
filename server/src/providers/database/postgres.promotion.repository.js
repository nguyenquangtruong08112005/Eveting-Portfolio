const { query } = require('./postgres.client');

function rowToPromotion(row) {
    return {
        id: row.id,
        organizerId: row.organizer_id,
        code: row.code,
        eventId: row.event_id,
        validFrom: Number(row.valid_from),
        validUntil: Number(row.valid_until),
        usageLimit: row.usage_limit,
        usedCount: row.used_count,
        isPublic: row.is_public,
        createdAt: Number(row.created_at),
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
    const now = new Date().getTime();
    const result = await query(ACTIVE_PROMOTIONS_SQL, [now]);
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
    const result = await query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    if (row.raw_data) {
        return { id: row.id, ...row.raw_data };
    }
    return {
        id: row.id,
        name: row.name,
        description: row.description || '',
        imageUrl: row.image_url || null,
        bannerUrl: row.banner_url || null,
        featuredProfileIds: row.featured_profile_ids || [],
        category: row.category || [],
        tags: row.tags || [],
        date: row.date != null ? Number(row.date) : null,
        endDate: row.end_date != null ? Number(row.end_date) : null,
        eventType: row.event_type || 'physical',
        onlineUrl: row.online_url || null,
        location: row.location || null,
        geohash: row.geohash || null,
        venueId: row.venue_id || null,
        venueName: row.venue_name || null,
        city: row.city || null,
        ticketTypes: row.ticket_types || {},
        minPrice: row.min_price != null ? Number(row.min_price) : 0,
        videoUrl: row.video_url || '',
        isOutdoor: row.is_outdoor || false,
        organizerId: row.organizer_id || null,
        status: row.status || 'pending',
        visibility: row.visibility || 'private',
        recurringRule: row.recurring_rule || null,
        hotScore: row.hot_score != null ? Number(row.hot_score) : 0,
        viewCount: row.view_count != null ? Number(row.view_count) : 0,
        requiredAge: row.required_age != null ? Number(row.required_age) : 0,
        sponsors: row.sponsors || [],
        createdAt: row.created_at != null ? Number(row.created_at) : null,
        lastUpdatedAt: row.last_updated_at != null ? Number(row.last_updated_at) : null,
    };
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
        [promoId, organizerId, code, eventId || null, validFrom, validUntil, usageLimit, usedCount, isPublic, createdAt, JSON.stringify(rest)]
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
    if (updates.validUntil !== undefined) {
        colSets.push(`valid_until = $${idx++}`);
        params.push(updates.validUntil);
    }
    if (updates.isPublic !== undefined) {
        colSets.push(`is_public = $${idx++}`);
        params.push(updates.isPublic);
    }

    const dataKeys = Object.keys(updates).filter(function(k) {
        return ['usageLimit', 'validUntil', 'isPublic', 'id'].indexOf(k) === -1;
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
const findPromoByCodeInTransaction = async (transaction, promoCode) => {
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    const result = await client.query(
        `SELECT id, organizer_id, code, event_id, valid_from, valid_until,
                usage_limit, used_count, is_public, data, created_at
         FROM promotions WHERE code = $1 LIMIT 1`,
        [promoCode]
    );
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
};
