'use strict';

const { validationResult } = require('express-validator');
const { BadRequestError } = require('@/shared/errors');

const {
  normalizeEventBuilderPayload,
  createEventValidation,
  updateEventValidation,
  vietnamLocationsValidation,
  attendeeAnswersValidation,
} = require('@/modules/events/api/validation');

function runChains(validation, req) {
  return Promise.all(
    validation.filter((v) => typeof v.run === 'function').map((v) => v.run(req))
  );
}

function makeReq({ body = {}, params = {}, query = {} } = {}) {
  return { body: { ...body }, params: { ...params }, query: { ...query } };
}

const validEventBody = {
  description: 'A great event',
  isPrivate: true,
  visibility: 'public',
  messageForAttendee: 'Welcome',
  customQuestions: [
    {
      id: 'eq_1',
      questionText: 'Food?',
      questionType: 'single_choice',
      isRequired: true,
      options: ['Veg', 'Non-veg'],
    },
    { id: 'eq_2', questionText: 'Diet?', questionType: 'text', isRequired: false },
  ],
  vietnamAddress: {
    provinceCode: '01',
    provinceName: 'Hanoi',
    districtCode: '001',
    districtName: 'Hoan Kiem',
    wardCode: '0001',
    wardName: 'Ward 1',
    streetAddress: '1 Ly Thuong Kiet',
  },
  featuredProfileIds: ['prof_1'],
  featuredProfilesToCreate: [
    {
      name: 'Artist A',
      profileType: 'artist',
      bio: 'A bio',
      genres: ['pop'],
      externalLinks: { spotify: 'x' },
    },
  ],
};

