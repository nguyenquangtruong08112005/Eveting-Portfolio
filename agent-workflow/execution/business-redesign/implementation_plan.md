# Eventing Platform — Business Scope Document V1

> **Mục đích tài liệu:** Xác định phạm vi, nghiệp vụ, và ranh giới của hệ thống.
> Đây là tài liệu nền tảng — mọi quyết định kỹ thuật sau này phải truy ngược được về tài liệu này.
>
> **Trạng thái:** DRAFT — Chờ review & bổ sung từ Product Owner.

---

## 1. Vision

Xây dựng một **Event Management Marketplace** cho phép Organizer tạo và bán vé sự kiện, Attendee khám phá và tham gia sự kiện, và Platform thu phí hoa hồng trên mỗi giao dịch thành công.

Hệ thống được thiết kế theo hướng **enterprise-grade** với mục tiêu portfolio, ưu tiên **chất lượng kiến trúc** và **tính đúng đắn của nghiệp vụ** hơn là số lượng tính năng.

---

## 2. Scope Boundaries

### 2.1. IN SCOPE (V1)

| # | Capability | Business Justification |
|---|---|---|
| 1 | **Event Lifecycle Management** | Core — Organizer cần tạo, quản lý, và công bố sự kiện |
| 2 | **Ticket Sales** | Core — Nguồn doanh thu chính của cả Organizer và Platform |
| 3 | **Payment Processing** (gateway-agnostic, V1: ZaloPay) | Core — Không có thanh toán thì không có marketplace |
| 4 | **Commission & Settlement** | Core — Business model của Platform |
| 5 | **Organizer Payout** | Core — Organizer cần nhận tiền sau sự kiện |
| 6 | **Refund Processing** | Core — Bảo vệ quyền lợi Attendee, xây dựng niềm tin |
| 7 | **Event Discovery** (search, filter, browse) | Core — Attendee cần tìm được sự kiện phù hợp |
| 8 | **Event Check-in** (QR code) | Core — Xác nhận tham dự thực tế, chống vé giả |
| 9 | **User & Organizer Management** | Core — Xác thực, phân quyền, hồ sơ |
| 10 | **Event Approval Workflow** | Core — Platform kiểm soát chất lượng nội dung |
| 11 | **Notification System** (order, event update, reminder) | Core — Thông báo giao dịch và sự kiện là bắt buộc |
| 12 | **Revenue Reporting** | Core — Platform và Organizer cần theo dõi doanh thu |
| 13 | **Event Reviews & Ratings** | High — Xây dựng niềm tin, giúp Attendee ra quyết định |

### 2.2. OUT OF SCOPE (V1)

| # | Capability | Lý do loại |
|---|---|---|
| 1 | Corporate event features (internal events, approval chains) | Khác business model, tăng phức tạp không cần thiết |
| 2 | Subscription/SaaS billing | V1 chỉ dùng commission model |
| 3 | Multi-currency, multi-language | V1 giả định single region, extensible later |
| 4 | Invoicing & tax compliance | Phức tạp pháp lý, không cần cho portfolio |
| 5 | Live streaming / virtual events | Phức tạp kỹ thuật cao, khác domain |
| 6 | In-app chat / messaging | Không phải core của event marketplace |
| 7 | Marketing automation (email campaigns, retargeting) | Không phải core business |
| 8 | Advanced BI dashboards / data warehouse | Reporting cơ bản đủ cho V1 |
| 9 | Venue management as a product | Venue là thuộc tính của Event, không phải sản phẩm riêng |
| 10 | Loyalty / membership programs | Không có business justification cho V1 marketplace |
| 11 | Seated event / seat map management | Xem Open Question #1 bên dưới |
| 12 | Promotions / vouchers / discount codes | Xem Open Question #2 bên dưới |

---

## 3. Actors

### 3.1. Primary Actors (Con người tương tác trực tiếp)

