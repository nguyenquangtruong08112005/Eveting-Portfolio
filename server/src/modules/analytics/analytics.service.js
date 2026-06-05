const analyticsRepository = require('../../providers/database/analytics.repository');

const getAnalyticsByEventId = async (eventId) => {
    return analyticsRepository.getAnalyticsByEventId(eventId);
};

module.exports = { getAnalyticsByEventId };
