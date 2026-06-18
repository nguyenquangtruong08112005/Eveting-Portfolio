const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('@/shared/config/env.config');
const logger = require('@/shared/logger');

let io = null;

function initSocketServer(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
        if (!token) {
            return next(new Error('Authentication error: Token required.'));
        }

        const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
        // fallback to AccessTokenSecret or AccessTokenSecret definition
        const secret = config.accessTokenSecret || 'dev_access_token_secret_change_before_prod_2026_very_long_value';
        
        jwt.verify(cleanToken, secret, (err, decoded) => {
            if (err) {
                return next(new Error('Authentication error: Invalid token.'));
            }
            socket.user = decoded;
            next();
        });
    });

    io.on('connection', (socket) => {
        logger.info(`[Socket.IO] Client connected: ${socket.id} (User: ${socket.user?.uid || socket.user?.id})`);

        socket.on('join_event', (eventId) => {
            socket.join(`event_${eventId}`);
            logger.info(`[Socket.IO] Client ${socket.id} joined event_${eventId}`);
        });

        socket.on('leave_event', (eventId) => {
            socket.leave(`event_${eventId}`);
            logger.info(`[Socket.IO] Client ${socket.id} left event_${eventId}`);
        });

        socket.on('disconnect', () => {
            logger.info(`[Socket.IO] Client disconnected: ${socket.id}`);
        });
    });

    return io;
}

function getIo() {
    return io;
}

module.exports = {
    initSocketServer,
    getIo
};
