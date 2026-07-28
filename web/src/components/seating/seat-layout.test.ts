import assert from 'node:assert/strict';
import {
  countLayoutSeats,
  createSeatSection,
  resizeLayoutSection,
  resizeSection,
  validateSeatLayout,
} from './seat-layout.ts';

const section = createSeatSection(0);
assert.equal(countLayoutSeats({ version: 1, sections: [section] }), 50);

section.rows[0].seats[0].blocked = true;
section.rows[0].seats[0].label = 'VIP-1';
const resized = resizeSection(section, 6, 12);
assert.equal(resized.rows[0].seats[0].blocked, true);
assert.equal(resized.rows[0].seats[0].label, 'VIP-1');
assert.equal(resized.rows.length, 6);
assert.equal(resized.rows[0].seats.length, 12);

const valid = validateSeatLayout({ version: 1, sections: [resized] });
assert.deepEqual(valid.errors, []);

const oversized = resizeSection(createSeatSection(1), 25, 21);
const overLimit = validateSeatLayout({ version: 1, sections: [oversized] });
assert.equal(overLimit.seatCount, 525);
assert.ok(overLimit.errors.includes('LAYOUT_SEAT_LIMIT_EXCEEDED'));

const protectedLayout = { version: 1 as const, sections: [createSeatSection(3)] };
assert.equal(
  resizeLayoutSection(protectedLayout, protectedLayout.sections[0].id, 25, 21),
  null,
  'resizing a section cannot create more than 500 seats'
);
assert.equal(countLayoutSeats(protectedLayout), 50, 'rejected resize preserves the current layout');

const duplicateLabels = resizeSection(createSeatSection(2), 1, 2);
duplicateLabels.rows[0].seats[1].label = duplicateLabels.rows[0].seats[0].label;
assert.ok(
  validateSeatLayout({ version: 1, sections: [duplicateLabels] }).errors.includes(
    'LAYOUT_SEAT_LABEL_INVALID'
  )
);

console.log('seat layout tests passed');
