require('./alias-bootstrap');
require('dotenv').config({ quiet: true });
const http = require('http');
const app = require('./app');
const { initSocketServer } = require('@/shared/socket/socket-server');
const { startReminderJob } = require('@/jobs/reminder.job');
const { startCronJob } = require('@/shared/events/outbox-processor');

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// Initialize Socket.IO
initSocketServer(server);

server.listen(PORT, () => {
  console.log(`Server address http://localhost:${PORT}`);
  startReminderJob();
  startCronJob();
});

module.exports = app;

