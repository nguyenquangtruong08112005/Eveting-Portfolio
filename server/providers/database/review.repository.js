const firebaseReviewRepository = require('./firebase.review.repository');

const repositories = {
    firebase: firebaseReviewRepository,
};

const providerName = process.env.DATABASE_PROVIDER || 'firebase';
const activeRepository = repositories[providerName];

if (!activeRepository) {
    throw new Error(`Database provider "${providerName}" is not supported for reviews.`);
}

module.exports = activeRepository;
