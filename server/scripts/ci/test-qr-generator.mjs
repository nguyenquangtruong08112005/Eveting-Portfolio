/**
 * Tests the shipped qr.generator.js entry point (real module).
 */
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const qr = require(path.join(__dirname, '../src/utils/qr.generator.js'));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const code = qr.generateTicketCode('ticket-abc');
assert(typeof code === 'string' && code.length === 16, 'ticket code length');
assert(code === qr.generateTicketCode('ticket-abc'), 'ticket code deterministic');
assert(code !== qr.generateTicketCode('ticket-xyz'), 'ticket code differs per id');

const content = qr.generateQrContent({ a: 1 });
assert(content === '{"a":1}', 'json content');

const payload = qr.buildTicketQrPayload({ ticketId: 't1', eventId: 'e1', token: 'tok' });
assert(payload.ticketId === 't1', 'payload ticketId');
assert(payload.eventId === 'e1', 'payload eventId');
assert(payload.token === 'tok', 'payload token');
assert(payload.code === qr.generateTicketCode('t1'), 'payload code matches');

let threw = false;
try {
  qr.generateTicketCode('');
} catch {
  threw = true;
}
assert(threw, 'empty ticketId throws');

console.log('qr.generator: all assertions passed');
