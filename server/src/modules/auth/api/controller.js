const authService = require('@/modules/auth/application/service');

const register = async (req, res) => {
    try {
        const { email, password, name, role } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }
        const result = await authService.register({ email, password, name, role });
        res.status(201).json(result);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        if (statusCode >= 500) {
            console.error('Error in Auth Controller - register:', error);
        } else {
            console.error('Error in Auth Controller - register:', error.message);
        }
        res.status(statusCode).json({ error: error.message || 'Internal Server Error' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }
        const result = await authService.login({ email, password });
        res.status(200).json(result);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        if (statusCode >= 500) {
            console.error('Error in Auth Controller - login:', error);
        } else {
            console.error('Error in Auth Controller - login:', error.message);
        }
        res.status(statusCode).json({ error: error.message || 'Internal Server Error' });
    }
};

const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token is required.' });
        }
        const result = await authService.refreshToken(refreshToken);
        res.status(200).json(result);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        if (statusCode >= 500) {
            console.error('Error in Auth Controller - refresh:', error);
        } else {
            console.error('Error in Auth Controller - refresh:', error.message);
        }
        res.status(statusCode).json({ error: error.message || 'Internal Server Error' });
    }
};

const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token is required.' });
        }
        const result = await authService.logout(refreshToken);
        res.status(200).json(result);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        if (statusCode >= 500) {
            console.error('Error in Auth Controller - logout:', error);
        } else {
            console.error('Error in Auth Controller - logout:', error.message);
        }
        res.status(statusCode).json({ error: error.message || 'Internal Server Error' });
    }
};

const logoutAll = async (req, res) => {
    try {
        const userId = req.user.uid;
        const result = await authService.logoutAll(userId);
        res.status(200).json(result);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        if (statusCode >= 500) {
            console.error('Error in Auth Controller - logoutAll:', error);
        } else {
            console.error('Error in Auth Controller - logoutAll:', error.message);
        }
        res.status(statusCode).json({ error: error.message || 'Internal Server Error' });
    }
};

const googleLogin = async (req, res) => {
    try {
        const { idToken, role } = req.body;
        if (!idToken) {
            return res.status(400).json({ error: 'Google ID token is required.' });
        }
        const result = await authService.googleLogin({ idToken, role });
        res.status(200).json(result);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        console.error('Error in Auth Controller - googleLogin:', error.message);
        res.status(statusCode).json({ error: error.message || 'Internal Server Error' });
    }
};

const facebookLogin = async (req, res) => {
    try {
        const { accessToken, role } = req.body;
        if (!accessToken) {
            return res.status(400).json({ error: 'Facebook access token is required.' });
        }
        const result = await authService.facebookLogin({ accessToken, role });
        res.status(200).json(result);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        console.error('Error in Auth Controller - facebookLogin:', error.message);
        res.status(statusCode).json({ error: error.message || 'Internal Server Error' });
    }
};

const passwordResetRequest = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required.' });
        }
        const result = await authService.requestPasswordReset(email);
        res.status(200).json(result);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        console.error('Error in Auth Controller - passwordResetRequest:', error.message);
        res.status(statusCode).json({ error: error.message || 'Internal Server Error' });
    }
};

const passwordResetConfirm = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        const result = await authService.confirmPasswordReset(token, newPassword);
        res.status(200).json(result);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        console.error('Error in Auth Controller - passwordResetConfirm:', error.message);
        res.status(statusCode).json({ error: error.message || 'Internal Server Error' });
    }
};

const emailVerificationRequest = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required.' });
        }
        const result = await authService.requestEmailVerification(email);
        res.status(200).json(result);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        console.error('Error in Auth Controller - emailVerificationRequest:', error.message);
        res.status(statusCode).json({ error: error.message || 'Internal Server Error' });
    }
};

const emailVerificationConfirm = async (req, res) => {
    try {
        const { token } = req.body;
        const result = await authService.confirmEmailVerification(token);
        res.status(200).json(result);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        console.error('Error in Auth Controller - emailVerificationConfirm:', error.message);
        res.status(statusCode).json({ error: error.message || 'Internal Server Error' });
    }
};

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
    emailVerificationConfirm,
};
