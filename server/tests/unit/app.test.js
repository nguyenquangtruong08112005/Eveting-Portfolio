'use strict';

const originalNodeEnv = process.env.NODE_ENV;

let mockApp;
let mockRouters;
let mockMiddleware;
let mockController;
let mockStorageProvider;
let mockExpressJson;
let mockExpressUrlencoded;
let mockExpressJsonFn;
let mockExpressUrlencodedFn;
let mockCookieParser;
let mockCookieParserMiddleware;
let mockGrantRoleMiddleware;

function createAppMock() {
  const app = {
    set: jest.fn(() => app),
    use: jest.fn(() => app),
    get: jest.fn(() => app),
    post: jest.fn(() => app),
  };
  return app;
}

function createResMock() {
  const res = {
    header: jest.fn(),
    status: jest.fn(),
    json: jest.fn(),
    end: jest.fn(),
    send: jest.fn(),
    set: jest.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

beforeEach(() => {
  mockExpressJson = jest.fn();
  mockExpressUrlencoded = jest.fn();
  mockExpressJsonFn = jest.fn(() => mockExpressJson);
  mockExpressUrlencodedFn = jest.fn(() => mockExpressUrlencoded);
  mockCookieParserMiddleware = jest.fn();
  mockCookieParser = jest.fn(() => mockCookieParserMiddleware);
  mockGrantRoleMiddleware = jest.fn();

  mockRouters = {
    users: jest.fn(),
    events: jest.fn(),
    tickets: jest.fn(),
    orderCheckout: jest.fn(),
    featuredProfile: jest.fn(),
    reviews: jest.fn(),
    promotions: jest.fn(),
    notifications: jest.fn(),
    analytics: jest.fn(),
    organizer: jest.fn(),
    payments: jest.fn(),
    venues: jest.fn(),
    admin: jest.fn(),
    auth: jest.fn(),
    memberships: jest.fn(),
    storage: jest.fn(),
    vouchers: jest.fn(),
  };

  mockMiddleware = {
    observability: jest.fn(),
    metrics: jest.fn(),
    notFound: jest.fn(),
    globalError: jest.fn(),
    csrf: jest.fn(),
    publicApiLimiter: jest.fn(),
    verifyAuthToken: jest.fn(),
  };

  mockController = {
    getProfileBySlug: jest.fn(),
    grantFeaturedArtist: jest.fn(),
  };

  mockStorageProvider = {
    getObjectBuffer: jest.fn(),
    getObjectMetadata: jest.fn(),
  };

  mockApp = createAppMock();

  jest.mock('express', () => {
    const fn = () => mockApp;
    fn.json = mockExpressJsonFn;
    fn.urlencoded = mockExpressUrlencodedFn;
    return fn;
  });
  jest.mock('cookie-parser', () => mockCookieParser);

  jest.mock('@/modules/users', () => ({ router: mockRouters.users }));
  jest.mock('@/modules/events', () => ({ router: mockRouters.events }));
  jest.mock('@/modules/tickets', () => ({ router: mockRouters.tickets }));
  jest.mock('@/modules/tickets/api/order-routes', () => mockRouters.orderCheckout);
  jest.mock('@/modules/featuredProfile', () => ({ router: mockRouters.featuredProfile }));
  jest.mock('@/modules/featuredProfile/api/controller', () => mockController);
  jest.mock('@/modules/reviews', () => ({ router: mockRouters.reviews }));
  jest.mock('@/modules/promotions', () => ({ router: mockRouters.promotions }));
  jest.mock('@/modules/notifications', () => ({ router: mockRouters.notifications }));
  jest.mock('@/modules/analytics', () => ({ router: mockRouters.analytics }));
  jest.mock('@/modules/organizer', () => ({ router: mockRouters.organizer }));
  jest.mock('@/modules/payments', () => ({ router: mockRouters.payments }));
  jest.mock('@/modules/venues', () => ({ router: mockRouters.venues }));
  jest.mock('@/modules/admin', () => ({ router: mockRouters.admin }));
  jest.mock('@/modules/auth', () => ({ router: mockRouters.auth }));
  jest.mock('@/modules/memberships', () => ({ router: mockRouters.memberships }));
  jest.mock('@/modules/storage', () => ({ router: mockRouters.storage }));
  jest.mock('@/modules/vouchers/api/routes', () => mockRouters.vouchers);
  jest.mock('@/providers/storage', () => mockStorageProvider);

  jest.mock('@/shared/middleware/observability.middleware', () => ({
    observabilityMiddleware: mockMiddleware.observability,
    metricsHandler: mockMiddleware.metrics,
  }));
  jest.mock('@/shared/middleware/error.middleware', () => ({
    notFoundHandler: mockMiddleware.notFound,
    globalErrorHandler: mockMiddleware.globalError,
  }));
  jest.mock('@/shared/middleware/csrf.middleware', () => ({
    csrfProtection: mockMiddleware.csrf,
  }));
  jest.mock('@/shared/middleware/rateLimit.middleware', () => ({
    publicApiLimiter: mockMiddleware.publicApiLimiter,
  }));
  jest.mock('@/shared/middleware/auth.middleware', () => ({
    verifyAuthToken: mockMiddleware.verifyAuthToken,
  }));
  jest.mock('@/shared/middleware/authz.middleware', () => ({
    requireRole: jest.fn(() => mockGrantRoleMiddleware),
  }));
});

afterEach(() => {
  jest.resetModules();
  process.env.NODE_ENV = originalNodeEnv;
  delete process.env.TRUST_PROXY;
  delete process.env.CORS_ALLOWED_ORIGINS;
  delete process.env.CORS_ORIGIN;
  delete process.env.ALLOWED_ORIGINS;
});

function loadApp() {
  require('@/app');
  return mockApp;
}

function loadCorsMiddleware() {
  loadApp();
  return mockApp.use.mock.calls[1][0];
}

test('initializes app and attaches parser, security and observability middleware', () => {
  delete process.env.TRUST_PROXY;
  const app = loadApp();

  expect(app.set).toHaveBeenCalledWith('trust proxy', 1);
  expect(app.use).toHaveBeenNthCalledWith(1, mockMiddleware.observability);
  expect(app.get).toHaveBeenNthCalledWith(1, '/metrics', mockMiddleware.metrics);
  expect(mockExpressJsonFn).toHaveBeenCalledTimes(1);
  expect(mockExpressUrlencodedFn).toHaveBeenCalledWith({ extended: false });
  expect(app.use.mock.calls[2]).toEqual([mockExpressJson]);
  expect(app.use.mock.calls[3]).toEqual([mockExpressUrlencoded]);
  expect(app.use.mock.calls[4]).toEqual([mockCookieParserMiddleware]);
  expect(app.use.mock.calls[5]).toEqual([mockMiddleware.csrf]);
  expect(app.use.mock.calls[6]).toEqual([mockMiddleware.publicApiLimiter]);
});

test('trust proxy defaults to 1 when unset', () => {
  delete process.env.TRUST_PROXY;
  const app = loadApp();
  expect(app.set).toHaveBeenCalledWith('trust proxy', 1);
});

test('trust proxy coerces numeric strings to numbers', () => {
  process.env.TRUST_PROXY = '2';
  const app = loadApp();
  expect(app.set).toHaveBeenCalledWith('trust proxy', 2);
});

test('trust proxy passes non-numeric strings through unchanged', () => {
  process.env.TRUST_PROXY = 'loopback, linklocal, uniquelocal';
  const app = loadApp();
  expect(app.set).toHaveBeenCalledWith('trust proxy', 'loopback, linklocal, uniquelocal');
});

test('mounts routers and handlers on all expected paths', () => {
  const app = loadApp();

  const expectedMounts = [
    ['/users', mockRouters.users],
    ['/events', mockRouters.events],
    ['/tickets', mockRouters.tickets],
    ['/profiles', mockRouters.featuredProfile],
    ['/reviews', mockRouters.reviews],
    ['/promotions', mockRouters.promotions],
    ['/notifications', mockRouters.notifications],
    ['/analytics', mockRouters.analytics],
    ['/organizer', mockRouters.organizer],
    ['/payments', mockRouters.payments],
    ['/venues', mockRouters.venues],
    ['/admin', mockRouters.admin],
    ['/auth', mockRouters.auth],
    ['/api/auth', mockRouters.auth],
    ['/storage', mockRouters.storage],
    ['/api/web/auth', mockRouters.auth],
    ['/api/mobile/auth', mockRouters.auth],
    ['/api/web/events', mockRouters.events],
    ['/api/web/tickets', mockRouters.tickets],
    ['/api/web/orders', mockRouters.orderCheckout],
    ['/api/web/payments', mockRouters.payments],
    ['/api/web/memberships', mockRouters.memberships],
    ['/api/web/vouchers', mockRouters.vouchers],
    ['/api/web/profiles', mockRouters.featuredProfile],
    ['/api/web/users', mockRouters.users],
    ['/api/web/notifications', mockRouters.notifications],
    ['/api/web/promotions', mockRouters.promotions],
    ['/api/web/storage', mockRouters.storage],
    ['/api/web/venues', mockRouters.venues],
    ['/api/organizer', mockRouters.organizer],
    ['/api/admin', mockRouters.admin],
  ];
  for (const [path, router] of expectedMounts) {
    expect(app.use).toHaveBeenCalledWith(path, router);
  }

  expect(app.get).toHaveBeenCalledWith('/artists/:slug', mockController.getProfileBySlug);
  expect(app.get).toHaveBeenCalledWith('/api/web/artists/:slug', mockController.getProfileBySlug);
  expect(app.get).toHaveBeenCalledWith('/public/:key(*)', expect.any(Function));

  const grant = app.post.mock.calls[0];
  expect(grant[0]).toBe('/admin/artists/:userId/grant');
  expect(grant[1]).toBe(mockMiddleware.verifyAuthToken);
  expect(grant[2]).toBe(mockGrantRoleMiddleware);
  expect(grant[3]).toBe(mockController.grantFeaturedArtist);

  const authz = require('@/shared/middleware/authz.middleware');
  expect(authz.requireRole).toHaveBeenCalledWith('admin');
});

test('serves index and health endpoints', () => {
  const app = loadApp();
  const gets = app.get.mock.calls;

  const indexHandler = gets.find(([path]) => path === '/')[1];
  const resIndex = createResMock();
  indexHandler({ headers: {} }, resIndex);
  expect(resIndex.send).toHaveBeenCalledWith('Welcome');

  const healthHandler = gets.find(([path]) => path === '/health')[1];
  const resHealth = createResMock();
  healthHandler({ headers: {} }, resHealth);
  expect(resHealth.status).toHaveBeenCalledWith(200);
  expect(resHealth.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true, service: 'eventing-api' }));
});

