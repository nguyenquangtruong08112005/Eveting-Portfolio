const { query } = require('./postgres.client');

async function tableExists(tableName) {
    var result = await query(
        'SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1) AS exists',
        [tableName]
    );
    return result.rows[0].exists;
}

function rowToReview(row) {
    var userObj = null;
    if (row.user_name) {
        userObj = { name: row.user_name, profilePicUrl: row.user_profile_pic_url || '' };
    }
    return {
        id: row.id,
        eventId: row.event_id,
        userId: row.user_id,
        rating: row.rating,
        comment: row.comment,
        createdAt: Number(row.created_at),
        user: userObj
    };
}

const getReviewsByEventId = async (eventId, page = 1, limit = 10) => {
    var offset = (page - 1) * limit;

    var countResult = await query(
        'SELECT COUNT(*)::int AS count FROM reviews WHERE event_id = $1',
        [eventId]
    );
    var totalItems = countResult.rows[0].count;

    var result = await query(
        'SELECT id, event_id, user_id, rating, comment, created_at, user_name, user_profile_pic_url FROM reviews WHERE event_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [eventId, limit, offset]
    );

    var reviews = result.rows.map(rowToReview);

    var userIds = [];
    var seen = {};
    for (var i = 0; i < reviews.length; i++) {
        var uid = reviews[i].userId;
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
                name: u.name || 'Anonymous',
                profilePicUrl: u.profile_pic_url || ''
            };
        }
    }

    var enriched = [];
    for (var m = 0; m < reviews.length; m++) {
        var r = reviews[m];
        enriched.push({
            id: r.id,
            eventId: r.eventId,
            userId: r.userId,
            rating: r.rating,
            comment: r.comment,
            createdAt: r.createdAt,
            user: r.user || userMap[r.userId] || { name: 'Anonymous', profilePicUrl: '' }
        });
    }

    return {
        reviews: enriched,
        pagination: {
            currentPage: page,
            limit: limit,
            totalPages: Math.ceil(totalItems / limit),
            totalItems: totalItems
        }
    };
};

const createReview = async (reviewId, reviewData) => {
    await query(
        `INSERT INTO reviews (id, event_id, user_id, rating, comment, created_at, user_name, user_profile_pic_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           event_id = EXCLUDED.event_id,
           user_id = EXCLUDED.user_id,
           rating = EXCLUDED.rating,
           comment = EXCLUDED.comment,
           created_at = EXCLUDED.created_at,
           user_name = EXCLUDED.user_name,
           user_profile_pic_url = EXCLUDED.user_profile_pic_url`,
        [
            reviewId,
            reviewData.eventId,
            reviewData.userId,
            reviewData.rating,
            reviewData.comment || '',
            Number(reviewData.createdAt),
            reviewData.user ? reviewData.user.name : null,
            reviewData.user ? reviewData.user.profilePicUrl : null
        ]
    );
    return reviewData;
};

const checkUserTicketForEvent = async (userId, eventId) => {
    var exists = await tableExists('tickets');
    if (!exists) {
        return false;
    }

    var result = await query(
        'SELECT 1 FROM tickets WHERE user_id = $1 AND event_id = $2 AND status IN ($3, $4) LIMIT 1',
        [userId, eventId, 'paid', 'checkedIn']
    );
    return result.rows.length > 0;
};

module.exports = {
    getReviewsByEventId,
    createReview,
    checkUserTicketForEvent
};
