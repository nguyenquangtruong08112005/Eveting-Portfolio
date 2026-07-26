const asyncHandler = require('@/shared/middleware/asyncHandler');
const authService = require('@/modules/auth/application/service');
const { BadRequestError, UnauthorizedError } = require('@/shared/errors');
const crypto = require('crypto');

function getClientTransport(req) {
    const url = req.baseUrl || req.originalUrl || req.path || '';
    if (url.startsWith('/api/web/auth') || url.includes('/api/web')) {
        return 'web';
    }
    return 'mobile';
}

function getCookieOptions(req, { httpOnly = true, maxAge } = {}) {
    const isSecure = process.env.COOKIE_SECURE !== undefined
        ? process.env.COOKIE_SECURE === 'true'
        : (process.env.NODE_ENV === 'production');

    const options = {
        httpOnly,
        secure: isSecure,
        sameSite: 'lax',
        path: '/'
    };
    if (maxAge !== undefined) {
        options.maxAge = maxAge;
    }
    return options;
}

function setAuthCookies(req, res, { accessToken, refreshToken }) {
    res.cookie('accessToken', accessToken, getCookieOptions(req, { httpOnly: true, maxAge: 15 * 60 * 1000 }));
    res.cookie('refreshToken', refreshToken, getCookieOptions(req, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 }));

    // Non-HttpOnly CSRF token cookie for web client
    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie('csrfToken', csrfToken, getCookieOptions(req, { httpOnly: false }));
}

function clearAuthCookies(req, res) {
    res.clearCookie('accessToken', getCookieOptions(req));
    res.clearCookie('refreshToken', getCookieOptions(req));
    res.clearCookie('csrfToken', getCookieOptions(req, { httpOnly: false }));
}

const register = asyncHandler(async (req, res) => {
    const { email, password, name, role } = req.body;
    const clientTransport = getClientTransport(req);
    const result = await authService.register({ email, password, name, role, clientTransport });
    if (clientTransport === 'web') {
        const csrfToken = crypto.randomBytes(32).toString('hex');
        res.cookie('csrfToken', csrfToken, getCookieOptions(req, { httpOnly: false }));
    }
    res.status(201).json(result);
});

const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const clientTransport = getClientTransport(req);
    const result = await authService.login({ email, password });
    if (clientTransport === 'web') {
        setAuthCookies(req, res, result);
        return res.status(200).json({ user: result.user });
    }
    res.status(200).json(result);
});

const refresh = asyncHandler(async (req, res) => {
    const clientTransport = getClientTransport(req);
    let refreshTokenVal = req.body ? req.body.refreshToken : undefined;

    if (clientTransport === 'web' && req.cookies) {
        refreshTokenVal = refreshTokenVal || req.cookies.refreshToken || req.cookies.refresh_token;
    }

    if (!refreshTokenVal) {
        throw new UnauthorizedError('Refresh token is required');
    }

    const result = await authService.refreshToken(refreshTokenVal);

    if (clientTransport === 'web') {
        setAuthCookies(req, res, result);
        return res.status(200).json({ user: result.user });
    }

    res.status(200).json(result);
});

const logout = asyncHandler(async (req, res) => {
    const clientTransport = getClientTransport(req);
    let refreshTokenVal = req.body ? req.body.refreshToken : undefined;

    if (clientTransport === 'web' && req.cookies) {
        refreshTokenVal = refreshTokenVal || req.cookies.refreshToken || req.cookies.refresh_token;
    }

    if (refreshTokenVal) {
        await authService.logout(refreshTokenVal);
    }

    if (clientTransport === 'web') {
        clearAuthCookies(req, res);
    }

    res.status(200).json({ success: true });
});

const logoutAll = asyncHandler(async (req, res) => {
    const userId = req.user.uid || req.user.id;
    const clientTransport = getClientTransport(req);
    const result = await authService.logoutAll(userId);
    if (clientTransport === 'web') {
        clearAuthCookies(req, res);
    }
    res.status(200).json(result);
});

const googleLogin = asyncHandler(async (req, res) => {
    const { idToken, role } = req.body;
    const clientTransport = getClientTransport(req);
    const result = await authService.googleLogin({ idToken, role });
    if (clientTransport === 'web') {
        setAuthCookies(req, res, result);
        return res.status(200).json({ user: result.user });
    }
    res.status(200).json(result);
});

const facebookLogin = asyncHandler(async (req, res) => {
    const { accessToken, role } = req.body;
    const clientTransport = getClientTransport(req);
    const result = await authService.facebookLogin({ accessToken, role });
    if (clientTransport === 'web') {
        setAuthCookies(req, res, result);
        return res.status(200).json({ user: result.user });
    }
    res.status(200).json(result);
});

const passwordResetRequest = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await authService.requestPasswordReset(email);
    res.status(200).json(result);
});

const passwordResetConfirm = asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;
    const result = await authService.confirmPasswordReset(token, newPassword);
    res.status(200).json(result);
});

const emailVerificationRequest = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await authService.requestEmailVerification(email);
    res.status(200).json(result);
});

const verifyEmail = asyncHandler(async (req, res) => {
    const token = req.query.token || req.body.token;
    if (!token) {
        throw new BadRequestError('Verification token is required');
    }

    const rawWebUrl = process.env.APP_PUBLIC_WEB_URL || process.env.WEB_APP_URL || 'http://localhost:3000';
    let safeBaseUrl = 'http://localhost:3000';
    try {
        const parsed = new URL(rawWebUrl);
        safeBaseUrl = `${parsed.protocol}//${parsed.host}`;
    } catch (e) {
        safeBaseUrl = 'http://localhost:3000';
    }

    const isHtmlNavigation = req.method === 'GET' && req.headers.accept && req.headers.accept.includes('text/html');

    if (isHtmlNavigation) {
        try {
            await authService.confirmEmailVerification(token);
            const redirectUrl = new URL('/verify-email', safeBaseUrl);
            redirectUrl.searchParams.set('status', 'success');
            return res.redirect(302, redirectUrl.toString());
        } catch (err) {
            const redirectUrl = new URL('/verify-email', safeBaseUrl);
            redirectUrl.searchParams.set('status', 'error');
            redirectUrl.searchParams.set('message', err.message || 'Verification failed');
            return res.redirect(302, redirectUrl.toString());
        }
    }

    const result = await authService.confirmEmailVerification(token);
    res.status(200).json(result);
});

module.exports = {
    register,
    login,
    refresh,
    logout,
    logoutAll,
    googleLogin,
    facebookLogin,
    passwordResetRequest,
    passwordResetConfirm,
    emailVerificationRequest,
    resendVerification: emailVerificationRequest,
    emailVerificationConfirm: verifyEmail,
    verifyEmail,
};

const playIntegrityProvider = require('@/providers/mobile/playIntegrity.provider');

const getMobileNonce = asyncHandler(async (req, res) => {
    const result = await playIntegrityProvider.generateNonce();
    res.status(200).json(result);
});

const attestMobileApp = asyncHandler(async (req, res) => {
    const { nonce, integrityToken, packageName } = req.body;
    if (!nonce || !integrityToken) {
        throw new BadRequestError('nonce and integrityToken are required');
    }
    const result = await playIntegrityProvider.verifyAttestationToken(nonce, integrityToken, { packageName });
    if (!result.success) {
        return res.status(400).json(result);
    }
    res.status(200).json(result);
});

module.exports.getMobileNonce = getMobileNonce;
module.exports.attestMobileApp = attestMobileApp;
