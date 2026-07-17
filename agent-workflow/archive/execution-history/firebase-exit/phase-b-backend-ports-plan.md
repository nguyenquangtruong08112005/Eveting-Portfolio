# Phase B – Kế Hoạch Backend Ports & Adapter

Trạng thái: draft
Ngày: 2026-05-28
Nguồn: `phase-a-audit.md`, `firebase-exit-plan.md`

---

## 1. Ba Slice Backend Đầu Tiên (Sắp Xếp Theo Độ An Toàn)

### Slice 1 – `notificationRepository` (An toàn nhất)

| Thuộc tính | Giá trị |
|---|---|
| Lý do | Collection nhỏ, CRUD thuần, không dùng `FieldValue.arrayUnion/Remove`. Ít service phụ thuộc. Blast radius nhỏ nhất. |
| Rủi ro | Thấp |

### Slice 2 – `userRepository`

| Thuộc tính | Giá trị |
|---|---|
| Lý do | Chứa `arrayUnion`/`arrayRemove` (fcmTokens, following) cần chuyển sang join tables. Blocking cho auth migration (Phase F). Pattern rõ ràng. |
| Rủi ro | Trung bình |

### Slice 3 – `eventRepository`

| Thuộc tính | Giá trị |
|---|---|
| Lý do | God service, nhiều query pattern phức tạp, search + Elasticsearch sync dependency. Cần adapter handle nested map và FieldPath.documentId(). |
| Rủi ro | Cao nhất trong 3 slice |

---

## 2. Branch Names

| Slice | Branch |
|---|---|
| notificationRepository | `agent/opencode-phase-b-notification-port` |
| userRepository | `agent/opencode-phase-b-user-port` |
| eventRepository | `agent/opencode-phase-b-event-port` |

Quy tắc đặt tên: `agent/opencode-phase-b-{module}-port`

Không dùng chung branch cho nhiều slice. Mỗi slice là một PR riêng.

---

## 3. Owned Files / Modules (Từng Slice)

### Slice 1 – notificationRepository

- `services/notification.service.js`
- `services/notification-event.helper.js`
- `controllers/notification.controller.js`
- `ports/notification.repository.js` (tạo mới)
- `adapters/firestore/notification.adapter.js` (tạo mới)

### Slice 2 – userRepository

- `services/user.service.js`
- `controllers/user.controller.js`
- `ports/user.repository.js` (tạo mới)
- `adapters/firestore/user.adapter.js` (tạo mới)

### Slice 3 – eventRepository

- `services/event.service.js`
- `controllers/event.controller.js`
- `ports/event.repository.js` (tạo mới)
- `adapters/firestore/event.adapter.js` (tạo mới)

---

## 4. Forbidden Files (Không Được Sửa Trong Phase B)

| File | Lý do cấm |
|---|---|
| `config/firebase.config.js` | Giữ nguyên. Adapter sẽ import từ đây, không xoá. |
| `middleware/auth.middleware.js` | Auth migration là Phase F. Không đụng trong Phase B. |
| `functions/index.js` | Functions replacement là Phase I. |
| `services/fcm.service.js` | Notification provider migration là Phase H. |
| `services/payment.service.js` | Phụ thuộc ticket repository, chưa implement. |
| `seed/*` | Seed scripts sẽ được thay thế trong Phase E. |
| `config/elasticsearch.config.js` | Elasticsearch sync chưa có quyết định thay thế. |
| `config/zalopay.config.js` | Thanh toán không liên quan Firebase. |
| `utils/*` | Chưa audit, không đụng. |
| `routes/*` | Router contracts giữ nguyên, không đổi. |

---

## 5. Repository Port Methods

### notificationRepository

| Method | Mô tả |
|---|---|
| `findByUserId(userId, limit, after)` | Lấy thông báo theo user, phân trang cursor |
| `markAsRead(notificationId, userId)` | Đánh dấu đã đọc |
| `create(data)` | Tạo thông báo mới |
| `markAllRead(userId)` | Đánh dấu tất cả đã đọc |
| `countUnread(userId)` | Đếm thông báo chưa đọc |

### userRepository

