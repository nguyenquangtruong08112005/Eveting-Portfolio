'use strict';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
jest.mock('@/shared/logger', () => mockLogger);

const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn(() => ({ sendMail: mockSendMail }));
jest.mock('nodemailer', () => ({ createTransport: mockCreateTransport }));

const mockCache = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
jest.mock('@/shared/cache/cache-provider', () => mockCache);

const mockNonceHex = 'a'.repeat(64);
jest.mock('crypto', () => ({ randomBytes: jest.fn(() => Buffer.from(mockNonceHex, 'hex')) }));

// ---------------------------------------------------------------------------
// Globals
// ---------------------------------------------------------------------------

const BASE_TIME = 1_700_000_000_000;

const ENV_KEYS = [
  'AUTH_MOCK_EMAIL', 'NODE_ENV', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS',
  'SMTP_PORT', 'SMTP_SECURE', 'EMAIL_FROM',
  'MOBILE_ATTESTATION_ENFORCE', 'MOBILE_ATTESTATION_MOCK',
  'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON',
];

let envSnapshot = {};

beforeAll(() => {
  jest.useFakeTimers({ now: BASE_TIME });
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  ENV_KEYS.forEach(k => { envSnapshot[k] = process.env[k]; });
  jest.clearAllMocks();
});