| Actor | Mô tả | Mục tiêu chính |
|---|---|---|
| **Attendee** | Người tham dự sự kiện. Tìm kiếm, mua vé, tham gia. | Tìm được sự kiện phù hợp, mua vé dễ dàng, tham dự suôn sẻ |
| **Organizer** | Người/tổ chức tạo sự kiện. Quản lý sự kiện, bán vé, nhận doanh thu. | Tiếp cận nhiều Attendee, bán được vé, nhận tiền đúng hạn |
| **Platform Admin** | Quản trị viên hệ thống. Duyệt sự kiện, quản lý người dùng, xử lý tranh chấp. | Đảm bảo chất lượng sự kiện, vận hành platform ổn định |

### 3.2. System Actors (Hệ thống bên ngoài)

| Actor | Mô tả |
|---|---|
| **Payment Gateway** | Xử lý thanh toán (V1: ZaloPay). Platform không tự giữ tiền. |
| **Notification Service** | Gửi thông báo đẩy (FCM), email xác nhận |
| **Search Engine** | Index và tìm kiếm sự kiện (nếu dùng Elasticsearch hoặc tương đương) |

---

## 4. High-Level Capabilities

### 4.1. Event Management

| ID | Capability | Actor | Mô tả |
|---|---|---|---|
| EVT-01 | Create Event | Organizer | Tạo sự kiện với thông tin cơ bản, loại vé, địa điểm, thời gian |
| EVT-02 | Edit Event | Organizer | Chỉnh sửa sự kiện (trước khi bắt đầu, có điều kiện) |
| EVT-03 | Submit Event for Approval | Organizer | Gửi sự kiện cho Admin duyệt |
| EVT-04 | Approve / Reject Event | Admin | Duyệt hoặc từ chối sự kiện |
| EVT-05 | Cancel Event | Organizer, Admin | Hủy sự kiện (trigger refund flow) |
| EVT-06 | Browse / Search Events | Attendee | Tìm kiếm sự kiện theo tên, loại, thành phố, ngày |
| EVT-07 | View Event Details | Attendee | Xem chi tiết sự kiện, loại vé, giá |

### 4.2. Ticketing

| ID | Capability | Actor | Mô tả |
|---|---|---|---|
| TKT-01 | Define Ticket Types | Organizer | Tạo các loại vé (General, VIP, Early Bird...) với giá, số lượng |
| TKT-02 | Purchase Tickets | Attendee | Chọn vé, thanh toán, nhận vé điện tử |
| TKT-03 | View My Tickets | Attendee | Xem danh sách vé đã mua |
| TKT-04 | Check-in with QR Code | Organizer | Quét QR code tại cổng để xác nhận tham dự |
| TKT-05 | Cancel / Request Refund | Attendee | Yêu cầu hủy vé/hoàn tiền (theo policy) |

### 4.3. Payment & Finance

| ID | Capability | Actor | Mô tả |
|---|---|---|---|
| PAY-01 | Process Payment | System | Xử lý thanh toán qua Payment Gateway |
| PAY-02 | Calculate Commission | System | Tính phí hoa hồng Platform trên mỗi giao dịch |
| PAY-03 | Settle with Organizer | System/Admin | Tính toán số tiền Organizer được nhận sau hoa hồng |
| PAY-04 | Process Payout | Admin | Chuyển tiền cho Organizer |
| PAY-05 | Process Refund | System/Admin | Hoàn tiền cho Attendee (toàn phần hoặc một phần) |
| PAY-06 | View Revenue Report | Organizer, Admin | Xem báo cáo doanh thu, hoa hồng, payout |

### 4.4. User Management

| ID | Capability | Actor | Mô tả |
|---|---|---|---|
| USR-01 | Register / Login | All | Đăng ký, đăng nhập (email/password) |
| USR-02 | Manage Profile | Attendee, Organizer | Cập nhật thông tin cá nhân |
| USR-03 | Apply as Organizer | User | Đăng ký trở thành Organizer (cần duyệt) |
| USR-04 | Approve Organizer | Admin | Duyệt đơn đăng ký Organizer |
| USR-05 | Manage Users | Admin | Xem, khóa, mở khóa tài khoản |

### 4.5. Notification

| ID | Capability | Actor | Mô tả |
|---|---|---|---|
| NTF-01 | Order Confirmation | System → Attendee | Xác nhận mua vé thành công |
| NTF-02 | Event Reminder | System → Attendee | Nhắc nhở trước khi sự kiện diễn ra |
| NTF-03 | Event Update / Cancellation | System → Attendee | Thông báo khi sự kiện thay đổi hoặc bị hủy |
| NTF-04 | Payout Notification | System → Organizer | Thông báo khi payout được xử lý |

