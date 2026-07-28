const asyncHandler = require('@/shared/middleware/asyncHandler');
const { BadRequestError } = require('@/shared/errors');
const organizerTeamService = require('@/modules/memberships/application/organizer-team.service');

const requirePrimaryOrganizer = asyncHandler(async (req, res, next) => {
    await organizerTeamService.requirePrimaryOrganizer(req.user.uid);
    next();
});

function requireEventPermission(permission, options = {}) {
    return asyncHandler(async (req, res, next) => {
        const eventId = options.fromQuery
            ? req.query.eventId
            : req.params.eventId || req.body.eventId;
        if (!eventId) throw new BadRequestError('eventId is required');
        req.organizerAccess = await organizerTeamService.authorizeEventPermission(
            req.user.uid,
            eventId,
            permission
        );
        next();
    });
}

function requireTeamPermission(permission) {
    return asyncHandler(async (req, res, next) => {
        const teamId = req.params.teamId || req.body.teamId || req.query.teamId;
        if (!teamId) throw new BadRequestError('teamId is required');
        req.organizerAccess = await organizerTeamService.authorizeTeamPermission(
            req.user.uid,
            teamId,
            permission
        );
        next();
    });
}

module.exports = {
    requirePrimaryOrganizer,
    requireEventPermission,
    requireTeamPermission,
};
