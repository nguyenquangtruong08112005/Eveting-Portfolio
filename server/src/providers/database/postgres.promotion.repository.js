const { query, transaction } = require('./postgres.client');
const eventRepository = require('./postgres.event.repository');
const { fromDb, nowDb, toDb } = require('./time.helper');

function numberOrNull(value) {
  return value == null ? null : Number(value);
}

function dataNumber(data, ...keys) {
  for (const key of keys) {
    if (data[key] != null && data[key] !== '') return Number(data[key]);
  }
  return null;
}

function rowToPromotion(row) {
  if (!row) return null;

  const data = row.data && typeof row.data === 'object' ? row.data : {};
  const legacyPercent = dataNumber(data, 'discountPercent', 'discount_percent');
  const legacyFixed = dataNumber(data, 'fixedDiscountVnd', 'fixed_discount_vnd');
  const storedType = row.discount_type || data.discountType || data.discount_type;
  const discountType = storedType === 'fixed'
    ? 'amount'
    : (storedType || (legacyPercent != null ? 'percent' : (legacyFixed != null ? 'amount' : null)));
  const discountValue = row.discount_value != null
    ? Number(row.discount_value)
    : (
      dataNumber(data, 'discountValue', 'discount_value') ??
      (legacyPercent != null ? legacyPercent / 100 : legacyFixed)
    );

  return {
    ...data,
    id: row.id,
    organizerId: row.organizer_id,
    code: row.code,
    eventId: row.event_id,
    validFrom: fromDb(row.valid_from),
    validUntil: fromDb(row.valid_until),
    usageLimit: numberOrNull(row.usage_limit),
    usedCount: Number(row.used_count || 0),
    ticketUsageLimit: numberOrNull(row.ticket_usage_limit),
    usedTicketCount: Number(row.used_ticket_count || 0),
    perUserLimit: numberOrNull(row.per_user_limit),
    minTicketQuantity: Number(
      row.min_ticket_quantity ??
      data.minTicketQuantity ??
      data.min_ticket_quantity ??
      1
    ),
    maxTicketQuantity: numberOrNull(
      row.max_ticket_quantity ??
      data.maxTicketQuantity ??
      data.max_ticket_quantity
    ),
    discountType,
    discountValue,
    maxDiscount: row.max_discount != null
      ? Number(row.max_discount)
      : dataNumber(data, 'maxDiscount', 'max_discount', 'maxDiscountVnd'),
    minOrder: row.min_order != null
      ? Number(row.min_order)
      : (dataNumber(data, 'minOrder', 'min_order') || 0),
    isPublic: row.is_public,
    isEnabled: row.is_enabled !== false,
    createdAt: fromDb(row.created_at),
  };
}

const PROMOTION_COLUMNS = `
  id, organizer_id, code, event_id, valid_from, valid_until,
  usage_limit, used_count, ticket_usage_limit, used_ticket_count,
  per_user_limit, min_ticket_quantity, max_ticket_quantity,
  discount_type, discount_value, max_discount, min_order,
  is_public, is_enabled, data, created_at
`;

const getActivePromotions = async () => {
  const result = await query(
    `SELECT ${PROMOTION_COLUMNS}
     FROM promotions
     WHERE is_public = true
       AND is_enabled = true
       AND valid_from <= $1
       AND valid_until > $1
       AND (usage_limit IS NULL OR used_count < usage_limit)
       AND (ticket_usage_limit IS NULL OR used_ticket_count < ticket_usage_limit)
     ORDER BY created_at DESC`,
    [nowDb()]
  );
  return result.rows.map(rowToPromotion);
};

const getPromotionsByOrganizer = async (organizerId) => {
  const result = await query(
    `SELECT ${PROMOTION_COLUMNS}
     FROM promotions
     WHERE organizer_id = $1
     ORDER BY created_at DESC`,
    [organizerId]
  );
  return result.rows.map(rowToPromotion);
};

