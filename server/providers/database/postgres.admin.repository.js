const { query } = require('./postgres.client');

function rowToFirebaseDoc(row) {
    if (!row) return null;
    let data;
    if (row.raw_data) {
        data = { ...row.raw_data };
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
    }
    delete data.id;
    return data;
}

const getPendingEvents = async (page = 1, limit = 20) => {
    const offset = (page - 1) * limit;
    const result = await query(
        "SELECT * FROM events WHERE status = 'pending' ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        [limit, offset]
    );
    return result.rows.map(row => {
        const eventData = rowToFirebaseDoc(row);
        return { id: row.id, ...eventData };
    });
};

module.exports = { getPendingEvents };
