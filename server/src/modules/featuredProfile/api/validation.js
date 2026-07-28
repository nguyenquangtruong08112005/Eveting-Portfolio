const { body, param, query } = require('express-validator');
const { validateRequest } = require('@/shared/middleware/validateRequest.middleware');

const PROFILE_TYPES = ['artist', 'performer', 'influencer', 'speaker', 'organization'];

const normalizeProfilePayload = (req, res, next) => {
    const bodyValue = req.body || {};
    if (bodyValue.profile_type !== undefined && bodyValue.profileType === undefined) {
        bodyValue.profileType = bodyValue.profile_type;
    }
    if (bodyValue.banner_url !== undefined && bodyValue.bannerUrl === undefined) {
        bodyValue.bannerUrl = bodyValue.banner_url;
    }
    if (bodyValue.avatar_url !== undefined && bodyValue.avatarUrl === undefined) {
        bodyValue.avatarUrl = bodyValue.avatar_url;
    }
    if (bodyValue.category_tag !== undefined && bodyValue.categoryTag === undefined) {
        bodyValue.categoryTag = bodyValue.category_tag;
    }
    if (bodyValue.external_links !== undefined && bodyValue.externalLinks === undefined) {
        bodyValue.externalLinks = bodyValue.external_links;
    }
    req.body = bodyValue;
    next();
};

const profileIdValidation = [
    param('profileId').isString().isLength({ min: 1, max: 200 }).withMessage('profileId is invalid'),
    validateRequest,
];

const listValidation = [
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
    validateRequest,
];

const slugValidation = [
    param('slug').isString().matches(/^[a-z0-9-]+$/).isLength({ min: 1, max: 120 }).withMessage('slug is invalid'),
    validateRequest,
];

const createValidation = [
    body('name').isString().trim().isLength({ min: 1, max: 160 }).withMessage('name is required and must be at most 160 characters'),
    body('profileType').optional().isIn(PROFILE_TYPES).withMessage('profileType is invalid'),
    body('bio').optional().isString().isLength({ max: 5000 }).withMessage('bio must be at most 5000 characters'),
    body('genres').optional().isArray({ max: 20 }).withMessage('genres must contain at most 20 items'),
    body('genres.*').optional().isString().isLength({ min: 1, max: 80 }).withMessage('genre is invalid'),
    body('slug').optional().isString().isLength({ min: 1, max: 120 }).withMessage('slug is invalid'),
    body('externalLinks').optional().isObject().withMessage('externalLinks must be an object'),
    validateRequest,
];

const updateValidation = [
    ...profileIdValidation.slice(0, -1),
    body('name').optional().isString().trim().isLength({ min: 1, max: 160 }).withMessage('name is invalid'),
    body('profileType').optional().isIn(PROFILE_TYPES).withMessage('profileType is invalid'),
    body('bio').optional().isString().isLength({ max: 5000 }).withMessage('bio must be at most 5000 characters'),
    body('genres').optional().isArray({ max: 20 }).withMessage('genres must contain at most 20 items'),
    body('genres.*').optional().isString().isLength({ min: 1, max: 80 }).withMessage('genre is invalid'),
    body('slug').optional().isString().isLength({ min: 1, max: 120 }).withMessage('slug is invalid'),
    body('externalLinks').optional().isObject().withMessage('externalLinks must be an object'),
    validateRequest,
];

module.exports = {
    normalizeProfilePayload,
    profileIdValidation,
    listValidation,
    slugValidation,
    createValidation,
    updateValidation,
};
