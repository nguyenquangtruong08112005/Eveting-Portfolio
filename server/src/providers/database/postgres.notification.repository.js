const { query } = require('./postgres.client');
const { toDb, fromDb, nowDb } = require('./time.helper');

function rowToNotification(row) {
    return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        message: row.message,
        type: row.type,
        eventId: row.event_id || null,
        isRead: row.is_read,
        createdAt: fromDb(row.created_at),
    };
}

const getNotificationsByUserId = async (userId) => {
    const result = await query(
        `SELECT * FROM notifications
         WHERE user_id = $1 OR audience = 'broadcast'
         ORDER BY created_at DESC`,
        [userId]
    );
    return result.rows.map(rowToNotification);
};

const markNotificationAsRead = async (notificationId) => {
    const result = await query(
        'UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *',
        [notificationId]
    );
    if (result.rows.length === 0) {
        throw new Error('Notification not found.');
    }
    return rowToNotification(result.rows[0]);
};

const createNotification = async (notificationData) => {
    const createdAt = toDb(notificationData.createdAt) || nowDb();
    const isBroadcast = notificationData.userId === 'all' || notificationData.audience === 'broadcast';
    const audience = isBroadcast ? 'broadcast' : 'user';
    const userId = isBroadcast ? null : notificationData.userId;
    // Partitioned PK is (id, created_at) — plain insert (empty-dev overwrite via delete)
    await query('DELETE FROM notifications WHERE id = $1', [notificationData.id]);
    await query(
        `INSERT INTO notifications (id, user_id, title, message, type, event_id, is_read, created_at, audience)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
            notificationData.id,
            userId,
            notificationData.title,
            notificationData.message,
            notificationData.type,
            notificationData.eventId || null,
            notificationData.isRead === undefined ? false : notificationData.isRead,
            createdAt,
            audience,
        ]
    );
    return notificationData;
};

module.exports = {
    getNotificationsByUserId,
    markNotificationAsRead,
    createNotification,
};
