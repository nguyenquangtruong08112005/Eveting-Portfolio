// config/firebase.config.js
const admin = require('firebase-admin');

// Đường dẫn tương đối từ file này đến file key
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

// Export db và auth để các file khác có thể sử dụng
module.exports = { db, auth };
