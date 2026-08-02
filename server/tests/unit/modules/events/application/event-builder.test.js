const {
  sanitizeRichDescription,
  normalizeCustomQuestions,
  customQuestionsEqual,
  extractAddressFields,
  normalizeAnswers,
} = require('@/modules/events/application/helpers/event-builder');

describe('sanitizeRichDescription', () => {
  it('returns empty string for null/undefined', () => {
    expect(sanitizeRichDescription(null)).toBe('');
    expect(sanitizeRichDescription(undefined)).toBe('');
  });

  it('strips HTML tags', () => {
    expect(sanitizeRichDescription('<script>alert("xss")</script>Hello')).toBe('alert("xss")Hello');
    expect(sanitizeRichDescription('<b>bold</b> <i>italic</i>')).toBe('bold italic');
  });

  it('replaces dangerous URL schemes with `](#)`', () => {
    expect(sanitizeRichDescription('[click](javascript:alert(1))')).toBe('[click](#)');
    expect(sanitizeRichDescription('[click](vbscript:msgbox(1))')).toBe('[click](#)');
    expect(sanitizeRichDescription('[data](data:text/html,<script>...</script>)')).toBe('[data](#)');
  });

  it('preserves safe markdown URLs', () => {
    expect(sanitizeRichDescription('[link](https://example.com)')).toBe('[link](https://example.com)');
  });

  it('trims whitespace', () => {
    expect(sanitizeRichDescription('  hello world  ')).toBe('hello world');
  });
});

describe('normalizeCustomQuestions', () => {
  it('returns [] for non-array input', () => {
    expect(normalizeCustomQuestions(null)).toEqual([]);
    expect(normalizeCustomQuestions(undefined)).toEqual([]);
    expect(normalizeCustomQuestions({})).toEqual([]);
  });

  it('returns [] for empty array', () => {
    expect(normalizeCustomQuestions([])).toEqual([]);
  });

  it('normalizes a text question without existing questions', () => {
    const input = [{ questionType: 'text', questionText: 'Your name?' }];
    const result = normalizeCustomQuestions(input);
    expect(result).toHaveLength(1);
    expect(result[0].questionType).toBe('text');
    expect(result[0].questionText).toBe('Your name?');
    expect(result[0].options).toEqual([]);
    expect(result[0].isRequired).toBe(false);
    expect(result[0].order).toBe(0);
    expect(result[0].id).toMatch(/^eq_/);
  });

  it('normalizes a choice question with deduplication and trimming', () => {
    const input = [{ questionType: 'single_choice', questionText: 'Choose?', options: [' A ', ' B ', ' A '] }];
    const result = normalizeCustomQuestions(input);
    expect(result[0].options).toEqual(['A', 'B']);
  });

  it('throws on unsupported question type', () => {
    expect(() => normalizeCustomQuestions([{ questionType: 'rating', questionText: 'Rate?' }]))
      .toThrow('Unsupported question type at position 0.');
  });

  it('throws on choice question without options', () => {
    expect(() => normalizeCustomQuestions([{ questionType: 'single_choice', questionText: 'Pick?' }]))
      .toThrow('Choice question at position 0 requires options.');
  });

  it('throws on empty question text', () => {
    expect(() => normalizeCustomQuestions([{ questionType: 'text', questionText: '' }]))
      .toThrow('Question text is required at position 0.');
  });

  it('throws on duplicate IDs when existing questions provided', () => {
    const existing = [{ id: 'q1', questionType: 'text', questionText: 'Q1' }];
    expect(() => normalizeCustomQuestions([
      { id: 'q1', questionType: 'text', questionText: 'A' },
      { id: 'q1', questionType: 'text', questionText: 'B' },
    ], existing)).toThrow('Duplicate custom question id "q1".');
  });

  it('throws when ID does not belong to event', () => {
    const existing = [{ id: 'q1', questionType: 'text', questionText: 'Q1' }];
    expect(() => normalizeCustomQuestions([{ id: 'q_unknown', questionType: 'text', questionText: '?' }], existing))
      .toThrow('Custom question id "q_unknown" does not belong to this event.');
  });

  it('preserves existing question IDs', () => {
    const existing = [{ id: 'q1', questionType: 'text', questionText: 'Q1' }];
    const result = normalizeCustomQuestions([{ id: 'q1', questionType: 'text', questionText: 'Updated' }], existing);
    expect(result[0].id).toBe('q1');
  });
});

describe('customQuestionsEqual', () => {
  it('returns true for identical questions', () => {
    const a = [{ id: 'q1', questionText: 'Q?', questionType: 'text', isRequired: true, options: [] }];
    const b = [{ id: 'q1', questionText: 'Q?', questionType: 'text', isRequired: true }];
    expect(customQuestionsEqual(a, b)).toBe(true);
  });

  it('returns false for different questions', () => {
    const a = [{ id: 'q1', questionText: 'Q?', questionType: 'text' }];
    const b = [{ id: 'q1', questionText: 'Different', questionType: 'text' }];
    expect(customQuestionsEqual(a, b)).toBe(false);
  });
});

