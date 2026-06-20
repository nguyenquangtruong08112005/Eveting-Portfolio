# Báo cáo Rà soát Mã nguồn - Dự án Eventing

Báo cáo này tập hợp các phát hiện về **Code Smell**, **Anti-pattern**, **Bug tiềm ẩn**, **God classes**, và các **file quá lớn** trên toàn bộ hệ thống Eventing (bao gồm Backend Server, Web Portal, và hai ứng dụng di động Android).

---

## 1. Bản đồ các file lớn nhất hệ thống (Line Count Analysis)

Dưới đây là thống kê tự động các file có kích thước dòng lệnh lớn nhất trong từng dự án, là những đối tượng cần ưu tiên tái cấu trúc (Refactoring):

### A. Backend (`Server-2025-Eventing`)
1. **`src/modules/tickets/application/service.js`** - **613 dòng** (24 KB): Chứa toàn bộ nghiệp vụ đặt vé, xác nhận thanh toán, giữ chỗ ngồi, đồng bộ đơn hàng và gửi thông báo.
2. **`src/providers/database/postgres.order.repository.js`** - **566 dòng** (19.7 KB): Lớp truy cập dữ liệu đa thực thể (Orders, Items, Payments, Ledgers, Settings).
3. **`src/providers/database/postgres.event.repository.js`** - **538 dòng** (19.8 KB): Ánh xạ phức tạp giữa DB Postgres và JSON DTO cho Mobile.
4. **`src/providers/database/postgres.user.repository.js`** - **496 dòng** (17.2 KB): Lớp Repository lớn tích hợp nhiều nghiệp vụ định danh và trang cá nhân.
5. **`src/modules/auth/application/service.js`** - **416 dòng** (14.5 KB): Tích hợp đăng nhập truyền thống, đăng nhập mạng xã hội (Google, Facebook) và xác thực email.
6. **`src/modules/events/application/service.js`** - **393 dòng** (16.5 KB): Nghiệp vụ quản lý sự kiện và tích hợp tìm kiếm Elasticsearch.

### B. Web Portal (`web-2025-eventing`)
1. **`src/app/page.tsx`** - **787 dòng** (37.8 KB): Trang chủ hiển thị đa phần (Hero, Stars, Trending, Specials, Category Rows).
2. **`src/app/checkout/page.tsx`** - **477 dòng** (21.2 KB): Xử lý toàn bộ form thanh toán, mã giảm giá và chuyển hướng cổng thanh toán.
3. **`src/app/attendee/events/[id]/page.tsx`** - **470 dòng** (19.1 KB): Trang chi tiết sự kiện và tích hợp widget thời tiết/bản đồ.

### C. Mobile Consumer (`Mobile-2025-Eventing`)
1. **`HomeScreen.kt`** - **1005 dòng** (39.2 KB): Màn hình chính chứa toàn bộ các khối Compose hiển thị và điều hướng.
2. **`EventDetailsScreen.kt`** - **735 dòng** (28.4 KB): Chi tiết sự kiện và tương tác đặt vé.
3. **`EventRepositoryImpl.kt`** - **613 dòng** (24.6 KB): Triển khai gọi API và đồng bộ offline.

### D. Mobile Organizer (`Mobile-2025-Eventing-Organizer`)
1. **`EditEventScreen.kt`** - **910 dòng** (41.3 KB): Giao diện chỉnh sửa thông tin sự kiện và cấu hình vé.
2. **`CreateEventViewModel.kt`** - **648 dòng** (24.5 KB): Quản lý luồng tạo sự kiện và lưu nháp.

---

## 2. Rà soát Chi tiết: God Classes & Gom nhóm Trách nhiệm

### 🚨 God Class 1: `postgres.order.repository.js` (566 dòng)
* **Vấn đề (Anti-pattern):** Vi phạm nguyên lý Đơn trách nhiệm (Single Responsibility Principle). File này quản lý các truy vấn cho ít nhất 5 thực thể khác nhau: `orders`, `order_items`, `payment_attempts`, `ledger_entries`, và `organizer_settings`.
* **Đề xuất phân rã:** Tách ra thành các file repository riêng biệt:
  * `order.repository.js` (Chỉ làm việc với bảng `orders` và `order_items`).
  * `payment.repository.js` (Quản lý `payment_attempts`).
  * `ledger.repository.js` (Quản lý `ledger_entries`).
  * `organizer_settings.repository.js` (Quản lý `organizer_settings`).

