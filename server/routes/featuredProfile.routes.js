// routes/featuredProfile.routes.js
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/featuredProfile.controller');
// Chỉ cần import verifyAuthToken và isOrganizer (cho route POST)
const { verifyAuthToken, isOrganizer } = require('../middleware/auth.middleware');

// --- Public Routes ---
// [GET] /profiles - Lấy danh sách tất cả hồ sơ nổi bật (công khai)
router.get('/', profileController.getAllProfiles);

// [GET] /profiles/:profileId - Lấy thông tin chi tiết một hồ sơ (công khai)
router.get('/:profileId', profileController.getProfileById);

// --- Admin/Organizer Routes ---
// TODO: Nên tạo middleware isAdmin riêng và cân nhắc quyền tạo profile

// [POST] /profiles - Thêm hồ sơ mới (yêu cầu là Organizer/Admin)
router.post('/', verifyAuthToken, isOrganizer, profileController.createProfile);

// [PUT] /profiles/:profileId - Cập nhật hồ sơ (chỉ cần đăng nhập, quyền kiểm tra trong controller)
router.put('/:profileId', verifyAuthToken, profileController.updateProfile);

// [DELETE] /profiles/:profileId - Xóa hồ sơ (chỉ cần đăng nhập, quyền kiểm tra trong controller)
router.delete('/:profileId', verifyAuthToken, profileController.deleteProfile);

module.exports = router;