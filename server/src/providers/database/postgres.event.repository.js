const { query } = require('./postgres.client');
const { STATUS, VISIBILITY } = require('@/modules/events/domain/event-lifecycle');

// Maps updates fields to PostgreSQL columns
const FIELD_MAP = {
    name: 'name',
    description: 'description',
    imageUrl: 'image_url',
    bannerUrl: 'banner_url',
    featuredProfileIds: 'featured_profile_ids',
    category: 'category',
    tags: 'tags',
    date: 'date',
    endDate: 'end_date',
    eventType: 'event_type',
    onlineUrl: 'online_url',
    location: 'location',
    geohash: 'geohash',
    venueId: 'venue_id',
    venueName: 'venue_name',
    city: 'city',
    ticketTypes: 'ticket_types',
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

function rowToFirebaseDoc(row) {
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
            status: row.status || STATUS.PENDING,
            visibility: row.visibility || VISIBILITY.PRIVATE,
            recurringRule: row.recurring_rule || null,
            hotScore: row.hot_score != null ? Number(row.hot_score) : 0,
            viewCount: row.view_count != null ? Number(row.view_count) : 0,
            requiredAge: row.required_age != null ? Number(row.required_age) : 0,
            sponsors: row.sponsors || [],
            createdAt: row.created_at != null ? Number(row.created_at) : null,
            lastUpdatedAt: row.last_updated_at != null ? Number(row.last_updated_at) : null,
        };
    }
    delete data.id;
    return data;
}

const getEventById = async (eventId) => {
    const result = await query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return { id: row.id, ...rowToFirebaseDoc(row) };
};

const getEventDataById = async (eventId) => {
    const result = await query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (result.rows.length === 0) return null;
    return rowToFirebaseDoc(result.rows[0]);
};

const getActiveEventsInDateRange = async (startTime, endTime) => {
    const result = await query(
        `SELECT * FROM events WHERE date >= $1 AND date < $2 AND status = $3`,
        [startTime, endTime, STATUS.ACTIVE]
    );
    return result.rows.map(row => ({ ...rowToFirebaseDoc(row), _id: row.id }));
};

const updateEvent = async (eventId, updates, transaction = null) => {
    if (!updates || Object.keys(updates).length === 0) return;
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    const sets = [];
    const params = [];
    let idx = 1;

    // Group updates by DB column
    const columnUpdates = {}; // colName => { fullVal: any, hasFullVal: boolean, dots: [ { path: string[], val: any } ] }
    const rawMerge = {};
    const rawDots = [];

    for (const key in updates) {
        if (key === 'id') continue;

        const dotIdx = key.indexOf('.');
        if (dotIdx > 0) {
            const topKey = key.substring(0, dotIdx);
            const nestedKey = key.substring(dotIdx + 1);
            if (topKey in FIELD_MAP) {
                const col = FIELD_MAP[topKey];
                if (!columnUpdates[col]) {
                    columnUpdates[col] = { hasFullVal: false, dots: [] };
                }
                columnUpdates[col].dots.push({
                    path: nestedKey.split('.'),
                    val: updates[key]
                });
            }

            // All dot-notation updates on the event object are stored under raw_data
            rawDots.push({
                path: key.split('.'),
                val: updates[key]
            });
            continue;
        }

        // Standard key
        if (key in FIELD_MAP) {
            const col = FIELD_MAP[key];
            if (col !== 'raw_data') { // raw_data is built separately
                if (!columnUpdates[col]) {
                    columnUpdates[col] = { hasFullVal: false, dots: [] };
                }
                columnUpdates[col].hasFullVal = true;
                columnUpdates[col].fullVal = updates[key];
            }
        }

        // Exclude lifecycleStatus from raw_data as in original logic
        if (key !== 'lifecycleStatus') {
            rawMerge[key] = updates[key];
        }
    }

    // Process columns other than raw_data
    for (const col in columnUpdates) {
        const info = columnUpdates[col];
        if (info.hasFullVal) {
            let expr = `$${idx}`;
            const val = info.fullVal;
            const isJsonb = ['location', 'ticket_types', 'recurring_rule', 'sponsors'].includes(col);
            if (isJsonb) {
                params.push(val !== null ? JSON.stringify(val) : null);
            } else if (['date', 'end_date', 'created_at', 'last_updated_at'].includes(col)) {
                params.push(val != null ? Number(val) : null);
            } else {
                params.push(val);
            }
            idx++;

            if (info.dots.length > 0) {
                // If there are dot-notation updates applied on top of full value update
                expr = `to_jsonb(${expr})`;
                for (const dot of info.dots) {
                    expr = `jsonb_set(${expr}, $${idx}::text[], $${idx+1}::jsonb)`;
                    params.push(dot.path);
                    params.push(JSON.stringify(dot.val));
                    idx += 2;
                }
            }
            sets.push(`${col} = ${expr}`);
        } else if (info.dots.length > 0) {
            // Only has dot-notation updates (e.g. ticketTypes.standard.available)
            let expr = `COALESCE(${col}, '{}'::jsonb)`;
            for (const dot of info.dots) {
                expr = `jsonb_set(${expr}, $${idx}::text[], $${idx+1}::jsonb)`;
                params.push(dot.path);
                params.push(JSON.stringify(dot.val));
                idx += 2;
            }
            sets.push(`${col} = ${expr}`);
        }
    }

    // Process raw_data column
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
                expr = `jsonb_set(${expr}, $${idx}::text[], $${idx+1}::jsonb)`;
                params.push(dot.path);
                params.push(JSON.stringify(dot.val));
                idx += 2;
            }
        }
        sets.push(`raw_data = ${expr}`);
    }

    if (sets.length === 0) return;

    params.push(eventId);
    await client.query(
        `UPDATE events SET ${sets.join(', ')} WHERE id = $${idx}`,
        params
    );
};

