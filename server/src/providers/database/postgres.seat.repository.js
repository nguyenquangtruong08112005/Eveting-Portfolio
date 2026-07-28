const { query, transaction: runTransaction } = require('./postgres.client');
const { toDb, fromDb, nowDb } = require('./time.helper');

const PERFORMANCE_SEAT_STATUSES = Object.freeze({
    AVAILABLE: 'AVAILABLE',
    HELD: 'HELD',
    SOLD: 'SOLD',
    BLOCKED: 'BLOCKED'
});

const getClient = (transaction) => (
    transaction && typeof transaction.query === 'function'
        ? transaction
        : { query }
);

const createSeatMap = async (mapId, mapData, transaction = null) => {
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    await client.query(
        `INSERT INTO seat_maps (id, name, total_rows, total_cols, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET name = $2, total_rows = $3, total_cols = $4`,
        [mapId, mapData.name, mapData.totalRows, mapData.totalCols, toDb(mapData.createdAt) || nowDb()]
    );
};

const createSeatSections = async (sectionsArray, transaction = null) => {
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    for (const section of sectionsArray) {
        await client.query(
            `INSERT INTO seat_sections (id, seat_map_id, name, price_multiplier, created_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO UPDATE SET name = $3, price_multiplier = $4`,
            [section.id, section.seatMapId, section.name, section.priceMultiplier || 1.0, toDb(section.createdAt) || nowDb()]
        );
    }
};

const createSeats = async (seatsArray, transaction = null) => {
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    for (const seat of seatsArray) {
        await client.query(
            `INSERT INTO seats (id, seat_section_id, row_name, seat_number, status, created_at, code)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO UPDATE SET status = $5, code = $7`,
            [
                seat.id,
                seat.seatSectionId,
                seat.rowName,
                seat.seatNumber,
                seat.status || 'available',
                toDb(seat.createdAt) || nowDb(),
                seat.code || `${seat.rowName}${seat.seatNumber}`
            ]
        );
    }
};

const getSeatsBySection = async (sectionId) => {
    const result = await query(
        `SELECT * FROM seats WHERE seat_section_id = $1 ORDER BY row_name, seat_number`,
        [sectionId]
    );
    return result.rows.map(row => ({
        id: row.id,
        seatSectionId: row.seat_section_id,
        rowName: row.row_name,
        seatNumber: row.seat_number,
        status: row.status,
        createdAt: fromDb(row.created_at)
    }));
};

const getSeatMapById = async (mapId) => {
    const result = await query('SELECT * FROM seat_maps WHERE id = $1', [mapId]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
        id: row.id,
        name: row.name,
        totalRows: row.total_rows,
        totalCols: row.total_cols,
        createdAt: fromDb(row.created_at)
    };
};

const getSeatsByMapId = async (mapId) => {
    const result = await query(
        `SELECT s.* FROM seats s
         JOIN seat_sections ss ON s.seat_section_id = ss.id
         WHERE ss.seat_map_id = $1
         ORDER BY ss.name, s.row_name, s.seat_number`,
        [mapId]
    );
    return result.rows.map(row => ({
        id: row.id,
        seatSectionId: row.seat_section_id,
        rowName: row.row_name,
        seatNumber: row.seat_number,
        status: row.status,
        createdAt: fromDb(row.created_at)
    }));
};

const updateSeatStatus = async (seatId, status, transaction = null) => {
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    await client.query(
        `UPDATE seats SET status = $1 WHERE id = $2`,
        [status, seatId]
    );
};

const getSeatById = async (seatId) => {
    const result = await query('SELECT * FROM seats WHERE id = $1', [seatId]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
        id: row.id,
        seatSectionId: row.seat_section_id,
        rowName: row.row_name,
        seatNumber: row.seat_number,
        status: row.status,
        createdAt: fromDb(row.created_at)
    };
};

