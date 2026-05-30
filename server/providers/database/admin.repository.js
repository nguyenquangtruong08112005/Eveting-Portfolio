const firebaseAdminRepository = require('./firebase.admin.repository');
const postgresAdminRepository = require('./postgres.admin.repository');

const repositories = {
  firebase: firebaseAdminRepository,
  postgres: postgresAdminRepository,
};

const providerName = process.env.ADMIN_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'firebase';
const activeRepository = repositories[providerName];

if (!activeRepository) {
  throw new Error(`Database provider "${providerName}" is not supported for admin.`);
}

module.exports = activeRepository;
