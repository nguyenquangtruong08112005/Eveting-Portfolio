const asyncHandler = require('@/shared/middleware/asyncHandler');
const organizerTeamService = require('@/modules/memberships/application/organizer-team.service');

const getMyTeams = asyncHandler(async (req, res) => {
    const teams = await organizerTeamService.listUserTeams(req.user.uid);
    res.status(200).json({ teams });
});

const getTeamMembers = asyncHandler(async (req, res) => {
    const members = await organizerTeamService.listTeamMembers(
        req.user.uid,
        req.query.teamId
    );
    res.status(200).json({ members });
});

const inviteMember = asyncHandler(async (req, res) => {
    const invitation = await organizerTeamService.inviteMember(req.user.uid, req.body);
    res.status(201).json({ invitation });
});

const acceptInvitation = asyncHandler(async (req, res) => {
    const member = await organizerTeamService.acceptInvitation(
        req.user.uid,
        req.params.token
    );
    res.status(200).json({ member });
});

const updateMember = asyncHandler(async (req, res) => {
    const member = await organizerTeamService.updateMember(
        req.user.uid,
        req.params.memberId,
        req.body
    );
    res.status(200).json({ member });
});

const removeMember = asyncHandler(async (req, res) => {
    const result = await organizerTeamService.removeMember(
        req.user.uid,
        req.params.memberId
    );
    res.status(200).json(result);
});

module.exports = {
    getMyTeams,
    getTeamMembers,
    inviteMember,
    acceptInvitation,
    updateMember,
    removeMember,
};
