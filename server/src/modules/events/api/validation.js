const { body, param, query } = require('express-validator');
const { validateRequest } = require('@/shared/middleware/validateRequest.middleware');

function normalizeQuestion(question) {
    return {
        ...question,
        questionText: question.questionText ?? question.question_text,
        questionType: question.questionType ?? question.question_type,
        isRequired: question.isRequired ?? question.is_required,
    };
}

const normalizeEventBuilderPayload = (req, res, next) => {
    const value = req.body || {};
    if (value.is_private !== undefined && value.isPrivate === undefined) {
        value.isPrivate = value.is_private;
    }
    if (value.message_for_attendee !== undefined && value.messageForAttendee === undefined) {
        value.messageForAttendee = value.message_for_attendee;
    }
    if (value.custom_questions !== undefined && value.customQuestions === undefined) {
        value.customQuestions = value.custom_questions;
    }
    if (Array.isArray(value.customQuestions)) {
        value.customQuestions = value.customQuestions.map(normalizeQuestion);
    }
    if (
        value.featured_profiles_to_create !== undefined
        && value.featuredProfilesToCreate === undefined
    ) {
        value.featuredProfilesToCreate = value.featured_profiles_to_create;
    }
    if (Array.isArray(value.featuredProfilesToCreate)) {
        value.featuredProfilesToCreate = value.featuredProfilesToCreate.map((profile) => ({
            ...profile,
            profileType: profile.profileType ?? profile.profile_type,
            imageUrl: profile.imageUrl ?? profile.image_url,
            avatarUrl: profile.avatarUrl ?? profile.avatar_url,
            bannerUrl: profile.bannerUrl ?? profile.banner_url,
            categoryTag: profile.categoryTag ?? profile.category_tag,
            externalLinks: profile.externalLinks ?? profile.external_links,
        }));
    }
    if (value.vietnam_address !== undefined && value.vietnamAddress === undefined) {
        value.vietnamAddress = value.vietnam_address;
    }
    if (value.vietnamAddress) {
        value.vietnamAddress = {
            ...value.vietnamAddress,
            provinceCode: value.vietnamAddress.provinceCode ?? value.vietnamAddress.province_code,
            provinceName: value.vietnamAddress.provinceName ?? value.vietnamAddress.province_name,
            districtCode: value.vietnamAddress.districtCode ?? value.vietnamAddress.district_code,
            districtName: value.vietnamAddress.districtName ?? value.vietnamAddress.district_name,
            wardCode: value.vietnamAddress.wardCode ?? value.vietnamAddress.ward_code,
            wardName: value.vietnamAddress.wardName ?? value.vietnamAddress.ward_name,
            streetAddress: value.vietnamAddress.streetAddress ?? value.vietnamAddress.street_address,
        };
        value.addressDetails = {
            ...(value.addressDetails || {}),
            street:
                value.vietnamAddress.streetAddress
                ?? value.addressDetails?.street
                ?? '',
            ward:
                value.vietnamAddress.wardName
                ?? value.addressDetails?.ward
                ?? '',
            district:
                value.vietnamAddress.districtName
                ?? value.addressDetails?.district
                ?? '',
            city:
                value.vietnamAddress.provinceName
                ?? value.addressDetails?.city
                ?? value.city
                ?? '',
            provinceCode: value.vietnamAddress.provinceCode ?? null,
            districtCode: value.vietnamAddress.districtCode ?? null,
            wardCode: value.vietnamAddress.wardCode ?? null,
        };
        if (value.city === undefined && value.vietnamAddress.provinceName) {
            value.city = value.vietnamAddress.provinceName;
        }
    }
    req.body = value;
    next();
};

