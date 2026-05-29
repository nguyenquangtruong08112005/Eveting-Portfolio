const { query } = require('./postgres.client');

function rowToVenue(row) {
    return { id: row.id, name: row.name, ...row.data };
}

const getAllVenues = async () => {
    const result = await query('SELECT id, name, data FROM venues ORDER BY name');
    return result.rows.map(rowToVenue);
};

const createVenue = async (venueId, venueData) => {
    const { id: _id, name, ...rest } = venueData;
    await query(
        `INSERT INTO venues (id, name, data)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET name = $2, data = $3`,
        [venueId, name || '', JSON.stringify(rest)]
    );
};

const getVenueById = async (venueId) => {
    const result = await query('SELECT id, name, data FROM venues WHERE id = $1', [venueId]);
    if (result.rows.length === 0) return null;
    return rowToVenue(result.rows[0]);
};

const getVenueRawById = async (venueId) => {
    const result = await query('SELECT id, name, data FROM venues WHERE id = $1', [venueId]);
    if (result.rows.length === 0) return { exists: false, id: null, data: null };
    const row = result.rows[0];
    return { exists: true, id: row.id, data: { name: row.name, ...row.data } };
};

module.exports = {
    getAllVenues,
    createVenue,
    getVenueById,
    getVenueRawById,
};
