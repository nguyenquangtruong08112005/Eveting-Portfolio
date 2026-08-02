const jwt = require('jsonwebtoken');
const crypto = require('crypto');

jest.mock('@/shared/config/env.config', () => ({
  accessTokenSecret: 'test-access-secret',
  accessTokenExpiresIn: '15m',
}));

const {
  hashPassword,
  verifyPassword,
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  verifyToken,
  hashRefreshToken,
} = require('@/providers/auth/backend.auth.provider');

describe('hashPassword', () => {
  it('returns a string in scrypt:salt:derivedKey format', async () => {
    const hash = await hashPassword('mypassword');
    expect(typeof hash).toBe('string');
    const parts = hash.split(':');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe('scrypt');
    expect(parts[1]).toMatch(/^[0-9a-f]{32}$/);
    expect(parts[2]).toMatch(/^[0-9a-f]{128}$/);
  });

  it('produces different hashes for different passwords', async () => {
    const [h1, h2] = await Promise.all([hashPassword('pwd1'), hashPassword('pwd2')]);
    expect(h1).not.toBe(h2);
  });

  it('produces different hashes for the same password (unique salt per call)', async () => {
    const [h1, h2] = await Promise.all([hashPassword('same'), hashPassword('same')]);
    expect(h1).not.toBe(h2);
  });
});

describe('verifyPassword', () => {
  it('returns true for a correct password', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    await expect(verifyPassword('correct-horse-battery-staple', hash)).resolves.toBe(true);
  });

  it('returns false for an incorrect password', async () => {
    const hash = await hashPassword('real-password');
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });

  it('throws on malformed hash format (no colons)', async () => {
    await expect(verifyPassword('pwd', 'not-a-valid-format')).rejects.toThrow('Unsupported password hash format');
  });

  it('throws on hash with wrong number of parts', async () => {
    await expect(verifyPassword('pwd', 'scrypt:salt')).rejects.toThrow('Unsupported password hash format');
  });

  it('throws on hash with unsupported algorithm prefix', async () => {
    await expect(verifyPassword('pwd', 'bcrypt:salt:key')).rejects.toThrow('Unsupported password hash format');
  });
});

describe('signAccessToken', () => {
  it('returns a JWT string decodable with the same secret', () => {
    const token = signAccessToken({ uid: 'u1', email: 'a@b.com', roles: ['user'] });
    expect(typeof token).toBe('string');
    const decoded = jwt.verify(token, 'test-access-secret');
    expect(decoded.uid).toBe('u1');
    expect(decoded.email).toBe('a@b.com');
    expect(decoded.roles).toEqual(['user']);
  });
});

describe('verifyAccessToken', () => {
  it('decodes a valid token signed with the same secret', () => {
    const token = jwt.sign({ uid: 'u1', email: 'a@b.com' }, 'test-access-secret', { expiresIn: '15m' });
    const decoded = verifyAccessToken(token);
    expect(decoded.uid).toBe('u1');
    expect(decoded.email).toBe('a@b.com');
  });

  it('throws for a token signed with a different secret', () => {
    const token = jwt.sign({ uid: 'u1' }, 'wrong-secret');
    expect(() => verifyAccessToken(token)).toThrow();
  });

  it('throws for a malformed token string', () => {
    expect(() => verifyAccessToken('not-a-jwt')).toThrow();
  });
});

describe('verifyToken', () => {
  it('returns normalized object with default roles [] when roles missing', async () => {
    const token = jwt.sign({ uid: 'u1', email: 'a@b.com' }, 'test-access-secret', { expiresIn: '15m' });
    const result = await verifyToken(token);
    expect(result).toEqual({
      uid: 'u1',
      email: 'a@b.com',
      roles: [],
      iat: expect.any(Number),
      exp: expect.any(Number),
    });
  });

  it('preserves roles when present in token', async () => {
    const token = jwt.sign({ uid: 'u1', email: 'a@b.com', roles: ['admin'] }, 'test-access-secret', { expiresIn: '15m' });
    const result = await verifyToken(token);
    expect(result).toMatchObject({ roles: ['admin'] });
  });

  it('rejects for an invalid token', async () => {
    await expect(verifyToken('invalid-token')).rejects.toThrow();
  });
});

describe('generateRefreshToken', () => {
  it('returns { raw, hash } where hash is sha256 of raw', () => {
    const result = generateRefreshToken();
    expect(result).toHaveProperty('raw');
    expect(result).toHaveProperty('hash');
    const expectedHash = crypto.createHash('sha256').update(result.raw).digest('hex');
    expect(result.hash).toBe(expectedHash);
  });

  it('generates unique raw tokens on each call', () => {
    const r1 = generateRefreshToken();
    const r2 = generateRefreshToken();
    expect(r1.raw).not.toBe(r2.raw);
    expect(r1.hash).not.toBe(r2.hash);
  });
});

describe('verifyRefreshToken', () => {
  it('returns true for a matching raw/hash pair', () => {
    const { raw, hash } = generateRefreshToken();
    expect(verifyRefreshToken(raw, hash)).toBe(true);
  });

  it('returns false for a mismatched raw and hash', () => {
    const { raw } = generateRefreshToken();
    const otherHash = crypto.createHash('sha256').update('different').digest('hex');
    expect(verifyRefreshToken(raw, otherHash)).toBe(false);
  });

  it('returns false when stored hash has different byte length', () => {
    const { raw } = generateRefreshToken();
    expect(verifyRefreshToken(raw, 'short')).toBe(false);
    expect(verifyRefreshToken(raw, 'a'.repeat(65))).toBe(false);
  });
});

describe('hashRefreshToken', () => {
  it('returns a deterministic 64-char hex string', () => {
    const raw = 'some-raw-token-value';
    const h1 = hashRefreshToken(raw);
    const h2 = hashRefreshToken(raw);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces different hashes for different inputs', () => {
    const h1 = hashRefreshToken('token-a');
    const h2 = hashRefreshToken('token-b');
    expect(h1).not.toBe(h2);
  });
});
