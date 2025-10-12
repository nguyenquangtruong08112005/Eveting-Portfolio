const { getEventById } = require('../services/event.service');

/**
 * Middleware kiểm tra eventId có tồn tại trong Firestore không.
 * Nếu tồn tại, thông tin event sẽ được gắn vào req.event.
 */

const isEventExists = async (req, res, next) => {
    const eventId = req.params.eventId;

    try {
        const eventDoc = await getEventById(eventId);
        if (!eventDoc) {
            return res.status(404).send({ error: 'Event not found' });
        }
        req.event = { id: eventDoc.id, ...eventDoc };
        next();        
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Internal Server Error at isEventExists middleware' });
    }
};

const isEventOwner = async (req, res, next) => {

    const userId = req.user.uid;
    const ownerId = req.event.organizerId;

    try {
        if (userId !== ownerId) {
            return res.status(403).send({ error: 'Forbidden: You are not the owner of this event' });
        }
        next();
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Internal Server Error at isEventOwner middleware' });
    }
};
module.exports = {
    isEventExists,
    isEventOwner
};