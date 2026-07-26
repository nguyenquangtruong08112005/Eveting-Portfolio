const axios = require('axios');
const { UnauthorizedError, BadRequestError } = require('@/shared/errors');
const logger = require('@/shared/logger');

function isDevBypassAllowed() {
  const isAllowedEnv = ['local', 'development', 'test'].includes(process.env.NODE_ENV);
  return process.env.AUTH_SOCIAL_DEV_BYPASS === 'true' && isAllowedEnv;
}

async function verifyGoogleIdToken(idToken) {
  if (!idToken) {
    throw new BadRequestError('Google ID token is required');
  }

  if (isDevBypassAllowed() && idToken.startsWith('mock_google_token_')) {
    const rawEmail = idToken.replace('mock_google_token_', '');
    const email = rawEmail.includes('@') ? rawEmail : `${rawEmail}@example.com`;
    logger.info(`[GoogleOAuthProvider] Dev bypass active for ${email}`);
    return {
      provider: 'google',
      providerSubject: `google_sub_${rawEmail}`,
      providerEmail: email,
      emailVerified: true,
      name: 'Mock Google User',
      picture: '',
    };
  }

  try {
    const response = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (response.status !== 200 || !response.data) {
      throw new Error('Google token verification failed');
    }

    const payload = response.data;
    const allowedClientIds = (process.env.GOOGLE_ALLOWED_CLIENT_IDS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (allowedClientIds.length === 0) {
      throw new Error('Google allowed client IDs not configured');
    }

    if (!allowedClientIds.includes(payload.aud)) {
      throw new Error('Google token audience mismatch');
    }

    const emailVerified = payload.email_verified === true || payload.email_verified === 'true';

    return {
      provider: 'google',
      providerSubject: payload.sub,
      providerEmail: payload.email,
      emailVerified,
      name: payload.name || payload.email.split('@')[0],
      picture: payload.picture || '',
    };
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof UnauthorizedError) {
      throw error;
    }
    logger.warn(`[GoogleOAuthProvider] Token verification failed: ${error.message}`);
    throw new UnauthorizedError(error.message || 'Invalid Google ID token');
  }
}

module.exports = {
  verifyGoogleIdToken,
  isDevBypassAllowed,
};