const findByCode = async (code, scope = {}) => {
  const result = await query(
    `SELECT ${PROMOTION_COLUMNS}
     FROM promotions
     WHERE UPPER(code) = UPPER($1)
       AND ($2::text IS NULL OR organizer_id = $2)
       AND ($3::text IS NULL OR event_id IS NULL OR event_id = $3)
     ORDER BY CASE WHEN event_id = $3 THEN 0 ELSE 1 END, created_at DESC
     LIMIT 1`,
    [code, scope.organizerId || null, scope.eventId || null]
  );
  return rowToPromotion(result.rows[0]);
};

const getEventById = async (eventId) => eventRepository.getEventById(eventId);

const getPromotionById = async (promoId) => {
  const result = await query(
    `SELECT ${PROMOTION_COLUMNS} FROM promotions WHERE id = $1`,
    [promoId]
  );
  return rowToPromotion(result.rows[0]);
};

function toDatabaseDiscountType(type) {
  return type === 'amount' ? 'fixed' : type;
}

const createPromotion = async (promoId, promoData) => {
  const {
    organizerId,
    code,
    eventId,
    validFrom,
    validUntil,
    usageLimit,
    usedCount,
    ticketUsageLimit,
    usedTicketCount,
    perUserLimit,
    minTicketQuantity,
    maxTicketQuantity,
    discountType,
    discountValue,
    maxDiscount,
    minOrder,
    isPublic,
    isEnabled,
    createdAt,
    ...rest
  } = promoData;

  await query(
    `INSERT INTO promotions (
       id, organizer_id, code, event_id, valid_from, valid_until,
       usage_limit, used_count, ticket_usage_limit, used_ticket_count,
       per_user_limit, min_ticket_quantity, max_ticket_quantity,
       discount_type, discount_value, max_discount, min_order,
       is_public, is_enabled, created_at, data
     )
     VALUES (
       $1, $2, $3, $4, $5, $6,
       $7, $8, $9, $10,
       $11, $12, $13,
       $14, $15, $16, $17,
       $18, $19, $20, $21
     )
     ON CONFLICT (id) DO UPDATE SET
       organizer_id = EXCLUDED.organizer_id,
       code = EXCLUDED.code,
       event_id = EXCLUDED.event_id,
       valid_from = EXCLUDED.valid_from,
       valid_until = EXCLUDED.valid_until,
       usage_limit = EXCLUDED.usage_limit,
       used_count = EXCLUDED.used_count,
       ticket_usage_limit = EXCLUDED.ticket_usage_limit,
       used_ticket_count = EXCLUDED.used_ticket_count,
       per_user_limit = EXCLUDED.per_user_limit,
       min_ticket_quantity = EXCLUDED.min_ticket_quantity,
       max_ticket_quantity = EXCLUDED.max_ticket_quantity,
       discount_type = EXCLUDED.discount_type,
       discount_value = EXCLUDED.discount_value,
       max_discount = EXCLUDED.max_discount,
       min_order = EXCLUDED.min_order,
       is_public = EXCLUDED.is_public,
       is_enabled = EXCLUDED.is_enabled,
       created_at = EXCLUDED.created_at,
       data = EXCLUDED.data`,
    [
      promoId,
      organizerId,
      code,
      eventId || null,
      toDb(validFrom),
      toDb(validUntil),
      usageLimit,
      usedCount || 0,
      ticketUsageLimit,
      usedTicketCount || 0,
      perUserLimit == null ? 1 : perUserLimit,
      minTicketQuantity == null ? 1 : minTicketQuantity,
      maxTicketQuantity,
      toDatabaseDiscountType(discountType),
      discountValue,
      maxDiscount,
      minOrder,
      isPublic,
      isEnabled !== false,
      toDb(createdAt) || nowDb(),
      JSON.stringify(rest),
    ]
  );
};

