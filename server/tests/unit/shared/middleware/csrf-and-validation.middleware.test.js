const crypto = require('crypto');
const { validationResult } = require('express-validator');
const { BadRequestError } = require('@/shared/errors');

jest.mock('crypto');
jest.mock('express-validator', () => ({ validationResult: jest.fn() }));

const { csrfProtection, getCookieOptions } = require('@/shared/middleware/csrf.middleware');
const { validateRequest } = require('@/shared/middleware/validateRequest.middleware');

function mockReq(overrides) {
  return {
    method: 'GET',
    baseUrl: '',
    originalUrl: '/',
    path: '/',
    cookies: {},
    headers: {},
    ...overrides,
  };
}

function mockRes() {
  return {
    cookie: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

function mockNext() {
  return jest.fn();
}

describe('getCookieOptions', () => {
  const OENV = { ...process.env };

  beforeEach(() => {
    process.env = { ...OENV };
    delete process.env.COOKIE_SECURE;
    delete process.env.NODE_ENV;
  });

  afterAll(() => {
    process.env = OENV;
  });

  it('secure true when COOKIE_SECURE=true', () => {
    process.env.COOKIE_SECURE = 'true';
    expect(getCookieOptions({}).secure).toBe(true);
  });

  it('secure false when COOKIE_SECURE=false', () => {
    process.env.COOKIE_SECURE = 'false';
    expect(getCookieOptions({}).secure).toBe(false);
  });

  it('secure true via NODE_ENV production fallback', () => {
    process.env.NODE_ENV = 'production';
    expect(getCookieOptions({}).secure).toBe(true);
  });

  it('secure false via NODE_ENV development fallback', () => {
    process.env.NODE_ENV = 'development';
    expect(getCookieOptions({}).secure).toBe(false);
  });

  it('includes maxAge when provided', () => {
    const opts = getCookieOptions({}, { maxAge: 3600000 });
    expect(opts.maxAge).toBe(3600000);
  });

  it('omits maxAge when not provided', () => {
    expect(getCookieOptions({})).not.toHaveProperty('maxAge');
  });

  it('sets default httpOnly, sameSite, path', () => {
    const opts = getCookieOptions({});
    expect(opts.httpOnly).toBe(false);
    expect(opts.sameSite).toBe('lax');
    expect(opts.path).toBe('/');
  });
});

describe('csrfProtection', () => {
  let res, next;

  beforeEach(() => {
    crypto.randomBytes.mockReset();
    crypto.randomBytes.mockReturnValue(Buffer.alloc(32, 0xaa));
    res = mockRes();
    next = mockNext();
  });

  describe('web GET cookie issue', () => {
    it('issues csrfToken cookie when missing on web route and calls next', () => {
      const req = mockReq({ originalUrl: '/api/web/events' });
      csrfProtection(req, res, next);
      expect(crypto.randomBytes).toHaveBeenCalledWith(32);
      expect(res.cookie).toHaveBeenCalledWith(
        'csrfToken',
        expect.any(String),
        expect.objectContaining({ httpOnly: false, path: '/' })
      );
      expect(next).toHaveBeenCalled();
    });

    it('does not issue cookie when csrfToken already present', () => {
      const req = mockReq({
        originalUrl: '/api/web/events',
        cookies: { csrfToken: 'existing' },
      });
      csrfProtection(req, res, next);
      expect(res.cookie).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('safe non-web', () => {
    it('calls next for GET non-web', () => {
      const req = mockReq({ originalUrl: '/api/mobile' });
      csrfProtection(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('calls next for POST non-web without cookie auth', () => {
      const req = mockReq({ method: 'POST', originalUrl: '/api/mobile' });
      csrfProtection(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('auth excluded paths', () => {
    it.each(['/login', '/register', '/refresh', '/logout', '/verify-email'])(
      'calls next for POST %s',
      (path) => {
        const req = mockReq({
          method: 'POST',
          path,
          cookies: { accessToken: 'tok' },
        });
        csrfProtection(req, res, next);
        expect(next).toHaveBeenCalled();
      },
    );
  });

  describe('cookie-auth state change - success', () => {
    it('calls next with valid origin and matching token', () => {
      const req = mockReq({
        method: 'POST',
        originalUrl: '/api/web/events',
        cookies: { accessToken: 'at', csrfToken: 'valid-token' },
        headers: { origin: 'http://localhost:3000', 'x-csrf-token': 'valid-token' },
      });
      csrfProtection(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('invalid origin', () => {
    it('returns 403 for unknown origin', () => {
      const req = mockReq({
        method: 'POST',
        originalUrl: '/api/web/events',
        cookies: { accessToken: 'at', csrfToken: 'tok' },
        headers: { origin: 'http://evil.com', 'x-csrf-token': 'tok' },
      });
      csrfProtection(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('origin') }),
      );
    });
  });

  describe('cross-site metadata', () => {
    it('returns 403 when sec-fetch-site is cross-site', () => {
      const req = mockReq({
        method: 'POST',
        originalUrl: '/api/web/events',
        cookies: { accessToken: 'at', csrfToken: 'tok' },
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': 'tok',
          'sec-fetch-site': 'cross-site',
        },
      });
      csrfProtection(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('Cross-site') }),
      );
    });
  });

  describe('missing / mismatched token', () => {
    it('returns 403 when X-CSRF-Token header missing', () => {
      const req = mockReq({
        method: 'POST',
        originalUrl: '/api/web/events',
        cookies: { accessToken: 'at', csrfToken: 'tok' },
        headers: { origin: 'http://localhost:3000' },
      });
      csrfProtection(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 403 when token does not match cookie', () => {
      const req = mockReq({
        method: 'POST',
        originalUrl: '/api/web/events',
        cookies: { accessToken: 'at', csrfToken: 'real-token' },
        headers: { origin: 'http://localhost:3000', 'x-csrf-token': 'wrong-token' },
      });
      csrfProtection(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('origin host matching', () => {
    it('allows origin when host matches req.host', () => {
      const req = mockReq({
        method: 'POST',
        originalUrl: '/api/web/events',
        cookies: { accessToken: 'at', csrfToken: 'tok' },
        headers: {
          origin: 'http://my-custom-origin.com',
          host: 'my-custom-origin.com',
          'x-csrf-token': 'tok',
        },
      });
      csrfProtection(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('bearer-only mobile bypass', () => {
    it('calls next for POST non-web with Bearer token and no cookies', () => {
      const req = mockReq({
        method: 'POST',
        originalUrl: '/api/mobile',
        headers: { authorization: 'Bearer mob-token' },
      });
      csrfProtection(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});

describe('validateRequest', () => {
  let req, res, next;

  beforeEach(() => {
    validationResult.mockReset();
    req = {};
    res = {};
    next = jest.fn();
  });

  it('calls next when validation passes', () => {
    validationResult.mockReturnValue({ isEmpty: () => true, array: () => [] });
    validateRequest(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('throws BadRequestError with joined messages on validation failure', () => {
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: 'Email is required' }, { msg: 'Invalid format' }],
    });
    expect(() => validateRequest(req, res, next)).toThrow(BadRequestError);
    expect(() => validateRequest(req, res, next)).toThrow('Email is required; Invalid format');
  });
});