test('registers not-found and global error handlers after all routes', () => {
  const app = loadApp();
  const uses = app.use.mock.calls;
  expect(uses[uses.length - 2]).toEqual([mockMiddleware.notFound]);
  expect(uses[uses.length - 1]).toEqual([mockMiddleware.globalError]);
});

test('CORS allows default dev origins when no env origins configured', () => {
  const cors = loadCorsMiddleware();
  const res = createResMock();
  const next = jest.fn();
  cors({ headers: { origin: 'http://localhost:3000' } }, res, next);
  expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
  expect(res.header).toHaveBeenCalledWith('Vary', 'Origin');
  expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
  expect(next).toHaveBeenCalled();
  expect(res.status).not.toHaveBeenCalled();
});

test('CORS preflight OPTIONS short-circuits with 204', () => {
  const cors = loadCorsMiddleware();
  const res = createResMock();
  const next = jest.fn();
  cors({ method: 'OPTIONS', headers: { origin: 'http://127.0.0.1:3001' } }, res, next);
  expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  expect(res.status).toHaveBeenCalledWith(204);
  expect(res.end).toHaveBeenCalled();
  expect(next).not.toHaveBeenCalled();
});

test('CORS rejects disallowed origins with 403', () => {
  const cors = loadCorsMiddleware();
  const res = createResMock();
  const next = jest.fn();
  cors({ headers: { origin: 'https://evil.example' } }, res, next);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.json).toHaveBeenCalledWith({
    error: 'CORS_ORIGIN_NOT_ALLOWED',
    message: 'Cross-origin request rejected',
  });
  expect(next).not.toHaveBeenCalled();
});