### 4.6. Review & Rating

| ID | Capability | Actor | Mô tả |
|---|---|---|---|
| REV-01 | Write Review | Attendee | Viết đánh giá cho sự kiện đã tham dự |
| REV-02 | View Reviews | Attendee | Xem đánh giá của sự kiện |

---

## 5. Core Business Processes

### 5.1. Event Publication Flow

```
Organizer tạo Event (Draft)
    → Organizer điền thông tin + loại vé
    → Organizer submit for review
    → Admin review
        ├── Approve → Event Published (hiển thị cho Attendee)
        └── Reject (kèm lý do) → Organizer chỉnh sửa → Re-submit
```

### 5.2. Ticket Purchase Flow

```
Attendee tìm thấy Event
    → Chọn loại vé + số lượng
    → Tạo Order
    → Redirect sang Payment Gateway
    → Payment Gateway xử lý
        ├── Success → Order Confirmed → Ticket Issued → Notification gửi
        └── Failed → Order Expired → Vé trả về inventory
```

### 5.3. Check-in Flow

```
Attendee đến địa điểm
    → Mở vé trên app → Hiện QR Code
    → Organizer quét QR
    → Hệ thống validate (vé hợp lệ? đã check-in chưa? đúng sự kiện?)
        ├── Valid → Check-in thành công
        └── Invalid → Từ chối (hiện lý do)
```

### 5.4. Settlement & Payout Flow

```
Event kết thúc
    → Hệ thống tính tổng doanh thu vé
    → Trừ phí hoa hồng Platform
    → Trừ refund đã xử lý (nếu có)
    → Tính Net Amount cho Organizer
    → Admin review & approve payout
    → Chuyển tiền cho Organizer
    → Notification gửi cho Organizer
```

### 5.5. Refund Flow

```
Attendee yêu cầu refund
    → Kiểm tra refund policy (thời hạn, điều kiện)
        ├── Eligible → Process refund qua Payment Gateway
        │   → Cập nhật Order, Ticket status
        │   → Trả vé về inventory
        │   → Notification cho Attendee + Organizer
        └── Not Eligible → Từ chối (hiện lý do)
```

### 5.6. Event Cancellation Flow

```
Organizer hoặc Admin hủy Event
    → Tìm tất cả Ticket đã bán (confirmed)
    → Tự động refund toàn bộ
    → Cập nhật Event status → Cancelled
    → Notification cho tất cả Attendee đã mua vé
    → Settlement cho event này = 0 (hoặc xử lý các khoản đã payout nếu có)
```

---

## 6. Business Rules

### 6.1. Event Rules

| ID | Rule | Rationale |
|---|---|---|
| BR-EVT-01 | Event phải được Admin duyệt trước khi hiển thị cho Attendee | Kiểm soát chất lượng nội dung |
| BR-EVT-02 | Không được chỉnh sửa thông tin cốt lõi (ngày, giá vé) sau khi đã có vé bán ra | Bảo vệ quyền lợi Attendee đã mua vé |
| BR-EVT-03 | Event bị hủy phải tự động refund toàn bộ vé đã bán | Bảo vệ Attendee |
| BR-EVT-04 | Chỉ Organizer sở hữu Event hoặc Admin mới có quyền chỉnh sửa/hủy | Bảo mật và phân quyền |

### 6.2. Ticketing Rules

| ID | Rule | Rationale |
|---|---|---|
| BR-TKT-01 | Không bán vé khi Event chưa được published | Đảm bảo Event hợp lệ |
| BR-TKT-02 | Không bán vé vượt quá số lượng cho phép mỗi loại vé | Tránh oversell |
| BR-TKT-03 | Không bán vé sau khi Event đã bắt đầu | Tránh mua vé event đã diễn ra |
| BR-TKT-04 | Mỗi vé có QR Code duy nhất, chỉ check-in được 1 lần | Chống gian lận |
| BR-TKT-05 | Vé chưa thanh toán trong thời gian quy định sẽ tự hết hạn | Tránh giữ inventory vô thời hạn |