afterEach(() => {
  ENV_KEYS.forEach(k => {
    if (envSnapshot[k] === undefined) delete process.env[k];
    else process.env[k] = envSnapshot[k];
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const req = (headers) => ({ headers: headers || {} });
const res = () => {
  const r = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json = jest.fn().mockReturnValue(r);
  return r;
};

// ===========================================================================
// Email Provider
// ===========================================================================

describe('Email Provider', () => {
  let emailMod;

  beforeEach(() => {
    jest.resetModules();
    emailMod = require('@/providers/email/index');
  });

  // -- isMockMode -----------------------------------------------------------

  describe('isMockMode', () => {
    it('returns true when AUTH_MOCK_EMAIL=true', () => {
      process.env.AUTH_MOCK_EMAIL = 'true';
      process.env.NODE_ENV = 'production';
      expect(emailMod.isMockMode()).toBe(true);
    });

    it('returns true when NODE_ENV=test and AUTH_MOCK_EMAIL is not false', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.AUTH_MOCK_EMAIL;
      expect(emailMod.isMockMode()).toBe(true);
    });

    it('returns false when NODE_ENV=test and AUTH_MOCK_EMAIL=false', () => {
      process.env.NODE_ENV = 'test';
      process.env.AUTH_MOCK_EMAIL = 'false';
      expect(emailMod.isMockMode()).toBe(false);
    });

    it('returns false when NODE_ENV=production and AUTH_MOCK_EMAIL not set', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.AUTH_MOCK_EMAIL;
      expect(emailMod.isMockMode()).toBe(false);
    });
  });

  // -- sendEmail (recipient validation) ------------------------------------

  describe('sendEmail (recipient validation)', () => {
    it('throws when to is missing', async () => {
      await expect(emailMod.sendEmail({ subject: 'hi' })).rejects.toThrow(
        'Recipient email (to) is required',
      );
    });

    it('throws when to is empty string', async () => {
      await expect(emailMod.sendEmail({ to: '  ' })).rejects.toThrow(
        'Recipient email (to) is required',
      );
    });

    it('throws when to is not a string', async () => {
      await expect(emailMod.sendEmail({ to: 123 })).rejects.toThrow(
        'Recipient email (to) is required',
      );
    });
  });

  // -- sendEmail (mock mode) -----------------------------------------------

  describe('sendEmail (mock mode)', () => {
    it('returns mock result and logs with text in allowed env', async () => {
      process.env.AUTH_MOCK_EMAIL = 'true';
      process.env.NODE_ENV = 'test';
      jest.resetModules();
      emailMod = require('@/providers/email/index');

      const result = await emailMod.sendEmail({ to: 'a@b.com', subject: 'Hi', text: 'secret' });
      expect(result).toEqual({
        success: true,
        messageId: expect.stringMatching(/^mock-/),
        mock: true,
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('[Email Provider (Mock)]'),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('| Text: "secret"'),
      );
    });

    it('logs without text body in non-allowed env', async () => {
      process.env.AUTH_MOCK_EMAIL = 'true';
      process.env.NODE_ENV = 'staging';
      jest.resetModules();
      emailMod = require('@/providers/email/index');

      await emailMod.sendEmail({ to: 'a@b.com', subject: 'Hi', text: 'secret' });
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('[Email Provider (Mock)]'),
      );
      expect(mockLogger.info).not.toHaveBeenCalledWith(
        expect.stringContaining('| Text:'),
      );
    });
  });

  // -- sendEmail (SMTP missing config) -------------------------------------

  describe('sendEmail (SMTP missing config)', () => {
    it('throws when SMTP_HOST is missing', async () => {
      process.env.NODE_ENV = 'test';
      process.env.AUTH_MOCK_EMAIL = 'false';
      jest.resetModules();
      emailMod = require('@/providers/email/index');

      await expect(
        emailMod.sendEmail({ to: 'a@b.com', subject: 't' }),
      ).rejects.toThrow(
        'Email service unconfigured: missing required SMTP setting(s): SMTP_HOST',
      );
    });

    it('throws when SMTP_USER is missing', async () => {
      process.env.NODE_ENV = 'test';
      process.env.AUTH_MOCK_EMAIL = 'false';
      process.env.SMTP_HOST = 'smtp.test.com';
      jest.resetModules();
      emailMod = require('@/providers/email/index');

      await expect(
        emailMod.sendEmail({ to: 'a@b.com', subject: 't' }),
      ).rejects.toThrow(
        'Email service unconfigured: missing required SMTP setting(s): SMTP_USER',
      );
    });

    it('throws when SMTP_PASS is missing', async () => {
      process.env.NODE_ENV = 'test';
      process.env.AUTH_MOCK_EMAIL = 'false';
      process.env.SMTP_HOST = 'smtp.test.com';
      process.env.SMTP_USER = 'u';
      jest.resetModules();
      emailMod = require('@/providers/email/index');

      await expect(
        emailMod.sendEmail({ to: 'a@b.com', subject: 't' }),
      ).rejects.toThrow(
        'Email service unconfigured: missing required SMTP setting(s): SMTP_PASS',
      );
    });

    it('lists all missing settings in one error', async () => {
      process.env.NODE_ENV = 'test';
      process.env.AUTH_MOCK_EMAIL = 'false';
      jest.resetModules();
      emailMod = require('@/providers/email/index');

      await expect(
        emailMod.sendEmail({ to: 'a@b.com', subject: 't' }),
      ).rejects.toThrow(
        'SMTP_HOST, SMTP_USER, SMTP_PASS',
      );
    });
  });

  // -- getTransporter (caching and port/secure variants) -------------------

  describe('getTransporter (caching and port/secure variants)', () => {
    const smtp = {
      SMTP_HOST: 'smtp.test.com', SMTP_USER: 'u', SMTP_PASS: 'p',
      AUTH_MOCK_EMAIL: 'false', NODE_ENV: 'test',
    };

    it('caches transporter across sends', async () => {
      Object.assign(process.env, smtp);
      jest.resetModules();
      emailMod = require('@/providers/email/index');
      mockSendMail.mockResolvedValue({ messageId: 'm1' });

      await emailMod.sendEmail({ to: 'a@b.com', subject: 's' });
      await emailMod.sendEmail({ to: 'b@c.com', subject: 't' });

      expect(mockCreateTransport).toHaveBeenCalledTimes(1);
    });

    it('resetTransporter clears cache then creates new transporter', async () => {
      Object.assign(process.env, smtp);
      jest.resetModules();
      emailMod = require('@/providers/email/index');
      mockSendMail.mockResolvedValue({ messageId: 'm1' });

      await emailMod.sendEmail({ to: 'a@b.com', subject: 's' });
      emailMod.resetTransporter();
      await emailMod.sendEmail({ to: 'b@c.com', subject: 't' });

      expect(mockCreateTransport).toHaveBeenCalledTimes(2);
    });

    it('defaults to port 587 and secure=false', async () => {
      Object.assign(process.env, smtp);
      jest.resetModules();
      emailMod = require('@/providers/email/index');
      mockSendMail.mockResolvedValue({ messageId: 'm1' });

      await emailMod.sendEmail({ to: 'a@b.com', subject: 's' });

      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({ port: 587, secure: false }),
      );
    });

    it('sets secure=true when SMTP_PORT=465', async () => {
      Object.assign(process.env, smtp, { SMTP_PORT: '465' });
      jest.resetModules();
      emailMod = require('@/providers/email/index');
      mockSendMail.mockResolvedValue({ messageId: 'm1' });

      await emailMod.sendEmail({ to: 'a@b.com', subject: 's' });

      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({ port: 465, secure: true }),
      );
    });

    it('sets secure=true when SMTP_SECURE=true on non-465 port', async () => {
      Object.assign(process.env, smtp, { SMTP_PORT: '587', SMTP_SECURE: 'true' });
      jest.resetModules();
      emailMod = require('@/providers/email/index');
      mockSendMail.mockResolvedValue({ messageId: 'm1' });

      await emailMod.sendEmail({ to: 'a@b.com', subject: 's' });

      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({ port: 587, secure: true }),
      );
    });
  });

  // -- sendEmail (success / failure) ---------------------------------------

  describe('sendEmail (success / failure)', () => {
    const smtp = {
      SMTP_HOST: 'smtp.test.com', SMTP_USER: 'u', SMTP_PASS: 'p',
      AUTH_MOCK_EMAIL: 'false', NODE_ENV: 'test',
    };

    it('sends successfully and logs info', async () => {
      Object.assign(process.env, smtp);
      jest.resetModules();
      emailMod = require('@/providers/email/index');
      mockSendMail.mockResolvedValue({ messageId: 'msg-1' });

      const result = await emailMod.sendEmail({
        to: 'a@b.com', subject: 'Hi', text: 'body', html: '<p>body</p>',
        from: 'custom@x.com',
      });

      expect(result).toEqual({ success: true, messageId: 'msg-1', mock: false });
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'custom@x.com', to: 'a@b.com', subject: 'Hi',
          text: 'body', html: '<p>body</p>',
        }),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Sent email to a@b.com'),
      );
    });

    it('logs error and re-throws on send failure', async () => {
      Object.assign(process.env, smtp);
      jest.resetModules();
      emailMod = require('@/providers/email/index');
      mockSendMail.mockRejectedValue(new Error('Connection refused'));

      await expect(
        emailMod.sendEmail({ to: 'a@b.com', subject: 'Hi' }),
      ).rejects.toThrow('Connection refused');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send email to a@b.com'),
      );
    });
  });
});

