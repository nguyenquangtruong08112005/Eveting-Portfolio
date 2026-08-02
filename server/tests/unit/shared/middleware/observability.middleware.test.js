jest.mock('@/shared/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  http: jest.fn(),
  asyncLocalStorage: { run: jest.fn() }
}));

const crypto = require('crypto');
const logger = require('@/shared/logger');
const { observabilityMiddleware, metricsHandler } = require('@/shared/middleware/observability.middleware');

function makeRes() {
  const r = { statusCode: 200 };
  r.status = jest.fn((code) => { r.statusCode = code; return r; });
  r.json = jest.fn().mockReturnValue(r);
  r.send = jest.fn().mockReturnValue(r);
  r.setHeader = jest.fn();
  r.on = jest.fn();
  r.set = jest.fn().mockReturnValue(r);
  return r;
}

describe('observabilityMiddleware', () => {
  let req, res, next, origHrtime, uuidSpy;

  beforeEach(() => {
    req = {
      method: 'GET',
      path: '/api/test',
      originalUrl: '/api/test',
      headers: {},
      baseUrl: '',
      route: null,
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' }
    };
    res = makeRes();
    res.on = jest.fn((event, cb) => {
      if (event === 'finish') res.__finishCb = cb;
    });
    next = jest.fn();
    jest.clearAllMocks();
    logger.asyncLocalStorage.run.mockImplementation((store, cb) => cb());
    uuidSpy = jest.spyOn(crypto, 'randomUUID').mockReturnValue('mocked-uuid');
    origHrtime = process.hrtime;
    process.hrtime = jest.fn()
      .mockReturnValueOnce([0, 0])
      .mockReturnValueOnce([0, 500000]);
  });

  afterEach(() => {
    process.hrtime = origHrtime;
    uuidSpy.mockRestore();
  });

  it('skips middleware when path is /metrics', () => {
    req.path = '/metrics';
    observabilityMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.setHeader).not.toHaveBeenCalled();
    expect(res.on).not.toHaveBeenCalled();
    expect(logger.asyncLocalStorage.run).not.toHaveBeenCalled();
  });

  it('sets request ID from x-request-id header', () => {
    req.headers['x-request-id'] = 'header-id';
    observabilityMiddleware(req, res, next);
    expect(req.id).toBe('header-id');
    expect(req.correlationId).toBe('header-id');
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'header-id');
    expect(res.setHeader).toHaveBeenCalledWith('x-correlation-id', 'header-id');
    expect(crypto.randomUUID).not.toHaveBeenCalled();
  });

  it('falls back to x-correlation-id header', () => {
    req.headers['x-correlation-id'] = 'corr-id';
    observabilityMiddleware(req, res, next);
    expect(req.id).toBe('corr-id');
  });

  it('generates randomUUID when no header present', () => {
    observabilityMiddleware(req, res, next);
    expect(crypto.randomUUID).toHaveBeenCalled();
    expect(req.id).toBe('mocked-uuid');
  });

  it('runs next inside asyncLocalStorage context', () => {
    observabilityMiddleware(req, res, next);
    expect(logger.asyncLocalStorage.run).toHaveBeenCalledWith(
      { requestId: expect.any(String) },
      expect.any(Function)
    );
    expect(next).toHaveBeenCalled();
  });

  it('logs HTTP info on finish event', () => {
    observabilityMiddleware(req, res, next);
    res.statusCode = 200;
    res.__finishCb();
    expect(logger.http).toHaveBeenCalledWith(
      'GET /api/test - 200 - 0.50ms',
      expect.objectContaining({
        method: 'GET',
        url: '/api/test',
        status: 200,
        durationMs: 0.5,
        ip: '127.0.0.1',
        requestId: 'mocked-uuid'
      })
    );
  });

  it('resolves route from req.route when available', () => {
    req.baseUrl = '/api';
    req.route = { path: '/test/:id' };
    observabilityMiddleware(req, res, next);
    res.statusCode = 200;
    res.__finishCb();
    expect(logger.http).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ route: '/api/test/:id' })
    );
  });

  it('falls back to req.path when req.route is null', () => {
    req.baseUrl = '/api';
    req.route = null;
    observabilityMiddleware(req, res, next);
    res.statusCode = 200;
    res.__finishCb();
    expect(logger.http).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ route: '/api/api/test' })
    );
  });

  it('records metric on finish event', () => {
    observabilityMiddleware(req, res, next);
    res.statusCode = 201;
    res.__finishCb();
    const mRes = makeRes();
    metricsHandler({ path: '/metrics' }, mRes);
    const body = mRes.send.mock.calls[0][0];
    expect(body).toContain('http_requests_total{method="GET",route="/api/test",status="201"} 1');
    expect(body).toContain('http_request_duration_seconds_sum{method="GET",route="/api/test",status="201"}');
  });

  it('uses req.ip or x-forwarded-for or socket.remoteAddress', () => {
    delete req.ip;
    req.headers['x-forwarded-for'] = '10.0.0.1';
    observabilityMiddleware(req, res, next);
    res.statusCode = 200;
    res.__finishCb();
    expect(logger.http).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ ip: '10.0.0.1' })
    );
  });
});

describe('metricsHandler', () => {
  let res;

  beforeEach(() => {
    res = makeRes();
    jest.clearAllMocks();
  });

  it('sets Content-Type header', () => {
    metricsHandler({}, res);
    expect(res.set).toHaveBeenCalledWith('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  });

  it('includes process uptime metric', () => {
    metricsHandler({}, res);
    const body = res.send.mock.calls[0][0];
    expect(body).toMatch(/^# HELP process_uptime_seconds/m);
    expect(body).toMatch(/^# TYPE process_uptime_seconds gauge/m);
    expect(body).toMatch(/^process_uptime_seconds \d+(\.\d+)?$/m);
  });

  it('includes process memory metrics', () => {
    metricsHandler({}, res);
    const body = res.send.mock.calls[0][0];
    expect(body).toMatch(/^# HELP process_memory_rss_bytes/m);
    expect(body).toMatch(/^process_memory_rss_bytes \d+$/m);
    expect(body).toMatch(/^process_memory_heap_total_bytes \d+$/m);
    expect(body).toMatch(/^process_memory_heap_used_bytes \d+$/m);
    expect(body).toMatch(/^process_memory_external_bytes \d+$/m);
  });

  it('includes CPU metrics', () => {
    metricsHandler({}, res);
    const body = res.send.mock.calls[0][0];
    expect(body).toMatch(/^# HELP process_cpu_user_seconds_total/m);
    expect(body).toMatch(/^process_cpu_system_seconds_total \d+(\.\d+)?$/m);
  });

  it('includes HTTP metrics headers even when no data', () => {
    metricsHandler({}, res);
    const body = res.send.mock.calls[0][0];
    expect(body).toContain('# HELP http_requests_total');
    expect(body).toContain('# TYPE http_requests_total counter');
  });

  it('terminates output with newline', () => {
    metricsHandler({}, res);
    const body = res.send.mock.calls[0][0];
    expect(body.endsWith('\n')).toBe(true);
  });
});