const getEventInTransaction = async (transaction, eventId) => {
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    const result = await client.query('SELECT * FROM events WHERE id = $1 FOR UPDATE', [eventId]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return { id: row.id, ...rowToFirebaseDoc(row) };
};

const updateEventInTransaction = async (transaction, eventId, updates) => {
    return updateEvent(eventId, updates, transaction);
};

const incrementEventTicketTypeAvailableInTransaction = async (transaction, eventId, ticketType, incrementBy) => {
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    const pathTicketTypes = [ticketType, 'available'];
    const pathRawData = ['ticketTypes', ticketType, 'available'];
    await client.query(
        `UPDATE events
         SET ticket_types = jsonb_set(
                 COALESCE(ticket_types, '{}'::jsonb),
                 $1::text[],
                 to_jsonb(COALESCE((ticket_types #>> $1)::int, 0) + $2)
             ),
             raw_data = jsonb_set(
                 COALESCE(raw_data, '{}'::jsonb),
                 $3::text[],
                 to_jsonb(COALESCE((raw_data #>> $3)::int, 0) + $2)
             )
         WHERE id = $4`,
        [pathTicketTypes, incrementBy, pathRawData, eventId]
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
    sql += ` LIMIT $${idx} OFFSET $${idx+1}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    const events = [];
    result.rows.forEach(row => {
        events.push({
            id: row.id,
            name: row.name,
            date: row.date != null ? Number(row.date) : null,
            bannerUrl: row.banner_url,
            status: row.status,
            viewCount: row.view_count || 0
        });
    });
    return events;
};

const getEventEntriesByOrganizer = async (organizerId) => {
    const result = await query(
        'SELECT id, date FROM events WHERE organizer_id = $1',
        [organizerId]
    );
    const entries = [];
    result.rows.forEach(row => {
        entries.push({ id: row.id, date: row.date != null ? Number(row.date) : null });
    });
    return entries;
};

const createEvent = async (eventId, eventData, transaction = null) => {
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    const matchingData = Object.assign({}, eventData);
    delete matchingData.id;
    delete matchingData.lifecycleStatus;

    const featuredProfileIds = eventData.featuredProfileIds || [];
    const category = eventData.category || [];
    const tags = eventData.tags || [];

    await client.query(
        `INSERT INTO events (
            id, name, description, image_url, banner_url, featured_profile_ids,
            category, tags, date, end_date, event_type, online_url, location,
            geohash, venue_id, venue_name, city, ticket_types, min_price,
            video_url, is_outdoor, organizer_id, status, visibility,
            recurring_rule, hot_score, view_count, required_age, sponsors,
            created_at, last_updated_at, raw_data, lifecycle_status
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29,
            $30, $31, $32, $33
        ) ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            image_url = EXCLUDED.image_url,
            banner_url = EXCLUDED.banner_url,
            featured_profile_ids = EXCLUDED.featured_profile_ids,
            category = EXCLUDED.category,
            tags = EXCLUDED.tags,
            date = EXCLUDED.date,
            end_date = EXCLUDED.end_date,
            event_type = EXCLUDED.event_type,
            online_url = EXCLUDED.online_url,
            location = EXCLUDED.location,
            geohash = EXCLUDED.geohash,
            venue_id = EXCLUDED.venue_id,
            venue_name = EXCLUDED.venue_name,
            city = EXCLUDED.city,
            ticket_types = EXCLUDED.ticket_types,
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
            featuredProfileIds,
            category,
            tags,
            eventData.date != null ? Number(eventData.date) : null,
            eventData.endDate != null ? Number(eventData.endDate) : null,
            eventData.eventType || 'physical',
            eventData.onlineUrl || null,
            eventData.location ? JSON.stringify(eventData.location) : null,
            eventData.geohash || null,
            eventData.venueId || null,
            eventData.venueName || null,
            eventData.city || null,
            eventData.ticketTypes ? JSON.stringify(eventData.ticketTypes) : '{}',
            eventData.minPrice != null ? Number(eventData.minPrice) : 0,
            eventData.videoUrl || '',
            eventData.isOutdoor || false,
            eventData.organizerId || null,
            eventData.status || STATUS.PENDING,
            eventData.visibility || VISIBILITY.PRIVATE,
            eventData.recurringRule ? JSON.stringify(eventData.recurringRule) : null,
            eventData.hotScore != null ? Number(eventData.hotScore) : 0,
            eventData.viewCount != null ? Number(eventData.viewCount) : 0,
            eventData.requiredAge != null ? Number(eventData.requiredAge) : 0,
            eventData.sponsors ? JSON.stringify(eventData.sponsors) : '[]',
            eventData.createdAt != null ? Number(eventData.createdAt) : null,
            eventData.lastUpdatedAt != null ? Number(eventData.lastUpdatedAt) : null,
            JSON.stringify(matchingData),
            eventData.lifecycleStatus || null,
        ]
    );
};

