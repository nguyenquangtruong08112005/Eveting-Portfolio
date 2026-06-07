require('./alias-bootstrap');
require('dotenv').config();
const app = require('./app');
const { startReminderJob } = require('@/jobs/reminder.job');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server address http://localhost:${PORT}`);
  startReminderJob();
});

module.exports = app;
