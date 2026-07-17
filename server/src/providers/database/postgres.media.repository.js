// providers/database/postgres.media.repository.js
// PostgreSQL adapter for event media.
//
// SAFETY: hasEligibleTicket and getEventOrganizerId query the tickets/events
// tables only if they exist.  If the tables are missing (media adapter may
// load before those domains are migrated) they return false / null without
// throwing.
//
// No foreign keys are declared on event_media because the referenced
// tables (tickets, events) may not exist yet.

const { query } = require('./postgres.client');

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function rowToEventMedia(row) {
    return {
        id: row.id,
        userId: row.user_id,
        eventId: row.event_id,
        url: row.url,
        type: row.type,
        caption: row.caption,
        createdAt: Number(row.created_at)
    };
}

async function tableExists(tableName) {
    var result = await query(
        'SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1) AS exists',
        [tableName]
    );
    return result.rows[0].exists;
}

// -------------------------------------------------------------------------
// hasEligibleTicket
// -------------------------------------------------------------------------
// Returns true when the user holds a paid / checked-in ticket for the event.
// Returns false if the tickets table does not exist yet.

const hasEligibleTicket = async (userId, eventId) => {
    var exists = await tableExists('tickets');
    if (!exists) {
        // tickets table not yet migrated -- safe fallback
        return false;
    }

    var result = await query(
        `SELECT 1 FROM tickets
         WHERE user_id = $1 AND event_id = $2 AND status IN ('paid', 'checkedIn')
         LIMIT 1`,
        [userId, eventId]
    );
    return result.rows.length > 0;
};

// -------------------------------------------------------------------------
// getEventOrganizerId
// -------------------------------------------------------------------------
// Returns the organizer user id for an event.
// Returns null if the events table does not exist yet.

const getEventOrganizerId = async (eventId) => {
    var exists = await tableExists('events');
    if (!exists) {
        // events table not yet migrated -- safe fallback
        return null;
    }

    var result = await query(
        `SELECT organizer_id FROM events WHERE id = $1`,
        [eventId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0].organizer_id || null;
};

// -------------------------------------------------------------------------
// getEventMediaPage
// -------------------------------------------------------------------------
// Paginated media list for an event.  Each item includes a `user` object
// with {id, name, profilePicUrl} hydrated from auth_users when available,
// otherwise null fields.

const getEventMediaPage = async (eventId, page = 1, limit = 20) => {
    var offset = (page - 1) * limit;

    var countResult = await query(
        'SELECT COUNT(*)::int AS count FROM event_media WHERE event_id = $1',
        [eventId]
    );
    var totalItems = countResult.rows[0].count;

    var result = await query(
        `SELECT id, user_id, event_id, url, type, caption, created_at
         FROM event_media
         WHERE event_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [eventId, limit, offset]
    );

    var mediaList = result.rows.map(rowToEventMedia);

    // -- Enrich with user data from auth_users if table exists -----------
    var userIds = [];
    var seen = {};
    for (var i = 0; i < mediaList.length; i++) {
        var uid = mediaList[i].userId;
        if (!seen[uid]) {
            seen[uid] = true;
            userIds.push(uid);
        }
    }

    var userMap = {};

    var authExists = await tableExists('auth_users');
    if (authExists && userIds.length > 0) {
        var placeholders = [];
        for (var j = 0; j < userIds.length; j++) {
            placeholders.push('$' + (j + 1));
        }
        var userResult = await query(
            'SELECT a.id, p.name, p.profile_pic_url FROM auth_users a LEFT JOIN user_profiles p ON p.id = a.id WHERE a.id IN (' + placeholders.join(',') + ')',
            userIds
        );
        for (var k = 0; k < userResult.rows.length; k++) {
            var u = userResult.rows[k];
            userMap[u.id] = {
                id: u.id,
                name: u.name,
                profilePicUrl: u.profile_pic_url
            };
        }
    }

    var enriched = [];
    for (var m = 0; m < mediaList.length; m++) {
        var item = mediaList[m];
        enriched.push({
            id: item.id,
            userId: item.userId,
            eventId: item.eventId,
            url: item.url,
            type: item.type,
            caption: item.caption,
            createdAt: item.createdAt,
            user: userMap[item.userId] || { id: null, name: null, profilePicUrl: null }
        });
    }

    return {
        media: enriched,
        pagination: {
            currentPage: page,
            limit: limit,
            totalPages: Math.ceil(totalItems / limit),
            totalItems: totalItems
        }
    };
};

// -------------------------------------------------------------------------
// createEventMediaBatch
// -------------------------------------------------------------------------
// Upserts media rows to match Firebase batch.set() behaviour.

const createEventMediaBatch = async (mediaItems) => {
    for (var i = 0; i < mediaItems.length; i++) {
        var entry = mediaItems[i];
        var id = entry.id;
        var media = entry.media;

        await query(
            `INSERT INTO event_media (id, user_id, event_id, url, type, caption, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO UPDATE SET
               user_id = EXCLUDED.user_id,
               event_id = EXCLUDED.event_id,
               url = EXCLUDED.url,
               type = EXCLUDED.type,
               caption = EXCLUDED.caption,
               created_at = EXCLUDED.created_at`,
            [
                id,
                media.userId,
                media.eventId,
                media.url,
                media.type,
                media.caption || '',
                Number(media.createdAt)
            ]
        );
    }
};

module.exports = {
    hasEligibleTicket,
    getEventOrganizerId,
    getEventMediaPage,
    createEventMediaBatch
};
