const { randomUUID } = require('crypto');
const { BadRequestError } = require('@/shared/errors');

const QUESTION_TYPES = new Set(['text', 'single_choice', 'multi_choice']);

function sanitizeRichDescription(value) {
    if (value == null) return '';

    // Descriptions are Markdown. Remove raw HTML and unsafe Markdown URL schemes
    // so renderers cannot turn stored event content into executable markup.
    return String(value)
        .replace(/<[^>]*>/g, '')
        .replace(/\]\(\s*(?:javascript|vbscript|data)\s*:[^)]+\)\)?/gi, '](#)')
        .trim();
}

function normalizeCustomQuestions(input, existingQuestions = []) {
    if (!Array.isArray(input)) return [];

    const existingById = new Map(existingQuestions.map((question) => [question.id, question]));
    const seenIds = new Set();

    return input.map((rawQuestion, index) => {
        const id = existingQuestions.length > 0 && rawQuestion.id
            ? rawQuestion.id
            : `eq_${randomUUID()}`;
        if (seenIds.has(id)) {
            throw new BadRequestError(`Duplicate custom question id "${id}".`);
        }
        if (rawQuestion.id && existingQuestions.length > 0 && !existingById.has(id)) {
            throw new BadRequestError(`Custom question id "${id}" does not belong to this event.`);
        }
        seenIds.add(id);

        const questionType = rawQuestion.questionType;
        const options = questionType === 'text'
            ? []
            : [...new Set((rawQuestion.options || []).map((option) => String(option).trim()))];

        if (!QUESTION_TYPES.has(questionType)) {
            throw new BadRequestError(`Unsupported question type at position ${index}.`);
        }
        if (questionType !== 'text' && options.length === 0) {
            throw new BadRequestError(`Choice question at position ${index} requires options.`);
        }

        const questionText = String(rawQuestion.questionText || '').trim();
        if (!questionText) {
            throw new BadRequestError(`Question text is required at position ${index}.`);
        }

        return {
            id,
            questionText,
            questionType,
            isRequired: rawQuestion.isRequired === true,
            options,
            order: index,
        };
    });
}

function customQuestionsEqual(left, right) {
    const comparable = (questions) => questions.map((question, index) => ({
        id: question.id,
        questionText: question.questionText,
        questionType: question.questionType,
        isRequired: question.isRequired === true,
        options: question.options || [],
        order: index,
    }));
    return JSON.stringify(comparable(left)) === JSON.stringify(comparable(right));
}

function extractAddressFields(eventData) {
    const structured = eventData.vietnamAddress || {};
    const legacy = eventData.addressDetails || {};
    const hasAddressInput = Boolean(
        eventData.vietnamAddress
        || eventData.addressDetails
        || eventData.provinceCode !== undefined
        || eventData.provinceName !== undefined
        || eventData.districtCode !== undefined
        || eventData.districtName !== undefined
        || eventData.wardCode !== undefined
        || eventData.wardName !== undefined
        || eventData.streetAddress !== undefined
    );

    if (!hasAddressInput) return null;

    return {
        provinceCode: structured.provinceCode ?? legacy.provinceCode ?? eventData.provinceCode ?? null,
        provinceName:
            structured.provinceName
            ?? legacy.provinceName
            ?? legacy.city
            ?? eventData.provinceName
            ?? eventData.city
            ?? null,
        districtCode: structured.districtCode ?? legacy.districtCode ?? eventData.districtCode ?? null,
        districtName:
            structured.districtName
            ?? legacy.districtName
            ?? legacy.district
            ?? eventData.districtName
            ?? null,
        wardCode: structured.wardCode ?? legacy.wardCode ?? eventData.wardCode ?? null,
        wardName:
            structured.wardName
            ?? legacy.wardName
            ?? legacy.ward
            ?? eventData.wardName
            ?? null,
        streetAddress:
            structured.streetAddress
            ?? legacy.streetAddress
            ?? legacy.street
            ?? eventData.streetAddress
            ?? null,
    };
}

function normalizeAnswers(attendees, questions) {
    const questionById = new Map(questions.map((question) => [question.id, question]));
    const snapshot = questions.map((question) => ({
        id: question.id,
        questionText: question.questionText,
        questionType: question.questionType,
        isRequired: question.isRequired === true,
        options: question.options || [],
        order: question.order,
    }));

    const normalizedAttendees = attendees.map((attendee) => {
        const answers = attendee.answers || {};
        for (const questionId of Object.keys(answers)) {
            if (!questionById.has(questionId)) {
                throw new BadRequestError(`Unknown attendee question id "${questionId}".`);
            }
        }

        const normalized = {};
        for (const question of questions) {
            const value = answers[question.id];
            const missing = value === undefined
                || value === null
                || value === ''
                || (Array.isArray(value) && value.length === 0);
            if (missing) {
                if (question.isRequired) {
                    throw new BadRequestError(`Answer is required for question "${question.id}".`);
                }
                continue;
            }

            if (question.questionType === 'text') {
                if (typeof value !== 'string') {
                    throw new BadRequestError(`Answer for question "${question.id}" must be text.`);
                }
                if (value.length > 2000) {
                    throw new BadRequestError(`Answer for question "${question.id}" is too long.`);
                }
                normalized[question.id] = value.trim();
            } else if (question.questionType === 'single_choice') {
                if (typeof value !== 'string' || !question.options.includes(value)) {
                    throw new BadRequestError(`Invalid choice for question "${question.id}".`);
                }
                normalized[question.id] = value;
            } else {
                if (
                    !Array.isArray(value)
                    || value.some((option) => !question.options.includes(option))
                ) {
                    throw new BadRequestError(`Invalid choices for question "${question.id}".`);
                }
                normalized[question.id] = [...new Set(value)];
            }
        }

        return {
            id: `att_${randomUUID()}`,
            name: attendee.name ? String(attendee.name).trim() : null,
            email: attendee.email ? String(attendee.email).trim().toLowerCase() : null,
            answers: normalized,
        };
    });

    return { attendees: normalizedAttendees, questionSnapshot: snapshot };
}

module.exports = {
    sanitizeRichDescription,
    normalizeCustomQuestions,
    customQuestionsEqual,
    extractAddressFields,
    normalizeAnswers,
};