### 6.3. Payment & Finance Rules

| ID | Rule | Rationale |
|---|---|---|
| BR-PAY-01 | Platform thu hoa hồng cố định hoặc theo % trên mỗi vé bán thành công | Business model |
| BR-PAY-02 | Organizer chỉ nhận payout sau khi Event kết thúc | Giảm rủi ro (event có thể bị hủy) |
| BR-PAY-03 | Refund phải hoàn về phương thức thanh toán gốc | Đúng quy trình tài chính |
| BR-PAY-04 | Mọi giao dịch tài chính phải được ghi nhận (ledger) và không được sửa/xóa | Audit trail, tính toàn vẹn tài chính |
| BR-PAY-05 | Thanh toán phải có cơ chế idempotent để tránh charge 2 lần | Bảo vệ Attendee |

### 6.4. Refund Rules

| ID | Rule | Rationale |
|---|---|---|
| BR-REF-01 | Refund chỉ được xử lý trong thời hạn cho phép (trước event X ngày) | Cân bằng quyền lợi Organizer và Attendee |
| BR-REF-02 | Khi Event bị hủy bởi Organizer/Admin, refund 100% là bắt buộc | Bảo vệ Attendee |
| BR-REF-03 | Phí hoa hồng Platform có thể hoặc không được refund (cần quyết định) | Xem Open Question #3 |

### 6.5. User & Organizer Rules

| ID | Rule | Rationale |
|---|---|---|
| BR-USR-01 | Người dùng mới mặc định là Attendee | Đơn giản hóa onboarding |
| BR-USR-02 | Muốn trở thành Organizer phải đăng ký và được Admin duyệt | Kiểm soát chất lượng Organizer |
| BR-USR-03 | Admin có thể khóa tài khoản User hoặc Organizer | Xử lý vi phạm |

### 6.6. Review Rules

| ID | Rule | Rationale |
|---|---|---|
| BR-REV-01 | Chỉ Attendee đã tham dự (check-in) mới được viết review | Đảm bảo review chân thực |
| BR-REV-02 | Mỗi Attendee chỉ được viết 1 review cho mỗi Event | Tránh spam |
| BR-REV-03 | Review không thể chỉnh sửa sau khi đăng (chỉ xóa) | Đơn giản hóa, tránh manipulation |

---

## 7. Open Questions — Cần User quyết định

> [!IMPORTANT]
> Các câu hỏi dưới đây ảnh hưởng trực tiếp đến scope và thiết kế. Xin hãy cho ý kiến trước khi tôi tiến hành các bước tiếp theo.

### OQ-1: Seated Events (Chọn chỗ ngồi)

Hệ thống hiện tại có tính năng seat map (chọn chỗ ngồi). Trong V1 của redesign:

- **Option A**: Không hỗ trợ seated events (chỉ General Admission — mua vé, không chọn chỗ). Đơn giản, cover 80% use case entertainment.
- **Option B**: Hỗ trợ seated events ở mức cơ bản (chọn khu vực, không chọn chỗ cụ thể).
- **Option C**: Hỗ trợ đầy đủ (chọn chỗ cụ thể, seat map). Phức tạp đáng kể, đặc biệt về concurrency (giữ chỗ, hết hạn, race condition).

**Khuyến nghị của tôi:** Option A cho V1 (đơn giản, tập trung vào core flow). Seated events là extension tự nhiên cho V2.

---

### OQ-2: Promotions / Discount Codes

Hệ thống hiện tại có cả `promotions` và `vouchers`. Trong V1:

- **Option A**: Không có discount/promotion (đơn giản hóa flow thanh toán và settlement).
- **Option B**: Hỗ trợ discount code cơ bản (Organizer tạo mã giảm giá cho event của mình).

**Khuyến nghị:** Option A cho V1. Discount codes thêm phức tạp cho payment, refund, commission calculation mà không phải core value.

---

### OQ-3: Phí hoa hồng khi Refund

Khi Attendee được refund, phí hoa hồng Platform đã thu trước đó xử lý thế nào?

