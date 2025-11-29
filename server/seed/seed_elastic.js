// seed/seed_elastic.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // Đọc file .env gốc

const { db } = require('../config/firebase.config');
const esClient = require('../config/elasticsearch.config');

const ELASTIC_INDEX = 'events';

/**
 * Lọc và CHUẨN HÓA dữ liệu (ASYNC).
 * (Hàm này đã đúng, giữ nguyên)
 */
const buildSearchData = async (eventData) => {
    if (!eventData) {
        return null;
    }

    // --- LẤY TÊN NGHỆ SĨ ---
    let featuredProfileNames = [];
    if (eventData.featuredProfileIds && eventData.featuredProfileIds.length > 0) {
        try {
            const profilesSnapshot = await db.collection("FeaturedProfiles")
                .where("id", "in", eventData.featuredProfileIds)
                .get();
            featuredProfileNames = profilesSnapshot.docs.map((doc) => doc.data().name);
        } catch (error) {
            console.error(`Lỗi khi lấy featuredProfileNames cho event ${eventData.id}:`, error);
        }
    }
    // --- KẾT THÚC ---

    const data = {
        name: eventData.name || null,
        description: eventData.description || null,
        tags: eventData.tags || [],
        city: eventData.city || null,
        category: eventData.category || [],
        minPrice: eventData.minPrice !== undefined ? eventData.minPrice : null,
        date: eventData.date || null,
        featuredProfileIds: eventData.featuredProfileIds || [],
        featuredProfileNames: featuredProfileNames,
        status: eventData.status || null,
        visibility: eventData.visibility || null,
        imageUrl: eventData.imageUrl || null,
        bannerUrl: eventData.bannerUrl || null,
        videoUrl: eventData.videoUrl || null,
        location: eventData.location || null,
        venueName: eventData.venueName || null,
        eventType: eventData.eventType || null,
    };

    Object.keys(data).forEach(key => {
        if (data[key] === undefined) {
            data[key] = null;
        }
    });

    return data;
};

// --- HÀM MỚI: XÓA INDEX CŨ ---
/**
 * Xóa index cũ trong Elasticsearch để làm sạch trước khi seed.
 */
const deleteIndexIfExists = async () => {
    console.log(`Đang kiểm tra và xóa index cũ (nếu có): '${ELASTIC_INDEX}'...`);
    try {
        const exists = await esClient.indices.exists({ index: ELASTIC_INDEX });

        if (exists) {
            await esClient.indices.delete({ index: ELASTIC_INDEX });
            console.log(`Đã xóa index cũ '${ELASTIC_INDEX}'.`);
        } else {
            console.log(`Index '${ELASTIC_INDEX}' không tồn tại, bỏ qua.`);
        }
    } catch (e) {
        if (e.meta && e.meta.statusCode === 404) {
            console.log(`Index '${ELASTIC_INDEX}' không tồn tại (lỗi 404), bỏ qua.`);
        } else {
            console.error(`Lỗi khi xóa index:`, e);
            throw e;
        }
    }
};

/**
 * Đọc tất cả sự kiện từ Firestore và đẩy vào Elasticsearch
 */
const migrateEventsToElastic = async () => {
    if (!esClient) {
        console.error('❌ Lỗi: Elasticsearch client chưa được cấu hình. Hãy kiểm tra .env và đảm bảo Docker đang chạy.');
        return;
    }

    console.log('🚀 Bắt đầu đồng bộ Firestore -> Elasticsearch...');

    try {
        // 1. XÓA DỮ LIỆU CŨ
        await deleteIndexIfExists();

        // 2. ĐỌC DỮ LIỆU MỚI TỪ FIRESTORE
        console.log('Đang đọc dữ liệu từ Firestore...');
        const snapshot = await db.collection('Events')
            .where('status', '==', 'active')
            .where('visibility', '!=', 'private')
            .get();

        if (snapshot.empty) {
            console.log('Không tìm thấy sự kiện (active/public) nào trong Firestore.');
            return;
        }

        console.log(`Tìm thấy ${snapshot.size} sự kiện. Đang chuẩn bị dữ liệu (async)...`);

        // 3. CHUẨN BỊ DATASOURCE (DỮ LIỆU THÔ)
        // Dùng Promise.all vì buildSearchData giờ là async
        const datasource = await Promise.all(snapshot.docs.map(async (doc) => {
            const eventData = doc.data();
            const searchData = await buildSearchData(eventData);
            if (!searchData) return null;

            // Chuẩn bị dữ liệu thô: Gồm ID và Body
            return {
                id: doc.id,
                body: searchData
            };
        }));

        const validDatasource = datasource.filter(Boolean); // Lọc bỏ các document bị null

        if (validDatasource.length === 0) {
            console.log('Không có dữ liệu hợp lệ để đẩy lên Elastic.');
            return;
        }

        console.log('Đang đẩy dữ liệu lên Elasticsearch...');

        // 4. CẤU HÌNH BULK HELPER (ĐÃ SỬA)
        const bulkResponse = await esClient.helpers.bulk({
            datasource: validDatasource, // <--- Nguồn dữ liệu thô

            // onDocument SẼ BIẾN ĐỔI DỮ LIỆU THÔ THÀNH [ACTION, BODY]
            onDocument(doc) {
                const { id, body } = doc;
                return [
                    // Hành động (Action)
                    { index: { _index: ELASTIC_INDEX, _id: id } },
                    // Dữ liệu (Body)
                    body
                ];
            },
            onDrop(doc) {
                console.warn(`Rớt (drop) document: ${doc.id}`, doc.error);
            }
        });
        // --- KẾT THÚC SỬA LỖI ---

        console.log('✅ HOÀN TẤT ĐỒNG BỘ!');
        console.log(`- Đã xử lý thành công: ${bulkResponse.successful}`);
        console.log(`- Bị lỗi: ${bulkResponse.failed}`);

    } catch (error) {
        console.error('❌ Lỗi nghiêm trọng trong quá trình đồng bộ:', error);
    }
};

migrateEventsToElastic();