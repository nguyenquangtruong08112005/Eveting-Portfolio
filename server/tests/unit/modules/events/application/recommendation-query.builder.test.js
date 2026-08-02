const moment = require('moment');
const {
  buildRecommendationQuery,
} = require('@/modules/events/application/query-builders/recommendation-query.builder');

describe('buildRecommendationQuery', () => {
  it('builds must conditions with visibility, status, and date range', () => {
    const result = buildRecommendationQuery(['music'], []);
    const must = result.query.bool.must;
    expect(must).toContainEqual({ term: { "visibility.keyword": "public" } });
    expect(must).toContainEqual({ term: { "status.keyword": "active" } });
    expect(must[2]).toMatchObject({ range: { date: { gte: expect.any(Number) } } });
  });

  it('adds must_not with historyIds when provided', () => {
    const result = buildRecommendationQuery(['music'], ['evt_1', 'evt_2']);
    expect(result.query.bool.must_not).toEqual([{ ids: { values: ['evt_1', 'evt_2'] } }]);
  });

  it('omits must_not when historyIds is empty array', () => {
    const result = buildRecommendationQuery(['music'], []);
    expect(result.query.bool.must_not).toEqual([]);
  });

  it('omits must_not when historyIds is undefined', () => {
    const result = buildRecommendationQuery(['music'], undefined);
    expect(result.query.bool.must_not).toEqual([]);
  });

  it('omits must_not when historyIds is null', () => {
    const result = buildRecommendationQuery(['music'], null);
    expect(result.query.bool.must_not).toEqual([]);
  });

  it('builds should conditions from interests', () => {
    const result = buildRecommendationQuery(['jazz', 'rock'], []);
    expect(result.query.bool.should).toHaveLength(2);
    expect(result.query.bool.should[0].multi_match.query).toBe('jazz');
    expect(result.query.bool.should[0].multi_match.fields).toContain('category^3');
    expect(result.query.bool.should[1].multi_match.query).toBe('rock');
  });

  it('builds empty should when interests is empty', () => {
    const result = buildRecommendationQuery([], []);
    expect(result.query.bool.should).toEqual([]);
  });

  it('sets minimum_should_match to 1', () => {
    const result = buildRecommendationQuery(['music'], []);
    expect(result.query.bool.minimum_should_match).toBe(1);
  });

  it('sorts by _score desc then date asc', () => {
    const result = buildRecommendationQuery(['music'], []);
    expect(result.sort).toEqual([
      { _score: { order: "desc" } },
      { date: { order: "asc" } },
    ]);
  });

  it('uses UTC+7 for now', () => {
    const result = buildRecommendationQuery(['music'], []);
    const expectedNow = moment().utcOffset('+07:00').valueOf();
    const gte = result.query.bool.must[2].range.date.gte;
    expect(gte).toBeCloseTo(expectedNow, -3);
  });
});