- **Option A**: Platform giữ lại hoa hồng (Organizer chịu). Ví dụ: Vé 100k, hoa hồng 10k → Refund Attendee 100k, Organizer mất 10k.
- **Option B**: Platform hoàn lại hoa hồng (Platform chịu). Ví dụ: Vé 100k, hoa hồng 10k → Refund Attendee 100k, Platform mất 10k.
- **Option C**: Tùy loại refund. Event bị hủy bởi Organizer → Organizer chịu. Attendee tự hủy trong thời hạn → Platform chịu.

---

### OQ-4: Thời hạn Refund

Attendee có thể request refund trong bao lâu trước Event?

- **Option A**: Cố định (ví dụ: 7 ngày trước event).
- **Option B**: Organizer tự cấu hình refund policy khi tạo event.
- **Option C**: Không cho refund trừ khi Event bị hủy.

---

### OQ-5: Featured Profiles / Artists

Hệ thống hiện tại có khái niệm "Featured Profiles" (nghệ sĩ, diễn giả được gắn vào event). Trong V1:

- **Option A**: Không có. Event chỉ có thông tin mô tả, Organizer tự viết tên nghệ sĩ trong description.
- **Option B**: Có danh mục Featured Profiles cơ bản (tên, ảnh, bio) gắn vào event. Attendee có thể follow.

**Khuyến nghị:** Option A cho V1. Featured profiles thêm domain riêng biệt (social, follow, notification) mà không phải core marketplace.

---

### OQ-6: Organizer có thể tạo nhiều Event cùng lúc không?

- **Option A**: Không giới hạn — Organizer tạo bao nhiêu event tùy ý.
- **Option B**: Giới hạn số event active tùy theo trạng thái Organizer (ví dụ: Organizer mới chỉ được 3 event active).

---

## 8. Event Types (V1)

Dựa trên scope đã đồng ý, V1 hỗ trợ các loại sự kiện:

| Category | Ví dụ |
|---|---|
| **Music** | Concert, live show, DJ night |
| **Festival** | Music festival, food festival, art festival |
| **Community** | Meetup, networking, hackathon |
| **Education** | Workshop, seminar, conference |
| **Entertainment** | Comedy show, theater, exhibition, party |

> Tất cả đều dùng chung flow: Tạo event → Duyệt → Bán vé → Check-in → Settlement. Không có flow riêng biệt cho từng loại.

---

## 9. Tổng kết Scope V1

```
┌─────────────────────────────────────────────────┐
│              EVENTING PLATFORM V1               │
│                                                 │
│  ┌─────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Event   │  │ Ticketing│  │ Payment &     │  │
│  │ Mgmt    │  │          │  │ Finance       │  │
│  │         │  │          │  │               │  │
│  │ Create  │  │ Define   │  │ Checkout      │  │
│  │ Edit    │  │ Purchase │  │ Commission    │  │
│  │ Approve │  │ Check-in │  │ Settlement    │  │
│  │ Cancel  │  │ Refund   │  │ Payout        │  │
│  │ Search  │  │          │  │ Refund        │  │
│  └─────────┘  └──────────┘  └───────────────┘  │
│                                                 │
│  ┌─────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ User    │  │ Notif.   │  │ Review &      │  │
│  │ Mgmt    │  │          │  │ Rating        │  │
│  │         │  │ Order    │  │               │  │
│  │ Auth    │  │ Reminder │  │ Write Review  │  │
│  │ Profile │  │ Update   │  │ View Reviews  │  │
│  │ Roles   │  │ Cancel   │  │               │  │
│  └─────────┘  └──────────┘  └───────────────┘  │
│                                                 │
│  Actors: Attendee, Organizer, Platform Admin    │
│  Payment: Gateway-agnostic (V1: ZaloPay)        │
│  Events: Entertainment + Community              │
└─────────────────────────────────────────────────┘
```

---

## 10. Next Steps

Sau khi scope document này được duyệt và các Open Questions được trả lời:

1. **Business Process Diagrams** — Vẽ chi tiết từng luồng nghiệp vụ (BPMN hoặc flowchart)
2. **Domain Model** — Xác định các Bounded Context, Entity, Value Object, Aggregate
3. **DDD Context Map** — Quan hệ giữa các domain
4. **Database Design** — Dựa trên Domain Model, không dựa trên source code cũ
5. **API Contract** — Dựa trên Business Process và Domain Model
