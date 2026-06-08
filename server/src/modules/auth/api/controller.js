const asyncHandler = require('@/shared/middleware/asyncHandler');
const authService = require('@/modules/auth/application/service');

const register = asyncHandler(async (req, res) => {
    const { email, password, name, role } = req.body;
    const result = await authService.register({ email, password, name, role });
    res.status(201).json(result);
});

const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    res.status(200).json(result);
});

const refresh = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const result = await authService.refreshToken(refreshToken);
    res.status(200).json(result);
});

const logout = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const result = await authService.logout(refreshToken);
    res.status(200).json(result);
});

const logoutAll = asyncHandler(async (req, res) => {
    const userId = req.user.uid;
    const result = await authService.logoutAll(userId);
    res.status(200).json(result);
});

const googleLogin = asyncHandler(async (req, res) => {
    const { idToken, role } = req.body;
    const result = await authService.googleLogin({ idToken, role });
    res.status(200).json(result);
});

const facebookLogin = asyncHandler(async (req, res) => {
    const { accessToken, role } = req.body;
    const result = await authService.facebookLogin({ accessToken, role });
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

const emailVerificationConfirm = asyncHandler(async (req, res) => {
    const { token } = req.body;
    const result = await authService.confirmEmailVerification(token);
    res.status(200).json(result);
});

module.exports = {
    register, login, refresh, logout, logoutAll,
    googleLogin, facebookLogin,
    passwordResetRequest, passwordResetConfirm,
    emailVerificationRequest, emailVerificationConfirm,
};