### 🚨 God Class 2: `tickets/application/service.js` (613 dòng)
* **Vấn đề (Code Smell / Tight Coupling):**
  * **Bỏ qua Abstraction:** Gọi trực tiếp `transaction.query(...)` để cập nhật bảng `seat_holds` và `user_profiles` (Ví dụ: dòng 270, 396) thay vì đi qua repository tương ứng. Điều này làm mất đi lợi ích của lớp Repository và gây khó khăn khi thay đổi DB.
  * **Chặt chẽ hóa nghiệp vụ:** Logic đặt vé chứa toàn bộ logic tạo "shadow order" (dòng 118-162) và thay đổi trạng thái thanh toán (dòng 225-266).
  * **Trực tiếp tương tác Cache:** Thao tác trực tiếp với Redis `cacheProvider` để lưu giữ ghế (dòng 437, 463).
* **Đề xuất phân rã:**
  * Đóng gói logic giữ ghế/hủy ghế vào một `SeatHoldService`.
  * Chuyển logic tạo shadow order sang `OrderService`.
  * Đóng gói Redis caching vào repository hoặc cache manager.

### 🚨 God Component 3 (Web): `web-2025-eventing/src/app/page.tsx` (787 dòng)
* **Vấn đề:** Không chia nhỏ giao diện. Toàn bộ các phần UI của Trang chủ như Hero Carousel, Nghệ sĩ nổi bật, Điểm đến, Sự kiện xu hướng, Tabs cuối tuần đều được viết inline trong một file duy nhất. Ngoài ra còn lưu trữ dữ liệu mock cứng (Slideshow, Stars, Destinations) ngay trong file component.
* **Đề xuất phân rã:**
  * Di chuyển dữ liệu cấu hình cứng ra file `src/lib/constants.ts` hoặc cấu hình động từ API.
  * Phân rã thành các component con: `HeroCarousel.tsx`, `FeaturedArtists.tsx`, `TrendingEvents.tsx`, `DestinationSelector.tsx`, `PromoBanner.tsx`.

---

## 3. Các Code Smells & Bugs Tiềm ẩn Nghiêm Trọng

### 🐛 Bug 1: Bảo mật Voucher bị rò rỉ ở Client (`checkout/page.tsx`)
* **Vị trí:** `web-2025-eventing/src/app/checkout/page.tsx#L112-L123`
* **Vấn đề:** Logic áp dụng voucher được kiểm tra **cứng hoàn toàn ở phía Client** (Next.js):
  ```typescript
  const code = voucherCode.toUpperCase().trim();
  if (code === 'EVENTING20') {
    const amt = Math.round(subtotal * 0.2);
    setDiscount(amt);
  } else if (code === 'WELCOME10') {
    ...
  }
  ```
  Người dùng có thể dễ dàng mở DevTools đọc mã nguồn để lấy mã giảm giá hoặc gửi trực tiếp tổng tiền đã giảm lên server.
* **Hậu quả:** Nguy cơ thất thoát doanh thu cao. Bất kỳ ai cũng có thể giả mạo giảm giá.
* **Đề xuất:** Logic áp dụng voucher **bắt buộc** phải thực hiện ở Backend thông qua API và được tính toán lại tại thời điểm tạo đơn hàng/vé.

### ⚠️ Smell 2: Không nhất quán trong hợp đồng FCM Topic (Topic Contract Inconsistency)
* **Vị trí 1:** `src/modules/events/application/service.js#L189`
  ```javascript
  topic: `artist_${artistId}`
  ```
* **Vị trí 2:** `src/modules/admin/application/service.js#L93`
  ```javascript
  topic: notifHelper.buildTopicName('artist', artistId)
  ```
* **Vấn đề:** Ở module tạo sự kiện (`events service`) sử dụng chuỗi viết cứng ``artist_${artistId}`` để gửi thông báo push. Trong khi đó, module duyệt sự kiện (`admin service`) lại dùng helper `notifHelper.buildTopicName('artist', artistId)`.
* **Hậu quả:** Nếu helper `buildTopicName` thay đổi prefix hoặc định dạng (ví dụ đổi thành `artist-` hoặc thêm môi trường `prod_artist_`), thông báo push sẽ bị gửi sai topic, dẫn tới việc thiết bị Android đã đăng ký topic sẽ không nhận được thông báo.
* **Đề xuất:** Quy chuẩn hóa và bắt buộc dùng helper `notifHelper.buildTopicName` ở tất cả các nơi gửi push notification.

