var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
require('dotenv').config();
const { startReminderJob } = require('./jobs/reminder.job');


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users.routes');
var eventsRouter = require('./routes/events.routes');
var ticketsRouter = require('./routes/tickets.routes');
var featuredProfileRouter = require('./routes/featuredProfile.routes');
var reviewsRouter = require('./routes/reviews.routes');
var promotionsRouter = require('./routes/promotions.routes');
var notificationsRouter = require('./routes/notifications.routes');
var analyticsRouter = require('./routes/analytics.routes');
var organizerRouter = require('./routes/organizer.routes');
var paymentsRouter = require('./routes/payments.routes');
var venuesRouter = require('./routes/venues.routes');
var adminRouter = require('./routes/admin.routes');
var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/events', eventsRouter);
app.use('/tickets', ticketsRouter);
app.use('/profiles', featuredProfileRouter);
app.use('/reviews', reviewsRouter);
app.use('/promotions', promotionsRouter);
app.use('/notifications', notificationsRouter);
app.use('/analytics', analyticsRouter);
app.use('/organizer', organizerRouter);
app.use('/payments', paymentsRouter);
app.use('/venues', venuesRouter);
app.use('/admin', adminRouter);

// ======================
// Tạo server trực tiếp ở đây
// ======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server address http://localhost:${PORT}`);
  // startEventSyncListener();
  
  // Kích hoạt Cron Job
  startReminderJob();
});

module.exports = app;
