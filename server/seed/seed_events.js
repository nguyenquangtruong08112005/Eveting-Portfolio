const { db } = require('../config/firebase.config');

// --- CẤU HÌNH ---
// Liệt kê tất cả các collection và đường dẫn đến file JSON tương ứng.
// Hãy đảm bảo tên collection (ví dụ: 'Users') khớp chính xác với tên trên Firestore.
const collectionsToSeed = [
    { name: 'Users', path: './users_seed.json' /* TODO: Điền đường dẫn file Users.json */ },
    { name: 'FeaturedProfiles', path: './featured_profiles.json' /* TODO: Điền đường dẫn file FeaturedProfiles.json */ },
    { name: 'Venues', path: './venues.json' /* TODO: Điền đường dẫn file Venues.json */ },
    { name: 'Events', path: './events_seed.json' /* TODO: Điền đường dẫn file Events.json */ },
    { name: 'Tickets', path: './tickets.json' /* TODO: Điền đường dẫn file Tickets.json */ },
    { name: 'Reviews', path: './reviews.json' /* TODO: Điền đường dẫn file Reviews.json */ },
    { name: 'Promotions', path: './promotions.json' /* TODO: Điền đường dẫn file Promotions.json */ },
    { name: 'Notifications', path: './notifications.json' /* TODO: Điền đường dẫn file Notifications.json */ },
    { name: 'Collaborators', path: './collaborators.json' /* TODO: Điền đường dẫn file Collaborators.json */ },
    { name: 'Analytics', path: './analytics.json' /* TODO: Điền đường dẫn file Analytics.json */ },
];

/**
 * Hàm chung để nạp dữ liệu cho một collection bất kỳ
 * @param {string} collectionName - Tên của collection trên Firestore
 * @param {string} dataPath - Đường dẫn đến file JSON chứa dữ liệu
 */
const importCollection = async (collectionName, dataPath) => {
    console.log(`🔥 Bắt đầu nạp dữ liệu cho collection: ${collectionName}...`);

    let data;
    try {
        data = require(dataPath);
    } catch (error) {
        console.error(`❌ Lỗi: Không thể đọc file dữ liệu tại '${dataPath}'. Vui lòng kiểm tra lại đường dẫn.`);
        return;
    }

    if (!Array.isArray(data) || data.length === 0) {
        console.log(`- Không có dữ liệu để nạp cho ${collectionName}.`);
        return;
    }

    const collectionRef = db.collection(collectionName);
    let batch = db.batch();
    let counter = 0;

    for (const docData of data) {
        // Dùng ID có sẵn trong file JSON làm document ID
        if (!docData.id) {
            console.warn(`- Cảnh báo: Document trong ${collectionName} không có trường 'id', sẽ bỏ qua.`);
            continue;
        }
        const docRef = collectionRef.doc(docData.id);
        batch.set(docRef, docData);
        counter++;

        // Firestore batch có giới hạn 500 thao tác, commit sớm hơn để an toàn
        if (counter % 499 === 0) {
            await batch.commit();
            console.log(`- Đã nạp ${counter} documents...`);
            batch = db.batch();
        }
    }

    // Commit phần còn lại
    if (counter % 499 !== 0) {
        await batch.commit();
    }

    console.log(`✅ Nạp thành công tổng cộng ${counter} documents cho collection ${collectionName}!`);
};

/**
 * Hàm chính để chạy toàn bộ quá trình seed
 */
const seedDatabase = async () => {
    console.log('🚀 BẮT ĐẦU QUÁ TRÌNH NẠP TOÀN BỘ DATABASE...');
    for (const collection of collectionsToSeed) {
        if (collection.path) {
            await importCollection(collection.name, collection.path);
        } else {
            console.warn(`- Bỏ qua collection '${collection.name}' do chưa có đường dẫn file JSON.`);
        }
    }
    console.log('🎉 HOÀN TẤT NẠP DỮ LIỆU TOÀN BỘ DATABASE!');
};

seedDatabase().catch(error => {
  console.error('❌ Lỗi nghiêm trọng trong quá trình nạp dữ liệu:', error);
});