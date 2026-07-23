const { query } = require('./postgres.client');
const { toDb, fromDb, nowDb, nowMs } = require('./time.helper');

function rowToAnalytics(row) {
    if (!row) return null;
    if (row.raw_data) {
        const raw = typeof row.raw_data === 'string' ? JSON.parse(row.raw_data) : row.raw_data;
        if (raw && Object.keys(raw).length > 0) {
            return raw;
        }
    }

    let analytics = {};
    analytics.eventId = row.event_id || row.id;
    if (row.total_revenue != null) analytics.totalRevenue = Number(row.total_revenue);
    if (row.tickets_sold != null) {
        analytics.ticketsSold = typeof row.tickets_sold === 'string' ? JSON.parse(row.tickets_sold) : row.tickets_sold;
    } else {
        analytics.ticketsSold = {};
    }
    if (row.daily_sales != null) {
        analytics.dailySales = typeof row.daily_sales === 'string' ? JSON.parse(row.daily_sales) : row.daily_sales;
    } else {
        analytics.dailySales = {};
    }
    if (row.check_ins != null) analytics.checkIns = Number(row.check_ins);
    if (row.views != null) analytics.views = Number(row.views);
    if (row.views_over_time != null) {
        analytics.viewsOverTime = typeof row.views_over_time === 'string' ? JSON.parse(row.views_over_time) : row.views_over_time;
    } else {
        analytics.viewsOverTime = {};
    }
    if (row.last_updated_at != null) analytics.lastUpdatedAt = fromDb(row.last_updated_at);

    return analytics;
}

const getAnalyticsByEventId = async (eventId) => {
    const result = await query('SELECT * FROM analytics WHERE id = $1', [eventId]);
    if (result.rows.length === 0) return null;
    return rowToAnalytics(result.rows[0]);
};

const updateAnalyticsForConfirmPaymentInTransaction = async (transaction, eventId, { price, ticketType, quantity, dailyTimestamp }) => {
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    const qty = quantity || 1;
    const prc = price || 0;
    const tsMs = nowMs();
    const tsDb = nowDb();

    const ticketsSoldObj = JSON.stringify({ [ticketType]: qty });
    const dailySalesObj = JSON.stringify({ [dailyTimestamp]: qty });

    const rawData = JSON.stringify({
        eventId,
        totalRevenue: prc,
        ticketsSold: { [ticketType]: qty },
        dailySales: { [dailyTimestamp]: qty },
        lastUpdatedAt: tsMs
    });

    const sql = `
        INSERT INTO analytics (id, event_id, total_revenue, tickets_sold, daily_sales, last_updated_at, raw_data)
        VALUES ($1, $1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
            total_revenue = COALESCE(analytics.total_revenue, 0) + EXCLUDED.total_revenue,
            tickets_sold = COALESCE(analytics.tickets_sold, '{}'::jsonb) || jsonb_build_object($7::text, COALESCE((analytics.tickets_sold->>$7)::int, 0) + $8::int),
            daily_sales = COALESCE(analytics.daily_sales, '{}'::jsonb) || jsonb_build_object($9::text, COALESCE((analytics.daily_sales->>$9)::int, 0) + $8::int),
            last_updated_at = EXCLUDED.last_updated_at,
            raw_data = COALESCE(analytics.raw_data, '{}'::jsonb) || jsonb_build_object(
                'totalRevenue', COALESCE((analytics.raw_data->>'totalRevenue')::numeric, 0) + EXCLUDED.total_revenue,
                'ticketsSold', COALESCE(analytics.raw_data->'ticketsSold', '{}'::jsonb) || jsonb_build_object($7::text, COALESCE((analytics.raw_data->'ticketsSold'->>$7)::int, 0) + $8::int),
                'dailySales', COALESCE(analytics.raw_data->'dailySales', '{}'::jsonb) || jsonb_build_object($9::text, COALESCE((analytics.raw_data->'dailySales'->>$9)::int, 0) + $8::int),
                'lastUpdatedAt', $10::bigint
            )
    `;

    await client.query(sql, [
        eventId,
        prc,
        ticketsSoldObj,
        dailySalesObj,
        tsDb,
        rawData,
        ticketType,
        qty,
        dailyTimestamp,
        tsMs,
    ]);
};

const incrementCheckInInTransaction = async (transaction, eventId) => {
    const client = (transaction && typeof transaction.query === 'function') ? transaction : { query };
    const tsMs = nowMs();
    const tsDb = nowDb();
    const sql = `
        INSERT INTO analytics (id, event_id, check_ins, last_updated_at, raw_data)
        VALUES ($1, $1, 1, $2, $3::jsonb)
        ON CONFLICT (id) DO UPDATE SET
            check_ins = COALESCE(analytics.check_ins, 0) + 1,
            last_updated_at = EXCLUDED.last_updated_at,
            raw_data = COALESCE(analytics.raw_data, '{}'::jsonb) || jsonb_build_object(
                'checkIns', COALESCE((analytics.raw_data->>'checkIns')::int, 0) + 1,
                'lastUpdatedAt', $4::bigint
            )
    `;
    await client.query(sql, [
        eventId,
        tsDb,
        JSON.stringify({ eventId, checkIns: 1, lastUpdatedAt: tsMs }),
        tsMs,
    ]);
};

const getAnalyticsByEventIds = async (eventIds) => {
    if (!eventIds || eventIds.length === 0) return [];
    const result = await query('SELECT * FROM analytics WHERE id = ANY($1)', [eventIds]);
    return result.rows.map(row => rowToAnalytics(row));
};

const createAnalytics = async (eventId, analyticsData) => {
    const rawData = { ...analyticsData };
    const ticketsSold = analyticsData.ticketsSold || {};
    const dailySales = analyticsData.dailySales || {};
    const viewsOverTime = analyticsData.viewsOverTime || {};

    await query(
        `INSERT INTO analytics (
            id, event_id, total_revenue, tickets_sold, daily_sales, check_ins, views, views_over_time, last_updated_at, raw_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
            event_id = EXCLUDED.event_id,
            total_revenue = EXCLUDED.total_revenue,
            tickets_sold = EXCLUDED.tickets_sold,
            daily_sales = EXCLUDED.daily_sales,
            check_ins = EXCLUDED.check_ins,
            views = EXCLUDED.views,
            views_over_time = EXCLUDED.views_over_time,
            last_updated_at = EXCLUDED.last_updated_at,
            raw_data = EXCLUDED.raw_data`,
        [
            eventId,
            analyticsData.eventId || eventId,
            analyticsData.totalRevenue || 0,
            JSON.stringify(ticketsSold),
            JSON.stringify(dailySales),
            analyticsData.checkIns || 0,
            analyticsData.views || 0,
            JSON.stringify(viewsOverTime),
            toDb(analyticsData.lastUpdatedAt) || nowDb(),
            JSON.stringify(rawData)
        ]
    );
};

module.exports = {
    getAnalyticsByEventId,
    updateAnalyticsForConfirmPaymentInTransaction,
    incrementCheckInInTransaction,
    getAnalyticsByEventIds,
    createAnalytics
};