const eventBuilderFields = [
    body('description').optional().isString().isLength({ max: 50000 }).withMessage('description must be at most 50000 characters'),
    body('isPrivate').optional().isBoolean().withMessage('isPrivate must be boolean').toBoolean(),
    body('visibility').optional().isIn(['private', 'public', 'unlisted']).withMessage('visibility is invalid'),
    body('messageForAttendee').optional().isString().isLength({ max: 5000 }).withMessage('messageForAttendee must be at most 5000 characters'),
    body('customQuestions').optional().isArray({ max: 30 }).withMessage('customQuestions must contain at most 30 questions'),
    body('customQuestions.*.id').optional().matches(/^eq_[A-Za-z0-9-]+$/).withMessage('custom question id is invalid'),
    body('customQuestions.*.questionText').optional().isString().trim().isLength({ min: 1, max: 500 }).withMessage('questionText must be between 1 and 500 characters'),
    body('customQuestions.*.questionType').optional().isIn(['text', 'single_choice', 'multi_choice']).withMessage('questionType is invalid'),
    body('customQuestions.*.isRequired').optional().isBoolean().withMessage('isRequired must be boolean').toBoolean(),
    body('customQuestions.*.options').optional().isArray({ max: 20 }).withMessage('question options must contain at most 20 items'),
    body('customQuestions.*.options.*').optional().isString().trim().isLength({ min: 1, max: 200 }).withMessage('question option is invalid'),
    body('customQuestions').optional().custom((questions) => {
        for (const question of questions) {
            if (!question.questionText || !question.questionType) {
                throw new Error('Each custom question requires questionText and questionType');
            }
            if (
                question.questionType !== 'text'
                && (!Array.isArray(question.options) || question.options.length === 0)
            ) {
                throw new Error('Choice questions require at least one option');
            }
        }
        return true;
    }),
    body('vietnamAddress').optional().isObject().withMessage('vietnamAddress must be an object'),
    body('vietnamAddress.provinceCode').optional({ nullable: true }).isString().isLength({ max: 32 }).withMessage('provinceCode is invalid'),
    body('vietnamAddress.provinceName').optional({ nullable: true }).isString().isLength({ max: 160 }).withMessage('provinceName is invalid'),
    body('vietnamAddress.districtCode').optional({ nullable: true }).isString().isLength({ max: 32 }).withMessage('districtCode is invalid'),
    body('vietnamAddress.districtName').optional({ nullable: true }).isString().isLength({ max: 160 }).withMessage('districtName is invalid'),
    body('vietnamAddress.wardCode').optional({ nullable: true }).isString().isLength({ max: 32 }).withMessage('wardCode is invalid'),
    body('vietnamAddress.wardName').optional({ nullable: true }).isString().isLength({ max: 160 }).withMessage('wardName is invalid'),
    body('vietnamAddress.streetAddress').optional({ nullable: true }).isString().isLength({ max: 500 }).withMessage('streetAddress is invalid'),
    body('featuredProfileIds').optional().isArray({ max: 50 }).withMessage('featuredProfileIds must contain at most 50 ids'),
    body('featuredProfileIds.*').optional().isString().isLength({ min: 1, max: 200 }).withMessage('featured profile id is invalid'),
    body('featuredProfilesToCreate').optional().isArray({ max: 20 }).withMessage('featuredProfilesToCreate must contain at most 20 profiles'),
    body('featuredProfilesToCreate.*.name').optional().isString().trim().isLength({ min: 1, max: 160 }).withMessage('new featured profile name is invalid'),
    body('featuredProfilesToCreate.*.profileType').optional().isIn(['artist', 'performer', 'influencer', 'speaker', 'organization']).withMessage('new featured profile type is invalid'),
    body('featuredProfilesToCreate.*.bio').optional().isString().isLength({ max: 5000 }).withMessage('new featured profile bio is invalid'),
    body('featuredProfilesToCreate.*.genres').optional().isArray({ max: 20 }).withMessage('new featured profile genres are invalid'),
    body('featuredProfilesToCreate.*.externalLinks').optional().isObject().withMessage('new featured profile externalLinks must be an object'),
    body('featuredProfilesToCreate').optional().custom((profiles) => {
        if (profiles.some((profile) => !profile.name)) {
            throw new Error('Each featured profile to create requires a name');
        }
        return true;
    }),
];

const createEventValidation = [
    ...eventBuilderFields,
    validateRequest,
];

const updateEventValidation = [
    param('eventId').notEmpty().withMessage('eventId is required'),
    ...eventBuilderFields,
    validateRequest,
];

const vietnamLocationsValidation = [
    query('level').isIn(['province', 'district', 'ward']).withMessage('level is invalid'),
    query('parentCode').optional().isString().isLength({ max: 32 }).withMessage('parentCode is invalid'),
    query('q').optional().isString().isLength({ max: 160 }).withMessage('q is invalid'),
    query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('limit must be between 1 and 500'),
    validateRequest,
];

const attendeeAnswersValidation = [
    param('eventId').notEmpty().withMessage('eventId is required'),
    param('orderId').matches(/^ord_[A-Za-z0-9-]+$/).withMessage('orderId is invalid'),
    body('attendees').isArray({ min: 1, max: 100 }).withMessage('attendees must contain between 1 and 100 entries'),
    body('attendees.*.id').optional().matches(/^att_[A-Za-z0-9-]+$/).withMessage('attendee id is invalid'),
    body('attendees.*.name').optional({ nullable: true }).isString().isLength({ max: 200 }).withMessage('attendee name is invalid'),
    body('attendees.*.email').optional({ nullable: true }).isEmail().normalizeEmail().withMessage('attendee email is invalid'),
    body('attendees.*.answers').isObject().withMessage('attendee answers must be an object keyed by question id'),
    validateRequest,
];

module.exports = {
    normalizeEventBuilderPayload,
    createEventValidation,
    updateEventValidation,
    vietnamLocationsValidation,
    attendeeAnswersValidation,
};
