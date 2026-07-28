const analyticsRepository = require('@/providers/database/analytics.repository');
const organizerDashboardRepository = require('@/modules/analytics/infrastructure/organizer-dashboard.repository');
const { NotFoundError } = require('@/shared/errors');

const getAnalyticsByEventId = async (eventId) => {
    return analyticsRepository.getAnalyticsByEventId(eventId);
};

const recordTraffic = async (eventId, visitorKey, source, rawData = {}) => {
    const safeRawData = {
        path: rawData.path ? String(rawData.path).slice(0, 500) : undefined,
        referrer: rawData.referrer ? String(rawData.referrer).slice(0, 1000) : undefined,
    };
    const traffic = await organizerDashboardRepository.recordTraffic(
        eventId,
        visitorKey,
        source,
        safeRawData
    );
    if (!traffic) throw new NotFoundError('Event not found');
    return traffic;
};

const getRevenueDashboard = (eventId) =>
    organizerDashboardRepository.getRevenueDashboard(eventId);

const getTrafficDashboard = (eventId) =>
    organizerDashboardRepository.getTrafficDashboard(eventId);

const getCheckInDashboard = (eventId, access) => {
    const eventScopes =
        access?.role === 'CHECK_IN_STAFF'
            ? access.scopes.filter((scope) => scope.eventId === eventId)
            : [];
    const hasEventWideScope = eventScopes.some((scope) => !scope.ticketTypeId);
    const allowedTicketTypes =
        access?.role === 'CHECK_IN_STAFF' && !hasEventWideScope
            ? eventScopes
                .filter((scope) => scope.ticketTypeId)
                .map((scope) => scope.ticketTypeId)
            : null;
    return organizerDashboardRepository.getCheckInDashboard(eventId, allowedTicketTypes);
};

module.exports = {
    getAnalyticsByEventId,
    recordTraffic,
    getRevenueDashboard,
    getTrafficDashboard,
    getCheckInDashboard,
};