// ===========================================================================
// Play Integrity Provider
// ===========================================================================

describe('Play Integrity Provider', () => {
  let playMod;

  beforeEach(() => {
    jest.resetModules();
    playMod = require('@/providers/mobile/playIntegrity.provider');
  });

  // -- generateNonce --------------------------------------------------------

  describe('generateNonce', () => {
    it('creates nonce from crypto.randomBytes(32) hex string', async () => {
      const result = await playMod.generateNonce();
      expect(result.nonce).toBe(mockNonceHex);
    });

    it('stores in cache with attestation:nonce: prefix and TTL 300', async () => {
      const result = await playMod.generateNonce();
      expect(mockCache.set).toHaveBeenCalledWith(
        `attestation:nonce:${result.nonce}`,
        expect.any(String),
        300,
      );
    });

    it('returns expiresAt ISO string ~300s from now', async () => {
      const result = await playMod.generateNonce();
      expect(new Date(result.expiresAt).getTime()).toBe(BASE_TIME + 300_000);
    });

    it('stores JSON with nonce, expiresAt and createdAt', async () => {
      await playMod.generateNonce();
      const stored = JSON.parse(mockCache.set.mock.calls[0][1]);
      expect(stored).toEqual({
        nonce: mockNonceHex,
        expiresAt: new Date(BASE_TIME + 300_000).toISOString(),
        createdAt: BASE_TIME,
      });
    });

    it('logs info message on generation', async () => {
      await playMod.generateNonce();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Generated attestation nonce'),
      );
    });
  });

  // -- consumeNonce ---------------------------------------------------------

  describe('consumeNonce', () => {
    it('returns false for null', async () => {
      expect(await playMod.consumeNonce(null)).toBe(false);
    });

    it('returns false for undefined', async () => {
      expect(await playMod.consumeNonce(undefined)).toBe(false);
    });

    it('returns false for number (non-string)', async () => {
      expect(await playMod.consumeNonce(123)).toBe(false);
    });

    it('returns false when nonce not in cache', async () => {
      mockCache.get.mockResolvedValue(null);
      expect(await playMod.consumeNonce('abc')).toBe(false);
    });

    it('returns true and deletes cache entry on match', async () => {
      mockCache.get.mockResolvedValue('{"nonce":"abc"}');
      expect(await playMod.consumeNonce('abc')).toBe(true);
      expect(mockCache.del).toHaveBeenCalledWith('attestation:nonce:abc');
    });

    it('enforces single-use: second call returns false', async () => {
      mockCache.get
        .mockResolvedValueOnce('{"nonce":"abc"}')
        .mockResolvedValueOnce(null);
      expect(await playMod.consumeNonce('abc')).toBe(true);
      expect(await playMod.consumeNonce('abc')).toBe(false);
    });
  });

  // -- verifyAttestationToken (nonce / token validation) -------------------

  describe('verifyAttestationToken (nonce / token validation)', () => {
    it('returns INVALID_NONCE when consumeNonce fails', async () => {
      mockCache.get.mockResolvedValue(null);
      const result = await playMod.verifyAttestationToken('bad-nonce', 'some-token');
      expect(result).toEqual({
        success: false,
        code: 'INVALID_NONCE',
        message: 'Nonce is invalid, expired, or has already been used',
      });
    });

    it('returns MISSING_TOKEN when integrityToken is undefined', async () => {
      mockCache.get.mockResolvedValue('{"nonce":"valid"}');
      const result = await playMod.verifyAttestationToken('valid-nonce');
      expect(result).toEqual({
        success: false,
        code: 'MISSING_TOKEN',
        message: 'Integrity token is required',
      });
    });

    it('returns MISSING_TOKEN when integrityToken is empty string', async () => {
      mockCache.get.mockResolvedValue('{"nonce":"valid"}');
      const result = await playMod.verifyAttestationToken('valid-nonce', '');
      expect(result.code).toBe('MISSING_TOKEN');
    });
  });

  // -- verifyAttestationToken (mock mode) ----------------------------------

  describe('verifyAttestationToken (mock mode)', () => {
    beforeEach(() => {
      jest.resetModules();
      playMod = require('@/providers/mobile/playIntegrity.provider');
      delete process.env.MOBILE_ATTESTATION_ENFORCE;
      delete process.env.MOBILE_ATTESTATION_MOCK;
    });

    it('returns mock success with all verdict fields', async () => {
      mockCache.get.mockResolvedValue('{"nonce":"valid"}');
      const result = await playMod.verifyAttestationToken('valid-nonce', 'good-token');
      expect(result).toMatchObject({
        success: true,
        attested: true,
        appLicensingVerdict: 'LICENSED',
        deviceRecognitionVerdict: ['MEETS_DEVICE_INTEGRITY', 'MEETS_BASIC_INTEGRITY'],
        packageName: 'com.eventing.attendee',
        mock: true,
      });
      expect(result.timestampMs).toBeGreaterThan(0);
    });

    it('returns ATTESTATION_FAILED when token includes "invalid"', async () => {
      mockCache.get.mockResolvedValue('{"nonce":"valid"}');
      const result = await playMod.verifyAttestationToken('valid-nonce', 'invalid-token');
      expect(result).toEqual({
        success: false,
        code: 'ATTESTATION_FAILED',
        message: 'Mock attestation failure requested',
        mock: true,
      });
    });

    it('returns ATTESTATION_FAILED when token includes "fail"', async () => {
      mockCache.get.mockResolvedValue('{"nonce":"valid"}');
      const result = await playMod.verifyAttestationToken('valid-nonce', 'this-will-fail');
      expect(result.code).toBe('ATTESTATION_FAILED');
    });

    it('uses options.packageName when provided', async () => {
      mockCache.get.mockResolvedValue('{"nonce":"valid"}');
      const result = await playMod.verifyAttestationToken('valid-nonce', 'good', { packageName: 'custom.app' });
      expect(result.packageName).toBe('custom.app');
    });
  });

  // -- verifyAttestationToken (enforced / credentials) ---------------------

  describe('verifyAttestationToken (enforced / credentials)', () => {
    it('returns PROVIDER_CREDENTIALS_MISSING when enforced and service account missing', async () => {
      process.env.MOBILE_ATTESTATION_ENFORCE = 'true';
      process.env.MOBILE_ATTESTATION_MOCK = 'false';
      jest.resetModules();
      playMod = require('@/providers/mobile/playIntegrity.provider');
      mockCache.get.mockResolvedValue('{"nonce":"valid"}');

      const result = await playMod.verifyAttestationToken('valid-nonce', 'real-token');
      expect(result).toEqual({
        success: false,
        code: 'PROVIDER_CREDENTIALS_MISSING',
        message: 'Google Play Integrity API service account credentials not configured',
      });
    });

    it('remains in mock mode when MOBILE_ATTESTATION_MOCK is unset even if enforced', async () => {
      process.env.MOBILE_ATTESTATION_ENFORCE = 'true';
      delete process.env.MOBILE_ATTESTATION_MOCK;
      jest.resetModules();
      playMod = require('@/providers/mobile/playIntegrity.provider');
      mockCache.get.mockResolvedValue('{"nonce":"valid"}');

      const result = await playMod.verifyAttestationToken('valid-nonce', 'good-token');
      expect(result.mock).toBe(true);
    });
  });

  // -- verifyMobileAttestation (middleware) ---------------------------------

  describe('verifyMobileAttestation middleware', () => {
    let mwReq, mwRes, mwNext;

    beforeEach(() => {
      jest.resetModules();
      playMod = require('@/providers/mobile/playIntegrity.provider');
      mwReq = req();
      mwRes = res();
      mwNext = jest.fn();
    });

    it('calls next() when MOBILE_ATTESTATION_ENFORCE is not set', () => {
      delete process.env.MOBILE_ATTESTATION_ENFORCE;
      playMod.verifyMobileAttestation(mwReq, mwRes, mwNext);
      expect(mwNext).toHaveBeenCalled();
      expect(mwRes.status).not.toHaveBeenCalled();
    });

    it('calls next() when MOBILE_ATTESTATION_ENFORCE is false', () => {
      process.env.MOBILE_ATTESTATION_ENFORCE = 'false';
      playMod.verifyMobileAttestation(mwReq, mwRes, mwNext);
      expect(mwNext).toHaveBeenCalled();
    });

    it('returns 403 ATTESTATION_REQUIRED when enforced and header missing', () => {
      process.env.MOBILE_ATTESTATION_ENFORCE = 'true';
      playMod.verifyMobileAttestation(mwReq, mwRes, mwNext);
      expect(mwRes.status).toHaveBeenCalledWith(403);
      expect(mwRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'ATTESTATION_REQUIRED',
        message: 'X-App-Integrity-Token header required for this operation',
      });
      expect(mwNext).not.toHaveBeenCalled();
    });

    it('calls next() when enforced and header present', () => {
      process.env.MOBILE_ATTESTATION_ENFORCE = 'true';
      mwReq.headers['x-app-integrity-token'] = 'test-token';
      playMod.verifyMobileAttestation(mwReq, mwRes, mwNext);
      expect(mwNext).toHaveBeenCalled();
      expect(mwRes.status).not.toHaveBeenCalled();
    });
  });
});
