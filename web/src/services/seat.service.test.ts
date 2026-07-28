import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

assert.equal(
  readFileSync(new URL('./seat.service.ts', import.meta.url), 'utf8').includes(
    '`/api/organizer/events/${encodeURIComponent(eventId)}/seat-layout`'
  ),
  true
);

console.log('seat service endpoint tests passed');
