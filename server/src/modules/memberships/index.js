const router = require('./api/routes');
const controller = require('./api/controller');
const service = require('./application/service');
const organizerTeamService = require('./application/organizer-team.service');
const organizerRbac = require('./api/organizer-rbac.middleware');
const teamController = require('./api/team.controller');

module.exports = {
  router,
  controller,
  service,
  organizerTeamService,
  organizerRbac,
  teamController,
};
