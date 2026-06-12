const moment = require('moment');
const { STATUS, VISIBILITY } = require('@/modules/events/domain/event-lifecycle');

const buildRecommendationQuery = (interests, historyIds) => {
    const now = moment().utcOffset('+07:00').valueOf();
    const mustConditions = [
        { term: { "visibility.keyword": VISIBILITY.PUBLIC } },
        { term: { "status.keyword": STATUS.ACTIVE } },
        { range: { date: { gte: now } } }
    ];
    const mustNotConditions = [];
    if (historyIds && historyIds.length > 0) {
        mustNotConditions.push({ ids: { values: historyIds } });
    }
    const shouldConditions = interests.map(interest => ({
        multi_match: {
            query: interest,
            fields: ["category^3", "tags^3", "featuredProfileNames^2", "name", "description"],
            fuzziness: "AUTO"
        }
    }));

    const query = {
        bool: {
            must: mustConditions,
            must_not: mustNotConditions,
            should: shouldConditions,
            minimum_should_match: 1
        }
    };

    const sort = [{ _score: { order: "desc" } }, { date: { order: "asc" } }];

    return { query, sort };
};

module.exports = {
    buildRecommendationQuery
};
