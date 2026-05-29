const firebaseReviewRepository = require('./firebase.review.repository');
const postgresReviewRepository = require('./postgres.review.repository');

const repositories = {
    firebase: firebaseReviewRepository,
    postgres: postgresReviewRepository,
};

const providerName = process.env.REVIEW_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'firebase';
const activeRepository = repositories[providerName];

if (!activeRepository) {
    throw new Error(`Database provider "${providerName}" is not supported for reviews.`);
}

module.exports = activeRepository;
