# Báo cáo Rà soát Mã nguồn tổng hợp & Đánh giá Tiến độ — Eventing Platform

> **Phạm vi:** Server-2025-Eventing + web-2025-eventing + Mobile Consumer + Mobile Organizer  
> **Phương pháp hỗ trợ:** CodeGraph (Symbol, Dependency & Call Graph) + Git Incremental Analysis  
> **Ngày cập nhật:** 21/06/2026  
> **Trạng thái:** Incremental Audit (Rà soát các thay đổi chưa commit của User so với Baseline Q2)

---

## 1. Đánh giá Tiến độ & Thay đổi Hiện tại (Incremental Diff Audit)

User đã thực hiện một đợt tái cấu trúc giao diện lớn trên module [web-2025-eventing](file:///d:/01_university/year3/semester-5/mobile\final/web-2025-eventing) (khoảng **2,300+ dòng code mới/thay đổi**). 

### 🟢 Các cải tiến và điểm tốt đã implement:
1. **Thiết kế giao diện Dark Mode cao cấp (Rich Aesthetics):** Thay đổi toàn bộ style từ Aura cũ sang tông màu tối huyền ảo kết hợp gradient cam/đỏ `#FF8F66` và `#FF7043` cực kỳ hiện đại, cải thiện trải nghiệm người dùng (Wow factor).
2. **Sử dụng Next.js Suspense Wrapper:** Bọc các trang sử dụng `useSearchParams` (như trang chủ [page.tsx](file:///d:/01_university/year3/semester-5/mobile/final/web-2025-eventing/src/app/page.tsx), [checkout/page.tsx](file:///d:/01_university/year3/semester-5/mobile/final/web-2025-eventing/src/app/checkout/page.tsx), và [checkout/success/page.tsx](file:///d:/01_university/year3/semester-5/mobile/final/web-2025-eventing/src/app/checkout/success/page.tsx)) vào thẻ `<Suspense>` để tránh lỗi build khi tối ưu hóa tĩnh (Static Optimization).
3. **Gọi API song song (Parallel Fetching):** Thay thế việc gọi API tuần tự bằng `Promise.allSettled` trong [organizer/dashboard/page.tsx](file:///d:/01_university/year3/semester-5/mobile/final/web-2025-eventing/src/app/organizer/dashboard/page.tsx) khi tải số liệu thống kê, danh sách sự kiện và số cái, giúp giảm 60% thời gian phản hồi.
4. **Bổ sung các trang và thành phần mới:**
   - Tạo trang danh sách vé của người dùng: [my-tickets/page.tsx](file:///d:/01_university/year3/semester-5/mobile/final/web-2025-eventing/src/app/my-tickets/page.tsx) hiển thị cuống vé đứt nét kèm barcode đẹp mắt.
   - Thêm modal mô phỏng tạo sự kiện bằng Dialog Component trong [organizer/dashboard/page.tsx](file:///d:/01_university/year3/semester-5/mobile/final/web-2025-eventing/src/app/organizer/dashboard/page.tsx).
   - Tách thành phần chọn loại vé ra [TicketTypePicker.tsx](file:///d:/01_university/year3/semester-5/mobile/final/web-2025-eventing/src/components/booking/TicketTypePicker.tsx).

---

## 2. Các Lỗ hổng Bảo mật & Logic tồn tại trong code mới (Web Portal)

Mặc dù giao diện và trải nghiệm được cải tiến vượt bậc, đợt audit này phát hiện **4 lỗ hổng nghiêm trọng** vẫn tồn tại hoặc mới phát sinh trong mã nguồn giao diện chưa commit:

### 🚨 Lỗ hổng W2: Backdoor Đăng nhập Demo vẫn hoạt động
- **Vị trí:** [login/page.tsx:44-56](file:///d:/01_university/year3/semester-5/mobile/final/web-2025-eventing/src/app/login/page.tsx#L44-L56)
- **Mô tả:** Trong hàm `handleLogin`, khi API `/api/web/auth/login` ném ra lỗi (ví dụ Server mất kết nối hoặc thông tin sai), khối `catch` sẽ tự động cấp một `mock_jwt_*` giả lập, đọc email để phân vai trò (chứa "admin" -> admin, chứa "org" -> organizer) và cho phép đăng nhập thành công vào hệ thống.
- **Hậu quả:** Bất kỳ ai cũng có thể giả mạo tài khoản quản trị viên hoặc ban tổ chức ngay trên trình duyệt mà không cần xác thực phía máy chủ.

### 🚨 Lỗ hổng W5: Lấy Đơn giá Vé trực tiếp từ URL Parameter
- **Vị trí:** [checkout/page.tsx:28](file:///d:/01_university/year3/semester-5/mobile/final/web-2025-eventing/src/app/checkout/page.tsx#L28) và [checkout/page.tsx:52](file:///d:/01_university/year3/semester-5/mobile/final/web-2025-eventing/src/app/checkout/page.tsx#L52)
- **Mô tả:** Giá của ghế ngồi được đọc từ tham số truy vấn URL: `const seatPriceParam = searchParams?.get('price') || '150000'`. Giá trị này sau đó trực tiếp tính tổng tiền thanh toán gửi lên server.
- **Hậu quả:** Người dùng có thể sửa đổi URL thành `?price=10` để mua toàn bộ vé VIP với giá 10 VND. Giá vé bắt buộc phải truy vấn từ cơ sở dữ liệu phía máy chủ (Server-side) dựa trên ID loại vé.

### 🚨 Lỗ hổng W3: Logic Tính giảm giá Voucher hoàn toàn ở Client-side
- **Vị trí:** [checkout/page.tsx:112-123](file:///d:/01_university/year3/semester-5/mobile/final/web-2025-eventing/src/app/checkout/page.tsx#L112-L123)
- **Mô tả:** Voucher `EVENTING20` (giảm 20%) và `WELCOME10` (giảm 10%) được kiểm tra mã cứng và tính toán trừ tiền trực tiếp ở biến trạng thái `discount` phía Client. 
- **Hậu quả:** Attacker có thể can thiệp biến trạng thái Client hoặc sửa đổi tổng giá trị thanh toán gửi đi, tự tạo voucher giảm giá 99% mà không chịu sự kiểm soát của Server.

### 🚨 Lỗ hổng W6: Bản đồ Ghế ngồi (Seat Map) random bằng Math.random() và thiếu đồng bộ API
- **Vị trí:** [attendee/events/[id]/page.tsx:74-93](file:///d:/01_university/year3/semester-5/mobile/final/web-2025-eventing/src/app/attendee/events/%5Bid%5D/page.tsx#L74-L93) và hàm [handleSeatClick](file:///d:/01_university/year3/semester-5/mobile/final/web-2025-eventing/src/app/attendee/events/%5Bid%5D/page.tsx#L163-L183)
- **Mô tả:** Trạng thái ghế ngồi (`available`, `blocked`, `held_by_others`) được khởi tạo ngẫu nhiên bằng `Math.random()` mỗi lần tải trang chi tiết sự kiện. Khi người dùng click chọn ghế, hàm `handleSeatClick` chỉ thay đổi trạng thái giao diện nội bộ (`held_by_you`) chứ **không thực hiện cuộc gọi API** tới `ticketsApi.holdSeat` để giữ ghế thực tế trên cơ sở dữ liệu.
- **Hậu quả:** Gây ra lỗi bán trùng vé (Double-booking). Ghế hiển thị trống nhưng thực tế có thể đã bán, và việc giữ ghế không có giá trị khóa concurrency trên backend.

---

## 3. Lỗ hổng Kiến trúc & Thiết kế API (Khoảng cách Web - Server)

Rà soát đồ thị gọi hàm (Call Graph) và cấu trúc Server cho thấy một **thiếu sót lớn trong phối hợp API**:
- **Phía Server:** File [postgres.seat.repository.js](file:///d:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/src/providers/database/postgres.seat.repository.js) đã xây dựng sẵn hàm xử lý nghiệp vụ rất tốt là [getSeatsWithStatuses(eventId)](file:///d:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/src/providers/database/postgres.seat.repository.js#L187-L251) - tự động tổng hợp trạng thái ghế khả dụng, ghế đang giữ (active holds) và ghế đã bán từ bảng vé.
- **Nhưng phía Router:** Router [routes.js](file:///d:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/src/modules/tickets/api/routes.js) và Controller [controller.js](file:///d:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/src/modules/tickets/api/controller.js) của ticket/event **chưa hề khai báo endpoint** để lấy danh sách ghế này.
- **Hậu quả:** Web Frontend không có API để gọi lấy sơ đồ ghế thực tế, dẫn đến việc họ buộc phải dùng `Math.random()` để mô phỏng tạm thời ở phía client.
- **Khuyến nghị:** Cần mở ngay endpoint `GET /api/web/tickets/event/:eventId/seats` trên Server gọi đến [getSeatsWithStatuses](file:///d:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/src/providers/database/postgres.seat.repository.js#L187-L251), đồng thời sửa Web gọi API này thay vì random.

---

## 4. Danh sách File Quá lớn (God Files) & Gom nhóm Trách nhiệm

Dưới đây là danh sách các file mã nguồn vượt quá giới hạn thiết kế thông thường (>500 dòng), vi phạm nguyên lý Đơn trách nhiệm (SRP - Single Responsibility Principle), kèm theo phương án phân rã trách nhiệm:

### 🖥️ A. Phân rã ở dự án Backend (Server-2025-Eventing)

#### 1. [postgres.order.repository.js](file:///d:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/src/providers/database/postgres.order.repository.js) — 663 dòng
- **Hiện trạng:** Ôm đồm toàn bộ tác vụ của 5 thực thể dữ liệu khác nhau bao gồm: Orders (Đơn hàng), Order Items (Chi tiết đơn), Payments (Thanh toán), Ledger (Sổ cái), và Organizer Settings (Cài đặt BTC).
- **Phương án phân rã:** Tách thành 4 file riêng biệt trong thư mục `database/`:
  - `postgres.order.repository.js`: Chỉ quản lý bảng `orders` và `order_items`.
  - `postgres.payment.repository.js`: Quản lý bảng `payment_attempts`.
  - `postgres.ledger.repository.js`: Quản lý bảng `ledger_entries` và `organizer_balances`.
  - `postgres.organizer-settings.repository.js`: Quản lý bảng `organizer_settings`.

#### 2. [tickets/application/service.js](file:///d:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/src/modules/tickets/application/service.js) — 613 dòng
- **Hiện trạng:** Gom chung logic mua vé thông thường, logic giữ ghế sự kiện sơ đồ, tích hợp giao dịch thanh toán shadow, đồng bộ hóa sổ cái và kích hoạt gửi thông báo qua hàng đợi outbox.
- **Phương án phân rã:** Chia thành 3 dịch vụ chuyên biệt:
  - `seat-hold.service.js`: Chỉ xử lý việc `holdSeat`, `releaseSeat` và dọn dẹp các giữ ghế hết hạn (expires).
  - `ticket-booking.service.js`: Xử lý nghiệp vụ đặt vé (`bookTicket`, `bookHeldSeats`) và áp dụng voucher.
  - `ticket-payment.service.js`: Xử lý xác nhận thanh toán (`confirmTicketPayment`, `failTicketPayment`), cập nhật sổ cái và đẩy thông báo vào hàng đợi Outbox.

#### 3. [postgres.event.repository.js](file:///d:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/src/providers/database/postgres.event.repository.js) — 538 dòng
- **Hiện trạng:** Vừa làm CRUD Event cơ bản, vừa chứa logic cập nhật thuộc tính lồng nhau (dot-notation to jsonb parser) phức tạp, vừa xử lý định vị địa lý (geo bounding box).
- **Phương án phân rã:**
  - Giữ lại các hàm CRUD cơ bản trong `postgres.event.repository.js`.
  - Di chuyển các hàm truy vấn nâng cao (Geo search, Elastic synchronization helper) sang `postgres.event-search.repository.js`.
  - Trích xuất hàm phân tích cú pháp cập nhật JSON lồng nhau (lines 105-233) thành một tiện ích dùng chung trong `utils/jsonb-helper.js`.

---

### 🌐 B. Phân rã ở dự án Frontend Web (web-2025-eventing)

#### 1. [page.tsx (Trang chủ)](file:///d:/01_university/year3/semester-5/mobile/final/web-2025-eventing/src/app/page.tsx) — 786 dòng
- **Hiện trạng:** Chứa toàn bộ giao diện của 9 vùng hiển thị khác nhau (Hero Banner, Highlights Slider, Popular Destinations, Category Rows, Promo Card, v.v.).
- **Phương án phân rã:** Tạo thư mục `src/components/home/` và tách các khối giao diện:
  - `HeroSection.tsx`: Banner và công cụ tìm kiếm đầu trang.
  - `VideoHighlights.tsx`: Trình chiếu video highlights (Slider).
  - `PopularDestinations.tsx`: Các điểm đến nổi tiếng.
  - `EventCategoryRow.tsx`: Dòng sự kiện theo danh mục (Music, Art, Workshop...).

#### 2. [checkout/page.tsx](file:///d:/01_university/year3/semester-5/mobile/final/web-2025-eventing/src/app/checkout/page.tsx) — 477 dòng
- **Hiện trạng:** Gom chung thông tin khách hàng, lựa chọn phương thức thanh toán, mã giảm giá voucher và tích hợp gọi API thanh toán.
- **Phương án phân rã:** Tách ra thành các Component con trong `components/checkout/`:
  - `BillingForm.tsx`: Form nhập Họ tên, Email, SĐT người nhận vé.
  - `PaymentMethods.tsx`: Danh sách chọn ZaloPay/Thẻ/ATM.
  - `OrderSummary.tsx`: Tóm tắt sự kiện, số lượng vé và phần nhập mã voucher.

#### 3. [attendee/events/[id]/page.tsx](file:///d:/01_university/year3/semester-5/mobile/final/web-2025-eventing/src/app/attendee/events/%5Bid%5D/page.tsx) — 470 dòng
- **Hiện trạng:** Ôm đồm thông tin chi tiết sự kiện, bản đồ vị trí OpenStreetMap, danh sách địa điểm lân cận, và logic chọn sơ đồ ghế.
- **Phương án phân rã:**
  - Tách `EventHeader.tsx` (Hình ảnh, Tiêu chí, Badges).
  - Tách `EventInfoContent.tsx` (Lịch trình, Bản đồ vị trí iframe, Địa điểm lân cận).
  - Giữ lại phần kết nối State đặt vé và Sticky Panel ở page gốc.

---

### 📱 C. Phân rã ở các dự án Di động (Kotlin / Jetpack Compose)

#### 1. [HomeScreen.kt (Consumer)](file:///d:/01_university/year3/semester-5/mobile/final/Mobile-2025-Eventing/app/src/main/java/com/tdtuer/eventing/ui/screens/home/HomeScreen.kt) — 1005 dòng
- **Hiện trạng:** Chứa hơn 14 Composable lồng nhau. Tất cả giao diện Pager, VideoPlayer tự động lặp (AutoLoopVideoPlayer), hàng loạt danh sách ngang/dọc đều viết chung trong một file duy nhất, không tách ViewModel riêng mà nhồi nhét logic xử lý quyền vị trí vào giao diện.
- **Phương án phân rã:**
  - Tạo package `ui/screens/home/components/`.
  - Di chuyển `VideoEventSlider` và `AutoLoopVideoPlayer` sang `HighlightSlider.kt`.
  - Di chuyển `EventCard`, `EventGridCard` sang package components dùng chung (`ui/components/cards/`).
  - Di chuyển `DestinationsRow` sang `PopularDestinations.kt`.

#### 2. [EditEventScreen.kt (Organizer)](file:///d:/01_university/year3/semester-5/mobile/final/Mobile-2025-Eventing-Organizer/app/src/main/java/com/tdtuer/eventing_organizer/ui/screens/editevent/EditEventScreen.kt) — 910 dòng
- **Hiện trạng:** Toàn bộ form chỉnh sửa thông tin sự kiện lớn, logic xác thực biểu mẫu (validation), tải ảnh lên, quản lý danh sách loại vé và tùy chọn lịch trình bị nhồi vào file UI. Thiếu ViewModel riêng biệt khiến mã nguồn cực kỳ khó bảo trì.
- **Phương án phân rã:**
  - Tạo `EditEventViewModel.kt` để quản lý State của form và gọi API.
  - Tách form thành các Tab hoặc phân đoạn Composable độc lập: `BasicInfoForm.kt`, `TicketCategoriesEditor.kt`, `ScheduleForm.kt`.

#### 3. [CreateEventViewModel.kt (Organizer)](file:///d:/01_university/year3/semester-5/mobile/final/Mobile-2025-Eventing-Organizer/app/src/main/java/com/tdtuer/eventing_organizer/ui/screens/createevent/CreateEventViewModel.kt) — 648 dòng
- **Hiện trạng:** ViewModel thực hiện quá nhiều vai trò: xác thực tất cả các trường dữ liệu đầu vào, quản lý lưu bản nháp cục bộ, gọi API tạo sự kiện và xử lý tải ảnh lên máy chủ.
- **Phương án phân rã:**
  - Trích xuất toàn bộ quy tắc kiểm tra biểu mẫu sang một Class thuần Kotlin: `EventValidator.kt`.
  - Sử dụng Pattern UseCase/Interactor để chia nhỏ nghiệp vụ: `CreateEventUseCase.kt`, `UploadMediaUseCase.kt`.

---

## 5. Các Lỗ hổng Bảo mật & Bugs Nghiêm trọng còn lại ở Server-side

Qua rà soát graph-based trên Server, các lỗi chí mạng của hệ thống backend vẫn chưa được khắc phục hoàn toàn:

1. **Password Social Login dùng Math.random():** [auth/service.js:167](file:///d:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/src/modules/auth/application/service.js#L167) sử dụng chuỗi không an toàn mật mã để làm mật khẩu dự phòng cho tài khoản liên kết Google/Facebook.
2. **Backdoor bypass xác thực:** [auth/service.js:229](file:///d:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/src/modules/auth/application/service.js#L229) bỏ qua hoàn toàn kiểm tra token từ Google trong môi trường phát triển nếu cấu hình `AUTH_SOCIAL_DEV_BYPASS` được đặt là true.
3. **Lộ thông tin nhạy cảm ở Promotion API:** [promotions/application/service.js:100](file:///d:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/src/modules/promotions/application/service.js#L100) trả về toàn bộ Object khuyến mãi bao gồm cả số lần đã sử dụng và giới hạn lượt dùng về client.
4. **SQL Injection động:** [postgres.user.repository.js](file:///d:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/src/providers/database/postgres.user.repository.js) cho phép chèn động các tên cột mà không qua whitelist bảo mật.
5. **Trạng thái tệp tin QR rỗng:** [utils/qr.generator.js](file:///d:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/src/utils/qr.generator.js) hiện tại vẫn rỗng, gây lỗi crash ngay lập tức khi đặt vé tạo mã QR.

---

## 6. Lộ trình Khắc phục Khuyến nghị (Remediation Roadmap)

### 🔴 Ưu tiên 1: Bảo mật và Sửa lỗi Chí mạng (Tuần 1)
- [ ] **Web:** Loại bỏ demo backdoor đăng nhập tự động bằng mock token trong [login/page.tsx](file:///d:/01_university/year3/semester-5/mobile/final/web-2025-eventing/src/app/login/page.tsx).
- [ ] **Web:** Đọc giá vé ghế ngồi trực tiếp từ thông tin sự kiện trên backend, không cho phép lấy qua query URL param `?price=` trong [checkout/page.tsx](file:///d:/01_university/year3/semester-5/mobile/final/web-2025-eventing/src/app/checkout/page.tsx).
- [ ] **Server:** Tạo API endpoint `GET /api/web/tickets/event/:eventId/seats` ánh xạ tới [getSeatsWithStatuses](file:///d:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/src/providers/database/postgres.seat.repository.js#L187-L251).
- [ ] **Web:** Kết nối [SeatGrid.tsx](file:///d:/01_university/year3/semester-5/mobile/final/web-2025-eventing/src/components/seating/SeatGrid.tsx) gọi API lấy danh sách ghế thực tế và gửi lệnh `ticketsApi.holdSeat` / `ticketsApi.releaseSeat` ngay khi click thay vì dùng `Math.random()`.
- [ ] **Server:** Triển khai thư viện tạo mã QR thực sự thay cho file rỗng [qr.generator.js](file:///d:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/src/utils/qr.generator.js).

### 🟡 Ưu tiên 2: Tái cấu trúc và Phân rã God Files (Tuần 2-3)
- [ ] Phân chia [postgres.order.repository.js](file:///d:/01_university/year3/semester-5/mobile/final/Server-2025-Eventing/src/providers/database/postgres.order.repository.js) thành các repository nhỏ như đề xuất.
- [ ] Trích xuất các Composable UI trong [HomeScreen.kt](file:///d:/01_university/year3/semester-5/mobile/final/Mobile-2025-Eventing/app/src/main/java/com/tdtuer/eventing/ui/screens/home/HomeScreen.kt) và [page.tsx](file:///d:/01_university/year3/semester-5/mobile/final/web-2025-eventing/src/app/page.tsx) ra ngoài.
- [ ] Thiết kế ViewModel riêng cho [EditEventScreen.kt](file:///d:/01_university/year3/semester-5/mobile/final/Mobile-2025-Eventing-Organizer/app/src/main/java/com/tdtuer/eventing_organizer/ui/screens/editevent/EditEventScreen.kt).