| Method | Mô tả |
|---|---|
| `findById(uid)` | Lấy user theo UID |
| `findByEmail(email)` | Lấy user theo email |
| `findByRole(role, pagination)` | Lấy user theo role, phân trang |
| `create(data)` | Tạo user mới |
| `updateProfile(uid, data)` | Cập nhật profile |
| `addFcmToken(uid, token)` | Thêm FCM token (join table) |
| `removeFcmToken(uid, token)` | Xoá FCM token khỏi join table |
| `getFollowers(uid)` | Lấy danh sách người theo dõi |
| `getFollowing(uid)` | Lấy danh sách đang theo dõi |
| `followUser(followerUid, targetUid)` | Theo dõi (insert join table) |
| `unfollowUser(followerUid, targetUid)` | Bỏ theo dõi (delete join table) |
| `addToHistory(uid, eventId)` | Thêm event vào lịch sử |
| `getHistory(uid, limit, after)` | Lấy lịch sử đã xem |

### eventRepository

| Method | Mô tả |
|---|---|
| `findById(eventId)` | Lấy event theo ID |
| `findMany(filters, pagination)` | Lấy danh sách event với bộ lọc |
| `search(query, filters)` | Tìm kiếm event |
| `create(data)` | Tạo event mới |
| `update(eventId, data)` | Cập nhật event |
| `delete(eventId)` | Xoá event |
| `getOrganizerEvents(organizerId, status)` | Lấy event của organizer |
| `getFeaturedProfiles(eventId)` | Lấy featured profiles của event |
| `addFeaturedProfile(eventId, profileId)` | Thêm profile vào event |
| `removeFeaturedProfile(eventId, profileId)` | Xoá profile khỏi event |
| `getLocation(eventId)` | Lấy địa điểm event |

---

## 6. Firestore Adapter Responsibilities

### Trách nhiệm chính

1. **Dịch method gọi** từ repository port thành truy vấn Firestore.
2. **Đóng gói `FieldValue`**: `arrayUnion`, `arrayRemove`, `increment` chỉ dùng bên trong adapter. Service layer không bao giờ thấy `FieldValue`.
3. **Đóng gói `FieldPath.documentId()`**: Chuyển thành truy vấn `WHERE id IN (...)` hoặc `ref.where(FieldPath.documentId(), 'in', ids)`.
4. **Nested map updates** (vd: `ticketTypes.${type}.available`): Xử lý trong adapter, không leak ra ngoài.
5. **Chunk/batch reads**: Adapter tự xử lý `firebase.firestore()` batch limits.
6. **Trả về plain JS objects**: Không trả về Firestore DocumentSnapshot. Map document thành object thuần.
7. **Wrap lỗi**: Firestore error → domain error:
   - Document không tồn tại → `NotFoundError`
   - Conflict (vd: duplicate) → `ConflictError`
   - Permission denied → `ForbiddenError`
   - Lỗi khác → `InternalError`
8. **Transaction**: Adapter có thể nhận transaction callback nếu service cần atomicity.

### Cấu trúc file adapter

```javascript
// adapters/firestore/notification.adapter.js
const { db, FieldValue } = require('../../config/firebase.config');

class FirestoreNotificationAdapter {
  async findByUserId(userId, limit = 20, after = null) {
    // Firestore query → map → plain objects
  }
  // ...
}

module.exports = FirestoreNotificationAdapter;
```

### Không được phép

- Adapter không được gọi service layer.
- Adapter không được thay đổi collection/table schema.
- Adapter không được gọi HTTP endpoints.

---

## 7. Behavior Compatibility Checks

### Contract check (mỗi method)

```
input(headers, params, body) → adapter.call(args) → output(JSON)
```

Phải giống hệt trước và sau khi refactor:

| Check | Mô tả |
|---|---|
| Response shape | Object keys, types (string, number, array, null) giống hệt |
| HTTP status code | 200, 201, 404, 409, 500 giống hệt |
| Pagination | Cursor `after`, `limit`, `hasMore` behavior giống hệt |
| Error message | Message text có thể khác, nhưng error code phải giống |
| Notification payload | `eventId`, `type` field được giữ nguyên |
| Array fields | `fcmTokens`, `following` trả về array phẳng giống hệt |
| Increment counters | Giá trị cuối cùng không đổi sau concurrent writes |
| Nested fields | `ticketTypes.*` shape giống hệt trong response |

### Cách verify

1. Viết unit test cho pure mapper functions.
2. So sánh output của adapter mới với output của code cũ (cùng input).
3. Gọi API endpoint, so sánh response body với snapshot trước khi thay đổi.

