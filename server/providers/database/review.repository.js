const providerName = process.env.REVIEW_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'firebase';

let activeRepository;
if (providerName === 'postgres') {
    activeRepository = require('./postgres.review.repository');
} else if (providerName === 'firebase') {
    activeRepository = require('./firebase.review.repository');
} else {
    throw new Error(`Database provider "${providerName}" is not supported for reviews.`);
}

module.exports = activeRepository;