const createSeatHold = async (holdData, transaction = null) => {
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    await client.query(
        `INSERT INTO seat_holds (id, event_id, seat_id, user_id, held_at, expires_at, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
            holdData.id,
            holdData.eventId,
            holdData.seatId,
            holdData.userId,
            toDb(holdData.heldAt) || nowDb(),
            toDb(holdData.expiresAt),
            holdData.status || 'held',
            toDb(holdData.createdAt) || nowDb()
        ]
    );
};

const getSeatHold = async (holdId) => {
    const result = await query('SELECT * FROM seat_holds WHERE id = $1', [holdId]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
        id: row.id,
        eventId: row.event_id,
        seatId: row.seat_id,
        userId: row.user_id,
        heldAt: fromDb(row.held_at),
        expiresAt: fromDb(row.expires_at),
        status: row.status,
        createdAt: fromDb(row.created_at)
    };
};

const getActiveHoldForSeat = async (eventId, seatId) => {
    const result = await query(
        `SELECT * FROM seat_holds 
         WHERE event_id = $1 AND seat_id = $2 AND status = 'held' AND expires_at > $3`,
        [eventId, seatId, nowDb()]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
        id: row.id,
        eventId: row.event_id,
        seatId: row.seat_id,
        userId: row.user_id,
        heldAt: fromDb(row.held_at),
        expiresAt: fromDb(row.expires_at),
        status: row.status,
        createdAt: fromDb(row.created_at)
    };
};

const releaseSeatHold = async (holdId, transaction = null) => {
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    await client.query(
        `UPDATE seat_holds SET status = 'released' WHERE id = $1`,
        [holdId]
    );
};

const releaseExpiredHolds = async (currentTime = Date.now(), transaction = null) => {
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    const result = await client.query(
        `UPDATE seat_holds 
         SET status = 'released' 
         WHERE status = 'held' AND expires_at <= $1
         RETURNING id`,
        [toDb(currentTime)]
    );
    return result.rows.map(row => row.id);
};

const convertHoldToSold = async (holdId, transaction = null) => {
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    await client.query(
        `UPDATE seat_holds SET status = 'converted' WHERE id = $1`,
        [holdId]
    );
};

const getSeatsWithStatuses = async (eventId) => {
    // 1. Get seat map ID for the event
    const eventResult = await query('SELECT venue_id, raw_data FROM events WHERE id = $1', [eventId]);
    if (eventResult.rows.length === 0) return [];
    const eventRow = eventResult.rows[0];
    let seatMapId = eventRow.raw_data?.seatMapId || eventRow.raw_data?.seat_map_id || eventRow.raw_data?.raw_data?.seatMapId || eventRow.raw_data?.raw_data?.seat_map_id;
    if (!seatMapId && eventRow.venue_id) {
        const venueResult = await query('SELECT data FROM venues WHERE id = $1', [eventRow.venue_id]);
        if (venueResult.rows.length > 0) {
            const venueData = venueResult.rows[0].data;
            seatMapId = venueData?.seatMapId || venueData?.seat_map_id;
        }
    }

    if (!seatMapId) return [];

    // 2. Fetch all seats for this seat map
    const seatsResult = await query(
        `SELECT s.id, s.seat_section_id, s.row_name, s.seat_number, s.status as structural_status,
                ss.name as section_name, ss.price_multiplier
         FROM seats s
         JOIN seat_sections ss ON s.seat_section_id = ss.id
         WHERE ss.seat_map_id = $1
         ORDER BY ss.name, s.row_name, s.seat_number`,
        [seatMapId]
    );

    // 3. Fetch active holds
    const holdsResult = await query(
        `SELECT seat_id FROM seat_holds 
         WHERE event_id = $1 AND status = 'held' AND expires_at > $2`,
        [eventId, nowDb()]
    );
    const heldSeats = new Set(holdsResult.rows.map(r => r.seat_id));

    // 4. Fetch sold tickets
    const ticketsResult = await query(
        `SELECT DISTINCT seat FROM tickets 
         WHERE event_id = $1 AND status != 'cancelled' AND seat IS NOT NULL`,
        [eventId]
    );
    const soldSeats = new Set(ticketsResult.rows.map(r => r.seat));

    // 5. Map status
    return seatsResult.rows.map(row => {
        let status = 'available';
        if (row.structural_status === 'blocked') {
            status = 'blocked';
        } else if (soldSeats.has(row.id)) {
            status = 'sold';
        } else if (heldSeats.has(row.id)) {
            status = 'held';
        }

        return {
            id: row.id,
            seatSectionId: row.seat_section_id,
            sectionName: row.section_name,
            priceMultiplier: Number(row.price_multiplier),
            rowName: row.row_name,
            seatNumber: row.seat_number,
            status
        };
    });
};

const createPerformance = async (performanceData, transaction = null) => {
    const client = getClient(transaction);
    const result = await client.query(
        `INSERT INTO performances (
            id, event_id, seat_map_id, starts_at, ends_at, status, is_default, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
         RETURNING id, event_id, seat_map_id, starts_at, ends_at, status, is_default`,
        [
            performanceData.id,
            performanceData.eventId,
            performanceData.seatMapId,
            toDb(performanceData.startsAt),
            toDb(performanceData.endsAt),
            performanceData.status || 'SCHEDULED',
            Boolean(performanceData.isDefault),
            toDb(performanceData.createdAt) || nowDb()
        ]
    );
    return result.rows[0];
};

const materializePerformanceSeats = async (performanceId, transaction = null) => {
    const client = getClient(transaction);
    const result = await client.query(
        `INSERT INTO performance_seats (id, performance_id, seat_id, status)
         SELECT
             'pseat_' || MD5(p.id || ':' || s.id),
             p.id,
             s.id,
             CASE WHEN s.status = 'blocked' THEN 'BLOCKED' ELSE 'AVAILABLE' END
         FROM performances p
         JOIN seat_sections ss ON ss.seat_map_id = p.seat_map_id
         JOIN seats s ON s.seat_section_id = ss.id
         WHERE p.id = $1
         ORDER BY ss.sort_order, ss.name, s.row_name, s.seat_number
         ON CONFLICT (performance_id, seat_id) DO NOTHING
         RETURNING id, seat_id, status`,
        [performanceId]
    );
    return result.rows.map((row) => ({
        id: row.id,
        seatId: row.seat_id,
        status: row.status
    }));
};

const getPerformanceSeatAvailability = async (eventId, performanceId = null, transaction = null) => {
    const client = getClient(transaction);
    const performanceResult = await client.query(
        `SELECT id, event_id, seat_map_id, starts_at, ends_at, status, is_default
         FROM performances
         WHERE event_id = $1
           AND ($2::text IS NULL OR id = $2)
         ORDER BY
             CASE WHEN id = $2 THEN 0 WHEN is_default THEN 1 ELSE 2 END,
             starts_at NULLS LAST,
             id
         LIMIT 1`,
        [eventId, performanceId]
    );

    if (performanceResult.rows.length === 0) return null;

    const performance = performanceResult.rows[0];
    const seatsResult = await client.query(
        `SELECT
             ps.id,
             ps.seat_id,
             CASE
                 WHEN ps.status = 'HELD' AND ps.hold_expires_at <= NOW() THEN 'AVAILABLE'
                 ELSE ps.status
             END AS status,
             ps.hold_expires_at,
             ps.price,
             ps.ticket_type_id,
             s.code,
             s.row_name,
             s.seat_number,
             s.x,
             s.y,
             s.metadata,
             ss.id AS section_id,
             ss.name AS section_name,
             ss.color AS section_color,
             ss.sort_order AS section_sort_order,
             ss.price_multiplier
         FROM performance_seats ps
         JOIN seats s ON s.id = ps.seat_id
         JOIN seat_sections ss ON ss.id = s.seat_section_id
         WHERE ps.performance_id = $1
         ORDER BY ss.sort_order, ss.name, s.row_name, s.seat_number`,
        [performance.id]
    );

    return {
        eventId: performance.event_id,
        performanceId: performance.id,
        seatMapId: performance.seat_map_id,
        startsAt: fromDb(performance.starts_at),
        endsAt: fromDb(performance.ends_at),
        performanceStatus: performance.status,
        seats: seatsResult.rows.map((row) => ({
            id: row.id,
            seatId: row.seat_id,
            code: row.code,
            rowName: row.row_name,
            seatNumber: row.seat_number,
            sectionId: row.section_id,
            sectionName: row.section_name,
            sectionColor: row.section_color,
            sectionSortOrder: row.section_sort_order,
            priceMultiplier: Number(row.price_multiplier),
            price: row.price === null ? null : Number(row.price),
            ticketTypeId: row.ticket_type_id,
            x: row.x === null ? null : Number(row.x),
            y: row.y === null ? null : Number(row.y),
            metadata: row.metadata || {},
            status: row.status,
            holdExpiresAt: row.status === PERFORMANCE_SEAT_STATUSES.HELD
                ? fromDb(row.hold_expires_at)
                : null
        }))
    };
};

const getPerformanceSeatLayout = async (eventId, performanceId, transaction = null) => {
    const client = getClient(transaction);
    const result = await client.query(
        `SELECT p.id, p.event_id, p.seat_map_id, sm.layout_schema, sm.version
         FROM performances p
         JOIN seat_maps sm ON sm.id = p.seat_map_id
         WHERE p.event_id = $1 AND p.id = $2`,
        [eventId, performanceId]
    );
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
        eventId: row.event_id,
        performanceId: row.id,
        seatMapId: row.seat_map_id,
        layout: row.layout_schema,
        version: row.version
    };
};

const savePerformanceSeatLayout = async (eventId, performanceId, layout, transaction = null) => {
    if (!transaction) {
        return runTransaction((client) => (
            savePerformanceSeatLayout(eventId, performanceId, layout, client)
        ));
    }

    const client = getClient(transaction);
    const performanceResult = await client.query(
        `SELECT id, event_id, seat_map_id
         FROM performances
         WHERE event_id = $1 AND id = $2
         FOR UPDATE`,
        [eventId, performanceId]
    );
    if (performanceResult.rows.length === 0) return null;

    const performance = performanceResult.rows[0];
    const updated = await client.query(
        `UPDATE seat_maps
         SET layout_schema = $1::jsonb, version = version + 1, updated_at = NOW()
         WHERE id = $2
         RETURNING layout_schema, version`,
        [JSON.stringify(layout), performance.seat_map_id]
    );
    const row = updated.rows[0];
    return {
        eventId: performance.event_id,
        performanceId: performance.id,
        seatMapId: performance.seat_map_id,
        layout: row.layout_schema,
        version: row.version
    };
};

const holdPerformanceSeats = async (holdData, transaction = null) => {
    if (!transaction) {
        return runTransaction((client) => holdPerformanceSeats(holdData, client));
    }

    const client = getClient(transaction);
    const seatIds = [...new Set(holdData.seatIds)].sort();
    const lockedResult = await client.query(
        `SELECT
             ps.id,
             ps.seat_id,
             ps.status,
             ps.held_by_user_id,
             ps.hold_token,
             ps.hold_expires_at
         FROM performance_seats ps
         JOIN performances p ON p.id = ps.performance_id
         WHERE p.event_id = $1
           AND ps.performance_id = $2
           AND ps.seat_id = ANY($3::text[])
         ORDER BY ps.seat_id
         FOR UPDATE OF ps`,
        [holdData.eventId, holdData.performanceId, seatIds]
    );

    const unavailableSeatIds = [];
    if (lockedResult.rows.length !== seatIds.length) {
        const found = new Set(lockedResult.rows.map((row) => row.seat_id));
        unavailableSeatIds.push(...seatIds.filter((seatId) => !found.has(seatId)));
    }

    const now = Date.now();
    for (const row of lockedResult.rows) {
        const expired = row.status === PERFORMANCE_SEAT_STATUSES.HELD
            && fromDb(row.hold_expires_at) <= now;
        if (row.status !== PERFORMANCE_SEAT_STATUSES.AVAILABLE && !expired) {
            unavailableSeatIds.push(row.seat_id);
        }
    }

    if (unavailableSeatIds.length > 0) {
        return {
            held: false,
            unavailableSeatIds: [...new Set(unavailableSeatIds)].sort()
        };
    }

    const expiredPerformanceSeatIds = lockedResult.rows
        .filter((row) => (
            row.status === PERFORMANCE_SEAT_STATUSES.HELD
            && fromDb(row.hold_expires_at) <= now
        ))
        .map((row) => row.id);
    if (expiredPerformanceSeatIds.length > 0) {
        await client.query(
            `UPDATE seat_holds
             SET status = 'expired', released_at = NOW(), updated_at = NOW()
             WHERE performance_seat_id = ANY($1::text[])
               AND status = 'held'`,
            [expiredPerformanceSeatIds]
        );
    }

    const expiresAt = toDb(holdData.expiresAt);
    const updatedResult = await client.query(
        `UPDATE performance_seats
         SET
             status = 'HELD',
             held_by_user_id = $1,
             hold_token = $2,
             hold_expires_at = $3,
             sold_ticket_id = NULL,
             version = version + 1,
             updated_at = NOW()
         WHERE performance_id = $4
           AND seat_id = ANY($5::text[])
         RETURNING id, seat_id, hold_expires_at`,
        [holdData.userId, holdData.holdToken, expiresAt, holdData.performanceId, seatIds]
    );

    await client.query(
        `INSERT INTO seat_holds (
             id,
             event_id,
             seat_id,
             user_id,
             held_at,
             expires_at,
             status,
             created_at,
             performance_id,
             performance_seat_id,
             hold_token,
             updated_at
         )
         SELECT
             'hold_' || MD5($1 || ':' || ps.id),
             $2,
             ps.seat_id,
             $3,
             NOW(),
             $4,
             'held',
             NOW(),
             $5,
             ps.id,
             $1,
             NOW()
         FROM performance_seats ps
         WHERE ps.performance_id = $5
           AND ps.seat_id = ANY($6::text[])`,
        [
            holdData.holdToken,
            holdData.eventId,
            holdData.userId,
            expiresAt,
            holdData.performanceId,
            seatIds
        ]
    );

    return {
        held: true,
        seats: updatedResult.rows.map((row) => ({
            id: row.id,
            seatId: row.seat_id,
            expiresAt: fromDb(row.hold_expires_at)
        }))
    };
};

const releasePerformanceSeatHold = async (releaseData, transaction = null) => {
    if (!transaction) {
        return runTransaction((client) => releasePerformanceSeatHold(releaseData, client));
    }

    const client = getClient(transaction);
    const requestedSeatIds = Array.isArray(releaseData.seatIds)
        ? [...new Set(releaseData.seatIds)].sort()
        : null;
    const lockedResult = await client.query(
        `SELECT ps.id, ps.seat_id
         FROM performance_seats ps
         JOIN performances p ON p.id = ps.performance_id
         WHERE p.event_id = $1
           AND ps.performance_id = $2
           AND ps.status = 'HELD'
           AND ps.held_by_user_id = $3
           AND ps.hold_token = $4
           AND ($5::text[] IS NULL OR ps.seat_id = ANY($5::text[]))
         ORDER BY ps.seat_id
         FOR UPDATE OF ps`,
        [
            releaseData.eventId,
            releaseData.performanceId,
            releaseData.userId,
            releaseData.holdToken,
            requestedSeatIds
        ]
    );

    if (requestedSeatIds && lockedResult.rows.length !== requestedSeatIds.length) {
        return { released: false, seatIds: [] };
    }

    if (lockedResult.rows.length === 0) {
        const ownershipResult = await client.query(
            `SELECT 1
             FROM performance_seats
             WHERE performance_id = $1
               AND status = 'HELD'
               AND hold_token = $2
             LIMIT 1`,
            [releaseData.performanceId, releaseData.holdToken]
        );
        if (ownershipResult.rows.length > 0) {
            return { released: false, seatIds: [] };
        }
        return { released: true, seatIds: [] };
    }

    const performanceSeatIds = lockedResult.rows.map((row) => row.id);
    const updatedResult = await client.query(
        `UPDATE performance_seats
         SET
             status = 'AVAILABLE',
             held_by_user_id = NULL,
             hold_token = NULL,
             hold_expires_at = NULL,
             version = version + 1,
             updated_at = NOW()
         WHERE id = ANY($1::text[])
         RETURNING seat_id`,
        [performanceSeatIds]
    );

    await client.query(
        `UPDATE seat_holds
         SET status = 'released', released_at = NOW(), updated_at = NOW()
         WHERE performance_seat_id = ANY($1::text[])
           AND user_id = $2
           AND hold_token = $3
           AND status = 'held'`,
        [performanceSeatIds, releaseData.userId, releaseData.holdToken]
    );

    return {
        released: true,
        seatIds: updatedResult.rows.map((row) => row.seat_id).sort()
    };
};

const convertPerformanceSeatHoldToSold = async (conversionData, transaction = null) => {
    if (!transaction) {
        return runTransaction((client) => convertPerformanceSeatHoldToSold(conversionData, client));
    }

    const client = getClient(transaction);
    const seatIds = [...new Set(conversionData.seatIds)].sort();
    const lockedResult = await client.query(
        `SELECT ps.id, ps.seat_id
         FROM performance_seats ps
         JOIN performances p ON p.id = ps.performance_id
         WHERE p.event_id = $1
           AND ps.performance_id = $2
           AND ps.seat_id = ANY($3::text[])
           AND ps.status = 'HELD'
           AND ps.held_by_user_id = $4
           AND ps.hold_token = $5
           AND ps.hold_expires_at > NOW()
         ORDER BY ps.seat_id
         FOR UPDATE OF ps`,
        [
            conversionData.eventId,
            conversionData.performanceId,
            seatIds,
            conversionData.userId,
            conversionData.holdToken
        ]
    );

    if (lockedResult.rows.length !== seatIds.length) {
        return { converted: false, seatIds: [] };
    }

    const performanceSeatIds = lockedResult.rows.map((row) => row.id);
    const updatedResult = await client.query(
        `UPDATE performance_seats
         SET
             status = 'SOLD',
             held_by_user_id = NULL,
             hold_token = NULL,
             hold_expires_at = NULL,
             version = version + 1,
             updated_at = NOW()
         WHERE id = ANY($1::text[])
         RETURNING seat_id`,
        [performanceSeatIds]
    );

    await client.query(
        `UPDATE seat_holds
         SET status = 'converted', converted_at = NOW(), updated_at = NOW()
         WHERE performance_seat_id = ANY($1::text[])
           AND user_id = $2
           AND hold_token = $3
           AND status = 'held'`,
        [performanceSeatIds, conversionData.userId, conversionData.holdToken]
    );

    return {
        converted: true,
        seatIds: updatedResult.rows.map((row) => row.seat_id).sort()
    };
};

const releaseExpiredPerformanceSeatHolds = async (limit = 500) => {
    return runTransaction(async (client) => {
        const result = await client.query(
            `WITH expired AS (
                 SELECT id, performance_id, seat_id, hold_token
                 FROM performance_seats
                 WHERE status = 'HELD'
                   AND hold_expires_at <= NOW()
                 ORDER BY hold_expires_at, id
                 LIMIT $1
                 FOR UPDATE SKIP LOCKED
             ),
             released AS (
                 UPDATE performance_seats ps
                 SET
                     status = 'AVAILABLE',
                     held_by_user_id = NULL,
                     hold_token = NULL,
                     hold_expires_at = NULL,
                     version = ps.version + 1,
                     updated_at = NOW()
                 FROM expired e
                 WHERE ps.id = e.id
                 RETURNING ps.id, ps.performance_id, ps.seat_id, e.hold_token
             ),
             expired_holds AS (
                 UPDATE seat_holds sh
                 SET status = 'expired', released_at = NOW(), updated_at = NOW()
                 FROM released r
                 WHERE sh.performance_seat_id = r.id
                   AND sh.hold_token = r.hold_token
                   AND sh.status = 'held'
                 RETURNING sh.id
             )
             SELECT r.id, r.performance_id, r.seat_id, p.event_id
             FROM released r
             JOIN performances p ON p.id = r.performance_id
             ORDER BY p.event_id, r.performance_id, r.seat_id`,
            [limit]
        );

        return result.rows.map((row) => ({
            id: row.id,
            eventId: row.event_id,
            performanceId: row.performance_id,
            seatId: row.seat_id
        }));
    });
};

module.exports = {
    createSeatMap,
    createSeatSections,
    createSeats,
    getSeatsBySection,
    getSeatMapById,
    getSeatsByMapId,
    updateSeatStatus,
    getSeatById,
    createSeatHold,
    getSeatHold,
    getActiveHoldForSeat,
    releaseSeatHold,
    releaseExpiredHolds,
    convertHoldToSold,
    getSeatsWithStatuses,
    createPerformance,
    materializePerformanceSeats,
    getPerformanceSeatAvailability,
    getPerformanceSeatLayout,
    savePerformanceSeatLayout,
    holdPerformanceSeats,
    releasePerformanceSeatHold,
    convertPerformanceSeatHoldToSold,
    releaseExpiredPerformanceSeatHolds,
    PERFORMANCE_SEAT_STATUSES
};
