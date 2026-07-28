import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCheckoutPayload, validateCheckoutQuestions } from './commerce.contract.ts';

const questions = [
  { id: 'eq_text', questionText: 'Name', questionType: 'text' as const, isRequired: true, options: [] },
  { id: 'eq_single', questionText: 'Size', questionType: 'single_choice' as const, isRequired: true, options: ['S', 'M'] },
  { id: 'eq_multi', questionText: 'Days', questionType: 'multi_choice' as const, isRequired: true, options: ['Fri', 'Sat'] },
];

assert.deepEqual(
  buildCheckoutPayload({
    eventId: 'evt_1',
    items: [{ ticketType: 'standard', quantity: 1 }, { ticketType: 'vip', quantity: 2 }],
    promoCode: 'ONECODE',
    attendees: [{ name: 'Buyer', email: 'buyer@example.com', answers: { eq_text: 'Buyer' } }],
  }).items,
  [{ ticketType: 'standard', quantity: 1 }, { ticketType: 'vip', quantity: 2 }]
);
assert.deepEqual(
  buildCheckoutPayload({
    eventId: 'evt_seated',
    items: [{ ticketType: 'vip', quantity: 2 }],
    attendees: [{ name: 'Buyer', email: 'buyer@example.com', answers: {} }],
    seatHold: { performanceId: 'perf_1', holdToken: 'hold_1', seatIds: ['seat_1', 'seat_2'] },
  }).seatHold,
  { performanceId: 'perf_1', holdToken: 'hold_1', seatIds: ['seat_1', 'seat_2'] }
);
assert.equal(validateCheckoutQuestions(questions, { eq_text: 'Buyer', eq_single: 'M', eq_multi: ['Fri'] }), null);
assert.equal(validateCheckoutQuestions(questions, { eq_text: '', eq_single: 'M', eq_multi: ['Fri'] }), 'eq_text');
assert.equal(validateCheckoutQuestions(questions, { eq_text: 'Buyer', eq_single: 'L', eq_multi: ['Fri'] }), 'eq_single');

const commerceAdapterSource = readFileSync(new URL('./commerce.ts', import.meta.url), 'utf8');
assert.match(commerceAdapterSource, /const ORDER_CHECKOUT_PATH = '\/api\/web\/orders\/checkout';/);
assert.match(commerceAdapterSource, /`\/api\/web\/orders\/\$\{encodeURIComponent\(orderId\)\}\/attendees`/);
assert.match(commerceAdapterSource, /body: \{ eventId, attendees \}/);
assert.match(commerceAdapterSource, /'\/api\/web\/payments\/create-order'/);

console.log('checkout commerce tests passed');
