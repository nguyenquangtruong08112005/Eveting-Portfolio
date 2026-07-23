const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const config = require('@/shared/config/env.config');

const scryptAsync = promisify(crypto.scrypt);

const SALT_LENGTH = 16;
const SCRYPT_KEY_LENGTH = 64;
const HASH_ALGORITHM = 'scrypt';
const REFRESH_TOKEN_BYTES = 48;
const ACCESS_TOKEN_EXPIRY = config.accessTokenExpiresIn;

async function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  const derivedKey = await scryptAsync(password, salt, SCRYPT_KEY_LENGTH);
  return `${HASH_ALGORITHM}:${salt}:${derivedKey.toString('hex')}`;
}

function timingSafeEqualHex(a, b) {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function hashRefreshToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

async function verifyPassword(password, storedHash) {
  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== HASH_ALGORITHM) {
    throw new Error('Unsupported password hash format');
  }
  const [ , salt, key ] = parts;
  const derivedKey = await scryptAsync(password, salt, SCRYPT_KEY_LENGTH);
  return timingSafeEqualHex(key, derivedKey.toString('hex'));
}

function signAccessToken(payload) {
  return jwt.sign(payload, config.accessTokenSecret, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.accessTokenSecret);
}

function generateRefreshToken() {
  const raw = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
  return { raw, hash: hashRefreshToken(raw) };
}

function verifyRefreshToken(raw, storedHash) {
  return timingSafeEqualHex(hashRefreshToken(raw), storedHash);
}

async function verifyToken(token) {
  const decoded = verifyAccessToken(token);
  return {
    uid: decoded.uid,
    email: decoded.email,
    roles: decoded.roles || [],
    iat: decoded.iat,
    exp: decoded.exp,
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  verifyToken,
  hashRefreshToken,
};