test('CORS passes through when no origin header is present', () => {
  const cors = loadCorsMiddleware();
  const res = createResMock();
  const next = jest.fn();
  cors({ headers: {} }, res, next);
  expect(next).toHaveBeenCalledTimes(1);
  expect(res.header).not.toHaveBeenCalled();
});

test('CORS honors CORS_ALLOWED_ORIGINS and rejects everything else', () => {
  process.env.CORS_ALLOWED_ORIGINS = ' https://custom.app, https://custom2.app ';
  const cors = loadCorsMiddleware();

  const resAllowed = createResMock();
  const nextAllowed = jest.fn();
  cors({ headers: { origin: 'https://custom.app' } }, resAllowed, nextAllowed);
  expect(resAllowed.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://custom.app');
  expect(nextAllowed).toHaveBeenCalled();

  const resBlocked = createResMock();
  const nextBlocked = jest.fn();
  cors({ headers: { origin: 'http://localhost:3000' } }, resBlocked, nextBlocked);
  expect(resBlocked.status).toHaveBeenCalledWith(403);
  expect(nextBlocked).not.toHaveBeenCalled();
});

test('CORS falls back to CORS_ORIGIN when set', () => {
  process.env.CORS_ORIGIN = 'https://legacy.app';
  const cors = loadCorsMiddleware();
  const res = createResMock();
  const next = jest.fn();
  cors({ headers: { origin: 'https://legacy.app' } }, res, next);
  expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://legacy.app');
  expect(next).toHaveBeenCalled();
});

test('CORS in production blocks localhost and allows prod domains', () => {
  process.env.NODE_ENV = 'production';
  const cors = loadCorsMiddleware();

  const resAllowed = createResMock();
  const nextAllowed = jest.fn();
  cors({ headers: { origin: 'https://eventing.moteo.fun' } }, resAllowed, nextAllowed);
  expect(resAllowed.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://eventing.moteo.fun');
  expect(nextAllowed).toHaveBeenCalled();

  const resBlocked = createResMock();
  const nextBlocked = jest.fn();
  cors({ headers: { origin: 'http://localhost:3000' } }, resBlocked, nextBlocked);
  expect(resBlocked.status).toHaveBeenCalledWith(403);
  expect(nextBlocked).not.toHaveBeenCalled();
});

test('serves public files with content type from storage provider', async () => {
  const app = loadApp();
  const handler = app.get.mock.calls.find(([path]) => path === '/public/:key(*)')[1];
  const buffer = Buffer.from('payload');
  mockStorageProvider.getObjectBuffer.mockResolvedValue(buffer);
  mockStorageProvider.getObjectMetadata.mockResolvedValue({ contentType: 'image/png' });

  const res = createResMock();
  await handler({ params: { key: 'media/img.png' } }, res);

  expect(mockStorageProvider.getObjectBuffer).toHaveBeenCalledWith('media/img.png');
  expect(mockStorageProvider.getObjectMetadata).toHaveBeenCalledWith('media/img.png');
  expect(res.set).toHaveBeenCalledWith('Content-Type', 'image/png');
  expect(res.send).toHaveBeenCalledWith(buffer);
});

test('serves public files without setting content type when metadata is missing', async () => {
  const app = loadApp();
  const handler = app.get.mock.calls.find(([path]) => path === '/public/:key(*)')[1];
  mockStorageProvider.getObjectBuffer.mockResolvedValue(Buffer.from('payload'));
  mockStorageProvider.getObjectMetadata.mockResolvedValue({});

  const res = createResMock();
  await handler({ params: { key: 'x' } }, res);
  expect(res.set).not.toHaveBeenCalled();
  expect(res.send).toHaveBeenCalled();
});

test('returns 404 when storage provider lookup fails', async () => {
  const app = loadApp();
  const handler = app.get.mock.calls.find(([path]) => path === '/public/:key(*)')[1];
  mockStorageProvider.getObjectBuffer.mockRejectedValue(new Error('missing'));
  mockStorageProvider.getObjectMetadata.mockResolvedValue({ contentType: 'text/plain' });

  const res = createResMock();
  await handler({ params: { key: 'x' } }, res);
  expect(res.status).toHaveBeenCalledWith(404);
  expect(res.json).toHaveBeenCalledWith({ error: 'Not found' });
  expect(res.send).not.toHaveBeenCalled();
});