const UPDATE_COLUMN_MAP = {
  code: ['code', (value) => value],
  eventId: ['event_id', (value) => value || null],
  validFrom: ['valid_from', toDb],
  validUntil: ['valid_until', toDb],
  usageLimit: ['usage_limit', (value) => value],
  ticketUsageLimit: ['ticket_usage_limit', (value) => value],
  perUserLimit: ['per_user_limit', (value) => value],
  minTicketQuantity: ['min_ticket_quantity', (value) => value],
  maxTicketQuantity: ['max_ticket_quantity', (value) => value],
  discountType: ['discount_type', toDatabaseDiscountType],
  discountValue: ['discount_value', (value) => value],
  maxDiscount: ['max_discount', (value) => value],
  minOrder: ['min_order', (value) => value],
  isPublic: ['is_public', (value) => value],
  isEnabled: ['is_enabled', (value) => value],
};

const updatePromotion = async (promoId, updates) => {
  const columnSets = [];
  const dataUpdates = {};
  const params = [];

  for (const [key, value] of Object.entries(updates)) {
    if (key === 'id') continue;
    const mapping = UPDATE_COLUMN_MAP[key];
    if (mapping) {
      params.push(mapping[1](value));
      columnSets.push(`${mapping[0]} = $${params.length}`);
    } else {
      dataUpdates[key] = value;
    }
  }

  if (Object.keys(dataUpdates).length > 0) {
    params.push(JSON.stringify(dataUpdates));
    columnSets.push(`data = data || $${params.length}::jsonb`);
  }
  if (columnSets.length === 0) return;

  params.push(promoId);
  await query(
    `UPDATE promotions SET ${columnSets.join(', ')} WHERE id = $${params.length}`,
    params
  );
};

const deletePromotion = async (promoId) => {
  await query('DELETE FROM promotions WHERE id = $1', [promoId]);
};

function transactionClient(transactionValue) {
  if (!transactionValue || typeof transactionValue.query !== 'function') {
    throw new TypeError('A PostgreSQL transaction client is required.');
  }
  return transactionValue;
}

const findPromoByCodeInTransaction = async (
  transactionValue,
  promoCode,
  lock = false,
  scope = {}
) => {
  const client = transactionClient(transactionValue);
  const result = await client.query(
    `SELECT ${PROMOTION_COLUMNS}
     FROM promotions
     WHERE UPPER(code) = UPPER($1)
       AND ($2::text IS NULL OR organizer_id = $2)
       AND ($3::text IS NULL OR event_id IS NULL OR event_id = $3)
     ORDER BY CASE WHEN event_id = $3 THEN 0 ELSE 1 END, created_at DESC
     LIMIT 1
     ${lock ? 'FOR UPDATE' : ''}`,
    [promoCode, scope.organizerId || null, scope.eventId || null]
  );
  const promotion = rowToPromotion(result.rows[0]);
  return promotion ? { ...promotion, _id: promotion.id } : null;
};

const getEventScopeInTransaction = async (transactionValue, eventId) => {
  if (!eventId) return null;
  const client = transactionClient(transactionValue);
  const result = await client.query(
    'SELECT id, organizer_id FROM events WHERE id = $1 LIMIT 1',
    [eventId]
  );
  if (result.rows.length === 0) return null;
  return {
    eventId: result.rows[0].id,
    organizerId: result.rows[0].organizer_id,
  };
};

const getUserActiveUsageCountInTransaction = async (
  transactionValue,
  promotionId,
  userId
) => {
  if (!userId) return 0;
  const client = transactionClient(transactionValue);
  const result = await client.query(
    `SELECT COUNT(*)::int AS count
     FROM voucher_usages
     WHERE promotion_id = $1
       AND user_id = $2
       AND status IN ('reserved', 'redeemed')`,
    [promotionId, userId]
  );
  return Number(result.rows[0].count || 0);
};

const findUsageByOrderInTransaction = async (transactionValue, orderId, lock = false) => {
  const client = transactionClient(transactionValue);
  const result = await client.query(
    `SELECT id, promotion_id, user_id, order_id, event_id, organizer_id,
            ticket_quantity, subtotal_amount, discount_amount, total_amount,
            status, created_at, updated_at
     FROM voucher_usages
     WHERE order_id = $1
     LIMIT 1
     ${lock ? 'FOR UPDATE' : ''}`,
    [orderId]
  );
  return result.rows[0] || null;
};

