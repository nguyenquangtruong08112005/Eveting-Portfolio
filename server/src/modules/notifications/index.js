const router = require('@/modules/notifications/api/routes');
const controller = require('@/modules/notifications/api/controller');
const service = require('@/modules/notifications/application/service');
const fcmService = require('@/modules/notifications/infrastructure/providers/fcm.service');
const helper = require('@/modules/notifications/application/notification-event.helper');

module.exports = {
  router,
  controller,
  service,
  fcmService,
  helper
};
