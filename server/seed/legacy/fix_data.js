const fs = require('fs');
const path = require('path');
const geofire = require('geofire-common');

// Đảm bảo bạn đã cài đặt geofire-common: npm install geofire-common

const fixEventData = () => {
    try {
        // --- 1. Nạp dữ liệu ---
        // (Giả sử các file JSON nằm cùng thư mục với script)
        const eventsPath = path.join(__dirname, 'events_seed.json');
        const venuesPath = path.join(__dirname, 'venues.json');

        const events = JSON.parse(fs.readFileSync(eventsPath, 'utf-8'));
        const venues = JSON.parse(fs.readFileSync(venuesPath, 'utf-8'));

        console.log(`Đã nạp ${events.length} sự kiện và ${venues.length} địa điểm.`);

        // --- 2. Tạo bản đồ tra cứu Venue ---
        const venueMap = new Map();
        for (const venue of venues) {
            venueMap.set(venue.id, venue);
        }

        let updatedCount = 0;
        const fixedEvents = [];

        // --- 3. Lặp qua và sửa sự kiện ---
        for (const event of events) {
            const modifiedEvent = { ...event }; // Tạo bản sao để sửa

            if (modifiedEvent.eventType === 'physical' && modifiedEvent.venueId) {
                const venueData = venueMap.get(modifiedEvent.venueId);

                if (venueData) {
                    // Đây là bước quan trọng: Đồng bộ dữ liệu từ Venue
                    const newLocation = venueData.location;
                    const newCity = venueData.addressDetails.city;
                    const newVenueName = venueData.name;
                    // Tính geohash mới với độ chính xác chuẩn (9)
                    const newGeohash = geofire.geohashForLocation([newLocation.latitude, newLocation.longitude]);

                    // Kiểm tra xem có cần cập nhật không
                    if (JSON.stringify(modifiedEvent.location) !== JSON.stringify(newLocation) ||
                        modifiedEvent.geohash !== newGeohash ||
                        modifiedEvent.city !== newCity ||
                        modifiedEvent.venueName !== newVenueName) {
                        
                        console.log(`-> Sửa ${modifiedEvent.id}:`);
                        console.log(`   Vị trí cũ: ${JSON.stringify(modifiedEvent.location)} -> Mới: ${JSON.stringify(newLocation)}`);
                        console.log(`   Geohash cũ: ${modifiedEvent.geohash} -> Mới: ${newGeohash}`);

                        modifiedEvent.location = newLocation;
                        modifiedEvent.geohash = newGeohash;
                        modifiedEvent.city = newCity;
                        modifiedEvent.venueName = newVenueName;
                        
                        updatedCount++;
                    }
                } else {
                    console.warn(`[CẢNH BÁO] Sự kiện ${modifiedEvent.id} có venueId "${modifiedEvent.venueId}" nhưng không tìm thấy trong venues.json!`);
                }
            } else if (modifiedEvent.eventType === 'online') {
                // Đảm bảo sự kiện online không có vị trí
                modifiedEvent.location = null;
                modifiedEvent.geohash = null;
                modifiedEvent.venueId = null;
                modifiedEvent.venueName = "Online";
                modifiedEvent.city = "Online";
            }
            
            fixedEvents.push(modifiedEvent);
        }

        console.log(`\nHoàn tất! Đã cập nhật ${updatedCount} sự kiện.`);

        // --- 4. Lưu file mới ---
        const outputPath = path.join(__dirname, 'events_FIXED.json');
        fs.writeFileSync(outputPath, JSON.stringify(fixedEvents, null, 2)); // Ghi lại file mới

        console.log(`Đã lưu dữ liệu đã sửa vào file: ${outputPath}`);
        console.log("Bây giờ bạn có thể dùng file 'events_FIXED.json' để seed lại database.");

    } catch (error) {
        console.error("Đã xảy ra lỗi:", error);
    }
};

// Chạy script
fixEventData();