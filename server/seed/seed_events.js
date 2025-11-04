const { db } = require('../config/firebase.config');

// --- HÀM XÓA COLLECTION ---
/**
 * Xóa một collection bằng cách xóa các document theo batch.
 * @param {string} collectionName - Tên collection cần xóa.
 * @param {number} batchSize - Số lượng document xóa mỗi lần.
 */
async function deleteCollection(collectionName, batchSize = 499) {
    console.log(`🗑️ Bắt đầu xóa collection: ${collectionName}...`);
    const collectionRef = db.collection(collectionName);
    // Sắp xếp theo __name__ (document ID) để dùng làm con trỏ
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(query, batchSize, resolve, reject);
    });
}

/**
 * Hàm đệ quy để xóa các batch document.
 */
async function deleteQueryBatch(query, batchSize, resolve, reject) {
    try {
        const snapshot = await query.get();

        // Khi không còn document nào, kết thúc
        if (snapshot.size === 0) {
            console.log(`✅ Xóa thành công collection.`);
            return resolve();
        }

        // Xóa các document trong batch hiện tại
        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        // Lấy document cuối cùng để làm điểm bắt đầu cho batch tiếp theo
        const lastVisible = snapshot.docs[snapshot.docs.length - 1];

        // Đệ quy cho batch tiếp theo
        const nextQuery = query.startAfter(lastVisible).limit(batchSize);
        deleteQueryBatch(nextQuery, batchSize, resolve, reject);

    } catch (error) {
        console.error("Lỗi khi đang xóa batch:", error);
        return reject(error);
    }
}


// --- HÀM NẠP DỮ LIỆU (Giữ nguyên) ---
/**
 * Hàm chung để nạp dữ liệu cho một collection bất kỳ
 * @param {string} collectionName - Tên của collection trên Firestore
 * @param {string} dataPath - Đường dẫn đến file JSON chứa dữ liệu
 */
const importCollection = async (collectionName, dataPath) => {
    console.log(`🔥 Bắt đầu nạp dữ liệu cho collection: ${collectionName}...`);

    let data;
    try {
        // Xóa cache của require để luôn đọc file mới nhất
        delete require.cache[require.resolve(dataPath)]; 
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
        if (!docData.id) {
            console.warn(`- Cảnh báo: Document trong ${collectionName} không có trường 'id', sẽ bỏ qua.`);
            continue;
        }
        const docRef = collectionRef.doc(docData.id);
        batch.set(docRef, docData);
        counter++;

        if (counter % 499 === 0) {
            await batch.commit();
            console.log(`- Đã nạp ${counter} documents...`);
            batch = db.batch();
        }
    }

    if (counter % 499 !== 0) {
        await batch.commit();
    }

    console.log(`✅ Nạp thành công tổng cộng ${counter} documents cho collection ${collectionName}!`);
};

// --- HÀM CHÍNH ĐÃ CHỈNH SỬA ---
/**
 * Hàm chính để xóa và nạp lại collection 'Events'
 */
const resetEventCollection = async () => {
    const COLLECTION_NAME = 'Events';
    // Lấy đường dẫn từ file config gốc của bạn
    const DATA_PATH = './events_seed.json'; 

    console.log(`🚀 BẮT ĐẦU QUÁ TRÌNH RESET COLLECTION: ${COLLECTION_NAME}...`);

    // Bước 1: Xóa tất cả document trong collection 'Events'
    await deleteCollection(COLLECTION_NAME);

    // Bước 2: Nạp lại dữ liệu cho 'Events' từ file JSON
    await importCollection(COLLECTION_NAME, DATA_PATH);

    console.log(`🎉 HOÀN TẤT RESET COLLECTION: ${COLLECTION_NAME}!`);
};

// Chạy hàm chính
resetEventCollection().catch(error => {
    console.error('❌ Lỗi nghiêm trọng trong quá trình reset:', error);
});