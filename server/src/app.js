var express = require('express');
var cookieParser = require('cookie-parser');

var usersRouter = require('@/modules/users').router;
var eventsRouter = require('@/modules/events').router;
var ticketsRouter = require('@/modules/tickets').router;
var orderCheckoutRouter = require('@/modules/tickets/api/order-routes');
var featuredProfileRouter = require('@/modules/featuredProfile').router;
var featuredProfileController = require('@/modules/featuredProfile/api/controller');
var reviewsRouter = require('@/modules/reviews').router;
var promotionsRouter = require('@/modules/promotions').router;
var notificationsRouter = require('@/modules/notifications').router;
var analyticsRouter = require('@/modules/analytics').router;
var organizerRouter = require('@/modules/organizer').router;
var paymentsRouter = require('@/modules/payments').router;
var venuesRouter = require('@/modules/venues').router;
var adminRouter = require('@/modules/admin').router;
var authRouter = require('@/modules/auth').router;
var membershipsRouter = require('@/modules/memberships').router;
var storageRouter = require('@/modules/storage').router;
var vouchersRouter = require('@/modules/vouchers/api/routes');
var activeStorageProvider = require('@/providers/storage');
const { observabilityMiddleware, metricsHandler } = require('@/shared/middleware/observability.middleware');
const { notFoundHandler, globalErrorHandler } = require('@/shared/middleware/error.middleware');
const { csrfProtection } = require('@/shared/middleware/csrf.middleware');
const { publicApiLimiter } = require('@/shared/middleware/rateLimit.middleware');
var app = express();

app.set('trust proxy', process.env.TRUST_PROXY ? (isNaN(Number(process.env.TRUST_PROXY)) ? process.env.TRUST_PROXY : Number(process.env.TRUST_PROXY)) : 1);

app.use(observabilityMiddleware);
app.get('/metrics', metricsHandler);

// Strict CORS middleware with exact whitelist
app.use((req, res, next) => {
  const envAllowed = (process.env.CORS_ALLOWED_ORIGINS || process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const baseProdOrigins = ['https://eventing.moteo.fun', 'https://eventing-api.moteo.fun'];
  const devOrigins = process.env.NODE_ENV !== 'production'
    ? ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001']
    : [];

  const allowedOrigins = envAllowed.length > 0
    ? envAllowed
    : [...baseProdOrigins, ...devOrigins];

  const origin = req.headers.origin;

  if (origin) {
    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token, X-App-Integrity-Token, X-Idempotency-Key');
      if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        return res.status(204).end();
      }
    } else {
      return res.status(403).json({ error: 'CORS_ORIGIN_NOT_ALLOWED', message: 'Cross-origin request rejected' });
    }
  }

  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(csrfProtection);
app.use(publicApiLimiter);

app.get('/', function(req, res) { res.send("Welcome"); });
app.get('/health', function(req, res) {
  res.status(200).json({ ok: true, service: 'eventing-api', ts: new Date().toISOString() });
});
app.use('/users', usersRouter);
app.use('/events', eventsRouter);
app.use('/tickets', ticketsRouter);
app.use('/profiles', featuredProfileRouter);
app.get('/artists/:slug', featuredProfileController.getProfileBySlug);
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
app.use('/api/mobile/auth', authRouter);
app.use('/api/web/events', eventsRouter);
app.use('/api/web/tickets', ticketsRouter);
app.use('/api/web/orders', orderCheckoutRouter);
app.use('/api/web/payments', paymentsRouter);
app.use('/api/web/memberships', membershipsRouter);
app.use('/api/web/vouchers', vouchersRouter);
app.use('/api/web/profiles', featuredProfileRouter);
app.get('/api/web/artists/:slug', featuredProfileController.getProfileBySlug);
app.post(
  '/admin/artists/:userId/grant',
  require('./shared/middleware/auth.middleware').verifyAuthToken,
  require('./shared/middleware/authz.middleware').requireRole('admin'),
  featuredProfileController.grantFeaturedArtist
);
app.use('/api/web/users', usersRouter);
app.use('/api/web/notifications', notificationsRouter);
app.use('/api/web/promotions', promotionsRouter);
app.use('/api/web/storage', storageRouter);
app.use('/api/web/venues', venuesRouter);
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
