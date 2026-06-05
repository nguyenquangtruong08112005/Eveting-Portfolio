// scripts/smoke.transactions.js
require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

process.env.TICKET_DATABASE_PROVIDER = 'postgres';
require('../src/alias-bootstrap');
const ticketRepo = require('../src/providers/database/ticket.repository');
const { query } = require('../src/providers/database/postgres.client');

async function testRollback() {
  console.log('--- TEST 1: Intentional Transaction Rollback ---');
  const syntheticTicketId = 'tkt_smoke_test_rollback_12345';
  
  // Cleanup any leftover from previous runs
  await query('DELETE FROM tickets WHERE id = $1', [syntheticTicketId]);

  const ticketData = {
    eventId: 'evt_smoke_test_event',
    userId: 'usr_smoke_test_user',
    organizerId: 'org_smoke_test_org',
    type: 'Standard',
    price: 100,
    originalPrice: 100,
    quantity: 1,
    unitPrice: 100,
    status: 'pending',
    purchaseDate: Date.now()
  };

  let errorCaught = false;

  try {
    await ticketRepo.runTransaction(async (transaction) => {
      console.log('Inserting ticket inside transaction...');
      await ticketRepo.createTicketInTransaction(transaction, syntheticTicketId, ticketData);

      // Verify it exists *inside* the transaction client context
      const ticketInTx = await ticketRepo.getTicketInTransaction(transaction, syntheticTicketId);
      if (ticketInTx) {
        console.log('SUCCESS: Ticket is visible inside transaction context.');
      } else {
        throw new Error('FAIL: Ticket not visible inside transaction.');
      }

      console.log('Throwing intentional error to trigger rollback...');
      throw new Error('Intentional Rollback Error');
    });
  } catch (err) {
    if (err.message === 'Intentional Rollback Error') {
      errorCaught = true;
      console.log('Caught expected error: ' + err.message);
    } else {
      console.error('Unexpected error caught during transaction: ', err);
    }
  }

  // Verify the ticket does NOT exist globally
  const ticketGlobal = await ticketRepo.getTicketById(syntheticTicketId);
  if (!ticketGlobal && errorCaught) {
    console.log('SUCCESS: Ticket does not exist globally. Rollback worked perfectly!');
  } else {
    console.error('FAIL: Rollback test failed. Ticket exists globally or error not caught.');
    process.exit(1);
  }
}

async function testCommit() {
  console.log('\n--- TEST 2: Successful Transaction Commit ---');
  const syntheticTicketId = 'tkt_smoke_test_commit_12345';
  
  // Cleanup any leftover from previous runs
  await query('DELETE FROM tickets WHERE id = $1', [syntheticTicketId]);

  const ticketData = {
    eventId: 'evt_smoke_test_event',
    userId: 'usr_smoke_test_user',
    organizerId: 'org_smoke_test_org',
    type: 'VIP',
    price: 250,
    originalPrice: 250,
    quantity: 1,
    unitPrice: 250,
    status: 'paid',
    purchaseDate: Date.now()
  };

  await ticketRepo.runTransaction(async (transaction) => {
    console.log('Inserting ticket inside transaction...');
    await ticketRepo.createTicketInTransaction(transaction, syntheticTicketId, ticketData);
    console.log('Committing transaction...');
  });

  // Verify the ticket exists globally
  const ticketGlobal = await ticketRepo.getTicketById(syntheticTicketId);
  if (ticketGlobal && ticketGlobal.type === 'VIP') {
    console.log('SUCCESS: Ticket committed successfully and exists globally!');
  } else {
    console.error('FAIL: Ticket not found or data mismatch globally after commit.');
    process.exit(1);
  }

  // Cleanup
  console.log('Cleaning up committed ticket...');
  await query('DELETE FROM tickets WHERE id = $1', [syntheticTicketId]);
  console.log('Cleanup done.');
}

async function run() {
  await testRollback();
  await testCommit();
  console.log('\nAll transaction smoke tests passed successfully!');
}

run().catch(err => {
  console.error('Transaction smoke tests failed:', err);
  process.exit(1);
});
