var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
require('dotenv').config();
const { startReminderJob } = require('@/jobs/reminder.job');


var indexRouter = require('@/routes/index');
var usersRouter = require('@/modules/users').router;
var eventsRouter = require('@/modules/events').router;
var ticketsRouter = require('@/modules/tickets').router;
var featuredProfileRouter = require('@/modules/featuredProfile').router;
var reviewsRouter = require('@/modules/reviews').router;
var promotionsRouter = require('@/modules/promotions').router;
var notificationsRouter = require('@/modules/notifications').router;
var analyticsRouter = require('@/modules/analytics').router;
var organizerRouter = require('@/modules/organizer').router;
var paymentsRouter = require('@/modules/payments').router;
var venuesRouter = require('@/modules/venues').router;
var adminRouter = require('@/modules/admin').router;
var authRouter = require('@/modules/auth').router;
var storageRouter = require('@/modules/storage').router;
var activeStorageProvider = require('@/providers/storage');
const { observabilityMiddleware, metricsHandler } = require('@/shared/middleware/observability.middleware');
var app = express();

app.set('trust proxy', 1);

app.use(observabilityMiddleware);
app.get('/metrics', metricsHandler);
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
app.use('/auth', authRouter);
app.use('/api/auth', authRouter);
app.use('/storage', storageRouter);

// GET /public/:key(*) - Serve files from the active storage provider (e.g. local in-memory)
app.get('/public/:key(*)', async (req, res) => {
  try {
    const key = req.params.key;
    const [buffer, metadata] = await Promise.all([
      activeStorageProvider.getObjectBuffer(key),
      activeStorageProvider.getObjectMetadata(key),
    ]);
    if (metadata && metadata.contentType) {
      res.set('Content-Type', metadata.contentType);
    }
    res.send(buffer);
  } catch (error) {
    res.status(404).json({ error: 'Not found' });
  }
});

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
