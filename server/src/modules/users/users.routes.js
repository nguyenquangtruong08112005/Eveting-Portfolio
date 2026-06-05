// modules/users/users.routes.js
const express = require('express');
const router = express.Router();
const { verifyAuthToken } = require('@/shared/middleware/auth.middleware');
const userController = require('./user.controller');
const ticketController = require('../../controllers/ticket.controller');
const { validateProfileUpdate } = require('../../utils/validators/user.validator');

// [POST] /users/register - Create user profile in Postgres after backend registration
// TODO: This route will be depreacated because mobile app already call this after sign up
router.post('/register', verifyAuthToken, userController.registerUser);

// [GET] /users/me - Lấy thông tin hồ sơ của người dùng đang đăng nhập
router.get('/me', verifyAuthToken, userController.getCurrentUserProfile);

// [PUT] /users/me - Cập nhật thông tin hồ sơ của người dùng
router.put('/me', verifyAuthToken, validateProfileUpdate, userController.updateUserProfile);

// [GET] /users/me/tickets - Lấy danh sách vé của người dùng đang đăng nhập
router.get('/me/tickets', verifyAuthToken, ticketController.getCurrentUserTickets);

// [POST] /users/me/follow - Theo dõi một hồ sơ nổi bật
router.post('/me/follow', verifyAuthToken, userController.followProfile);

// [DELETE] /users/me/follow/:profileId - Bỏ theo dõi một hồ sơ nổi bật
router.delete('/me/follow/:profileId', verifyAuthToken, userController.unfollowProfile);

// [POST] /users/me/device-token/remove - Gọi khi user Logout
router.post('/me/device-token/remove', verifyAuthToken, userController.removeDeviceToken);

module.exports = router;