const getEventRawById = async (eventId) => {
    const result = await query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (result.rows.length === 0) return { exists: false, id: null, data: null };
    const row = result.rows[0];
    return { exists: true, id: row.id, data: rowToFirebaseDoc(row) };
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
         ORDER BY date ASC
         LIMIT $3 OFFSET $4`,
        [VISIBILITY.PUBLIC, STATUS.ACTIVE, limit, offset]
    );

    const entries = [];
    result.rows.forEach(row => {
        const fullDoc = rowToFirebaseDoc(row);
        const data = {};
        const selectedFields = [
            "id", "name", "date", "imageUrl", "bannerUrl", "videoUrl",
            "location", "city", "venueName", "eventType", "minPrice",
            "category", "tags"
        ];
        selectedFields.forEach(field => {
            if (field === 'id') {
                data.id = row.id;
            } else if (fullDoc && fullDoc[field] !== undefined) {
                data[field] = fullDoc[field];
            }
        });
        entries.push({ id: row.id, data });
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
        `SELECT * ${sql} ORDER BY date ASC LIMIT $${idx} OFFSET $${idx+1}`,
        [...params, limit, offset]
    );

    const entries = [];
    result.rows.forEach(row => {
        const fullDoc = rowToFirebaseDoc(row);
        const data = {};
        const selectedFields = [
            "id", "name", "date", "imageUrl", "bannerUrl", "videoUrl",
            "location", "city", "venueName", "eventType", "minPrice",
            "category", "tags"
        ];
        selectedFields.forEach(field => {
            if (field === 'id') {
                data.id = row.id;
            } else if (fullDoc && fullDoc[field] !== undefined) {
                data[field] = fullDoc[field];
            }
        });
        entries.push({ id: row.id, data });
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
    const docs = [];
    for (const res of results) {
        res.rows.forEach(row => {
            docs.push({ id: row.id, data: rowToFirebaseDoc(row) });
        });
    }
    return docs;
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
    let sql = `SELECT * FROM events WHERE status = $1 AND visibility = $2 AND date >= $3`;
    const params = [STATUS.ACTIVE, VISIBILITY.PUBLIC, Date.now()];
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

    sql += ` ORDER BY hot_score DESC, date ASC LIMIT $${idx}`;
    params.push(limit);

    const result = await query(sql, params);
    return result.rows.map(row => ({ id: row.id, ...rowToFirebaseDoc(row) }));
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
};

