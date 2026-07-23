const moment = require('moment');

const buildSearchQuery = (queryParams) => {
    const page = parseInt(queryParams.page) || 1;
    const limit = parseInt(queryParams.limit) || 10;
    const offset = (page - 1) * limit;
    const mustFilters = [];
    const shouldClauses = [];

    if (queryParams.category) mustFilters.push({ term: { "category.keyword": queryParams.category.toLowerCase() } });
    if (queryParams.location) mustFilters.push({ term: { "city.keyword": queryParams.location } });

    const rangeFilters = {};
    const now = () => moment().utcOffset('+07:00').startOf('day');

    if (queryParams.startDate) rangeFilters.date = { gte: Number(queryParams.startDate) };
    if (queryParams.endDate) rangeFilters.date = { ...rangeFilters.date, lte: Number(queryParams.endDate) };
    if (queryParams.date) {
        if (queryParams.date === 'today') rangeFilters.date = { gte: now().valueOf(), lt: now().add(1, 'day').valueOf() };
        else if (queryParams.date === 'tomorrow') rangeFilters.date = { gte: now().add(1, 'day').valueOf(), lt: now().add(2, 'day').valueOf() };
        else if (queryParams.date === 'this_week') rangeFilters.date = { gte: now().valueOf(), lte: now().endOf('week').valueOf() };
        else if (queryParams.date === 'upcoming') rangeFilters.date = { gte: now().valueOf() };
    }
    if (queryParams.minPrice) rangeFilters.minPrice = { gte: Number(queryParams.minPrice) };
    if (queryParams.maxPrice) rangeFilters.minPrice = { ...rangeFilters.minPrice, lte: Number(queryParams.maxPrice) };
    if (Object.keys(rangeFilters).length > 0) mustFilters.push({ range: rangeFilters });

    if (queryParams.hasVideo === 'true') mustFilters.push({ exists: { field: "videoUrl" } });

    if (queryParams.q) {
        const q = queryParams.q;
        shouldClauses.push({ multi_match: { query: q, fields: ["name", "description", "tags"], fuzziness: "AUTO" } });
        shouldClauses.push({ match: { "featuredProfileNames": { query: q, fuzziness: "AUTO" } } });
        mustFilters.push({ bool: { should: shouldClauses, minimum_should_match: 1 } });
    }

    let sort = [];
    const sortBy = queryParams.sortBy || (queryParams.q ? '_score' : 'date');
    const sortOrder = queryParams.sortOrder || (sortBy === 'date' ? 'asc' : 'desc');

    if (sortBy === '_score') sort.push({ _score: { order: "desc" } });
    else if (sortBy === 'date' || sortBy === 'minPrice') sort.push({ [sortBy]: { order: sortOrder } });
    else sort.push({ date: { order: 'asc' } });

    const query = {
        bool: {
            must: mustFilters.length > 0 ? mustFilters : { match_all: {} }
        }
    };

    return { query, sort, offset, limit };
};

module.exports = {
    buildSearchQuery
};
