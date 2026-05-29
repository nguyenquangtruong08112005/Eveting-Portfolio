const firebaseAdminRepository = require('./firebase.admin.repository');
const repositories = { firebase: firebaseAdminRepository };
const providerName = process.env.DATABASE_PROVIDER || 'firebase';
const activeRepository = repositories[providerName];
if (!activeRepository) {
  throw new Error(`Database provider "${providerName}" is not supported for admin.`);
}
module.exports = activeRepository;