const createUsageInTransaction = async (transactionValue, usage) => {
  const client = transactionClient(transactionValue);
  const updated = await client.query(
    `UPDATE promotions
     SET used_count = used_count + 1,
         used_ticket_count = used_ticket_count + $2
     WHERE id = $1
       AND (usage_limit IS NULL OR used_count < usage_limit)
       AND (
         ticket_usage_limit IS NULL OR
         used_ticket_count + $2 <= ticket_usage_limit
       )
     RETURNING used_count, used_ticket_count`,
    [usage.promotionId, usage.ticketQuantity]
  );
  if (updated.rows.length === 0) return null;

  const inserted = await client.query(
    `INSERT INTO voucher_usages (
       id, promotion_id, user_id, order_id, event_id, organizer_id,
       ticket_quantity, subtotal_amount, discount_amount, total_amount,
       status, created_at, updated_at
     )
     VALUES (
       $1, $2, $3, $4, $5, $6,
       $7, $8, $9, $10,
       'reserved', NOW(), NOW()
     )
     RETURNING *`,
    [
      usage.id,
      usage.promotionId,
      usage.userId,
      usage.orderId,
      usage.eventId,
      usage.organizerId,
      usage.ticketQuantity,
      usage.subtotalAmount,
      usage.discountAmount,
      usage.totalAmount,
    ]
  );
  return inserted.rows[0];
};

const markUsageRedeemedInTransaction = async (transactionValue, orderId) => {
  const client = transactionClient(transactionValue);
  const usage = await findUsageByOrderInTransaction(client, orderId, true);
  if (!usage || usage.status !== 'reserved') return usage;
  const result = await client.query(
    `UPDATE voucher_usages
     SET status = 'redeemed', updated_at = NOW()
     WHERE order_id = $1 AND status = 'reserved'
     RETURNING *`,
    [orderId]
  );
  return result.rows[0] || null;
};

const releaseUsageInTransaction = async (transactionValue, orderId) => {
  const client = transactionClient(transactionValue);
  const usage = await findUsageByOrderInTransaction(client, orderId, true);
  if (!usage || usage.status !== 'reserved') return usage;

  await client.query(
    `UPDATE voucher_usages
     SET status = 'released', updated_at = NOW()
     WHERE id = $1`,
    [usage.id]
  );
  await client.query(
    `UPDATE promotions
     SET used_count = GREATEST(used_count - 1, 0),
         used_ticket_count = GREATEST(used_ticket_count - $2, 0)
     WHERE id = $1`,
    [usage.promotion_id, Number(usage.ticket_quantity || 0)]
  );
  return { ...usage, status: 'released' };
};

const incrementPromotionUsedCountInTransaction = async (transactionValue, promoId) => {
  const client = transactionClient(transactionValue);
  const result = await client.query(
    `UPDATE promotions
     SET used_count = used_count + 1
     WHERE id = $1
       AND (usage_limit IS NULL OR used_count < usage_limit)
     RETURNING used_count`,
    [promoId]
  );
  return result.rows.length > 0;
};

const decrementPromotionUsedCountInTransaction = async (transactionValue, promoId) => {
  const client = transactionClient(transactionValue);
  await client.query(
    'UPDATE promotions SET used_count = GREATEST(used_count - 1, 0) WHERE id = $1',
    [promoId]
  );
};

module.exports = {
  createPromotion,
  createUsageInTransaction,
  decrementPromotionUsedCountInTransaction,
  deletePromotion,
  findByCode,
  findPromoByCodeInTransaction,
  findUsageByOrderInTransaction,
  getActivePromotions,
  getEventById,
  getEventScopeInTransaction,
  getPromotionById,
  getPromotionsByOrganizer,
  getUserActiveUsageCountInTransaction,
  incrementPromotionUsedCountInTransaction,
  markUsageRedeemedInTransaction,
  releaseUsageInTransaction,
  rowToPromotion,
  updatePromotion,
  withTransaction: transaction,
};
