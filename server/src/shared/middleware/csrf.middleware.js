const crypto = require('crypto');

const EXCLUDED_PATHS = [
  '/login',
  '/register',
  '/refresh',
  '/logout',
  '/verify-email',
  '/email-verification',
  '/resend-verification',
  '/password-reset',
  '/google',
  '/google-login',
  '/facebook',
  '/facebook-login',
];

function isExcludedPath(path) {
  if (!path) return false;
  return EXCLUDED_PATHS.some((excluded) => path.includes(excluded));
}

function getCookieOptions(req, { httpOnly = false, maxAge } = {}) {
  const isSecure =
    process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === 'true'
      : process.env.NODE_ENV === 'production';

  const options = {
    httpOnly,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
  };
  if (maxAge !== undefined) {
    options.maxAge = maxAge;
  }
  return options;
}

const csrfProtection = (req, res, next) => {
  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  const url = req.baseUrl || req.originalUrl || req.path || '';
  const isWeb = url.startsWith('/api/web') || url.includes('/api/web');
  const isCookieAuth = Boolean(
    req.cookies && (req.cookies.accessToken || req.cookies.access_token || req.cookies.refreshToken)
  );

  // Issue CSRF cookie if not present on web requests
  if (isWeb && (!req.cookies || !req.cookies.csrfToken)) {
    const newToken = crypto.randomBytes(32).toString('hex');
    res.cookie('csrfToken', newToken, getCookieOptions(req, { httpOnly: false }));
  }

  // Non-state-changing or non-web / non-cookie requests do not require CSRF
  if (!isStateChanging || (!isWeb && !isCookieAuth)) {
    return next();
  }

  // Bootstrap / auth routes exclusion to prevent deadlock
  if (isExcludedPath(req.path) || isExcludedPath(req.originalUrl)) {
    return next();
  }

  // If request relies purely on Bearer Authorization header (mobile / direct API), bypass CSRF
  const authHeader = req.headers ? req.headers.authorization : null;
  if (authHeader && authHeader.startsWith('Bearer ') && !isCookieAuth && !isWeb) {
    return next();
  }

  // 1. Validate Origin / Fetch Metadata
  const origin = req.headers.origin || req.headers.referer;
  if (origin) {
    const allowedOrigins = (
      process.env.CORS_ALLOWED_ORIGINS ||
      process.env.CORS_ORIGIN ||
      'https://eventing.moteo.fun,http://localhost:3001,http://localhost:3000'
    )
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    let originHost = '';
    try {
      originHost = new URL(origin).host;
    } catch (e) {
      originHost = origin;
    }

    const reqHost = req.headers.host;
    const isAllowedOrigin =
      allowedOrigins.some((allowed) => {
        try {
          return new URL(allowed).host === originHost;
        } catch (e) {
          return allowed === origin;
        }
      }) || originHost === reqHost;

    if (!isAllowedOrigin) {
      return res.status(403).json({ error: 'Forbidden: Invalid request origin for CSRF validation.' });
    }
  }

  const secFetchSite = req.headers['sec-fetch-site'];
  if (secFetchSite === 'cross-site') {
    return res.status(403).json({ error: 'Forbidden: Cross-site requests rejected.' });
  }

  // 2. Validate X-CSRF-Token header against csrfToken cookie
  const headerToken = req.headers['x-csrf-token'] || req.headers['X-CSRF-Token'];
  const cookieToken = req.cookies && req.cookies.csrfToken;

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return res.status(403).json({ error: 'Forbidden: Invalid or missing CSRF token.' });
  }

  next();
};

module.exports = {
  csrfProtection,
  getCookieOptions,
};
