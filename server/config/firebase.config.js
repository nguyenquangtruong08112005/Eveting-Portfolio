// config/firebase.config.js
const admin = require('firebase-admin');

// Đường dẫn tương đối từ file này đến file key
const serviceAccount = require('../serviceAccountKey.json');

// Khởi tạo Admin SDK (Chỉ chạy 1 lần)
if (!admin.apps.length) { // Bảo vệ khỏi việc khởi tạo nhiều lần
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
        // Nếu bạn dùng Storage, thêm storageBucket: "your-bucket-url"
    });
}

const db = admin.firestore();
const auth = admin.auth();
const FieldValue = admin.firestore.FieldValue;

// Export TẤT CẢ các thành phần cần thiết, bao gồm cả 'admin' object.
module.exports = { 
    admin, 
    db, 
    auth, 
    FieldValue 
};