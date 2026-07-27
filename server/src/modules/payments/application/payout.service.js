const crypto = require('crypto');
const payoutRepository = require('@/providers/database/payout.repository');
const { verifyBankAccount } = require('@/modules/payments/infrastructure/bank-verify.adapter');
const { submitPayout } = require('@/modules/payments/infrastructure/simulated-payout.provider');
const payoutKey = require('@/modules/payments/infrastructure/config/payout.config');
const { BadRequestError, ConflictError } = require('@/shared/errors');

const MIN_PAYOUT_AMOUNT = 100000;
const HIGH_TOUCH_THRESHOLD = 10000000;
const ELIGIBILITY_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function encrypt(payload, key) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function makeFingerprint(key, ...parts) {
    const data = parts.join('|');
    return crypto.createHmac('sha256', key).update(data).digest('hex');
}

function maskAccountNumber(accountNumber) {
    const s = accountNumber.replace(/\s+/g, '');
    if (s.length <= 4) return `****${s}`;
    return `****${s.slice(-4)}`;
}

async function registerBankAccount(organizerId, accountNumber, accountHolder, bankName) {
    const encKey = payoutKey.getEncryptionKey();

    const valid = await verifyBankAccount(accountNumber, accountHolder, bankName);
    if (!valid) {
        throw new BadRequestError('Bank account verification failed');
    }

    const payload = { accountNumber, accountHolder };
    const encryptedPayload = encrypt(payload, encKey);
    const maskedDisplay = `${bankName} - ${maskAccountNumber(accountNumber)}`;
    const fp = makeFingerprint(encKey, organizerId, accountNumber, bankName);

    await payoutRepository.upsertBankAccount(organizerId, encryptedPayload, maskedDisplay, fp);
    return { organizerId, maskedDisplay };
}

async function requestPayout(organizerId) {
    const cutoff = new Date(Date.now() - ELIGIBILITY_DAYS_MS);
    const encKey = payoutKey.getEncryptionKey();
    const { v4: uuidv4 } = require('uuid');
    const payoutId = `payout_${uuidv4()}`;

    let payout, providerResult;
    const rawData = {};

    try {
        await payoutRepository.runTransaction(async (tx) => {
            const bankAccount = await payoutRepository.getBankAccount(organizerId, tx);
            if (!bankAccount) {
                throw new BadRequestError('No bank account registered.');
            }

            const previousCount = await payoutRepository.getPreviousPayoutsCount(organizerId, tx);
            const isFirstPayout = previousCount === 0;

            const entries = await payoutRepository.getEligibleLedgerEntries(organizerId, cutoff, tx);
            if (entries.length === 0) {
                throw new BadRequestError('No eligible ledger entries for payout.');
            }

            const totalNet = entries.reduce((sum, e) => sum + e.netAmount, 0);
            if (totalNet < MIN_PAYOUT_AMOUNT) {
                throw new BadRequestError(
                    `Minimum payout amount is ${MIN_PAYOUT_AMOUNT}. Locked total: ${totalNet}`
                );
            }

            const needsAdminApproval = isFirstPayout || totalNet >= HIGH_TOUCH_THRESHOLD;
            const fp = makeFingerprint(encKey, organizerId, totalNet.toString(), Date.now().toString());
            rawData.isFirstPayout = isFirstPayout;
            rawData.requiresAdminApproval = needsAdminApproval;

            await payoutRepository.createPayout({
                id: payoutId,
                organizerId,
                amount: totalNet,
                status: needsAdminApproval ? 'pending_admin_approval' : 'pending_provider_submission',
                keyedFingerprint: fp,
                providerReference: null,
                providerMessage: null,
                rawData,
            }, tx);

            for (const entry of entries) {
                await payoutRepository.createPayoutItem({
                    id: `pi_${uuidv4()}`,
                    payoutId,
                    ledgerEntryId: entry.id,
                    amount: entry.netAmount,
                }, tx);
            }
        });

        // Post-transaction: dispatch to provider outside the DB transaction
        payout = await payoutRepository.getPayoutById(payoutId);

        if (payout.status === 'pending_provider_submission') {
            providerResult = await submitPayout(organizerId, payout.amount);
            await payoutRepository.updatePayoutStatus(payoutId, 'processing', {
                providerReference: providerResult.providerReference,
                providerMessage: providerResult.providerMessage,
            });
            payout = await payoutRepository.getPayoutById(payoutId);
        }

        return { payout, providerResult };
    } catch (err) {
        if (err.code === '23505') {
            if (err.constraint === 'idx_payouts_fingerprint') {
                throw new ConflictError('Duplicate payout submission detected.');
            }
            if (err.constraint === 'idx_payout_items_ledger_entry') {
                throw new ConflictError('A ledger entry has already been allocated to a payout.');
            }
        }
        throw err;
    }
}

async function adminApprovePayout(payoutId, reason) {
    const safeReason = (reason && typeof reason === 'string') ? reason.trim() : null;
    let payout;

    await payoutRepository.runTransaction(async (tx) => {
        const locked = await payoutRepository.lockPayoutById(payoutId, tx);
        if (!locked) throw new BadRequestError('Payout not found.');
        if (locked.status !== 'pending_admin_approval') {
            throw new ConflictError(
                `Payout is in '${locked.status}' state; only pending_admin_approval can be approved.`
            );
        }

        await payoutRepository.updatePayoutStatus(payoutId, 'pending_provider_submission', {
            adminApprovalReason: safeReason,
        }, tx);
    });

    // Post-transaction dispatch — compare-and-set via status check prevents double-submit
    payout = await payoutRepository.getPayoutById(payoutId);
    if (payout.status !== 'pending_provider_submission') {
        throw new ConflictError(`Payout state changed to '${payout.status}' before provider dispatch.`);
    }

    const providerResult = await submitPayout(payout.organizerId, payout.amount);
    await payoutRepository.updatePayoutStatus(payoutId, 'processing', {
        providerReference: providerResult.providerReference,
        providerMessage: providerResult.providerMessage,
    });
    return payoutRepository.getPayoutById(payoutId);
}

module.exports = {
    registerBankAccount,
    requestPayout,
    adminApprovePayout,
};