---

## 8. CMD Verification Commands

### Trước khi mở PR

```powershell
# 1. Kiểm tra service layer không còn import firebase trực tiếp
rg -n "require.*firebase" services/ -g "*.js"
rg -n "require.*firebase" controllers/ -g "*.js"

# 2. Kiểm tra service layer không gọi db.collection
rg -n "db\.collection" services/ -g "*.js"
rg -n "db\.collection" controllers/ -g "*.js"

# 3. Kiểm tra service layer không dùng FieldValue
rg -n "FieldValue" services/ -g "*.js"
rg -n "FieldValue" controllers/ -g "*.js"

# 4. Kiểm tra không đụng forbidden files
rg -n "require.*firebase" middleware/auth.middleware.js
rg -n "require.*firebase" functions/index.js
rg -n "require.*firebase" services/fcm.service.js
rg -n "require.*firebase" services/payment.service.js

# 5. Kiểm tra chỉ thay đổi owned files
git diff --name-only --diff-filter=M
# Output phải chỉ gồm owned files (services/*.js, controllers/*.js, ports/*, adapters/*)

# 6. Kiểm tra file mới nằm đúng thư mục
git diff --name-only --diff-filter=A
# Output phải chỉ gồm ports/*.js và adapters/firestore/*.js

# 7. Lint
npm run lint
```

---

## 9. Merge Gates

Gate list (tất cả phải PASS mới được merge):

| Gate | Mô tả | Hard/Soft |
|---|---|---|
| G1 | Không còn `require('firebase')` trong owned service files | Hard |
| G2 | Không còn `db.collection()` trong owned service files | Hard |
| G3 | Không còn `FieldValue` trong owned service files | Hard |
| G4 | `git diff` chỉ thay đổi owned files + file mới | Hard |
| G5 | Không thay đổi file trong forbidden list | Hard |
| G6 | Mọi API endpoint response shape không đổi | Hard |
| G7 | HTTP status codes không đổi | Hard |
| G8 | `npm run lint` pass | Hard |
| G9 | Mọi adapter method có unit test hoặc smoke test | Soft (ưu tiên) |
| G10 | Reviewer xác nhận không có logic thay đổi ngoài DB access | Hard |

Hard = bắt buộc. Soft = khuyến nghị.

---

## 10. Rollback Rule

### Quy tắc rollback

1. **Nếu một slice làm hỏng behavior**:
   - Revert toàn bộ branch của slice đó.
   - Không cherry-pick fix một phần.

2. **Sau khi revert**:
   - Mở bug ticket mô tả contract bị hỏng (response shape, status code, error behavior).
   - Đính kèm diff của PR bị revert.
   - Ghi rõ root cause (nếu đã xác định được).

3. **Điều kiện thử lại**:
   - Chỉ thử lại slice đó sau khi root cause đã được document.
   - Không merge slice khác trong lúc chờ.

4. **Không rollback liên quan đến Firebase config**:
   - `config/firebase.config.js` không bao giờ bị thay đổi trong Phase B, nên không cần rollback file này.

5. **Khi rollback xảy ra**:
   - Tất cả các adapter còn lại trong cùng batch phải được verify lại vì có thể phụ thuộc gián tiếp.

### Rollback command

```powershell
git checkout main
git branch -D agent/opencode-phase-b-{module}-port
git push origin --delete agent/opencode-phase-b-{module}-port  # nếu đã push
```

---

## Tóm Tắt

| Slice | Branch | Owned files | Rủi ro |
|---|---|---|---|
| notificationRepository | `agent/opencode-phase-b-notification-port` | notification.service.js, notification-event.helper.js, notification.controller.js | Thấp |
| userRepository | `agent/opencode-phase-b-user-port` | user.service.js, user.controller.js | Trung bình |
| eventRepository | `agent/opencode-phase-b-event-port` | event.service.js, event.controller.js | Cao |

Mỗi slice tạo mới: `ports/{module}.repository.js` + `adapters/firestore/{module}.adapter.js`.

Forbidden: `config/firebase.config.js`, `middleware/auth.middleware.js`, `functions/`, `fcm.service.js`, `payment.service.js`, `seed/*`.

Merge gates: G1–G10. Rollback: revert full branch, không cherry-pick.
