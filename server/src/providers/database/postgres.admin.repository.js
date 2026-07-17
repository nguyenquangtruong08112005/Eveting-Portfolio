const { query } = require('./postgres.client');
const { STATUS, LIFECYCLE } = require('@/modules/events/domain/event-lifecycle');
const eventRepository = require('./postgres.event.repository');

const getPendingEvents = async (page = 1, limit = 20) => {
    const offset = (page - 1) * limit;
    const result = await query(
        `SELECT id FROM events WHERE status = $1 AND (lifecycle_status IS NULL OR lifecycle_status = $4) ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [STATUS.PENDING, limit, offset, LIFECYCLE.SUBMITTED]
    );
    const events = [];
    for (const row of result.rows) {
        const full = await eventRepository.getEventById(row.id);
        if (full) events.push(full);
    }
    return events;
};

module.exports = { getPendingEvents };
