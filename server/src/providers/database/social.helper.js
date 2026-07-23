/**
 * Social graph helpers (3NF N2) — junction tables instead of TEXT[] arrays.
 */
const { nowDb } = require('./time.helper');

async function loadFollowedProfileIds(client, userId) {
    const result = await client.query(
        'SELECT followee_id FROM user_follows WHERE follower_id = $1 ORDER BY created_at',
        [userId]
    );
    return result.rows.map((r) => r.followee_id);
}

async function loadHistoryEventIds(client, userId) {
    const result = await client.query(
        'SELECT event_id FROM user_event_history WHERE user_id = $1 ORDER BY attended_at DESC',
        [userId]
    );
    return result.rows.map((r) => r.event_id);
}

async function loadFcmTokens(client, userId) {
    const result = await client.query(
        'SELECT fcm_token FROM user_devices WHERE user_id = $1',
        [userId]
    );
    return result.rows.map((r) => r.fcm_token);
}

async function loadFcmTokensForUsers(client, userIds) {
    if (!userIds || userIds.length === 0) return {};
    const result = await client.query(
        'SELECT user_id, fcm_token FROM user_devices WHERE user_id = ANY($1::text[])',
        [userIds]
    );
    const map = {};
    for (const row of result.rows) {
        if (!map[row.user_id]) map[row.user_id] = [];
        map[row.user_id].push(row.fcm_token);
    }
    return map;
}

async function replaceFollows(client, userId, followeeIds) {
    await client.query('DELETE FROM user_follows WHERE follower_id = $1', [userId]);
    const ids = Array.isArray(followeeIds) ? followeeIds : [];
    const now = nowDb();
    for (const followeeId of ids) {
        await client.query(
            `INSERT INTO user_follows (follower_id, followee_id, created_at)
             VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
            [userId, followeeId, now]
        );
    }
}

async function replaceHistory(client, userId, eventIds) {
    await client.query('DELETE FROM user_event_history WHERE user_id = $1', [userId]);
    const ids = Array.isArray(eventIds) ? eventIds : [];
    const now = nowDb();
    for (const eventId of ids) {
        await client.query(
            `INSERT INTO user_event_history (user_id, event_id, source, attended_at)
             VALUES ($1, $2, 'history', $3) ON CONFLICT DO NOTHING`,
            [userId, eventId, now]
        );
    }
}

async function replaceDevices(client, userId, tokens) {
    await client.query('DELETE FROM user_devices WHERE user_id = $1', [userId]);
    const list = Array.isArray(tokens) ? tokens : [];
    const now = nowDb();
    let i = 0;
    for (const token of list) {
        if (!token) continue;
        await client.query(
            `INSERT INTO user_devices (id, user_id, fcm_token, last_seen_at, created_at)
             VALUES ($1, $2, $3, $4, $4)
             ON CONFLICT (fcm_token) DO UPDATE SET user_id = EXCLUDED.user_id, last_seen_at = EXCLUDED.last_seen_at`,
            [`dev_${userId}_${i}`, userId, token, now]
        );
        i += 1;
    }
}

async function loadFeaturedProfileIds(client, eventId) {
    const result = await client.query(
        `SELECT featured_profile_id FROM event_featured_profiles
         WHERE event_id = $1 ORDER BY sort_order ASC`,
        [eventId]
    );
    return result.rows.map((r) => r.featured_profile_id);
}

async function loadFeaturedProfileIdsForEvents(client, eventIds) {
    const byEvent = {};
    if (!eventIds || eventIds.length === 0) return byEvent;
    const result = await client.query(
        `SELECT event_id, featured_profile_id, sort_order
         FROM event_featured_profiles
         WHERE event_id = ANY($1::text[])
         ORDER BY sort_order ASC`,
        [eventIds]
    );
    for (const row of result.rows) {
        if (!byEvent[row.event_id]) byEvent[row.event_id] = [];
        byEvent[row.event_id].push(row.featured_profile_id);
    }
    return byEvent;
}

async function replaceFeaturedProfiles(client, eventId, profileIds) {
    await client.query('DELETE FROM event_featured_profiles WHERE event_id = $1', [eventId]);
    const ids = Array.isArray(profileIds) ? profileIds : [];
    const now = nowDb();
    let sort = 0;
    for (const profileId of ids) {
        // Only link if featured profile exists (FK)
        const exists = await client.query(
            'SELECT 1 FROM featured_profiles WHERE id = $1',
            [profileId]
        );
        if (exists.rows.length === 0) continue;
        await client.query(
            `INSERT INTO event_featured_profiles (event_id, featured_profile_id, sort_order, created_at)
             VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
            [eventId, profileId, sort, now]
        );
        sort += 1;
    }
}

module.exports = {
    loadFollowedProfileIds,
    loadHistoryEventIds,
    loadFcmTokens,
    loadFcmTokensForUsers,
    replaceFollows,
    replaceHistory,
    replaceDevices,
    loadFeaturedProfileIds,
    loadFeaturedProfileIdsForEvents,
    replaceFeaturedProfiles,
};
