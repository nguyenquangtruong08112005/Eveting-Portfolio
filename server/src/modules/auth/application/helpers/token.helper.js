const backendAuthProvider = require('@/providers/auth/backend.auth.provider');

const REFRESH_TOKEN_EXPIRY_MS = (() => {
  const env = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
  const match = env.match(/^(\d+)\s*(d|h|m|s)$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(match[1], 10);
  switch (match[2]) {
    case 'd': return n * 24 * 60 * 60 * 1000;
    case 'h': return n * 60 * 60 * 1000;
    case 'm': return n * 60 * 1000;
    case 's': return n * 1000;
    default:  return 7 * 24 * 60 * 60 * 1000;
  }
})();

function makeTokens(uid, email, roles) {
  const payload = { uid, email, roles };
  const accessToken = backendAuthProvider.signAccessToken(payload);
  const { raw: refreshToken, hash: refreshTokenHash } = backendAuthProvider.generateRefreshToken();
  return { accessToken, refreshToken, refreshTokenHash };
}

module.exports = { REFRESH_TOKEN_EXPIRY_MS, makeTokens };
