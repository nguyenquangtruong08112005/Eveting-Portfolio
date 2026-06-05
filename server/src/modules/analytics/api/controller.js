const analyticsService = require('@/modules/analytics/application/service');

const getEventAnalytics = async (req, res) => {
    try {
        const { eventId } = req.query;
        const analytics = await analyticsService.getAnalyticsByEventId(eventId);
        if (!analytics) {
            return res.status(404).send({ error: 'Analytics data not found for this event.' });
        }
        res.status(200).json(analytics);
    } catch (error) {
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

module.exports = { getEventAnalytics };
