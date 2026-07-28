const { query } = require('./postgres.client');

function getClient(transaction) {
    return transaction && typeof transaction.query === 'function'
        ? transaction
        : { query };
}

async function loadCustomQuestionsForEvents(transaction, eventIds) {
    const byEvent = {};
    if (!Array.isArray(eventIds) || eventIds.length === 0) return byEvent;

    const client = getClient(transaction);
    const result = await client.query(
        `SELECT id, event_id, question_text, question_type, is_required, options, sort_order
         FROM event_custom_questions
         WHERE event_id = ANY($1::text[])
         ORDER BY event_id, sort_order`,
        [eventIds]
    );

    for (const row of result.rows) {
        if (!byEvent[row.event_id]) byEvent[row.event_id] = [];
        byEvent[row.event_id].push({
            id: row.id,
            questionText: row.question_text,
            questionType: row.question_type,
            isRequired: row.is_required === true,
            options: Array.isArray(row.options) ? row.options : [],
            order: Number(row.sort_order),
        });
    }
    return byEvent;
}

async function loadCustomQuestions(transaction, eventId) {
    const byEvent = await loadCustomQuestionsForEvents(transaction, [eventId]);
    return byEvent[eventId] || [];
}

async function replaceCustomQuestions(transaction, eventId, questions) {
    const client = getClient(transaction);
    await client.query('DELETE FROM event_custom_questions WHERE event_id = $1', [eventId]);

    for (let index = 0; index < questions.length; index += 1) {
        const question = questions[index];
        await client.query(
            `INSERT INTO event_custom_questions (
                id, event_id, question_text, question_type, is_required,
                options, sort_order, updated_at
             ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, NOW())`,
            [
                question.id,
                eventId,
                question.questionText,
                question.questionType,
                question.isRequired === true,
                JSON.stringify(question.options || []),
                index,
            ]
        );
    }
}

async function hasTicketSalesStarted(transaction, eventId) {
    const client = getClient(transaction);
    const result = await client.query(
        `SELECT (
            EXISTS (SELECT 1 FROM tickets WHERE event_id = $1)
            OR EXISTS (SELECT 1 FROM orders WHERE event_id = $1)
         ) AS started`,
        [eventId]
    );
    return result.rows[0]?.started === true;
}

async function listVietnamLocations({ level, parentCode = null, search = '', limit = 100 }) {
    const params = [level];
    let sql = `
        SELECT code, name, full_name, level, parent_code
        FROM vietnam_locations
        WHERE level = $1
    `;
    let index = 2;

    if (parentCode) {
        sql += ` AND parent_code = $${index}`;
        params.push(parentCode);
        index += 1;
    }
    if (search) {
        sql += ` AND (name ILIKE $${index} OR full_name ILIKE $${index})`;
        params.push(`%${search}%`);
        index += 1;
    }

    sql += ` ORDER BY sort_order, name LIMIT $${index}`;
    params.push(limit);

    const result = await query(sql, params);
    return result.rows.map((row) => ({
        code: row.code,
        name: row.name,
        fullName: row.full_name || row.name,
        level: row.level,
        parentCode: row.parent_code || null,
    }));
}

async function getBuyerOrder(transaction, eventId, orderId, userId) {
    const client = getClient(transaction);
    const result = await client.query(
        `SELECT o.id, o.event_id, o.user_id, o.status,
                COALESCE((
                    SELECT SUM(oi.quantity)
                    FROM order_items oi
                    WHERE oi.order_id = o.id
                ), 0)::int AS ticket_quantity
         FROM orders o
         WHERE o.id = $1 AND o.event_id = $2 AND o.user_id = $3
         FOR UPDATE`,
        [orderId, eventId, userId]
    );
    return result.rows[0] || null;
}

async function replaceOrderAttendees(transaction, eventId, orderId, attendees, questionSnapshot) {
    const client = getClient(transaction);
    await client.query('DELETE FROM order_attendees WHERE order_id = $1', [orderId]);

    for (let index = 0; index < attendees.length; index += 1) {
        const attendee = attendees[index];
        await client.query(
            `INSERT INTO order_attendees (
                id, order_id, event_id, attendee_name, attendee_email,
                answers, question_snapshot, sort_order, updated_at
             ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, NOW())`,
            [
                attendee.id,
                orderId,
                eventId,
                attendee.name || null,
                attendee.email || null,
                JSON.stringify(attendee.answers),
                JSON.stringify(questionSnapshot),
                index,
            ]
        );
    }
}

module.exports = {
    loadCustomQuestionsForEvents,
    loadCustomQuestions,
    replaceCustomQuestions,
    hasTicketSalesStarted,
    listVietnamLocations,
    getBuyerOrder,
    replaceOrderAttendees,
};
