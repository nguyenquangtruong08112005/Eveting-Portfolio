const { query } = require('./postgres.client');

const createSeatMap = async (mapId, mapData, transaction = null) => {
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    await client.query(
        `INSERT INTO seat_maps (id, name, total_rows, total_cols, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET name = $2, total_rows = $3, total_cols = $4`,
        [mapId, mapData.name, mapData.totalRows, mapData.totalCols, mapData.createdAt || Date.now()]
    );
};

const createSeatSections = async (sectionsArray, transaction = null) => {
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    for (const section of sectionsArray) {
        await client.query(
            `INSERT INTO seat_sections (id, seat_map_id, name, price_multiplier, created_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO UPDATE SET name = $3, price_multiplier = $4`,
            [section.id, section.seatMapId, section.name, section.priceMultiplier || 1.0, section.createdAt || Date.now()]
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
            [seat.id, seat.seatSectionId, seat.rowName, seat.seatNumber, seat.status || 'available', seat.createdAt || Date.now()]
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

module.exports = {
    createSeatMap,
    createSeatSections,
    createSeats,
    getSeatsBySection,
    getSeatMapById,
    getSeatsByMapId,
    updateSeatStatus,
    getSeatById
};