describe('normalizeEventBuilderPayload', () => {
  const next = jest.fn();

  beforeEach(() => next.mockClear());

  function invoke(body) {
    const req = { body };
    normalizeEventBuilderPayload(req, {}, next);
    return req.body;
  }

  it('maps snake_case fields to camelCase', () => {
    const body = invoke({
      is_private: true,
      message_for_attendee: 'hi',
      featured_profiles_to_create: [],
    });
    expect(body.isPrivate).toBe(true);
    expect(body.messageForAttendee).toBe('hi');
    expect(body.featuredProfilesToCreate).toEqual([]);
  });

  it('does not overwrite existing camelCase values', () => {
    const body = invoke({ isPrivate: false, is_private: true });
    expect(body.isPrivate).toBe(false);
  });

  it('normalizes custom question fields', () => {
    const body = invoke({
      custom_questions: [
        { question_text: 'q', question_type: 'text', is_required: true },
      ],
    });
    expect(body.customQuestions).toEqual([
      {
        question_text: 'q',
        question_type: 'text',
        is_required: true,
        questionText: 'q',
        questionType: 'text',
        isRequired: true,
      },
    ]);
  });

  it('normalizes customQuestions even when provided in camelCase', () => {
    const body = invoke({ customQuestions: [{ question_text: 'q' }] });
    expect(body.customQuestions[0].questionText).toBe('q');
  });

  it('normalizes featured profile fields', () => {
    const body = invoke({
      featured_profiles_to_create: [
        {
          profile_type: 'artist',
          image_url: 'img',
          avatar_url: 'av',
          banner_url: 'bn',
          category_tag: 'ct',
          external_links: { x: 1 },
        },
      ],
    });
    expect(body.featuredProfilesToCreate[0]).toMatchObject({
      profileType: 'artist',
      imageUrl: 'img',
      avatarUrl: 'av',
      bannerUrl: 'bn',
      categoryTag: 'ct',
      externalLinks: { x: 1 },
    });
  });

  it('normalizes vietnam address and builds addressDetails', () => {
    const body = invoke({
      vietnam_address: {
        province_code: '01',
        province_name: 'Hanoi',
        district_code: '001',
        district_name: 'Hoan Kiem',
        ward_code: '0001',
        ward_name: 'Ward',
        street_address: 'Street 1',
      },
    });
    expect(body.vietnamAddress).toMatchObject({
      provinceCode: '01',
      provinceName: 'Hanoi',
      streetAddress: 'Street 1',
    });
    expect(body.addressDetails).toEqual({
      street: 'Street 1',
      ward: 'Ward',
      district: 'Hoan Kiem',
      city: 'Hanoi',
      provinceCode: '01',
      districtCode: '001',
      wardCode: '0001',
    });
    expect(body.city).toBe('Hanoi');
  });

  it('merges with existing addressDetails and city', () => {
    const body = invoke({
      vietnamAddress: { provinceName: 'Hanoi', districtName: 'D' },
      addressDetails: { street: 'Old St', city: 'Other City' },
    });
    expect(body.addressDetails).toEqual({
      street: 'Old St',
      ward: '',
      district: 'D',
      city: 'Hanoi',
      provinceCode: null,
      districtCode: null,
      wardCode: null,
    });
    expect(body.city).toBe('Hanoi');
  });

  it('handles an empty body', () => {
    expect(invoke({})).toEqual({});
  });

  it('calls next', () => {
    const req = { body: {} };
    normalizeEventBuilderPayload(req, {}, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('createEventValidation', () => {
  it('accepts an empty body', async () => {
    const req = makeReq();
    await runChains(createEventValidation, req);
    expect(validationResult(req).isEmpty()).toBe(true);
  });

  it('accepts a fully valid event builder payload', async () => {
    const req = makeReq({ body: validEventBody });
    await runChains(createEventValidation, req);
    expect(validationResult(req).isEmpty()).toBe(true);
  });

  it('accepts a snake_case payload after normalization', async () => {
    const req = makeReq({
      body: {
        is_private: true,
        message_for_attendee: 'welcome',
        custom_questions: [
          { question_text: 'q', question_type: 'text', is_required: false },
        ],
        featured_profiles_to_create: [{ name: 'A', profile_type: 'artist' }],
        vietnam_address: {
          province_code: '01',
          province_name: 'HN',
          district_code: '001',
          district_name: 'D',
          ward_code: '1',
          ward_name: 'W',
          street_address: 'S',
        },
      },
    });
    normalizeEventBuilderPayload(req, {}, jest.fn());
    await runChains(createEventValidation, req);
    expect(validationResult(req).isEmpty()).toBe(true);
  });

  it('rejects a non-boolean isPrivate', async () => {
    const req = makeReq({ body: { isPrivate: 'yes' } });
    await runChains(createEventValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('isPrivate must be boolean');
  });

  it('rejects an invalid visibility', async () => {
    const req = makeReq({ body: { visibility: 'everyone' } });
    await runChains(createEventValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('visibility is invalid');
  });

  it('rejects an overlong description', async () => {
    const req = makeReq({ body: { description: 'x'.repeat(50001) } });
    await runChains(createEventValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('description must be at most 50000 characters');
  });

  it('rejects an overlong messageForAttendee', async () => {
    const req = makeReq({ body: { messageForAttendee: 'x'.repeat(5001) } });
    await runChains(createEventValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('messageForAttendee must be at most 5000 characters');
  });

  it('rejects customQuestions with more than 30 entries', async () => {
    const req = makeReq({
      body: { customQuestions: new Array(31).fill({ questionText: 'q', questionType: 'text' }) },
    });
    await runChains(createEventValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('customQuestions must contain at most 30 questions');
  });

  it('rejects an invalid custom question id', async () => {
    const req = makeReq({
      body: { customQuestions: [{ id: 'bad id!', questionText: 'q', questionType: 'text' }] },
    });
    await runChains(createEventValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('custom question id is invalid');
  });

  it('rejects an overlong questionText', async () => {
    const req = makeReq({
      body: { customQuestions: [{ questionText: 'x'.repeat(501), questionType: 'text' }] },
    });
    await runChains(createEventValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('questionText must be between 1 and 500 characters');
  });

  it('rejects an invalid questionType', async () => {
    const req = makeReq({
      body: { customQuestions: [{ questionText: 'q', questionType: 'radio' }] },
    });
    await runChains(createEventValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('questionType is invalid');
  });

  it('rejects a non-boolean isRequired', async () => {
    const req = makeReq({
      body: { customQuestions: [{ questionText: 'q', questionType: 'text', isRequired: 'yes' }] },
    });
    await runChains(createEventValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('isRequired must be boolean');
  });

  it('rejects choice questions with more than 20 options', async () => {
    const req = makeReq({
      body: {
        customQuestions: [
          { questionText: 'q', questionType: 'single_choice', options: new Array(21).fill('o') },
        ],
      },
    });
    await runChains(createEventValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('question options must contain at most 20 items');
  });

  it('rejects an invalid question option', async () => {
    const req = makeReq({
      body: {
        customQuestions: [
          { questionText: 'q', questionType: 'single_choice', options: ['ok', ''] },
        ],
      },
    });
    await runChains(createEventValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('question option is invalid');
  });

  it('rejects a custom question missing questionText', async () => {
    const req = makeReq({
      body: { customQuestions: [{ questionType: 'text' }] },
    });
    await runChains(createEventValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('Each custom question requires questionText and questionType');
  });

  it('rejects a choice question without options', async () => {
    const req = makeReq({
      body: { customQuestions: [{ questionText: 'q', questionType: 'multi_choice' }] },
    });
    await runChains(createEventValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('Choice questions require at least one option');
  });

  it('rejects a non-object vietnamAddress', async () => {
    const req = makeReq({ body: { vietnamAddress: 'Hanoi' } });
    await runChains(createEventValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('vietnamAddress must be an object');
  });

  it('rejects an overlong provinceCode', async () => {
    const req = makeReq({ body: { vietnamAddress: { provinceCode: 'x'.repeat(33) } } });
    await runChains(createEventValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('provinceCode is invalid');
  });

  it('rejects featuredProfileIds with more than 50 ids', async () => {
    const req = makeReq({ body: { featuredProfileIds: new Array(51).fill('prof_1') } });
    await runChains(createEventValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('featuredProfileIds must contain at most 50 ids');
  });

  it('rejects an invalid featured profile id', async () => {
    const req = makeReq({ body: { featuredProfileIds: [''] } });
    await runChains(createEventValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('featured profile id is invalid');
  });

  it('rejects featuredProfilesToCreate with more than 20 profiles', async () => {
    const req = makeReq({ body: { featuredProfilesToCreate: new Array(21).fill({ name: 'A' }) } });
    await runChains(createEventValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('featuredProfilesToCreate must contain at most 20 profiles');
  });

  it('rejects an invalid featured profile name', async () => {
    const req = makeReq({ body: { featuredProfilesToCreate: [{ name: '' }] } });
    await runChains(createEventValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('new featured profile name is invalid');
  });

  it('rejects an invalid featured profile type', async () => {
    const req = makeReq({ body: { featuredProfilesToCreate: [{ name: 'A', profileType: 'band' }] } });
    await runChains(createEventValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('new featured profile type is invalid');
  });

  it('rejects an overlong featured profile bio', async () => {
    const req = makeReq({ body: { featuredProfilesToCreate: [{ name: 'A', bio: 'x'.repeat(5001) }] } });
    await runChains(createEventValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('new featured profile bio is invalid');
  });

  it('rejects non-array genres', async () => {
    const req = makeReq({ body: { featuredProfilesToCreate: [{ name: 'A', genres: 'pop' }] } });
    await runChains(createEventValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('new featured profile genres are invalid');
  });

  it('rejects a non-object externalLinks', async () => {
    const req = makeReq({ body: { featuredProfilesToCreate: [{ name: 'A', externalLinks: 'x' }] } });
    await runChains(createEventValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('new featured profile externalLinks must be an object');
  });

  it('rejects a featured profile without a name', async () => {
    const req = makeReq({ body: { featuredProfilesToCreate: [{ profileType: 'artist' }] } });
    await runChains(createEventValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('Each featured profile to create requires a name');
  });

  it('throws BadRequestError from validateRequest for invalid input', async () => {
    const req = makeReq({ body: { isPrivate: 'no', visibility: 'x' } });
    await runChains(createEventValidation, req);
    const validateRequest = createEventValidation[createEventValidation.length - 1];
    const next = jest.fn();
    let caught;
    try {
      validateRequest(req, {}, next);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(BadRequestError);
    expect(caught.message).toContain('isPrivate must be boolean');
    expect(caught.message).toContain('visibility is invalid');
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next from validateRequest for valid input', () => {
    const req = makeReq({ body: validEventBody });
    const validateRequest = createEventValidation[createEventValidation.length - 1];
    const next = jest.fn();
    expect(() => validateRequest(req, {}, next)).not.toThrow();
    expect(next).toHaveBeenCalled();
  });
});

describe('updateEventValidation', () => {
  it('accepts a valid eventId with a valid body', async () => {
    const req = makeReq({ params: { eventId: 'evt_1' }, body: validEventBody });
    await runChains(updateEventValidation, req);
    expect(validationResult(req).isEmpty()).toBe(true);
  });

  it('rejects a missing eventId', async () => {
    const req = makeReq();
    await runChains(updateEventValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('eventId is required');
  });
});

describe('vietnamLocationsValidation', () => {
  it('accepts all valid query params', async () => {
    const req = makeReq({ query: { level: 'province', parentCode: '01', q: 'Ha', limit: '10' } });
    await runChains(vietnamLocationsValidation, req);
    expect(validationResult(req).isEmpty()).toBe(true);
  });

  it('rejects a missing level', async () => {
    const req = makeReq({ query: {} });
    await runChains(vietnamLocationsValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('level is invalid');
  });

  it('rejects an invalid level', async () => {
    const req = makeReq({ query: { level: 'city' } });
    await runChains(vietnamLocationsValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('level is invalid');
  });

  it('rejects a limit below the minimum', async () => {
    const req = makeReq({ query: { level: 'province', limit: '0' } });
    await runChains(vietnamLocationsValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('limit must be between 1 and 500');
  });

  it('rejects a limit above the maximum', async () => {
    const req = makeReq({ query: { level: 'province', limit: '501' } });
    await runChains(vietnamLocationsValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('limit must be between 1 and 500');
  });

  it('rejects an overlong parentCode', async () => {
    const req = makeReq({ query: { level: 'district', parentCode: 'x'.repeat(33) } });
    await runChains(vietnamLocationsValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('parentCode is invalid');
  });

  it('rejects an overlong q', async () => {
    const req = makeReq({ query: { level: 'ward', q: 'x'.repeat(161) } });
    await runChains(vietnamLocationsValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('q is invalid');
  });
});

describe('attendeeAnswersValidation', () => {
  const validBody = {
    attendees: [{ id: 'att_1', name: 'John', email: 'John@Example.com', answers: { eq_1: 'Veg' } }],
  };

  it('accepts valid attendee answers', async () => {
    const req = makeReq({ params: { eventId: 'evt_1', orderId: 'ord_1' }, body: validBody });
    await runChains(attendeeAnswersValidation, req);
    expect(validationResult(req).isEmpty()).toBe(true);
  });

  it('rejects a missing eventId', async () => {
    const req = makeReq({ params: { orderId: 'ord_1' }, body: validBody });
    await runChains(attendeeAnswersValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('eventId is required');
  });

  it('rejects an invalid orderId', async () => {
    const req = makeReq({ params: { eventId: 'evt_1', orderId: 'order_1!' }, body: validBody });
    await runChains(attendeeAnswersValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('orderId is invalid');
  });

  it('rejects a non-array attendees', async () => {
    const req = makeReq({ params: { eventId: 'evt_1', orderId: 'ord_1' }, body: { attendees: {} } });
    await runChains(attendeeAnswersValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('attendees must contain between 1 and 100 entries');
  });

  it('rejects an empty attendees array', async () => {
    const req = makeReq({ params: { eventId: 'evt_1', orderId: 'ord_1' }, body: { attendees: [] } });
    await runChains(attendeeAnswersValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('attendees must contain between 1 and 100 entries');
  });

  it('rejects more than 100 attendees', async () => {
    const req = makeReq({
      params: { eventId: 'evt_1', orderId: 'ord_1' },
      body: { attendees: new Array(101).fill({ name: 'A', answers: {} }) },
    });
    await runChains(attendeeAnswersValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('attendees must contain between 1 and 100 entries');
  });

  it('rejects an invalid attendee id', async () => {
    const req = makeReq({
      params: { eventId: 'evt_1', orderId: 'ord_1' },
      body: { attendees: [{ id: 'john', answers: {} }] },
    });
    await runChains(attendeeAnswersValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('attendee id is invalid');
  });

  it('rejects an overlong attendee name', async () => {
    const req = makeReq({
      params: { eventId: 'evt_1', orderId: 'ord_1' },
      body: { attendees: [{ name: 'x'.repeat(201), answers: {} }] },
    });
    await runChains(attendeeAnswersValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('attendee name is invalid');
  });

  it('rejects an invalid attendee email', async () => {
    const req = makeReq({
      params: { eventId: 'evt_1', orderId: 'ord_1' },
      body: { attendees: [{ email: 'not-an-email', answers: {} }] },
    });
    await runChains(attendeeAnswersValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('attendee email is invalid');
  });

  it('rejects attendees without an answers object', async () => {
    const req = makeReq({
      params: { eventId: 'evt_1', orderId: 'ord_1' },
      body: { attendees: [{ name: 'John' }] },
    });
    await runChains(attendeeAnswersValidation, req);
    expect(validationResult(req).array().map((e) => e.msg)).toContain('attendee answers must be an object keyed by question id');
  });
});
