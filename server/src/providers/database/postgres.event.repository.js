const { query } = require('./postgres.client');
const {
    STATUS,
    VISIBILITY,
    LIFECYCLE,
    legacyToCanonicalStatus,
    canonicalToLegacyStatus,
} = require('@/modules/events/domain/event-lifecycle');
const ticketTypesHelper = require('./ticket-types.helper');
const socialHelper = require('./social.helper');
const { toDb, fromDb, nowDb } = require('./time.helper');

// Maps update fields to PostgreSQL columns (ticketTypes / featuredProfileIds are relational)
const FIELD_MAP = {
    name: 'name',
    description: 'description',
    imageUrl: 'image_url',
    bannerUrl: 'banner_url',
    category: 'category',
    tags: 'tags',
    date: 'start_at',
    endDate: 'end_at',
    eventType: 'event_type',
    onlineUrl: 'online_url',
    location: 'location',
    geohash: 'geohash',
    venueId: 'venue_id',
    venueName: 'venue_name',
    city: 'city',
    minPrice: 'min_price',
    videoUrl: 'video_url',
    isOutdoor: 'is_outdoor',
    organizerId: 'organizer_id',
    status: 'status',
    visibility: 'visibility',
    recurringRule: 'recurring_rule',
    hotScore: 'hot_score',
    viewCount: 'view_count',
    requiredAge: 'required_age',
    sponsors: 'sponsors',
    createdAt: 'created_at',
    lastUpdatedAt: 'last_updated_at',
    rawData: 'raw_data',
    lifecycleStatus: 'lifecycle_status',
};

function rowToFirebaseDoc(row, extras = {}) {
    if (!row) return null;
    let data;
    if (row.raw_data) {
        data = { ...row.raw_data };
        delete data.lifecycleStatus;
    } else {
        data = {
            name: row.name,
            description: row.description || '',
            imageUrl: row.image_url || null,
            bannerUrl: row.banner_url || null,
            category: row.category || [],
            tags: row.tags || [],
            date: fromDb(row.start_at),
            endDate: fromDb(row.end_at),
            eventType: row.event_type || 'physical',
            onlineUrl: row.online_url || null,
            location: row.location || null,
            geohash: row.geohash || null,
            venueId: row.venue_id || null,
            venueName: row.venue_name || null,
            city: row.city || null,
            minPrice: row.min_price != null ? Number(row.min_price) : 0,
            videoUrl: row.video_url || '',
            isOutdoor: row.is_outdoor || false,
            organizerId: row.organizer_id || null,
            status: row.status || STATUS.PENDING,
            visibility: row.visibility || VISIBILITY.PRIVATE,
            recurringRule: row.recurring_rule || null,
            hotScore: row.hot_score != null ? Number(row.hot_score) : 0,
            viewCount: row.view_count != null ? Number(row.view_count) : 0,
            requiredAge: row.required_age != null ? Number(row.required_age) : 0,
            sponsors: row.sponsors || [],
            createdAt: fromDb(row.created_at),
            lastUpdatedAt: fromDb(row.last_updated_at),
        };
    }
    // Normalize time fields when raw_data path used
    if (row.start_at != null) data.date = fromDb(row.start_at);
    if (row.end_at != null) data.endDate = fromDb(row.end_at);
    if (row.created_at != null) data.createdAt = fromDb(row.created_at);
    if (row.last_updated_at != null) data.lastUpdatedAt = fromDb(row.last_updated_at);
    data.ticketTypes = extras.ticketTypes != null ? extras.ticketTypes : (data.ticketTypes || {});
    data.featuredProfileIds = extras.featuredProfileIds != null
        ? extras.featuredProfileIds
        : (data.featuredProfileIds || []);
    // Prefer relational min price when ticket types present
    if (extras.ticketTypes && Object.keys(extras.ticketTypes).length > 0) {
        data.minPrice = ticketTypesHelper.minPriceFromMap(extras.ticketTypes);
    }
    delete data.id;
    return data;
}

