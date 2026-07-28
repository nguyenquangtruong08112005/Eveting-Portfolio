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
const eventBuilderHelper = require('./event-builder.helper');
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
    isPrivate: 'is_private',
    messageForAttendee: 'message_for_attendee',
    provinceCode: 'province_code',
    provinceName: 'province_name',
    districtCode: 'district_code',
    districtName: 'district_name',
    wardCode: 'ward_code',
    wardName: 'ward_name',
    streetAddress: 'street_address',
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
            isPrivate: row.is_private === true,
            messageForAttendee: row.message_for_attendee || '',
            createdAt: fromDb(row.created_at),
            lastUpdatedAt: fromDb(row.last_updated_at),
        };
    }
    // Canonical lifecycle (draft | submitted | approved | …) — not the same as legacy status
    data.lifecycleStatus = row.lifecycle_status || data.lifecycleStatus || null;
    // Normalize time fields when raw_data path used
    if (row.start_at != null) data.date = fromDb(row.start_at);
    if (row.end_at != null) data.endDate = fromDb(row.end_at);
    if (row.created_at != null) data.createdAt = fromDb(row.created_at);
    if (row.last_updated_at != null) data.lastUpdatedAt = fromDb(row.last_updated_at);

    // Relational columns are SoT — never trust stale Firebase ids from raw_data
    // (raw_data.organizerId often points at deleted Firebase UIDs → FK violations on tickets)
    data.organizerId = row.organizer_id || null;
    data.venueId = row.venue_id != null ? row.venue_id : (data.venueId || null);
    data.venueName = row.venue_name != null ? row.venue_name : (data.venueName || null);
    data.city = row.city != null ? row.city : (data.city || null);
    data.status = row.status || data.status || STATUS.PENDING;
    data.visibility = row.visibility || data.visibility || VISIBILITY.PRIVATE;
    if (row.category != null) data.category = row.category;
    if (row.tags != null) data.tags = row.tags;
    if (row.name != null) data.name = row.name;
    if (row.description != null) data.description = row.description;
    if (row.image_url !== undefined) data.imageUrl = row.image_url;
    if (row.banner_url !== undefined) data.bannerUrl = row.banner_url;
    if (row.event_type != null) data.eventType = row.event_type;
    if (row.online_url !== undefined) data.onlineUrl = row.online_url;
    if (row.min_price != null) data.minPrice = Number(row.min_price);
    data.isPrivate = row.is_private === true;
    data.messageForAttendee = row.message_for_attendee || '';

    const hasStructuredAddress = [
        row.province_code,
        row.province_name,
        row.district_code,
        row.district_name,
        row.ward_code,
        row.ward_name,
        row.street_address,
    ].some((value) => value != null && value !== '');
    if (hasStructuredAddress) {
        const addressDetails = {
            street: row.street_address || '',
            ward: row.ward_name || '',
            district: row.district_name || '',
            city: row.province_name || data.city || '',
            provinceCode: row.province_code || null,
            districtCode: row.district_code || null,
            wardCode: row.ward_code || null,
        };
        data.addressDetails = addressDetails;
        data.vietnamAddress = {
            provinceCode: row.province_code || null,
            provinceName: row.province_name || null,
            districtCode: row.district_code || null,
            districtName: row.district_name || null,
            wardCode: row.ward_code || null,
            wardName: row.ward_name || null,
            streetAddress: row.street_address || null,
        };
    }

    data.ticketTypes = extras.ticketTypes != null ? extras.ticketTypes : (data.ticketTypes || {});
    data.featuredProfileIds = extras.featuredProfileIds != null
        ? extras.featuredProfileIds
        : (data.featuredProfileIds || []);
    data.customQuestions = extras.customQuestions != null
        ? extras.customQuestions
        : (data.customQuestions || []);
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
    // A pg transaction client must not receive concurrent queries. Pool-backed
    // reads remain parallel, while transactional hydration runs sequentially.
    let typesByEvent;
    let featuredByEvent;
    let questionsByEvent;
    if (typeof client.release === 'function') {
        typesByEvent = await ticketTypesHelper.loadTicketTypesForEvents(client, ids);
        featuredByEvent = await socialHelper.loadFeaturedProfileIdsForEvents(client, ids);
        questionsByEvent = await eventBuilderHelper.loadCustomQuestionsForEvents(client, ids);
    } else {
        [typesByEvent, featuredByEvent, questionsByEvent] = await Promise.all([
            ticketTypesHelper.loadTicketTypesForEvents(client, ids),
            socialHelper.loadFeaturedProfileIdsForEvents(client, ids),
            eventBuilderHelper.loadCustomQuestionsForEvents(client, ids),
        ]);
    }
    return rows.map((row) => ({
        id: row.id,
        ...rowToFirebaseDoc(row, {
            ticketTypes: typesByEvent[row.id] || {},
            featuredProfileIds: featuredByEvent[row.id] || [],
            customQuestions: questionsByEvent[row.id] || [],
        }),
    }));
}

