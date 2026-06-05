const router = require('./payments.routes');
const controller = require('./payment.controller');
const service = require('./payment.service');

module.exports = {
  router,
  controller,
  service
};
