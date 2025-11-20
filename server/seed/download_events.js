// seed/download_events.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // Đọc file .env gốc
const fs = require('fs');
const { db } = require('../config/firebase.config');

const downloadEvents = async () => {
    console.log('Đang kết nối Firestore để tải Events...');

    try {
        const snapshot = await db.collection('Events').get();
        if (snapshot.empty) {
            console.log('Không tìm thấy sự kiện nào.');
            return;
        }

        const events = [];
        snapshot.forEach(doc => {
            events.push(doc.data());
        });

        const outputPath = path.resolve(__dirname, 'events_REAL_from_db.json');
        fs.writeFileSync(outputPath, JSON.stringify(events, null, 2));

        console.log(`✅ Tải thành công ${events.length} sự kiện!`);
        console.log(`Dữ liệu đã được lưu tại: ${outputPath}`);

    } catch (error) {
        console.error('❌ Lỗi khi tải dữ liệu:', error);
    }
};

downloadEvents();