### ⚠️ Smell 3: Rò rỉ Logic Nghiệp vụ vào API Controller (`payments/api/controller.js`)
* **Vị trí:** `src/modules/payments/api/controller.js`
* **Vấn đề:** Controller trực tiếp quản lý transaction database (`runTransaction`) và thực hiện kiểm tra các ràng buộc trạng thái thanh toán (ví dụ: dòng 80-105, 141-168).
* **Hậu quả:** Leak business logic từ Application/Domain Layer ra Transport Layer (API Controller). Khiến logic này không thể tái sử dụng nếu chạy qua CLI, Cron Job, hay gRPC.
* **Đề xuất:** Di chuyển toàn bộ nghiệp vụ kiểm tra trạng thái thanh toán và chạy transaction vào `PaymentApplicationService`. Controller chỉ làm nhiệm vụ nhận request và trả về response.

### ⚠️ Smell 4: Trực tiếp gọi HTTP và Hash trong Service (`payments/application/service.js`)
* **Vấn đề:** Service trực tiếp gọi thư viện `axios` để gửi dữ liệu tới ZaloPay và tự tính toán chữ ký MAC/HMAC bằng `crypto`.
* **Hậu quả:** Vi phạm nguyên lý phụ thuộc ngược (Dependency Inversion). Nghiệp vụ ứng dụng bị phụ thuộc trực tiếp vào thư viện HTTP và đặc tả kỹ thuật của ZaloPay.
* **Đề xuất:** Đóng gói ZaloPay SDK/API thành một Infrastructure Provider (`ZaloPayProvider` nằm trong `src/providers`). Service chỉ gọi thông qua Interface/Provider đó.

### ⚠️ Smell 5: Mã nguồn rác / Unused Imports
* **Vị trí:** `src/modules/admin/application/service.js#L4`
  ```javascript
  const esClient = require('@/shared/config/elasticsearch.config');
  ```
* **Vấn đề:** File này import `esClient` nhưng hoàn toàn không gọi trực tiếp client này để index dữ liệu (mọi tác vụ ghi/xóa search index đều được chuyển qua Outbox Pattern `eventPublisher.publish('search_index', ...)`).
* **Hậu quả:** Gây nhầm lẫn trong quá trình phát triển mã nguồn và tăng thời gian khởi chạy/khởi tạo module.
* **Đề xuất:** Xóa bỏ import `esClient` thừa.

---

## 4. Kế hoạch hành động đề xuất (Recommended Action Plan)

| Bước | Thành phần | Mô tả công việc | Mức độ ưu tiên |
| :--- | :--- | :--- | :--- |
| **1** | Web / Backend | **Vá lỗ hổng bảo mật Voucher:** Chuyển toàn bộ logic check và tính toán voucher từ Client (`checkout/page.tsx`) lên Backend (`promotion.repository.js` & `tickets/application/service.js`). | 🔴 **Khẩn cấp** |
| **2** | Backend | **Sửa lỗi không nhất quán FCM Topic:** Thay thế tất cả các chuỗi cứng ghép topic push (ví dụ: ``artist_${artistId}``) sang gọi helper `notifHelper.buildTopicName('artist', artistId)`. | 🟠 **Cao** |
| **3** | Backend | **Tách nhỏ God Repository:** Phân rã `postgres.order.repository.js` thành các repositories nhỏ chuyên biệt (`order`, `payment`, `ledger`, `settings`). | 🟡 **Trung bình** |
| **4** | Web | **Phân rã Trang chủ (`page.tsx`):** Tách nhỏ trang chủ Next.js thành các component con và di chuyển mock data ra ngoài component. | 🟡 **Trung bình** |
| **5** | Backend | **Refactor Payments Controller:** Di chuyển logic transaction và kiểm tra trạng thái thanh toán từ Controller sang Service. | 🟢 **Thấp** |

---
 Báo cáo được lưu trữ tự động tại hệ thống phân tích mã nguồn.