describe('extractAddressFields', () => {
  it('returns null when no address input', () => {
    expect(extractAddressFields({})).toBeNull();
  });

  it('extracts from vietnamAddress structure', () => {
    const data = { vietnamAddress: { provinceCode: '01', provinceName: 'HN', streetAddress: '123' } };
    const result = extractAddressFields(data);
    expect(result.provinceCode).toBe('01');
    expect(result.provinceName).toBe('HN');
    expect(result.streetAddress).toBe('123');
  });

  it('falls back to addressDetails legacy fields', () => {
    const data = { addressDetails: { provinceCode: '02', city: 'HCMC', district: 'D1', ward: 'W1', street: '456' } };
    const result = extractAddressFields(data);
    expect(result.provinceCode).toBe('02');
    expect(result.provinceName).toBe('HCMC');
    expect(result.districtName).toBe('D1');
    expect(result.wardName).toBe('W1');
    expect(result.streetAddress).toBe('456');
  });

  it('falls back to individual top-level fields', () => {
    const data = { provinceCode: '03', provinceName: 'Prov', streetAddress: '789' };
    const result = extractAddressFields(data);
    expect(result.provinceCode).toBe('03');
    expect(result.provinceName).toBe('Prov');
    expect(result.streetAddress).toBe('789');
  });

  it('structured takes precedence over legacy and flat', () => {
    const data = {
      vietnamAddress: { provinceCode: 'S01' },
      addressDetails: { provinceCode: 'L01' },
      provinceCode: 'F01',
    };
    const result = extractAddressFields(data);
    expect(result.provinceCode).toBe('S01');
  });

  it('falls through null chain to null', () => {
    const data = { vietnamAddress: {} };
    const result = extractAddressFields(data);
    expect(result.provinceCode).toBeNull();
    expect(result.provinceName).toBeNull();
  });
});

describe('normalizeAnswers', () => {
  const questions = [
    { id: 'q1', questionText: 'Name?', questionType: 'text', isRequired: true, options: [], order: 0 },
    { id: 'q2', questionText: 'Gender?', questionType: 'single_choice', isRequired: false, options: ['M', 'F'], order: 1 },
    { id: 'q3', questionText: 'Interests?', questionType: 'multi_choice', isRequired: false, options: ['A', 'B', 'C'], order: 2 },
  ];

  it('throws for unknown question id', () => {
    expect(() => normalizeAnswers([{ answers: { q_unknown: 'x' } }], questions))
      .toThrow('Unknown attendee question id "q_unknown".');
  });

  it('throws when required question is missing', () => {
    expect(() => normalizeAnswers([{ answers: {} }], questions))
      .toThrow('Answer is required for question "q1".');
  });

  it('skips optional unanswered questions', () => {
    const result = normalizeAnswers([{ answers: { q1: 'John' } }], questions);
    expect(result.attendees[0].answers.q1).toBe('John');
    expect(result.attendees[0].answers.q2).toBeUndefined();
    expect(result.attendees[0].answers.q3).toBeUndefined();
  });

  it('validates and normalizes text answer', () => {
    const result = normalizeAnswers([{ answers: { q1: '  John  ' } }], questions);
    expect(result.attendees[0].answers.q1).toBe('John');
  });

  it('throws for non-string text answer', () => {
    expect(() => normalizeAnswers([{ answers: { q1: 123 } }], questions))
      .toThrow('Answer for question "q1" must be text.');
  });

  it('throws for text answer exceeding 2000 chars', () => {
    expect(() => normalizeAnswers([{ answers: { q1: 'x'.repeat(2001) } }], questions))
      .toThrow('Answer for question "q1" is too long.');
  });

  it('validates single_choice answer', () => {
    const result = normalizeAnswers([{ answers: { q1: 'John', q2: 'M' } }], questions);
    expect(result.attendees[0].answers.q2).toBe('M');
  });

  it('throws for invalid single_choice', () => {
    expect(() => normalizeAnswers([{ answers: { q1: 'John', q2: 'X' } }], questions))
      .toThrow('Invalid choice for question "q2".');
  });

  it('validates multi_choice and deduplicates', () => {
    const result = normalizeAnswers([{ answers: { q1: 'John', q3: ['A', 'B', 'A'] } }], questions);
    expect(result.attendees[0].answers.q3).toEqual(['A', 'B']);
  });

  it('throws for invalid multi_choice', () => {
    expect(() => normalizeAnswers([{ answers: { q1: 'John', q3: ['A', 'X'] } }], questions))
      .toThrow('Invalid choices for question "q3".');
  });

  it('throws for non-array multi_choice value', () => {
    expect(() => normalizeAnswers([{ answers: { q1: 'John', q3: 'A' } }], questions))
      .toThrow('Invalid choices for question "q3".');
  });

  it('generates attendee IDs and normalizes name/email', () => {
    const result = normalizeAnswers([{ answers: { q1: 'John' }, name: '  John D ', email: '  JOHN@Example.COM  ' }], questions);
    expect(result.attendees[0].id).toMatch(/^att_/);
    expect(result.attendees[0].name).toBe('John D');
    expect(result.attendees[0].email).toBe('john@example.com');
  });

  it('sets name/email to null when missing', () => {
    const result = normalizeAnswers([{ answers: { q1: 'John' } }], questions);
    expect(result.attendees[0].name).toBeNull();
    expect(result.attendees[0].email).toBeNull();
  });

  it('produces question snapshot', () => {
    const result = normalizeAnswers([{ answers: { q1: 'John' } }], questions);
    expect(result.questionSnapshot).toHaveLength(3);
    expect(result.questionSnapshot[0].id).toBe('q1');
  });

  it('treats empty array multi_choice as missing', () => {
    const result = normalizeAnswers([{ answers: { q1: 'John', q3: [] } }], questions);
    expect(result.attendees[0].answers.q3).toBeUndefined();
  });
});
