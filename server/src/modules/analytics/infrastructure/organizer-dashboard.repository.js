const { query } = require('@/providers/database/postgres.client');
const { randomUUID } = require('crypto');

async function recordTraffic(eventId, visitorKey, source, rawData) {
    const result = await query(
        `INSERT INTO event_traffic_logs (
            id, event_id, visitor_key, source, raw_data
         )
         SELECT $1, e.id, $3, $4, $5
         FROM events e
         WHERE e.id = $2
           AND e.deleted_at IS NULL
         RETURNING id, event_id AS "eventId", source, occurred_at AS "occurredAt"`,
        [
            `etl_${randomUUID()}`,
            eventId,
            visitorKey,
            source,
            JSON.stringify(rawData || {}),
        ]
    );
    return result.rows[0] || null;
}

async function getRevenueDashboard(eventId) {
    const overviewResult = await query(
        `WITH paid_orders AS (
            SELECT id, total_amount
            FROM orders
            WHERE event_id = $1
              AND status = 'paid'
              AND deleted_at IS NULL
         )
         SELECT
            COALESCE((SELECT SUM(total_amount) FROM paid_orders), 0) AS total_revenue,
            COALESCE(
                (
                    SELECT SUM(oi.quantity)
                    FROM order_items oi
                    JOIN paid_orders po ON po.id = oi.order_id
                ),
                0
            )::int AS tickets_sold,
            (SELECT COUNT(*) FROM paid_orders)::int AS paid_orders`,
        [eventId]
    );
    const timelineResult = await query(
        `SELECT
            DATE_TRUNC('day', COALESCE(o.paid_at, o.created_at)) AS bucket,
            SUM(o.total_amount) AS revenue,
            COUNT(*)::int AS orders
         FROM orders o
         WHERE o.event_id = $1
           AND o.status = 'paid'
           AND o.deleted_at IS NULL
         GROUP BY bucket
         ORDER BY bucket`,
        [eventId]
    );
    const breakdownResult = await query(
        `SELECT
            ett.id AS "ticketTypeId",
            ett.code,
            ett.name,
            ett.price,
            ett.capacity,
            ett.available,
            COALESCE(SUM(oi.quantity) FILTER (WHERE o.status = 'paid'), 0)::int AS sold,
            GREATEST(
                ett.capacity - ett.available
                - COALESCE(SUM(oi.quantity) FILTER (WHERE o.status = 'paid'), 0),
                0
            )::int AS locked
         FROM event_ticket_types ett
         LEFT JOIN order_items oi
            ON oi.ticket_type_id = ett.id
            OR (oi.ticket_type_id IS NULL AND oi.ticket_type = ett.code)
         LEFT JOIN orders o
            ON o.id = oi.order_id
           AND o.event_id = ett.event_id
           AND o.deleted_at IS NULL
         WHERE ett.event_id = $1
         GROUP BY ett.id
         ORDER BY ett.sort_order, ett.id`,
        [eventId]
    );
    const overview = overviewResult.rows[0];
    return {
        eventId,
        totalRevenue: Number(overview.total_revenue),
        ticketsSold: overview.tickets_sold,
        paidOrders: overview.paid_orders,
        salesTimeline: timelineResult.rows.map((row) => ({
            timestamp: row.bucket,
            revenue: Number(row.revenue),
            orders: row.orders,
        })),
        ticketTypes: breakdownResult.rows.map((row) => ({
            ...row,
            price: Number(row.price),
            capacity: Number(row.capacity),
            available: Number(row.available),
            sellRate:
                Number(row.capacity) > 0
                    ? Number(((Number(row.sold) / Number(row.capacity)) * 100).toFixed(2))
                    : 0,
        })),
    };
}

