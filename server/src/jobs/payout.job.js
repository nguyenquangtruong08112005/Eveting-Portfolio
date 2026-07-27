require('../alias-bootstrap');
const cron = require('node-cron');
const logger = require('@/shared/logger');
const payoutRepository = require('@/providers/database/payout.repository');
const payoutService = require('@/modules/payments/application/payout.service');
const { submitPayout, getTransferStatus } = require('@/modules/payments/infrastructure/simulated-payout.provider');

const SCHEDULE_TZ = 'Asia/Ho_Chi_Minh';
const BATCH_SCHEDULE = '0 0 * * 0';
const RECONCILE_SCHEDULE = '*/5 * * * *';

/**
 * Auto-batch: discover and process eligible organizers.
 * Logs only aggregate counters — no PII.
 */
async function runBatch() {
    logger.info('[payout-batch] Starting scheduled batch');

    const organizerIds = await payoutRepository.getEligibleOrganizers();
    logger.info(`[payout-batch] Found ${organizerIds.length} organizers with eligible ledger entries`);

    let submitted = 0;
    let skipped = 0;
    let errors = 0;

    for (const organizerId of organizerIds) {
        try {
            const result = await payoutService.requestPayout(organizerId);
            if (result.payout.status === 'pending_admin_approval') {
                skipped++;
            } else {
                submitted++;
            }
        } catch (_) {
            errors++;
        }
    }

    logger.info(`[payout-batch] Complete: ${submitted} submitted, ${skipped} admin-approval, ${errors} errors`);
    return { submitted, skipped, errors };
}

/**
 * Claim a single pending_provider_submission payout exclusively.
 *
 * Phase 1 (DB transaction): lock the row and transition
 *   pending_provider_submission → submitting.
 *   Only one reconciler wins; concurrent calls see the new status and skip.
 *
 * Phase 2 (post-commit): submit to simulated provider.
 *   - On success: transition submitting → processing with provider reference.
 *   - On failure: transition submitting → failed with safe message.
 *
 * If the process dies during Phase 2 the payout remains submitting;
 * operational/manual retry is required (portfolio scope, no real payment).
 */
async function claimAndSubmit(payout) {
    // Phase 1 — exclusive claim
    const claimed = await payoutRepository.runTransaction(async (tx) => {
        return payoutRepository.lockAndUpdatePayout(
            payout.id, 'pending_provider_submission', 'submitting', {}, tx
        );
    });
    if (!claimed) return false;

    // Phase 2 — provider dispatch (outside DB transaction)
    try {
        const providerResult = await submitPayout(payout.organizerId, payout.amount);
        await payoutRepository.updatePayoutStatus(payout.id, 'processing', {
            providerReference: providerResult.providerReference,
            providerMessage: providerResult.providerMessage,
        });
    } catch (_) {
        await payoutRepository.updatePayoutStatus(payout.id, 'failed', {
            providerMessage: 'Payout submission failed',
        });
    }
    return true;
}

/**
 * Reconciliation: snapshot processing payouts BEFORE pending recovery,
 * recover pending submissions, then reconcile only the initial snapshot.
 * A just-claimed payout (processing) is not reconciled until the next run.
 */
async function runReconciliation() {
    logger.info('[payout-reconcile] Starting reconciliation');

    // Snapshot processing payouts before recovery
    const initialProcessing = await payoutRepository.getProcessingPayouts();

    // Phase 1 — recover stranded pending_provider_submission only
    const pending = await payoutRepository.getPendingProviderSubmissionPayouts();
    let recovered = 0;
    for (const payout of pending) {
        try {
            const ok = await claimAndSubmit(payout);
            if (ok) recovered++;
        } catch (_) {
            // aggregate count only
        }
    }
    if (recovered > 0) {
        logger.info(`[payout-reconcile] Recovered ${recovered} pending submissions`);
    }

    // Phase 2 — reconcile only the pre-recovery snapshot
    let completed = 0;
    let failed = 0;

    for (const payout of initialProcessing) {
        let providerResult;
        try {
            providerResult = await getTransferStatus(payout.providerReference);
        } catch (_) {
            continue;
        }

        if (providerResult.status === 'COMPLETED') {
            const ok = await payoutRepository.runTransaction(async (tx) => {
                return payoutRepository.lockAndUpdatePayout(
                    payout.id, 'processing', 'completed',
                    { completedAt: new Date(), providerMessage: providerResult.providerMessage },
                    tx
                );
            });
            if (ok) completed++;
        } else if (providerResult.status === 'FAILED') {
            const ok = await payoutRepository.runTransaction(async (tx) => {
                return payoutRepository.lockAndUpdatePayout(
                    payout.id, 'processing', 'failed',
                    { providerMessage: providerResult.providerMessage },
                    tx
                );
            });
            if (ok) failed++;
        }
    }

    logger.info(`[payout-reconcile] Complete: ${completed} completed, ${failed} failed`);
    return { recovered, completed, failed };
}

function startPayoutCron() {
    const enabled = process.env.PAYOUT_WORKERS_ENABLED !== 'false';

    if (!enabled) {
        logger.info('[payout] PAYOUT_WORKERS_ENABLED=false, cron disabled');
        return;
    }

    logger.info('[payout] Scheduling batch cron (Sunday 00:00 Asia/Ho_Chi_Minh)');
    cron.schedule(BATCH_SCHEDULE, () => {
        runBatch().catch(() => logger.error('[payout-batch] Cron run failed'));
    }, { scheduled: true, timezone: SCHEDULE_TZ });

    logger.info('[payout] Scheduling reconcile cron (every 5 minutes)');
    cron.schedule(RECONCILE_SCHEDULE, () => {
        runReconciliation().catch(() => logger.error('[payout-reconcile] Cron run failed'));
    }, { scheduled: true, timezone: SCHEDULE_TZ });

    logger.info('[payout] Cron scheduled');
}

if (require.main === module) {
    const task = process.argv.includes('--batch') ? 'batch'
        : process.argv.includes('--reconcile') ? 'reconcile'
        : null;

    if (task === 'batch') {
        runBatch().then(() => process.exit(0)).catch(() => { logger.error('[payout-batch] Fatal'); process.exit(1); });
    } else if (task === 'reconcile') {
        runReconciliation().then(() => process.exit(0)).catch(() => { logger.error('[payout-reconcile] Fatal'); process.exit(1); });
    } else {
        console.error('Usage: node src/jobs/payout.job.js --batch|--reconcile');
        process.exit(1);
    }
}

module.exports = { runBatch, runReconciliation, startPayoutCron };
