'use strict';

jest.mock('@/shared/middleware/asyncHandler', () => (fn) => (req, res, next) => {
  req.__optedInToGlobalErrorHandling = true;
  return Promise.resolve(fn(req, res, next)).catch(next);
});

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  refreshToken: jest.fn(),
  logout: jest.fn(),
  logoutAll: jest.fn(),
  googleLogin: jest.fn(),
  facebookLogin: jest.fn(),
  requestPasswordReset: jest.fn(),
  confirmPasswordReset: jest.fn(),
  requestEmailVerification: jest.fn(),
  confirmEmailVerification: jest.fn(),
};

jest.mock('@/modules/auth/application/service', () => mockAuthService);

const mockPlayIntegrity = {
  generateNonce: jest.fn(),
  verifyAttestationToken: jest.fn(),
};

jest.mock('@/providers/mobile/playIntegrity.provider', () => mockPlayIntegrity);

const {
  register, login, refresh, logout, logoutAll,
  googleLogin, facebookLogin,
  passwordResetRequest, passwordResetConfirm,
  emailVerificationRequest, verifyEmail,
  getMobileNonce, attestMobileApp,
} = require('@/modules/auth/api/controller');

const uid = 'user_001';

function mockReq(overrides = {}) {
  return {
    user: { uid },
    body: {},
    params: {},
    query: {},
    cookies: {},
    baseUrl: '/api/mobile/auth',
    headers: {},
    ...overrides,
  };
}
function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('register', () => {
  it('registers user and returns 201 for mobile', async () => {
    const result = { accessToken: 'at', refreshToken: 'rt', user: { id: uid } };
    mockAuthService.register.mockResolvedValue(result);
    const req = mockReq({ body: { email: 'a@b.com', password: '123456', name: 'A', role: 'user' } });
    const res = mockRes();
    const next = jest.fn();
    await register(req, res, next);
    expect(mockAuthService.register).toHaveBeenCalledWith({ email: 'a@b.com', password: '123456', name: 'A', role: 'user', clientTransport: 'mobile' });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(result);
    expect(res.cookie).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('registers and sets csrf cookie for web', async () => {
    mockAuthService.register.mockResolvedValue({ message: 'ok' });
    const req = mockReq({ baseUrl: '/api/web/auth', body: { email: 'a@b.com', password: '123456' } });
    const res = mockRes();
    const next = jest.fn();
    await register(req, res, next);
    expect(res.cookie).toHaveBeenCalledWith('csrfToken', expect.any(String), expect.objectContaining({ httpOnly: false }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('propagates service error', async () => {
    const err = new Error('fail');
    mockAuthService.register.mockRejectedValue(err);
    const req = mockReq({ body: { email: 'a@b.com', password: '123456' } });
    const res = mockRes();
    const next = jest.fn();
    await register(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('login', () => {
  const result = { accessToken: 'at', refreshToken: 'rt', user: { id: uid, name: 'A' } };

  it('returns full result for mobile', async () => {
    mockAuthService.login.mockResolvedValue(result);
    const req = mockReq({ body: { email: 'a@b.com', password: 'pw' } });
    const res = mockRes();
    const next = jest.fn();
    await login(req, res, next);
    expect(mockAuthService.login).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pw' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('sets auth cookies and returns only user for web', async () => {
    mockAuthService.login.mockResolvedValue(result);
    const req = mockReq({ baseUrl: '/api/web/auth', body: { email: 'a@b.com', password: 'pw' } });
    const res = mockRes();
    const next = jest.fn();
    await login(req, res, next);
    expect(res.cookie).toHaveBeenCalledWith('accessToken', 'at', expect.any(Object));
    expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'rt', expect.any(Object));
    expect(res.cookie).toHaveBeenCalledWith('csrfToken', expect.any(String), expect.objectContaining({ httpOnly: false }));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ user: result.user });
  });

  it('propagates service error', async () => {
    const err = new Error('fail');
    mockAuthService.login.mockRejectedValue(err);
    const req = mockReq({ body: { email: 'a@b.com', password: 'pw' } });
    const res = mockRes();
    const next = jest.fn();
    await login(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('refresh', () => {
  const result = { accessToken: 'at2', refreshToken: 'rt2', user: { id: uid } };

  it('uses body refreshToken for mobile', async () => {
    mockAuthService.refreshToken.mockResolvedValue(result);
    const req = mockReq({ body: { refreshToken: 'rt1' } });
    const res = mockRes();
    const next = jest.fn();
    await refresh(req, res, next);
    expect(mockAuthService.refreshToken).toHaveBeenCalledWith('rt1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  it('reads refreshToken from cookie for web', async () => {
    mockAuthService.refreshToken.mockResolvedValue(result);
    const req = mockReq({ baseUrl: '/api/web/auth', cookies: { refreshToken: 'rt_cookie' } });
    const res = mockRes();
    const next = jest.fn();
    await refresh(req, res, next);
    expect(mockAuthService.refreshToken).toHaveBeenCalledWith('rt_cookie');
    expect(res.cookie).toHaveBeenCalledWith('accessToken', 'at2', expect.any(Object));
    expect(res.json).toHaveBeenCalledWith({ user: result.user });
  });

  it('prefers body refreshToken over cookie for web', async () => {
    mockAuthService.refreshToken.mockResolvedValue(result);
    const req = mockReq({ baseUrl: '/api/web/auth', body: { refreshToken: 'rt_body' }, cookies: { refreshToken: 'rt_cookie' } });
    const res = mockRes();
    const next = jest.fn();
    await refresh(req, res, next);
    expect(mockAuthService.refreshToken).toHaveBeenCalledWith('rt_body');
  });

  it('falls back to refresh_token cookie key', async () => {
    mockAuthService.refreshToken.mockResolvedValue(result);
    const req = mockReq({ baseUrl: '/api/web/auth', cookies: { refresh_token: 'rt_alt' } });
    const res = mockRes();
    const next = jest.fn();
    await refresh(req, res, next);
    expect(mockAuthService.refreshToken).toHaveBeenCalledWith('rt_alt');
  });

  it('throws UnauthorizedError when no refresh token', async () => {
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await refresh(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401, message: 'Refresh token is required' }));
  });
});

describe('logout', () => {
  it('calls logout with token and returns 200 for mobile', async () => {
    mockAuthService.logout.mockResolvedValue({ success: true });
    const req = mockReq({ body: { refreshToken: 'rt' } });
    const res = mockRes();
    const next = jest.fn();
    await logout(req, res, next);
    expect(mockAuthService.logout).toHaveBeenCalledWith('rt');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('skips service call when no token and clears cookies for web', async () => {
    const req = mockReq({ baseUrl: '/api/web/auth', cookies: { refreshToken: 'rt' } });
    const res = mockRes();
    const next = jest.fn();
    await logout(req, res, next);
    expect(mockAuthService.logout).toHaveBeenCalledWith('rt');
    expect(res.clearCookie).toHaveBeenCalledWith('accessToken', expect.any(Object));
    expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', expect.any(Object));
    expect(res.clearCookie).toHaveBeenCalledWith('csrfToken', expect.any(Object));
  });

  it('does not call logout when no token provided', async () => {
    const req = mockReq({ body: {} });
    const res = mockRes();
    const next = jest.fn();
    await logout(req, res, next);
    expect(mockAuthService.logout).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('logoutAll', () => {
  it('calls logoutAll and returns', async () => {
    mockAuthService.logoutAll.mockResolvedValue({ success: true });
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await logoutAll(req, res, next);
    expect(mockAuthService.logoutAll).toHaveBeenCalledWith(uid);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('clears cookies for web', async () => {
    mockAuthService.logoutAll.mockResolvedValue({});
    const req = mockReq({ baseUrl: '/api/web/auth' });
    const res = mockRes();
    const next = jest.fn();
    await logoutAll(req, res, next);
    expect(res.clearCookie).toHaveBeenCalledWith('accessToken', expect.any(Object));
    expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', expect.any(Object));
    expect(res.clearCookie).toHaveBeenCalledWith('csrfToken', expect.any(Object));
  });

  it('uses req.user.id as fallback', async () => {
    mockAuthService.logoutAll.mockResolvedValue({});
    const req = mockReq({ user: { id: 'alt_id' } });
    const res = mockRes();
    const next = jest.fn();
    await logoutAll(req, res, next);
    expect(mockAuthService.logoutAll).toHaveBeenCalledWith('alt_id');
  });
});

describe('googleLogin', () => {
  const result = { accessToken: 'at', refreshToken: 'rt', user: { id: uid } };

  it('returns full result for mobile', async () => {
    mockAuthService.googleLogin.mockResolvedValue(result);
    const req = mockReq({ body: { idToken: 'tok', role: 'user' } });
    const res = mockRes();
    const next = jest.fn();
    await googleLogin(req, res, next);
    expect(mockAuthService.googleLogin).toHaveBeenCalledWith({ idToken: 'tok', role: 'user' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  it('sets cookies for web', async () => {
    mockAuthService.googleLogin.mockResolvedValue(result);
    const req = mockReq({ baseUrl: '/api/web/auth', body: { idToken: 'tok' } });
    const res = mockRes();
    const next = jest.fn();
    await googleLogin(req, res, next);
    expect(res.cookie).toHaveBeenCalledWith('accessToken', 'at', expect.any(Object));
    expect(res.json).toHaveBeenCalledWith({ user: result.user });
  });
});

describe('facebookLogin', () => {
  const result = { accessToken: 'at', refreshToken: 'rt', user: { id: uid } };

  it('returns full result for mobile', async () => {
    mockAuthService.facebookLogin.mockResolvedValue(result);
    const req = mockReq({ body: { accessToken: 'fb_tok', role: 'organizer' } });
    const res = mockRes();
    const next = jest.fn();
    await facebookLogin(req, res, next);
    expect(mockAuthService.facebookLogin).toHaveBeenCalledWith({ accessToken: 'fb_tok', role: 'organizer' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  it('sets cookies for web', async () => {
    mockAuthService.facebookLogin.mockResolvedValue(result);
    const req = mockReq({ baseUrl: '/api/web/auth', body: { accessToken: 'fb_tok' } });
    const res = mockRes();
    const next = jest.fn();
    await facebookLogin(req, res, next);
    expect(res.cookie).toHaveBeenCalledWith('accessToken', 'at', expect.any(Object));
    expect(res.json).toHaveBeenCalledWith({ user: result.user });
  });
});

describe('passwordResetRequest', () => {
  it('calls service and returns 200', async () => {
    mockAuthService.requestPasswordReset.mockResolvedValue({ message: 'ok' });
    const req = mockReq({ body: { email: 'a@b.com' } });
    const res = mockRes();
    const next = jest.fn();
    await passwordResetRequest(req, res, next);
    expect(mockAuthService.requestPasswordReset).toHaveBeenCalledWith('a@b.com');
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('passwordResetConfirm', () => {
  it('calls service and returns 200', async () => {
    mockAuthService.confirmPasswordReset.mockResolvedValue({ success: true });
    const req = mockReq({ body: { token: 't', newPassword: 'newpw' } });
    const res = mockRes();
    const next = jest.fn();
    await passwordResetConfirm(req, res, next);
    expect(mockAuthService.confirmPasswordReset).toHaveBeenCalledWith('t', 'newpw');
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('emailVerificationRequest / resendVerification', () => {
  it('calls service and returns 200', async () => {
    mockAuthService.requestEmailVerification.mockResolvedValue({ message: 'sent' });
    const req = mockReq({ body: { email: 'a@b.com' } });
    const res = mockRes();
    const next = jest.fn();
    await emailVerificationRequest(req, res, next);
    expect(mockAuthService.requestEmailVerification).toHaveBeenCalledWith('a@b.com');
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('verifyEmail', () => {
  it('uses token from query', async () => {
    mockAuthService.confirmEmailVerification.mockResolvedValue({ success: true, email: 'a@b.com' });
    const req = mockReq({ query: { token: 'tok_q' } });
    const res = mockRes();
    const next = jest.fn();
    await verifyEmail(req, res, next);
    expect(mockAuthService.confirmEmailVerification).toHaveBeenCalledWith('tok_q');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, email: 'a@b.com' });
  });

  it('uses token from body', async () => {
    mockAuthService.confirmEmailVerification.mockResolvedValue({ success: true });
    const req = mockReq({ body: { token: 'tok_b' } });
    const res = mockRes();
    const next = jest.fn();
    await verifyEmail(req, res, next);
    expect(mockAuthService.confirmEmailVerification).toHaveBeenCalledWith('tok_b');
  });

  it('throws BadRequestError when no token', async () => {
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await verifyEmail(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('redirects on GET with text/html accept (success)', async () => {
    mockAuthService.confirmEmailVerification.mockResolvedValue({ success: true });
    const req = mockReq({ method: 'GET', query: { token: 'tok' }, headers: { accept: 'text/html' } });
    const res = mockRes();
    const next = jest.fn();
    await verifyEmail(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith(302, expect.stringContaining('status=success'));
    expect(res.json).not.toHaveBeenCalled();
  });

  it('redirects on GET with text/html accept (error)', async () => {
    mockAuthService.confirmEmailVerification.mockRejectedValue(new Error('bad token'));
    const req = mockReq({ method: 'GET', query: { token: 'tok' }, headers: { accept: 'text/html' } });
    const res = mockRes();
    const next = jest.fn();
    await verifyEmail(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith(302, expect.stringContaining('status=error'));
  });
});

describe('getMobileNonce', () => {
  it('returns nonce from provider', async () => {
    mockPlayIntegrity.generateNonce.mockResolvedValue({ nonce: 'abc' });
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await getMobileNonce(req, res, next);
    expect(mockPlayIntegrity.generateNonce).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ nonce: 'abc' });
  });
});

describe('attestMobileApp', () => {
  it('returns 200 on successful attestation', async () => {
    mockPlayIntegrity.verifyAttestationToken.mockResolvedValue({ success: true, payload: {} });
    const req = mockReq({ body: { nonce: 'n', integrityToken: 'it', packageName: 'com.x' } });
    const res = mockRes();
    const next = jest.fn();
    await attestMobileApp(req, res, next);
    expect(mockPlayIntegrity.verifyAttestationToken).toHaveBeenCalledWith('n', 'it', { packageName: 'com.x' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, payload: {} });
  });

  it('returns 400 on failed attestation', async () => {
    mockPlayIntegrity.verifyAttestationToken.mockResolvedValue({ success: false, error: 'fail' });
    const req = mockReq({ body: { nonce: 'n', integrityToken: 'it' } });
    const res = mockRes();
    const next = jest.fn();
    await attestMobileApp(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'fail' });
  });

  it('throws BadRequestError when nonce missing', async () => {
    const req = mockReq({ body: { integrityToken: 'it' } });
    const res = mockRes();
    const next = jest.fn();
    await attestMobileApp(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });
});
