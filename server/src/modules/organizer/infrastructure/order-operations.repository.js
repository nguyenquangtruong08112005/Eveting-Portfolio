const { query } = require('@/providers/database/postgres.client');

function buildOrderFilters(eventId, filters) {
    const params = [eventId];
    const clauses = [
        'o.event_id = $1',
        'o.deleted_at IS NULL',
    ];
    if (filters.status) {
        params.push(filters.status);
        clauses.push(`o.status = $${params.length}`);
    }
    if (filters.search) {
        params.push(`%${filters.search.toLowerCase()}%`);
        clauses.push(
            `(LOWER(o.id) LIKE $${params.length}
              OR LOWER(au.email) LIKE $${params.length}
              OR LOWER(COALESCE(NULLIF(up.name, ''), au.email)) LIKE $${params.length})`
        );
    }
    return { params, clauses };
}

async function listOrders(eventId, filters) {
    const { params, clauses } = buildOrderFilters(eventId, filters);
    params.push(filters.limit, filters.offset);
    const result = await query(
        `SELECT
            o.id,
            o.created_at AS "createdAt",
            o.user_id AS "customerId",
            COALESCE(NULLIF(up.name, ''), au.email) AS "customerName",
            au.email AS "customerEmail",
            o.total_amount AS "totalValue",
            o.currency,
            COALESCE(pa.payment_method, pa.provider, '') AS "paymentMethod",
            o.status,
            COUNT(*) OVER()::int AS total
         FROM orders o
         JOIN auth_users au ON au.id = o.user_id
         LEFT JOIN user_profiles up ON up.id = o.user_id
         LEFT JOIN LATERAL (
            SELECT payment_method, provider
            FROM payment_attempts
            WHERE order_id = o.id
            ORDER BY created_at DESC NULLS LAST, id DESC
            LIMIT 1
         ) pa ON true
         WHERE ${clauses.join(' AND ')}
         ORDER BY o.created_at DESC NULLS LAST, o.id
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
    );
    return {
        total: result.rows[0]?.total || 0,
        orders: result.rows.map(({ total, totalValue, ...row }) => ({
            ...row,
            totalValue: Number(totalValue),
        })),
    };
}

async function listOrdersForExport(eventId, filters) {
    const { params, clauses } = buildOrderFilters(eventId, filters);
    const result = await query(
        `SELECT
            o.id,
            o.created_at AS "createdAt",
            COALESCE(NULLIF(up.name, ''), au.email) AS "customerName",
            au.email AS "customerEmail",
            o.total_amount AS "totalValue",
            o.currency,
            COALESCE(pa.payment_method, pa.provider, '') AS "paymentMethod",
            o.status
         FROM orders o
         JOIN auth_users au ON au.id = o.user_id
         LEFT JOIN user_profiles up ON up.id = o.user_id
         LEFT JOIN LATERAL (
            SELECT payment_method, provider
            FROM payment_attempts
            WHERE order_id = o.id
            ORDER BY created_at DESC NULLS LAST, id DESC
            LIMIT 1
         ) pa ON true
         WHERE ${clauses.join(' AND ')}
         ORDER BY o.created_at DESC NULLS LAST, o.id
         LIMIT 10000`,
        params
    );
    return result.rows.map(({ totalValue, ...row }) => ({
        ...row,
        totalValue: Number(totalValue),
    }));
}

async function getOrderRecipients(eventId, orderIds) {
    const params = [eventId];
    let orderFilter = '';
    if (orderIds && orderIds.length) {
        params.push(orderIds);
        orderFilter = ` AND o.id = ANY($2::text[])`;
    }
    const result = await query(
        `SELECT DISTINCT
            o.id AS "orderId",
            o.user_id AS "userId",
            au.email,
            COALESCE(NULLIF(up.name, ''), au.email) AS name
         FROM orders o
         JOIN auth_users au ON au.id = o.user_id
         LEFT JOIN user_profiles up ON up.id = o.user_id
         WHERE o.event_id = $1
           AND o.deleted_at IS NULL
           AND o.status = 'paid'
           ${orderFilter}
         ORDER BY o.id`,
        params
    );
    return result.rows;
}

module.exports = {
    listOrders,
    listOrdersForExport,
    getOrderRecipients,
};
