const { query } = require('./postgres.client');

function rowToNotification(row) {
    return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        message: row.message,
        type: row.type,
        eventId: row.event_id || null,
        isRead: row.is_read,
        createdAt: Number(row.created_at)
    };
}

const getNotificationsByUserId = async (userId) => {
    const result = await query(
        'SELECT * FROM notifications WHERE user_id = $1 OR user_id = \'all\' ORDER BY created_at DESC',
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
    await query(
        `INSERT INTO notifications (id, user_id, title, message, type, event_id, is_read, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           user_id = EXCLUDED.user_id,
           title = EXCLUDED.title,
           message = EXCLUDED.message,
           type = EXCLUDED.type,
           event_id = EXCLUDED.event_id,
           is_read = EXCLUDED.is_read,
           created_at = EXCLUDED.created_at`,
        [
            notificationData.id,
            notificationData.userId,
            notificationData.title,
            notificationData.message,
            notificationData.type,
            notificationData.eventId || null,
            notificationData.isRead === undefined ? false : notificationData.isRead,
            Number(notificationData.createdAt)
        ]
    );
    return notificationData;
};

module.exports = {
    getNotificationsByUserId,
    markNotificationAsRead,
    createNotification
};
