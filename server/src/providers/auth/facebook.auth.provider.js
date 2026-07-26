const axios = require('axios');
const { UnauthorizedError, BadRequestError } = require('@/shared/errors');
const logger = require('@/shared/logger');

function isDevBypassAllowed() {
  const isAllowedEnv = ['local', 'development', 'test'].includes(process.env.NODE_ENV);
  return process.env.AUTH_SOCIAL_DEV_BYPASS === 'true' && isAllowedEnv;
}

async function verifyFacebookAccessToken(accessToken) {
  if (!accessToken) {
    throw new BadRequestError('Facebook access token is required');
  }

  if (isDevBypassAllowed() && accessToken.startsWith('mock_facebook_token_')) {
    const rawEmail = accessToken.replace('mock_facebook_token_', '');
    const email = rawEmail.includes('@') ? rawEmail : `${rawEmail}@example.com`;
    logger.info(`[FacebookOAuthProvider] Dev bypass active for ${email}`);
    return {
      provider: 'facebook',
      providerSubject: `fb_sub_${rawEmail}`,
      providerEmail: email,
      emailVerified: true,
      name: 'Mock Facebook User',
      picture: '',
    };
  }

  try {
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error('Facebook App ID or Secret not configured');
    }

    const debugResponse = await axios.get(
      `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`
    );

    if (debugResponse.status !== 200 || !debugResponse.data?.data) {
      throw new Error('Facebook token debugging failed');
    }

    const debugData = debugResponse.data.data;
    if (!debugData.is_valid) {
      throw new Error('Facebook token is invalid');
    }

    if (debugData.app_id !== appId) {
      throw new Error('Facebook App ID mismatch');
    }

    const profileResponse = await axios.get(
      `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`
    );

    if (profileResponse.status !== 200 || !profileResponse.data) {
      throw new Error('Facebook profile fetch failed');
    }

    const payload = profileResponse.data;
    if (!payload.email) {
      throw new Error('Facebook profile did not return email');
    }

    return {
      provider: 'facebook',
      providerSubject: payload.id,
      providerEmail: payload.email,
      emailVerified: true,
      name: payload.name || payload.email.split('@')[0],
      picture: payload.picture?.data?.url || '',
    };
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof UnauthorizedError) {
      throw error;
    }
    logger.warn(`[FacebookOAuthProvider] Token verification failed: ${error.message}`);
    throw new UnauthorizedError(error.message || 'Invalid Facebook access token');
  }
}

module.exports = {
  verifyFacebookAccessToken,
  isDevBypassAllowed,
};