const getEventById = async (eventId) => {
    const result = await query(
        'SELECT * FROM events WHERE id = $1 AND deleted_at IS NULL',
        [eventId]
    );
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
    // start_at is TIMESTAMPTZ — never pass raw epoch millis (PG error 22008).
    const { toDb } = require('./time.helper');
    const startAt = toDb(startTime);
    const endAt = toDb(endTime);
    if (!startAt || !endAt) {
        return [];
    }
    const result = await query(
        `SELECT * FROM events WHERE start_at >= $1 AND start_at < $2 AND status = $3 AND deleted_at IS NULL`,
        [startAt, endAt, STATUS.ACTIVE]
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
        // Prefer lifecycle_status for organizer UI (draft vs submitted).
        // Legacy status maps BOTH draft+submitted → "pending", which hid drafts.
        const lifecycle = row.lifecycle_status || null;
        events.push({
            id: row.id,
            name: row.name,
            date: fromDb(row.start_at),
            bannerUrl: row.banner_url,
            status: lifecycle || row.status,
            lifecycleStatus: lifecycle,
            legacyStatus: row.status,
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
            created_at, last_updated_at, is_private, message_for_attendee,
            province_code, province_name, district_code, district_name,
            ward_code, ward_name, street_address, raw_data, lifecycle_status
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27,
            $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40
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
            is_private = EXCLUDED.is_private,
            message_for_attendee = EXCLUDED.message_for_attendee,
            province_code = EXCLUDED.province_code,
            province_name = EXCLUDED.province_name,
            district_code = EXCLUDED.district_code,
            district_name = EXCLUDED.district_name,
            ward_code = EXCLUDED.ward_code,
            ward_name = EXCLUDED.ward_name,
            street_address = EXCLUDED.street_address,
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
            eventData.isPrivate === true,
            eventData.messageForAttendee || '',
            eventData.provinceCode || null,
            eventData.provinceName || null,
            eventData.districtCode || null,
            eventData.districtName || null,
            eventData.wardCode || null,
            eventData.wardName || null,
            eventData.streetAddress || null,
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
    // Attendee feed: only upcoming (or still-running) public events
    const now = nowDb();

    const countResult = await query(
        `SELECT COUNT(*)::int AS count FROM events
         WHERE visibility = $1 AND is_private = false AND status = $2 AND deleted_at IS NULL
           AND (end_at IS NULL OR end_at >= $3)
           AND start_at >= ($3::timestamptz - INTERVAL '6 hours')`,
        [VISIBILITY.PUBLIC, STATUS.ACTIVE, now]
    );
    const totalItems = countResult.rows[0].count;

    const result = await query(
        `SELECT * FROM events
         WHERE visibility = $1 AND is_private = false AND status = $2 AND deleted_at IS NULL
           AND (end_at IS NULL OR end_at >= $3)
           AND start_at >= ($3::timestamptz - INTERVAL '6 hours')
         ORDER BY start_at ASC
         LIMIT $4 OFFSET $5`,
        [VISIBILITY.PUBLIC, STATUS.ACTIVE, now, limit, offset]
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

const searchPublicEvents = async (searchStringOrOptions, pageArg, limitArg) => {
    let rawFilters = {};
    if (typeof searchStringOrOptions === 'object' && searchStringOrOptions !== null) {
        rawFilters = searchStringOrOptions;
    } else {
        rawFilters = {
            q: searchStringOrOptions || '',
            page: pageArg,
            limit: limitArg,
        };
    }

    const { normalizeSearchParams, parseDateToMs } = require('../../modules/events/application/query-builders/search-query.builder');
    const filters = normalizeSearchParams(rawFilters);

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const offset = (page - 1) * limit;
    const now = nowDb();

    let sql = `FROM events WHERE visibility = $1 AND is_private = false AND status = $2 AND deleted_at IS NULL
      AND (end_at IS NULL OR end_at >= $3)
      AND start_at >= ($3::timestamptz - INTERVAL '6 hours')`;
    const params = [VISIBILITY.PUBLIC, STATUS.ACTIVE, now];
    let idx = 4;

    const searchString = filters.q || '';
    if (searchString) {
        sql += ` AND (name ILIKE $${idx} OR description ILIKE $${idx} OR city ILIKE $${idx} OR venue_name ILIKE $${idx})`;
        params.push(`%${searchString}%`);
        idx++;
    }

    if (filters.category) {
        const cat = String(filters.category).toLowerCase();
        sql += ` AND (category @> ARRAY[$${idx}]::text[] OR category::text ILIKE $${idx + 1})`;
        params.push(cat, `%${cat}%`);
        idx += 2;
    }

    if (filters.city) {
        sql += ` AND city ILIKE $${idx}`;
        params.push(`%${filters.city}%`);
        idx++;
    }

    const startMs = parseDateToMs(filters.startDate, false);
    if (startMs !== null) {
        sql += ` AND (date >= $${idx} OR start_at >= to_timestamp($${idx + 1}))`;
        params.push(startMs, startMs / 1000.0);
        idx += 2;
    }

    const endMs = parseDateToMs(filters.endDate, true);
    if (endMs !== null) {
        sql += ` AND (date <= $${idx} OR start_at <= to_timestamp($${idx + 1}))`;
        params.push(endMs, endMs / 1000.0);
        idx += 2;
    }

    if (filters.minPrice !== undefined && filters.minPrice !== '' && !isNaN(Number(filters.minPrice))) {
        sql += ` AND min_price >= $${idx}`;
        params.push(Number(filters.minPrice));
        idx++;
    }

    if (filters.maxPrice !== undefined && filters.maxPrice !== '' && !isNaN(Number(filters.maxPrice))) {
        sql += ` AND min_price <= $${idx}`;
        params.push(Number(filters.maxPrice));
        idx++;
    }

    if (filters.hasVideo === 'true') {
        sql += ` AND video_url IS NOT NULL AND video_url != ''`;
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
            `SELECT * FROM events WHERE status = $1 AND visibility = $2 AND is_private = false AND deleted_at IS NULL AND geohash >= $3 AND geohash <= $4 ORDER BY geohash`,
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
        'SELECT id, organizer_id, lifecycle_status, status, visibility FROM events WHERE id = $1 AND deleted_at IS NULL',
        [eventId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0];
};

const getRecommendedEventsRelational = async (interests = [], excludeEventIds = [], limit = 10) => {
    let sql = `SELECT * FROM events WHERE status = $1 AND visibility = $2 AND is_private = false AND deleted_at IS NULL AND start_at >= $3`;
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
         WHERE status = 'published' AND visibility = 'public' AND deleted_at IS NULL
           AND city IS NOT NULL AND city != ''
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

const listVietnamLocations = async (filters) => {
    return eventBuilderHelper.listVietnamLocations(filters);
};

const hasTicketSalesStarted = async (eventId, transaction = null) => {
    return eventBuilderHelper.hasTicketSalesStarted(transaction, eventId);
};

const getCustomQuestions = async (eventId, transaction = null) => {
    return eventBuilderHelper.loadCustomQuestions(transaction, eventId);
};

const replaceCustomQuestionsInTransaction = async (transaction, eventId, questions) => {
    return eventBuilderHelper.replaceCustomQuestions(transaction, eventId, questions);
};

const getBuyerOrderInTransaction = async (transaction, eventId, orderId, userId) => {
    return eventBuilderHelper.getBuyerOrder(transaction, eventId, orderId, userId);
};

const replaceOrderAttendeesInTransaction = async (
    transaction,
    eventId,
    orderId,
    attendees,
    questionSnapshot
) => {
    return eventBuilderHelper.replaceOrderAttendees(
        transaction,
        eventId,
        orderId,
        attendees,
        questionSnapshot
    );
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
    listVietnamLocations,
    hasTicketSalesStarted,
    getCustomQuestions,
    replaceCustomQuestionsInTransaction,
    getBuyerOrderInTransaction,
    replaceOrderAttendeesInTransaction,
};