async function hydrateEventRows(rows, client = { query }) {
    if (!rows || rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const [typesByEvent, featuredByEvent] = await Promise.all([
        ticketTypesHelper.loadTicketTypesForEvents(client, ids),
        socialHelper.loadFeaturedProfileIdsForEvents(client, ids),
    ]);
    return rows.map((row) => ({
        id: row.id,
        ...rowToFirebaseDoc(row, {
            ticketTypes: typesByEvent[row.id] || {},
            featuredProfileIds: featuredByEvent[row.id] || [],
        }),
    }));
}

const getEventById = async (eventId) => {
    const result = await query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (result.rows.length === 0) return null;
    const hydrated = await hydrateEventRows(result.rows);
    return hydrated[0];
};

const getEventDataById = async (eventId) => {
    const event = await getEventById(eventId);
    if (!event) return null;
    const { id, ...data } = event;
    return data;
};

const getActiveEventsInDateRange = async (startTime, endTime) => {
    const result = await query(
        `SELECT * FROM events WHERE start_at >= $1 AND start_at < $2 AND status = $3`,
        [startTime, endTime, STATUS.ACTIVE]
    );
    const hydrated = await hydrateEventRows(result.rows);
    return hydrated.map((e) => ({ ...e, _id: e.id }));
};

const updateEvent = async (eventId, updates, transaction = null) => {
    if (!updates || Object.keys(updates).length === 0) return;
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    const sets = [];
    const params = [];
    let idx = 1;

    const columnUpdates = {};
    const rawMerge = {};
    const rawDots = [];
    let fullTicketTypes = undefined;
    const ticketTypeDots = [];
    let fullFeatured = undefined;

    for (const key in updates) {
        if (key === 'id') continue;

        if (key === 'ticketTypes') {
            fullTicketTypes = updates[key];
            if (key !== 'lifecycleStatus') rawMerge[key] = updates[key];
            continue;
        }
        if (key === 'featuredProfileIds') {
            fullFeatured = updates[key];
            if (key !== 'lifecycleStatus') rawMerge[key] = updates[key];
            continue;
        }

        const dotIdx = key.indexOf('.');
        if (dotIdx > 0) {
            const topKey = key.substring(0, dotIdx);
            const nestedKey = key.substring(dotIdx + 1);
            if (topKey === 'ticketTypes') {
                ticketTypeDots.push({ path: nestedKey.split('.'), val: updates[key] });
                rawDots.push({ path: key.split('.'), val: updates[key] });
                continue;
            }
            if (topKey in FIELD_MAP) {
                const col = FIELD_MAP[topKey];
                if (!columnUpdates[col]) {
                    columnUpdates[col] = { hasFullVal: false, dots: [] };
                }
                columnUpdates[col].dots.push({
                    path: nestedKey.split('.'),
                    val: updates[key],
                });
            }
            rawDots.push({ path: key.split('.'), val: updates[key] });
            continue;
        }

        if (key in FIELD_MAP) {
            const col = FIELD_MAP[key];
            if (col !== 'raw_data') {
                if (!columnUpdates[col]) {
                    columnUpdates[col] = { hasFullVal: false, dots: [] };
                }
                columnUpdates[col].hasFullVal = true;
                columnUpdates[col].fullVal = updates[key];
            }
        }

        if (key !== 'lifecycleStatus') {
            rawMerge[key] = updates[key];
        }
    }

    for (const col in columnUpdates) {
        const info = columnUpdates[col];
        if (info.hasFullVal) {
            let expr = `$${idx}`;
            const val = info.fullVal;
            const isJsonb = ['location', 'recurring_rule', 'sponsors'].includes(col);
            if (isJsonb) {
                params.push(val !== null ? JSON.stringify(val) : null);
            } else if (['start_at', 'end_at', 'created_at', 'last_updated_at'].includes(col)) {
                params.push(toDb(val));
            } else {
                params.push(val);
            }
            idx++;

            if (info.dots.length > 0) {
                expr = `to_jsonb(${expr})`;
                for (const dot of info.dots) {
                    expr = `jsonb_set(${expr}, $${idx}::text[], $${idx + 1}::jsonb)`;
                    params.push(dot.path);
                    params.push(JSON.stringify(dot.val));
                    idx += 2;
                }
            }
            sets.push(`${col} = ${expr}`);
        } else if (info.dots.length > 0) {
            let expr = `COALESCE(${col}, '{}'::jsonb)`;
            for (const dot of info.dots) {
                expr = `jsonb_set(${expr}, $${idx}::text[], $${idx + 1}::jsonb)`;
                params.push(dot.path);
                params.push(JSON.stringify(dot.val));
                idx += 2;
            }
            sets.push(`${col} = ${expr}`);
        }
    }

    const hasRawMerge = Object.keys(rawMerge).length > 0;
    const hasRawDots = rawDots.length > 0;

    if (hasRawMerge || hasRawDots) {
        let expr;
        if (hasRawMerge) {
            expr = `COALESCE(raw_data, '{}'::jsonb) || $${idx}::jsonb`;
            params.push(JSON.stringify(rawMerge));
            idx++;
        } else {
            expr = `COALESCE(raw_data, '{}'::jsonb)`;
        }

        if (hasRawDots) {
            for (const dot of rawDots) {
                expr = `jsonb_set(${expr}, $${idx}::text[], $${idx + 1}::jsonb)`;
                params.push(dot.path);
                params.push(JSON.stringify(dot.val));
                idx += 2;
            }
        }
        sets.push(`raw_data = ${expr}`);
    }

    if (fullTicketTypes !== undefined) {
        await ticketTypesHelper.replaceTicketTypes(client, eventId, fullTicketTypes);
        const mp = ticketTypesHelper.minPriceFromMap(fullTicketTypes);
        sets.push(`min_price = $${idx}`);
        params.push(mp);
        idx++;
    }

    for (const dot of ticketTypeDots) {
        // path: [code, field] e.g. ['VIP', 'available']
        const code = dot.path[0];
        const field = dot.path[1];
        if (field === 'available') {
            await ticketTypesHelper.setAvailable(client, eventId, code, Number(dot.val));
        } else if (code) {
            // generic field update on raw_data of type row
            await client.query(
                `UPDATE event_ticket_types
                 SET raw_data = jsonb_set(COALESCE(raw_data, '{}'::jsonb), $1::text[], $2::jsonb),
                     updated_at = $3
                 WHERE event_id = $4 AND code = $5`,
                [[field], JSON.stringify(dot.val), nowDb(), eventId, code]
            );
        }
    }

    if (fullFeatured !== undefined) {
        await socialHelper.replaceFeaturedProfiles(client, eventId, fullFeatured);
    }

    if (sets.length > 0) {
        params.push(eventId);
        await client.query(
            `UPDATE events SET ${sets.join(', ')} WHERE id = $${idx}`,
            params
        );
    }
};

const getEventInTransaction = async (transaction, eventId) => {
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    const result = await client.query('SELECT * FROM events WHERE id = $1 FOR UPDATE', [eventId]);
    if (result.rows.length === 0) return null;
    const hydrated = await hydrateEventRows(result.rows, client);
    return hydrated[0];
};

const updateEventInTransaction = async (transaction, eventId, updates) => {
    return updateEvent(eventId, updates, transaction);
};

const incrementEventTicketTypeAvailableInTransaction = async (transaction, eventId, ticketType, incrementBy) => {
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    await ticketTypesHelper.incrementAvailable(client, eventId, ticketType, incrementBy);
    // Keep raw_data in sync if present
    const pathRawData = ['ticketTypes', ticketType, 'available'];
    await client.query(
        `UPDATE events
         SET raw_data = CASE
             WHEN raw_data ? 'ticketTypes' THEN
                 jsonb_set(
                     COALESCE(raw_data, '{}'::jsonb),
                     $1::text[],
                     to_jsonb(COALESCE((raw_data #>> $1)::int, 0) + $2)
                 )
             ELSE raw_data
         END
         WHERE id = $3`,
        [pathRawData, incrementBy, eventId]
    );
};

const getEventsByOrganizerId = async (organizerId, { page = 1, limit = 20, status } = {}) => {
    let sql = 'SELECT * FROM events WHERE organizer_id = $1';
    const params = [organizerId];
    let idx = 2;

    if (status) {
        sql += ` AND status = $${idx}`;
        params.push(status);
        idx++;
    }

    sql += ' ORDER BY created_at DESC';

    const offset = (page - 1) * limit;
    sql += ` LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    const events = [];
    result.rows.forEach((row) => {
        events.push({
            id: row.id,
            name: row.name,
            date: fromDb(row.start_at),
            bannerUrl: row.banner_url,
            status: row.status,
            viewCount: row.view_count || 0,
        });
    });
    return events;
};

const getEventEntriesByOrganizer = async (organizerId) => {
    const result = await query(
        'SELECT id, start_at FROM events WHERE organizer_id = $1',
        [organizerId]
    );
    const entries = [];
    result.rows.forEach((row) => {
        entries.push({ id: row.id, date: fromDb(row.start_at) });
    });
    return entries;
};

const createEvent = async (eventId, eventData, transaction = null) => {
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    const matchingData = Object.assign({}, eventData);
    delete matchingData.id;
    delete matchingData.lifecycleStatus;

    const category = eventData.category || [];
    const tags = eventData.tags || [];
    const ticketTypes = eventData.ticketTypes || {};
    const minPrice = eventData.minPrice != null
        ? Number(eventData.minPrice)
        : ticketTypesHelper.minPriceFromMap(ticketTypes);

    const lifecycleStatus = eventData.lifecycleStatus
        || (eventData.status ? legacyToCanonicalStatus(eventData.status) : null)
        || LIFECYCLE.DRAFT;
    const legacyStatus = canonicalToLegacyStatus(lifecycleStatus);

    await client.query(
        `INSERT INTO events (
            id, name, description, image_url, banner_url,
            category, tags, start_at, end_at, event_type, online_url, location,
            geohash, venue_id, venue_name, city, min_price,
            video_url, is_outdoor, organizer_id, status, visibility,
            recurring_rule, hot_score, view_count, required_age, sponsors,
            created_at, last_updated_at, raw_data, lifecycle_status
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27,
            $28, $29, $30, $31
        ) ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            image_url = EXCLUDED.image_url,
            banner_url = EXCLUDED.banner_url,
            category = EXCLUDED.category,
            tags = EXCLUDED.tags,
            start_at = EXCLUDED.start_at,
            end_at = EXCLUDED.end_at,
            event_type = EXCLUDED.event_type,
            online_url = EXCLUDED.online_url,
            location = EXCLUDED.location,
            geohash = EXCLUDED.geohash,
            venue_id = EXCLUDED.venue_id,
            venue_name = EXCLUDED.venue_name,
            city = EXCLUDED.city,
            min_price = EXCLUDED.min_price,
            video_url = EXCLUDED.video_url,
            is_outdoor = EXCLUDED.is_outdoor,
            organizer_id = EXCLUDED.organizer_id,
            status = EXCLUDED.status,
            visibility = EXCLUDED.visibility,
            recurring_rule = EXCLUDED.recurring_rule,
            hot_score = EXCLUDED.hot_score,
            view_count = EXCLUDED.view_count,
            required_age = EXCLUDED.required_age,
            sponsors = EXCLUDED.sponsors,
            created_at = EXCLUDED.created_at,
            last_updated_at = EXCLUDED.last_updated_at,
            raw_data = EXCLUDED.raw_data,
            lifecycle_status = COALESCE(EXCLUDED.lifecycle_status, events.lifecycle_status)`,
        [
            eventId,
            eventData.name || '',
            eventData.description || '',
            eventData.imageUrl || null,
            eventData.bannerUrl || null,
            category,
            tags,
            toDb(eventData.date),
            toDb(eventData.endDate),
            eventData.eventType || 'physical',
            eventData.onlineUrl || null,
            eventData.location ? JSON.stringify(eventData.location) : null,
            eventData.geohash || null,
            eventData.venueId || null,
            eventData.venueName || null,
            eventData.city || null,
            minPrice,
            eventData.videoUrl || '',
            eventData.isOutdoor || false,
            eventData.organizerId || null,
            legacyStatus,
            eventData.visibility || VISIBILITY.PRIVATE,
            eventData.recurringRule ? JSON.stringify(eventData.recurringRule) : null,
            eventData.hotScore != null ? Number(eventData.hotScore) : 0,
            eventData.viewCount != null ? Number(eventData.viewCount) : 0,
            eventData.requiredAge != null ? Number(eventData.requiredAge) : 0,
            eventData.sponsors ? JSON.stringify(eventData.sponsors) : '[]',
            toDb(eventData.createdAt) || nowDb(),
            toDb(eventData.lastUpdatedAt) || nowDb(),
            JSON.stringify(matchingData),
            lifecycleStatus,
        ]
    );

    await ticketTypesHelper.replaceTicketTypes(client, eventId, ticketTypes);
    await socialHelper.replaceFeaturedProfiles(client, eventId, eventData.featuredProfileIds || []);
};

const getEventRawById = async (eventId) => {
    const event = await getEventById(eventId);
    if (!event) return { exists: false, id: null, data: null };
    const { id, ...data } = event;
    return { exists: true, id, data };
};

const getPublicEventsPage = async (page, limit) => {
    const offset = (page - 1) * limit;

    const countResult = await query(
        `SELECT COUNT(*)::int AS count FROM events WHERE visibility = $1 AND status = $2`,
        [VISIBILITY.PUBLIC, STATUS.ACTIVE]
    );
    const totalItems = countResult.rows[0].count;

    const result = await query(
        `SELECT * FROM events
         WHERE visibility = $1 AND status = $2
         ORDER BY start_at ASC
         LIMIT $3 OFFSET $4`,
        [VISIBILITY.PUBLIC, STATUS.ACTIVE, limit, offset]
    );

    const hydrated = await hydrateEventRows(result.rows);
    const entries = hydrated.map((fullDoc) => {
        const data = {};
        const selectedFields = [
            'id', 'name', 'date', 'imageUrl', 'bannerUrl', 'videoUrl',
            'location', 'city', 'venueName', 'eventType', 'minPrice',
            'category', 'tags',
        ];
        selectedFields.forEach((field) => {
            if (field === 'id') {
                data.id = fullDoc.id;
            } else if (fullDoc && fullDoc[field] !== undefined) {
                data[field] = fullDoc[field];
            }
        });
        return { id: fullDoc.id, data };
    });

    return { entries, totalItems };
};

const searchPublicEvents = async (searchString, page, limit) => {
    const offset = (page - 1) * limit;

    let sql = `FROM events WHERE visibility = $1 AND status = $2`;
    const params = [VISIBILITY.PUBLIC, STATUS.ACTIVE];
    let idx = 3;

    if (searchString) {
        sql += ` AND (name ILIKE $${idx} OR description ILIKE $${idx} OR city ILIKE $${idx} OR venue_name ILIKE $${idx})`;
        params.push(`%${searchString}%`);
        idx++;
    }

    const countResult = await query(`SELECT COUNT(*)::int AS count ${sql}`, params);
    const totalItems = countResult.rows[0].count;

    const result = await query(
        `SELECT * ${sql} ORDER BY start_at ASC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
    );

    const hydrated = await hydrateEventRows(result.rows);
    const entries = hydrated.map((fullDoc) => {
        const data = {};
        const selectedFields = [
            'id', 'name', 'date', 'imageUrl', 'bannerUrl', 'videoUrl',
            'location', 'city', 'venueName', 'eventType', 'minPrice',
            'category', 'tags',
        ];
        selectedFields.forEach((field) => {
            if (field === 'id') {
                data.id = fullDoc.id;
            } else if (fullDoc && fullDoc[field] !== undefined) {
                data[field] = fullDoc[field];
            }
        });
        return { id: fullDoc.id, data };
    });

    return { entries, totalItems };
};

