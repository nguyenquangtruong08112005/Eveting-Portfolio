const { query } = require('./postgres.client');
const { toDb, nowDb } = require('./time.helper');

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
            `INSERT INTO seats (id, seat_section_id, row_name, seat_number, status, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (id) DO UPDATE SET status = $5`,
            [seat.id, seat.seatSectionId, seat.rowName, seat.seatNumber, seat.status || 'available', toDb(seat.createdAt) || nowDb()]
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
        createdAt: Number(row.created_at)
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
        createdAt: Number(row.created_at)
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
        createdAt: Number(row.created_at)
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
        createdAt: Number(row.created_at)
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
            toDb(holdData.expiresAt) || nowDb(),
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
        heldAt: Number(row.held_at),
        expiresAt: Number(row.expires_at),
        status: row.status,
        createdAt: Number(row.created_at)
    };
};

const getActiveHoldForSeat = async (eventId, seatId) => {
    const result = await query(
        `SELECT * FROM seat_holds 
         WHERE event_id = $1 AND seat_id = $2 AND status = 'held' AND expires_at > $3`,
        [eventId, seatId, Date.now()]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
        id: row.id,
        eventId: row.event_id,
        seatId: row.seat_id,
        userId: row.user_id,
        heldAt: Number(row.held_at),
        expiresAt: Number(row.expires_at),
        status: row.status,
        createdAt: Number(row.created_at)
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
        [currentTime]
    );
    return result.rows.map(row => row.id);
};

const convertHoldToSold = async (holdId, transaction = null) => {
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    await client.query(
        `UPDATE seat_holds SET status = 'sold' WHERE id = $1`,
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
        [eventId, Date.now()]
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
    getSeatsWithStatuses
};
