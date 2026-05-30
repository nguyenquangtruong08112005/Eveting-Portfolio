// controllers/auth.controller.js
const authService = require('../services/auth.service');

const register = async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }
        const result = await authService.register({ email, password, name });
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

module.exports = {
    register,
    login,
    refresh,
    logout,
    logoutAll,
};
