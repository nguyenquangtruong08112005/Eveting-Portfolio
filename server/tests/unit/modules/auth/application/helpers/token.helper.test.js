const jwt = require('jsonwebtoken');

describe('token.helper — REFRESH_TOKEN_EXPIRY_MS', () => {
  beforeAll(() => {
    process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
    process.env.ACCESS_TOKEN_SECRET = 'test-secret';
    process.env.ACCESS_TOKEN_EXPIRES_IN = '15m';
  });

  it('computes 7d in ms', () => {
    jest.isolateModules(() => {
      const mod = require('@/modules/auth/application/helpers/token.helper');
      expect(mod.REFRESH_TOKEN_EXPIRY_MS).toBe(7 * 24 * 60 * 60 * 1000);
    });
  });

  describe('REFRESH_TOKEN_EXPIRY parsing', () => {
    const cases = [
      ['1h', 60 * 60 * 1000],
      ['30m', 30 * 60 * 1000],
      ['60s', 60 * 1000],
      ['2d', 2 * 24 * 60 * 60 * 1000],
    ];
    it.each(cases)('parses "%s" as %d ms', (env, expected) => {
      process.env.REFRESH_TOKEN_EXPIRES_IN = env;
      jest.isolateModules(() => {
        const fresh = require('@/modules/auth/application/helpers/token.helper');
        expect(fresh.REFRESH_TOKEN_EXPIRY_MS).toBe(expected);
      });
    });
  });

  it('defaults to 7d on invalid format', () => {
    process.env.REFRESH_TOKEN_EXPIRES_IN = 'invalid';
    jest.isolateModules(() => {
      const fresh = require('@/modules/auth/application/helpers/token.helper');
      expect(fresh.REFRESH_TOKEN_EXPIRY_MS).toBe(7 * 24 * 60 * 60 * 1000);
    });
  });
});

describe('token.helper — makeTokens', () => {
  beforeAll(() => {
    process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
    process.env.ACCESS_TOKEN_SECRET = 'test-secret';
    process.env.ACCESS_TOKEN_EXPIRES_IN = '15m';
  });

  it('returns accessToken, refreshToken, and refreshTokenHash', () => {
    jest.isolateModules(() => {
      const mod = require('@/modules/auth/application/helpers/token.helper');
      const result = mod.makeTokens('u1', 'a@b.com', ['user']);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('refreshTokenHash');

      const decoded = jwt.verify(result.accessToken, process.env.ACCESS_TOKEN_SECRET);
      expect(decoded.uid).toBe('u1');
      expect(decoded.email).toBe('a@b.com');
      expect(decoded.roles).toEqual(['user']);
    });
  });

  it('generates different refresh tokens per call', () => {
    jest.isolateModules(() => {
      const mod = require('@/modules/auth/application/helpers/token.helper');
      const r1 = mod.makeTokens('u1', 'a@b.com', ['user']);
      const r2 = mod.makeTokens('u1', 'a@b.com', ['user']);
      expect(r1.refreshToken).not.toBe(r2.refreshToken);
      expect(r1.refreshTokenHash).not.toBe(r2.refreshTokenHash);
    });
  });
});