const queryActivePublicEventsByGeoBounds = async (bounds) => {
    const promises = [];
    for (const b of bounds) {
        promises.push(query(
            `SELECT * FROM events WHERE status = $1 AND visibility = $2 AND geohash >= $3 AND geohash <= $4 ORDER BY geohash`,
            [STATUS.ACTIVE, VISIBILITY.PUBLIC, b[0], b[1]]
        ));
    }
    const results = await Promise.all(promises);
    const allRows = [];
    for (const res of results) {
        allRows.push(...res.rows);
    }
    const hydrated = await hydrateEventRows(allRows);
    return hydrated.map((e) => {
        const { id, ...data } = e;
        return { id, data };
    });
};

const getEventLifecycleOwnership = async (eventId) => {
    const result = await query(
        'SELECT id, organizer_id, lifecycle_status, status, visibility FROM events WHERE id = $1',
        [eventId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0];
};

const getRecommendedEventsRelational = async (interests = [], excludeEventIds = [], limit = 10) => {
    let sql = `SELECT * FROM events WHERE status = $1 AND visibility = $2 AND start_at >= $3`;
    const params = [STATUS.ACTIVE, VISIBILITY.PUBLIC, nowDb()];
    let idx = 4;

    if (interests && interests.length > 0) {
        sql += ` AND (category && $${idx} OR tags && $${idx})`;
        params.push(interests);
        idx++;
    }

    if (excludeEventIds && excludeEventIds.length > 0) {
        sql += ` AND NOT (id = ANY($${idx}))`;
        params.push(excludeEventIds);
        idx++;
    }

    sql += ` ORDER BY hot_score DESC, start_at ASC LIMIT $${idx}`;
    params.push(limit);

    const result = await query(sql, params);
    return hydrateEventRows(result.rows);
};

const getPopularDestinations = async (limit = 10) => {
    const result = await query(
        `SELECT city, COUNT(*)::int AS event_count
         FROM events
         WHERE status = 'published' AND visibility = 'public' AND city IS NOT NULL AND city != ''
         GROUP BY city
         ORDER BY event_count DESC
         LIMIT $1`,
        [limit]
    );
    return result.rows.map((row) => ({
        name: row.city,
        query: row.city,
        eventCount: row.event_count,
    }));
};

module.exports = {
    getEventById,
    getEventDataById,
    getActiveEventsInDateRange,
    updateEvent,
    getEventInTransaction,
    updateEventInTransaction,
    incrementEventTicketTypeAvailableInTransaction,
    getEventsByOrganizerId,
    getEventEntriesByOrganizer,
    createEvent,
    getEventRawById,
    getPublicEventsPage,
    searchPublicEvents,
    queryActivePublicEventsByGeoBounds,
    getEventLifecycleOwnership,
    getRecommendedEventsRelational,
    getPopularDestinations,
};
