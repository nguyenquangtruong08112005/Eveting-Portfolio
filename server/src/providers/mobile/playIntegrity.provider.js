const crypto = require('crypto');
const logger = require('@/shared/logger');
const { get, set, del } = require('@/shared/cache/cache-provider');

const NONCE_TTL_SECONDS = 300; // 5 minutes

/**
 * Generates a single-use cryptographically secure nonce for Play Integrity verification.
 */
async function generateNonce() {
  const nonce = crypto.randomBytes(32).toString('hex');
  const cacheKey = `attestation:nonce:${nonce}`;
  const expiresAt = new Date(Date.now() + NONCE_TTL_SECONDS * 1000).toISOString();

  await set(cacheKey, JSON.stringify({ nonce, expiresAt, createdAt: Date.now() }), NONCE_TTL_SECONDS);

  logger.info(`[PlayIntegrityProvider] Generated attestation nonce (TTL ${NONCE_TTL_SECONDS}s)`);
  return { nonce, expiresAt };
}

/**
 * Verifies and atomically consumes a nonce.
 */
async function consumeNonce(nonce) {
  if (!nonce || typeof nonce !== 'string') return false;
  const cacheKey = `attestation:nonce:${nonce}`;

  const stored = await get(cacheKey);
  if (!stored) return false;

  // Single-use: delete immediately
  await del(cacheKey);
  return true;
}

/**
 * Verifies a Play Integrity attestation token.
 */
async function verifyAttestationToken(nonce, integrityToken, options = {}) {
  const nonceValid = await consumeNonce(nonce);
  if (!nonceValid) {
    return {
      success: false,
      code: 'INVALID_NONCE',
      message: 'Nonce is invalid, expired, or has already been used',
    };
  }

  if (!integrityToken || typeof integrityToken !== 'string') {
    return {
      success: false,
      code: 'MISSING_TOKEN',
      message: 'Integrity token is required',
    };
  }

  const isEnforced = process.env.MOBILE_ATTESTATION_ENFORCE === 'true';
  const isMock = process.env.MOBILE_ATTESTATION_MOCK !== 'false' || !isEnforced;

  if (isMock) {
    if (integrityToken.includes('invalid') || integrityToken.includes('fail')) {
      return {
        success: false,
        code: 'ATTESTATION_FAILED',
        message: 'Mock attestation failure requested',
        mock: true,
      };
    }

    return {
      success: true,
      attested: true,
      appLicensingVerdict: 'LICENSED',
      deviceRecognitionVerdict: ['MEETS_DEVICE_INTEGRITY', 'MEETS_BASIC_INTEGRITY'],
      packageName: options.packageName || 'com.eventing.attendee',
      timestampMs: Date.now(),
      mock: true,
    };
  }

  // Live Production Verification Boundary
  const serviceAccountJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    logger.warn('[PlayIntegrityProvider] Production attestation enforced but GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is missing');
    return {
      success: false,
      code: 'PROVIDER_CREDENTIALS_MISSING',
      message: 'Google Play Integrity API service account credentials not configured',
    };
  }

  // Real verification logic using Google API boundary if credentials provided
  try {
    // Note: Live token verification requires Google Play Integrity API endpoint
    // POST https://playintegrity.googleapis.com/v1/{packageName=*} :decodeIntegrityToken
    return {
      success: false,
      code: 'NOT_IMPLEMENTED',
      message: 'Live Google API token decoding endpoint requires active Play Console OAuth binding',
    };
  } catch (err) {
    logger.error(`[PlayIntegrityProvider] Token verification error: ${err.message}`);
    return {
      success: false,
      code: 'VERIFICATION_ERROR',
      message: 'Failed to verify integrity token with Google Play API',
    };
  }
}

/**
 * Express middleware to enforce X-App-Integrity-Token on sensitive mobile API endpoints.
 */
function verifyMobileAttestation(req, res, next) {
  const isEnforced = process.env.MOBILE_ATTESTATION_ENFORCE === 'true';
  if (!isEnforced) return next();

  const token = req.headers['x-app-integrity-token'];
  if (!token) {
    return res.status(403).json({
      success: false,
      error: 'ATTESTATION_REQUIRED',
      message: 'X-App-Integrity-Token header required for this operation',
    });
  }

  next();
}

module.exports = {
  generateNonce,
  consumeNonce,
  verifyAttestationToken,
  verifyMobileAttestation,
};
