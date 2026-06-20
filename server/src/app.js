var express = require('express');
var cookieParser = require('cookie-parser');

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
const { notFoundHandler, globalErrorHandler } = require('@/shared/middleware/error.middleware');
var app = express();

app.set('trust proxy', 1);

app.use(observabilityMiddleware);
app.get('/metrics', metricsHandler);

// Custom CORS middleware to allow localhost:3001 or other clients
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
    return res.status(200).json({});
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.get('/', function(req, res) { res.send("Welcome"); });
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

// BFF Route Prefixes
app.use('/api/web/auth', authRouter);
app.use('/api/web/events', eventsRouter);
app.use('/api/web/tickets', ticketsRouter);
app.use('/api/web/payments', paymentsRouter);
app.use('/api/organizer', organizerRouter);
app.use('/api/admin', adminRouter);

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

app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;