async function getTrafficDashboard(eventId) {
    const overviewResult = await query(
        `SELECT
            COUNT(*)::int AS clicks,
            COUNT(DISTINCT visitor_key)::int AS unique_visitors
         FROM event_traffic_logs
         WHERE event_id = $1`,
        [eventId]
    );
    const purchaseResult = await query(
        `SELECT COUNT(DISTINCT user_id)::int AS buyers
         FROM orders
         WHERE event_id = $1
           AND status = 'paid'
           AND deleted_at IS NULL`,
        [eventId]
    );
    const timelineResult = await query(
        `SELECT
            DATE_TRUNC('day', occurred_at) AS bucket,
            COUNT(*)::int AS clicks,
            COUNT(DISTINCT visitor_key)::int AS unique_visitors
         FROM event_traffic_logs
         WHERE event_id = $1
         GROUP BY bucket
         ORDER BY bucket`,
        [eventId]
    );
    const sourceResult = await query(
        `SELECT source, COUNT(*)::int AS clicks
         FROM event_traffic_logs
         WHERE event_id = $1
         GROUP BY source
         ORDER BY clicks DESC, source`,
        [eventId]
    );
    const overview = overviewResult.rows[0];
    const buyers = purchaseResult.rows[0].buyers;
    return {
        eventId,
        clicks: overview.clicks,
        uniqueVisitors: overview.unique_visitors,
        buyers,
        conversionRate:
            overview.unique_visitors > 0
                ? Number(((buyers / overview.unique_visitors) * 100).toFixed(2))
                : 0,
        accessTimeline: timelineResult.rows.map((row) => ({
            timestamp: row.bucket,
            clicks: row.clicks,
            uniqueVisitors: row.unique_visitors,
        })),
        sources: sourceResult.rows,
    };
}

async function getCheckInDashboard(eventId, allowedTicketTypes = null) {
    const params = [eventId];
    let ticketFilter = '';
    if (allowedTicketTypes && allowedTicketTypes.length) {
        params.push(allowedTicketTypes);
        ticketFilter = ` AND COALESCE(ett.id, ett.code, t.type) = ANY($2::text[])`;
    }
    const result = await query(
        `WITH sold AS (
            SELECT
                t.id,
                t.type,
                COALESCE(ett.id, t.type) AS ticket_type_id,
                COALESCE(ett.name, t.type) AS ticket_type_name,
                COALESCE(t.quantity, 1) AS quantity
            FROM tickets t
            LEFT JOIN event_ticket_types ett
                ON ett.event_id = t.event_id
               AND (ett.id = t.type OR ett.code = t.type OR ett.name = t.type)
            WHERE t.event_id = $1
              AND t.status IN ('paid', 'checkedIn', 'checked_in')
              ${ticketFilter}
        ),
        movement AS (
            SELECT
                tci.ticket_id,
                COUNT(*) FILTER (WHERE tci.direction = 'entry')::int AS entries,
                COUNT(*) FILTER (WHERE tci.direction = 'exit')::int AS exits
            FROM ticket_check_ins tci
            WHERE tci.event_id = $1
            GROUP BY tci.ticket_id
        )
        SELECT
            sold.ticket_type_id AS "ticketTypeId",
            sold.ticket_type_name AS "ticketTypeName",
            SUM(sold.quantity)::int AS sold,
            COALESCE(SUM(movement.entries), 0)::int AS entries,
            COALESCE(SUM(movement.exits), 0)::int AS exits
        FROM sold
        LEFT JOIN movement ON movement.ticket_id = sold.id
        GROUP BY sold.ticket_type_id, sold.ticket_type_name
        ORDER BY sold.ticket_type_name`,
        params
    );
    const ticketTypes = result.rows.map((row) => ({
        ...row,
        currentlyInside: Math.max(0, row.entries - row.exits),
        checkInRate:
            row.sold > 0 ? Number(((row.entries / row.sold) * 100).toFixed(2)) : 0,
    }));
    return {
        eventId,
        sold: ticketTypes.reduce((sum, row) => sum + row.sold, 0),
        joined: ticketTypes.reduce((sum, row) => sum + row.entries, 0),
        exited: ticketTypes.reduce((sum, row) => sum + row.exits, 0),
        currentlyInside: ticketTypes.reduce((sum, row) => sum + row.currentlyInside, 0),
        ticketTypes,
    };
}

module.exports = {
    recordTraffic,
    getRevenueDashboard,
    getTrafficDashboard,
    getCheckInDashboard,
};
