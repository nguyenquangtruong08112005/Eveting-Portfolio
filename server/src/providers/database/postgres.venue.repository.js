const { query } = require('./postgres.client');

function rowToVenue(row) {
    if (!row) return null;
    const data = row.data && typeof row.data === 'object' ? row.data : {};
    return {
        id: row.id,
        name: row.name,
        address: row.address != null ? row.address : data.address,
        city: row.city != null ? row.city : data.city,
        district: row.district != null ? row.district : data.district,
        country: row.country != null ? row.country : data.country,
        lat: row.lat != null ? Number(row.lat) : (data.lat != null ? Number(data.lat) : undefined),
        lng: row.lng != null ? Number(row.lng) : (data.lng != null ? Number(data.lng) : undefined),
        capacity: row.capacity != null ? Number(row.capacity) : data.capacity,
        ...data,
        // Prefer first-class columns over bag for known keys
        address: row.address != null ? row.address : data.address,
        city: row.city != null ? row.city : data.city,
        district: row.district != null ? row.district : data.district,
        country: row.country != null ? row.country : (data.country || 'VN'),
        lat: row.lat != null ? Number(row.lat) : (data.lat != null ? Number(data.lat) : undefined),
        lng: row.lng != null ? Number(row.lng) : (data.lng != null ? Number(data.lng) : undefined),
        capacity: row.capacity != null ? Number(row.capacity) : data.capacity,
    };
}

const getAllVenues = async () => {
    const result = await query(
        `SELECT id, name, data, address, city, district, country, lat, lng, capacity
         FROM venues WHERE deleted_at IS NULL ORDER BY name`
    );
    return result.rows.map(rowToVenue);
};

const createVenue = async (venueId, venueData) => {
    const {
        id: _id,
        name,
        address,
        city,
        district,
        country,
        lat,
        lng,
        capacity,
        ...rest
    } = venueData;

    await query(
        `INSERT INTO venues (id, name, data, address, city, district, country, lat, lng, capacity)
         VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           data = EXCLUDED.data,
           address = EXCLUDED.address,
           city = EXCLUDED.city,
           district = EXCLUDED.district,
           country = EXCLUDED.country,
           lat = EXCLUDED.lat,
           lng = EXCLUDED.lng,
           capacity = EXCLUDED.capacity`,
        [
            venueId,
            name || '',
            JSON.stringify(rest || {}),
            address != null ? address : rest.address || null,
            city != null ? city : rest.city || null,
            district != null ? district : rest.district || null,
            country != null ? country : rest.country || 'VN',
            lat != null ? Number(lat) : (rest.lat != null ? Number(rest.lat) : null),
            lng != null ? Number(lng) : (rest.lng != null ? Number(rest.lng) : null),
            capacity != null ? Number(capacity) : (rest.capacity != null ? Number(rest.capacity) : null),
        ]
    );
};

const getVenueById = async (venueId) => {
    const result = await query(
        `SELECT id, name, data, address, city, district, country, lat, lng, capacity
         FROM venues WHERE id = $1 AND deleted_at IS NULL`,
        [venueId]
    );
    if (result.rows.length === 0) return null;
    return rowToVenue(result.rows[0]);
};

const getVenueRawById = async (venueId) => {
    const venue = await getVenueById(venueId);
    if (!venue) return { exists: false, id: null, data: null };
    const { id, ...data } = venue;
    return { exists: true, id, data };
};

const updateVenue = async (venueId, venueData) => {
    const existing = await getVenueById(venueId);
    if (!existing) return null;

    const merged = {
        ...existing,
        ...venueData,
        id: venueId,
    };

    const {
        id: _id,
        name,
        address,
        city,
        district,
        country,
        lat,
        lng,
        capacity,
        ...rest
    } = merged;

    // Keep bag fields (location, addressDetails, seatMapTemplate, etc.)
    const bag = { ...rest };
    delete bag.address;
    delete bag.city;
    delete bag.district;
    delete bag.country;
    delete bag.lat;
    delete bag.lng;
    delete bag.capacity;
    delete bag.name;

    await query(
        `UPDATE venues SET
           name = $2,
           data = $3::jsonb,
           address = $4,
           city = $5,
           district = $6,
           country = $7,
           lat = $8,
           lng = $9,
           capacity = $10
         WHERE id = $1 AND deleted_at IS NULL`,
        [
            venueId,
            name || '',
            JSON.stringify(bag || {}),
            address != null ? address : null,
            city != null ? city : null,
            district != null ? district : null,
            country != null ? country : 'VN',
            lat != null ? Number(lat) : null,
            lng != null ? Number(lng) : null,
            capacity != null ? Number(capacity) : null,
        ]
    );

    return getVenueById(venueId);
};

const deleteVenue = async (venueId) => {
    // Soft-delete when column exists; hard delete as fallback
    try {
        const result = await query(
            `UPDATE venues SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
            [venueId]
        );
        if (result.rows.length > 0) return true;
    } catch {
        /* column may not exist on older schemas */
    }
    const result = await query(`DELETE FROM venues WHERE id = $1 RETURNING id`, [venueId]);
    return result.rows.length > 0;
};

module.exports = {
    getAllVenues,
    createVenue,
    getVenueById,
    getVenueRawById,
    updateVenue,
    deleteVenue,
};
