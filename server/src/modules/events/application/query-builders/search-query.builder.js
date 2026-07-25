const moment = require('moment');

/**
 * Parses a date parameter (numeric timestamp in ms, digit string, or ISO date string) into epoch ms.
 * When isEndOfDay is true for an ISO date string, sets time to the end of that day (23:59:59.999).
 */
const parseDateToMs = (val, isEndOfDay = false) => {
    if (val === undefined || val === null || val === '') return null;
    if (typeof val === 'number') return isNaN(val) ? null : val;
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (!trimmed) return null;
        if (/^\d+$/.test(trimmed)) {
            const num = Number(trimmed);
            return isNaN(num) ? null : num;
        }
        const m = isEndOfDay ? moment(trimmed).endOf('day') : moment(trimmed);
        return m.isValid() ? m.valueOf() : null;
    }
    return null;
};

/**
 * Normalizes search parameters across web-shaped and legacy-shaped parameter aliases.
 * Precedence rules when both are supplied:
 * - city takes precedence over location (city ?? location)
 * - dateFrom takes precedence over startDate (dateFrom ?? startDate)
 * - dateTo takes precedence over endDate (dateTo ?? endDate)
 */
const normalizeSearchParams = (queryParams = {}) => {
    const city = (queryParams.city !== undefined && queryParams.city !== '')
        ? queryParams.city
        : queryParams.location;

    const startDate = (queryParams.dateFrom !== undefined && queryParams.dateFrom !== '')
        ? queryParams.dateFrom
        : queryParams.startDate;

    const endDate = (queryParams.dateTo !== undefined && queryParams.dateTo !== '')
        ? queryParams.dateTo
        : queryParams.endDate;

    const normalizedCity = (city !== undefined && city !== '') ? city : undefined;
    const normalizedStartDate = (startDate !== undefined && startDate !== '') ? startDate : undefined;
    const normalizedEndDate = (endDate !== undefined && endDate !== '') ? endDate : undefined;

    return {
        ...queryParams,
        city: normalizedCity,
        location: normalizedCity,
        startDate: normalizedStartDate,
        dateFrom: normalizedStartDate,
        endDate: normalizedEndDate,
        dateTo: normalizedEndDate,
    };
};

const buildSearchQuery = (rawQueryParams = {}) => {
    const queryParams = normalizeSearchParams(rawQueryParams);
    const page = parseInt(queryParams.page) || 1;
    const limit = parseInt(queryParams.limit) || 10;
    const offset = (page - 1) * limit;
    const mustFilters = [];
    const shouldClauses = [];

    if (queryParams.category) mustFilters.push({ term: { "category.keyword": queryParams.category.toLowerCase() } });
    if (queryParams.city) mustFilters.push({ term: { "city.keyword": queryParams.city } });

    const rangeFilters = {};
    const now = () => moment().utcOffset('+07:00').startOf('day');

    const startMs = parseDateToMs(queryParams.startDate, false);
    const endMs = parseDateToMs(queryParams.endDate, true);

    if (startMs !== null) rangeFilters.date = { gte: startMs };
    if (endMs !== null) rangeFilters.date = { ...rangeFilters.date, lte: endMs };

    if (queryParams.date) {
        if (queryParams.date === 'today') rangeFilters.date = { gte: now().valueOf(), lt: now().add(1, 'day').valueOf() };
        else if (queryParams.date === 'tomorrow') rangeFilters.date = { gte: now().add(1, 'day').valueOf(), lt: now().add(2, 'day').valueOf() };
        else if (queryParams.date === 'this_week') rangeFilters.date = { gte: now().valueOf(), lte: now().endOf('week').valueOf() };
        else if (queryParams.date === 'upcoming') rangeFilters.date = { gte: now().valueOf() };
    }
    if (queryParams.minPrice !== undefined && queryParams.minPrice !== '' && !isNaN(Number(queryParams.minPrice))) {
        rangeFilters.minPrice = { gte: Number(queryParams.minPrice) };
    }
    if (queryParams.maxPrice !== undefined && queryParams.maxPrice !== '' && !isNaN(Number(queryParams.maxPrice))) {
        rangeFilters.minPrice = { ...rangeFilters.minPrice, lte: Number(queryParams.maxPrice) };
    }
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
    parseDateToMs,
    normalizeSearchParams,
    buildSearchQuery
};
