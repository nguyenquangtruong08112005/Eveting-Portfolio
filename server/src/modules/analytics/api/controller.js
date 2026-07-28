const analyticsService = require('@/modules/analytics/application/service');
const asyncHandler = require('@/shared/middleware/asyncHandler');
const { NotFoundError } = require('@/shared/errors');

const getEventAnalytics = asyncHandler(async (req, res) => {
    const analytics = await analyticsService.getAnalyticsByEventId(req.query.eventId);
    if (!analytics) throw new NotFoundError('Analytics data not found for this event');
    res.status(200).json(analytics);
});

const recordTraffic = asyncHandler(async (req, res) => {
    const traffic = await analyticsService.recordTraffic(
        req.body.eventId,
        req.body.visitorKey,
        req.body.source || 'direct',
        req.body.rawData
    );
    res.status(202).json({ recorded: true, trafficId: traffic.id });
});

const getRevenueDashboard = asyncHandler(async (req, res) => {
    const dashboard = await analyticsService.getRevenueDashboard(req.params.eventId);
    res.status(200).json(dashboard);
});

const getTrafficDashboard = asyncHandler(async (req, res) => {
    const dashboard = await analyticsService.getTrafficDashboard(req.params.eventId);
    res.status(200).json(dashboard);
});

const getCheckInDashboard = asyncHandler(async (req, res) => {
    const dashboard = await analyticsService.getCheckInDashboard(
        req.params.eventId,
        req.organizerAccess
    );
    res.status(200).json(dashboard);
});

module.exports = {
    getEventAnalytics,
    recordTraffic,
    getRevenueDashboard,
    getTrafficDashboard,
    getCheckInDashboard,
};
