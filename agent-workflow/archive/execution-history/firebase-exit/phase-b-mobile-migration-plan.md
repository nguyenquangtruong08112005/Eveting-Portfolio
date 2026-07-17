# Phase B – Kế Hoạch Migration Mobile (Auth / Network / Storage / Push)

Trạng thái: draft  
Ngày: 2026-05-28  
Nguồn: `phase-a-audit.md`, `phase-b-backend-ports-plan.md`, `firebase-exit-plan.md`  
Phạm vi: `Mobile-2025-Eventing` (attendee) + `Mobile-2025-Eventing-Organizer` (organizer)

> ⚠️ Phase B backend ports (notification, user, event repository) phải hoàn thành và merged trước khi bắt đầu bất kỳ thay đổi nào trên mobile.

---

## 1. Auth Migration – FirebaseAuth → Backend-Owned Auth

### 1.1 Kiến trúc hiện tại

Cả hai app dùng `FirebaseAuth` với 5 flow:
- Email/password (`createUserWithEmailAndPassword`, `signInWithEmailAndPassword`)
- Google (`GoogleAuthProvider.getCredential` + `signInWithCredential`)
- Facebook (`FacebookAuthProvider.getCredential` + `signInWithCredential`)
- Email verification / password reset (Firebase ActionCodeSettings → deep link)
- Auth state listener (`FirebaseAuth.AuthStateListener`)

### 1.2 Kiến trúc thay thế (backend-owned auth per `firebase-exit-plan.md`)

| Thành phần | Triển khai |
|---|---|
| Password hash | argon2 (backend) |
| Access token | JWT short-lived (~15 phút) |
| Refresh token | DB-stored hashed token (~30 ngày) |
| Session | Bảng `sessions` với revoke support |
| Roles | user, organizer, admin trong bảng `user_roles` |

### 1.3 Endpoints backend cần có trước khi mobile migration

| Endpoint | Mô tả |
|---|---|
| `POST /auth/register` | Tạo user mới (email, password, displayName) → trả về access + refresh token |
| `POST /auth/login` | Email + password → access + refresh token |
| `POST /auth/refresh` | Refresh token → access token mới |
| `POST /auth/logout` | Revoke refresh token, xoá session |
| `POST /auth/send-verification-email` | Gửi email xác thực |
| `POST /auth/verify-email` | Xác thực email bằng code |
| `POST /auth/send-password-reset` | Gửi email reset mật khẩu |
| `POST /auth/reset-password` | Reset mật khẩu bằng code |
| `GET /auth/me` | Lấy thông tin user hiện tại |
| `POST /auth/google` | Nhận Google ID token → tạo/tìm user → trả về access + refresh token |
| `POST /auth/facebook` | Nhận Facebook access token → tạo/tìm user → trả về access + refresh token |

### 1.4 Mobile thay đổi

#### AuthRepositoryImpl (cả hai app)

| Firebase method | Backend replacement |
|---|---|
| `auth.createUserWithEmailAndPassword()` | `POST /auth/register` → lưu access/refresh token vào EncryptedSharedPreferences |
| `auth.signInWithEmailAndPassword()` | `POST /auth/login` → lưu tokens |
| `auth.signInWithCredential()` (Google) | Lấy Google ID token từ Credential Manager → `POST /auth/google` |
| `auth.signInWithCredential()` (Facebook) | Lấy Facebook access token → `POST /auth/facebook` |
| `auth.currentUser?.uid` | Đọc userId từ JWT payload hoặc từ token store |
| `auth.addAuthStateListener()` | Kiểm tra local token expiry + refresh flow |
| `auth.sendEmailVerification()` | `POST /auth/send-verification-email` |
| `auth.applyActionCode()` | `POST /auth/verify-email` |
| `auth.sendPasswordResetEmail()` | `POST /auth/send-password-reset` |
| `auth.verifyPasswordResetCode()` + `auth.confirmPasswordReset()` | `POST /auth/reset-password` |
| `auth.signOut()` | Xoá local tokens + `POST /auth/logout` |
| `auth.currentUser?.getIdToken()` (NetworkModule) | Đọc access token từ local store, refresh nếu hết hạn |

#### File cần sửa – `AuthRepositoryImpl.kt`

Cả hai project:
- `data/auth/AuthRepositoryImpl.kt` – thay thế toàn bộ implementation
- `data/auth/AuthRepository.kt` – cập nhật interface signature (bỏ Firebase imports)

#### File cần tạo mới

- `data/auth/TokenManager.kt` – quản lý access/refresh token trong EncryptedSharedPreferences
- `data/auth/AuthApiService.kt` – Retrofit interface cho `/auth/*` endpoints

---

## 2. Network Token / Session Changes

### 2.1 NetworkModule thay đổi

Hiện tại: `FirebaseAuth` được inject vào `provideOkHttpClient`, interceptor lấy token qua `auth.currentUser?.getIdToken(false)?.await()?.token`.

Thay thế: Interceptor đọc access token từ `TokenManager`, tự động refresh nếu 401.

### 2.2 Auth Interceptor mới

```
OkHttp Interceptor:
  1. Lấy access token từ TokenManager
  2. Gắn header "Authorization: Bearer <access_token>"
  3. Nếu response 401:
     - Gọi /auth/refresh với refresh token
     - Lưu access token mới
     - Retry request với token mới
     - Nếu refresh fail → logout user
```

### 2.3 Files cần sửa

| File | Project | Thay đổi |
|---|---|---|
| `di/NetworkModule.kt` | Cả hai | Bỏ `FirebaseAuth` parameter; dùng `TokenManager` |
| `di/AppModule.kt` | Cả hai | Bỏ `FirebaseAuth`, `FirebaseFirestore`, `FirebaseStorage` providers; thêm `TokenManager` |

### 2.4 Xoá direct `firebaseAuth.signOut()` trong ViewModel

- `HomeViewModel.kt` (Project 1, dòng 166) gọi `firebaseAuth.signOut()` trực tiếp → phải chuyển sang `signOutUseCase()`
- Kiểm tra tất cả ViewModel còn import `FirebaseAuth`:
  - `PostEventViewModel.kt` (Project 1) – xoá import, dùng thông tin user từ token

### 2.5 Token lifecycle

```
App start → đọc access token từ EncryptedSharedPreferences
         → nếu expired, gọi /auth/refresh
         → nếu refresh fail, xoá token, chuyển về màn hình login
         
401 response → refresh token → retry (tối đa 1 lần)
            → refresh fail → logout
```

---

## 3. Storage Migration – FirebaseStorage → S3 Signed URL

### 3.1 Hiện tại

Cả hai app dùng `FirebaseStorage` trong `UserRepositoryImpl.kt`:
```kotlin
storage.reference.child(path).putFile(uri).await()
storageRef.downloadUrl.await().toString()
```

### 3.2 Flow thay thế

Kiến trúc signed URL (`firebase-exit-plan.md` Phần G):

```
Mobile:                      Backend:                    S3 Provider:
  1. Gọi /media/upload-url     2. Tạo signed PUT URL      3. Pre-sign
  4. Upload file trực tiếp ──────────────────────────────► S3
     bằng signed URL
  5. Gọi /media/confirm        6. Lưu object key + URL
     ← return public URL
```

Hoặc backend-mediated upload nếu muốn kiểm soát chặt hơn:
```
Mobile:                        Backend:                       S3 Provider:
  1. POST /media/upload        2. Nhận file multipart
                               3. Upload lên S3 ──────────────►
                               4. Lưu record, return URL
```

### 3.3 Endpoints backend cần có

| Endpoint | Mô tả |
|---|---|
| `POST /media/upload-url` | Trả về signed PUT URL (thời hạn ngắn) |
| `POST /media/confirm` | Xác nhận upload hoàn tất, lưu object key |
| `POST /media/upload` | Backend-mediated upload (alternative) |
| `GET /media/:key` | Redirect hoặc trả về signed GET URL |

### 3.4 Files cần sửa

| File | Project | Thay đổi |
|---|---|---|
| `data/repository/UserRepositoryImpl.kt` | Cả hai | Bỏ FirebaseStorage, dùng Retrofit API upload |
| `domain/usecase/user/UploadImageUseCase.kt` | Cả hai | Cập nhật để không reference Firebase Storage |
| `di/AppModule.kt` | Cả hai | Bỏ FirebaseStorage provider |
| `constants/Constraints.kt` | Cả hai | Xoá `STORAGE_BUCKET_URL` |

### 3.5 Xử lý object key cũ

- Cần backend migration script copy object từ Firebase Storage bucket sang S3 bucket
- Object key mapping: `images/avatars/{uid}` → giữ nguyên path
- Thời gian chuyển đổi: dùng dual-read (thử S3 trước, fallback Firebase Storage) nếu cần

---

## 4. Push Migration – FCM → OneSignal

### 4.1 Hiện tại

**Project 1 (attendee):**
- `MyFirebaseMessagingService.kt` extends `FirebaseMessagingService`
- `MainActivity.kt` request FCM token → gửi lên backend
- `AuthRepositoryImpl.kt` signOut() gọi `FirebaseMessaging.getInstance().token` → `removeFcmToken`
- Backend lưu `fcmTokens` trong user document

**Project 2 (organizer):**
- Không có FCM service, không có push notification handling
- Vẫn gửi FCM token lên backend trong signOut

### 4.2 OneSignal integration

> Lưu ý: OneSignal Android vẫn cần FCM credentials bên dưới để Google Play delivery, nhưng app code không còn gọi `FirebaseMessaging` API trực tiếp.

#### Thêm dependency

```toml
# gradle/libs.versions.toml – cả hai project
onesignal = "5.1.26"
onesignal = { module = "com.onesignal:OneSignal", version.ref = "onesignal" }
```

```kotlin
// app/build.gradle.kts
implementation(libs.onesignal)
```

#### Files cần tạo

- `service/OneSignalMessagingService.kt` (Project 1) – extends `OneSignal.OSNotificationOpenedHandler`/`OSNotificationWillShowInForegroundHandler`
- `data/push/PushTokenManager.kt` (cả hai) – quản lý OneSignal subscription ID

#### Files cần sửa

| File | Project | Thay đổi |
|---|---|---|
| `service/MyFirebaseMessagingService.kt` | Project 1 | Xoá class; thay bằng OneSignal handler |
| `MainActivity.kt` | Project 1 | Bỏ `FirebaseMessaging.getInstance().token`; dùng OneSignal init |
| `MainViewModel.kt` | Project 1 | `updateFcmToken` → `updatePushToken` với OneSignal ID |
| `AuthRepositoryImpl.kt` | Cả hai | `signOut()` gửi OneSignal subscription ID thay vì FCM token |
| `AndroidManifest.xml` | Project 1 | Bỏ `MyFirebaseMessagingService` declaration; thêm OneSignal metadata |
| `MyApp.kt` | Cả hai | Khởi tạo OneSignal thay vì chỉ `FirebaseApp.initializeApp()` |

#### Giữ nguyên payload contract

Backend notification record cần giữ trường `eventId`, `type` trong payload để OneSignal handler đọc được và điều hướng:

```kotlin
// OneSignal handler
override fun notificationWillShowInForeground(notification: OSNotification): OSNotification? {
    val eventId = notification.additionalData?.optString("eventId")
    val type = notification.additionalData?.optString("type")
    // hiển thị notification với eventId/type để khi tap có thể điều hướng
    return notification
}
```

#### Topic mapping

```text
Firebase topic "all"          → OneSignal segment "All Users"
Firebase topic "organizers"   → OneSignal externalUserId tag role=organizer
Firebase token targeting      → OneSignal subscription ID / externalUserId
```

---

## 5. Likely Files Later Touched (tất cả các Phase)

### 5.1 Mobile files (cả hai project)

| File | Phase | Thay đổi |
|---|---|---|
| `data/auth/AuthRepositoryImpl.kt` | B/F | Auth flow migration |
| `data/auth/AuthRepository.kt` | B/F | Interface thay đổi |
| `di/NetworkModule.kt` | B/F | Token management layer |
| `di/AppModule.kt` | B/F | Thay Firebase DI bằng custom DI |
| `data/repository/UserRepositoryImpl.kt` | G | Storage upload flow |
| `service/MyFirebaseMessagingService.kt` | H | Xoá class (chỉ Project 1) |
| `MainActivity.kt` | H | Push initialization (Project 1) |
| `MainViewModel.kt` | H | Push token logic |
| `ui/main/MainViewModel.kt` | H | Token update use case |
| `ui/screens/home/HomeViewModel.kt` | F | Xoá direct `firebaseAuth.signOut()` |
| `ui/screens/auth/signin/SignInViewModel.kt` | F | Bỏ Firebase exception mapping |
| `ui/screens/auth/signup/SignUpViewModel.kt` | F | Bỏ Firebase exception mapping |
| `ui/screens/auth/verification/VerificationScreen.kt` | F | Bỏ `firebase_common_keep` resource |
| `ui/navigation/Navigation.kt` | F | Bỏ Firebase deep link parsing |
| `data/network/EventApiService.kt` | F/H | Endpoint thay đổi cho token/push |
| `data/network/model/UserDto.kt` | F/H | DTO thay đổi |
| `domain/model/User.kt` | F/H | `fcmTokens` field → `pushTokens` |
| `data/local/entity/UserEntity.kt` | F/H | Entity field thay đổi |
| `data/mapper/UserMapper.kt` | F/H | Mapping thay đổi |
| `helpers/ShareUtils.kt` | F | Xoá Firebase deep link comment |
| `constants/Constraints.kt` | G | Xoá STORAGE_BUCKET_URL |
| `app/build.gradle.kts` | F/G/H/I | Xoá Firebase dependencies từng phase |
| `gradle/libs.versions.toml` | F/G/H/I | Xoá Firebase version entries |
| `build.gradle.kts` (root) | I | Xoá google-services plugin |
| `app/google-services.json` | I | Xoá file |

### 5.2 Backend files (Phase B-D, F, G, H)

| File | Phase | Thay đổi |
|---|---|---|
| `config/firebase.config.js` | I | Xoá (Phase I, không đụng trong B) |
| `middleware/auth.middleware.js` | F | Chuyển từ Firebase verifyIdToken sang JWT verify |
| `routes/*` | F | Thêm auth routes |
| `services/fcm.service.js` | H | Thay bằng OneSignal adapter |
| `services/media.service.js` | G | Storage provider port |
| `ports/storage.provider.js` | G | Tạo mới |
| `adapters/s3/` | G | Tạo mới |
| `adapters/onesignal/` | H | Tạo mới |

### 5.3 Files cần tạo mới (tổng hợp)

| File | Project | Phase |
|---|---|---|
| `data/auth/TokenManager.kt` | Cả hai | B |
| `data/auth/AuthApiService.kt` | Cả hai | B |
| `service/OneSignalMessagingService.kt` | Project 1 | H |
| `data/push/PushTokenManager.kt` | Cả hai | H |

---

## 6. Backend Compatibility Gates

### G1: Auth endpoints availability

Tất cả auth endpoints (`/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`, `/auth/google`, `/auth/facebook`) phải deployed và tested trước khi mobile chuyển từ FirebaseAuth.

### G2: Token contract

Backend JWT access token payload phải chứa ít nhất `{ sub: userId, email, role, iat, exp }`.  
Mobile decode JWT (hoặc gọi `/auth/me`) để lấy userId thay vì `auth.currentUser?.uid`.

### G3: User data port

`userRepository.findById()` (Phase B, Slice 2) phải implement xong để backend có thể tìm user bằng backend ID thay vì Firebase UID.

### G4: Refresh token rotation

Backend phải implement refresh token rotation (mỗi lần refresh cấp token mới, vô hiệu hoá token cũ) để tránh replay attack.

### G5: Storage signed URL endpoint

`POST /media/upload-url`, `POST /media/confirm` hoặc `POST /media/upload` phải deployed trước khi mobile ngừng dùng Firebase Storage.

### G6: OneSignal API key

Backend `notificationProvider.sendToUsers()` dùng OneSignal API key, phải configured trong env trước khi mobile chuyển push.

### G7: Legacy UID bridge

Trong thời gian migration, Firebase UID và backend user ID cùng tồn tại. Backend cần mapping table hoặc giữ `firebase_uid` trong bảng `users` để mobile cũ vẫn hoạt động.

---

## 7. Risks

### P0 – Critical

| Risk | Tác động | Mitigation |
|---|---|---|
| R1: Auth migration lockout | User không thể đăng nhập sau khi backend auth thay thế FirebaseAuth. Tất cả users bị ảnh hưởng. | Giữ legacy Firebase UID mapping. Rollback plan: quay lại FirebaseAuth bằng feature flag. Test với staging user trước. |
| R2: Token refresh race condition | Nhiều request 401 đồng thời gây nhiều refresh call → token inconsistent. | Dùng mutex/ lock cho refresh flow. Chỉ một refresh call duy nhất, các request khác chờ. |
| R3: Storage URL breaking | Ảnh/ media cũ bị broken nếu object key không mapping đúng từ Firebase Storage sang S3. | Dual-read strategy: thử S3 trước, fallback Firebase Storage. Migration script verify từng object. |
| R4: Google/Facebook OAuth flow break | User không thể đăng nhập bằng Google/Facebook nếu backend chưa handle ID token. | Triển khai `/auth/google` và `/auth/facebook` trước. Test với ID token thật từ staging app. |

### P1 – High

| Risk | Tác động | Mitigation |
|---|---|---|
| R5: Email verification / password reset deep link | Firebase ActionCodeSettings dùng deep link `eventing-baa25.firebaseapp.com`. Backend-owned auth cần deep link mới. | Dùng custom scheme hoặc Universal Link. Mobile Navigation.kt parsing code phải cập nhật. |
| R6: OneSignal payload field mapping | Nếu `eventId` / `type` không được map đúng từ FCM data sang OneSignal additionalData, notification tap không điều hướng được. | Test payload mapping với từng notification type. So sánh output giữa FCM và OneSignal. |
| R7: Concurrent auth state | Mobile app có thể mất sync giữa local token state và server session nếu refresh token bị revoke admin. | Thêm interceptor kiểm tra 401 và force logout nếu refresh fail. Push notification từ backend để notify session revoked. |
| R8: Clean Architecture violation | ViewModel import FirebaseAuth trực tiếp (HomeViewModel.kt file). Cần kiểm tra toàn bộ codebase trước khi migration. | Grep `import com.google.firebase.auth` toàn bộ project. Tạo task list từng file. |

### P2 – Medium

| Risk | Tác động | Mitigation |
|---|---|---|
| R9: Google Services plugin còn phụ thuộc Firebase | Nếu chỉ dùng `play-services-auth` (Google Sign-In), vẫn cần google-services plugin và google-services.json. | Có thể giữ plugin nếu cần Google Sign-In. Chỉ xoá khi Credential Manager API thay thế hoàn toàn. |
| R10: FCM transport dependency của OneSignal | OneSignal Android vẫn cần FCM credentials để Google Play delivery, nên google-services.json có thể cần giữ. | Chấp nhận dependency này. Document rõ đây là transport-only, không phải business logic. |
| R11: `firebase_common_keep` resource | `VerificationScreen.kt` dùng Lottie animation từ Firebase SDK internal R.raw. | Thay bằng local Lottie file hoặc tuỳ chỉnh animation. Cần xử lý trước khi xoá Firebase SDK. |
| R12: Facebook SDK credential | Facebook login flow dùng `FacebookAuthProvider.getCredential` cần backend `/auth/facebook` handle Facebook access token. | Backend dùng Facebook Graph API verify token, sau đó tạo user/session. Cần Facebook App ID configured. |
| R13: Worktree dirty state | Cả hai mobile repo đã dirty, migration cần branch sạch. | Tạo feature branch từ main. Không mix với Phase 1 eventing changes. |

### R0 – Post-migration

| Risk | Tác động | Mitigation |
|---|---|---|
| R14: Seed scripts | Seed scripts dùng Firebase Admin SDK để tạo dữ liệu mẫu. Cần thay bằng Postgres seed. | Phase E – Data migration sẽ xử lý. |
| R15: Rollback khó nếu merge nhiều phase | Nếu auth + push + storage merged cùng lúc, rollback phức tạp. | Mỗi phase là một PR riêng. Rollback từng PR, không batch. |

---

## 8. CMD Verification Commands

### 8.1 Pre-migration – kiểm tra Firebase coupling hiện tại

```powershell
# FirebaseAuth imports trong mobile
rg -n "import com.google.firebase.auth" Mobile-2025-Eventing -g "**/*.kt" -g "!**/build/**"
rg -n "import com.google.firebase.auth" Mobile-2025-Eventing-Organizer -g "**/*.kt" -g "!**/build/**"

# FirebaseStorage imports
rg -n "import com.google.firebase.storage" Mobile-2025-Eventing -g "**/*.kt" -g "!**/build/**"
rg -n "import com.google.firebase.storage" Mobile-2025-Eventing-Organizer -g "**/*.kt" -g "!**/build/**"

# FirebaseMessaging imports (chỉ Project 1)
rg -n "import com.google.firebase.messaging" Mobile-2025-Eventing -g "**/*.kt" -g "!**/build/**"

# Direct FirebaseAuth usage trong ViewModel
rg -n "firebaseAuth" Mobile-2025-Eventing -g "**/*.kt" -g "!**/build/**"
rg -n "firebaseAuth" Mobile-2025-Eventing-Organizer -g "**/*.kt" -g "!**/build/**"

# FCM token references
rg -n "FcmToken\|fcmToken" Mobile-2025-Eventing -g "**/*.kt" -g "!**/build/**"
rg -n "FcmToken\|fcmToken" Mobile-2025-Eventing-Organizer -g "**/*.kt" -g "!**/build/**"

# Firebase deep link parsing
rg -n "firebaseapp\.com\|oobCode\|mode" Mobile-2025-Eventing -g "**/*.kt" -g "!**/build/**"
rg -n "firebaseapp\.com\|oobCode\|mode" Mobile-2025-Eventing-Organizer -g "**/*.kt" -g "!**/build/**"

# google-services.json còn tồn tại
Test-Path Mobile-2025-Eventing/app/google-services.json
Test-Path Mobile-2025-Eventing-Organizer/app/google-services.json
```

### 8.2 Post-auth migration – verify không còn FirebaseAuth

```powershell
# Kiểm tra không còn FirebaseAuth DI provider
rg -n "FirebaseAuth" Mobile-2025-Eventing -g "**/di/*.kt" -g "!**/build/**"
rg -n "FirebaseAuth" Mobile-2025-Eventing-Organizer -g "**/di/*.kt" -g "!**/build/**"

# Kiểm tra NetworkModule không dùng FirebaseAuth
rg -n "FirebaseAuth" Mobile-2025-Eventing -g "**/NetworkModule.kt" -g "!**/build/**"
rg -n "FirebaseAuth" Mobile-2025-Eventing-Organizer -g "**/NetworkModule.kt" -g "!**/build/**"

# Kiểm tra không còn direct auth.signOut trong ViewModel
rg -n "\.signOut\(\)" Mobile-2025-Eventing -g "**/*ViewModel.kt" -g "!**/build/**"
rg -n "\.signOut\(\)" Mobile-2025-Eventing-Organizer -g "**/*ViewModel.kt" -g "!**/build/**"

# Kiểm tra AuthRepositoryImpl không còn Firebase import
rg -n "com\.google\.firebase" Mobile-2025-Eventing -g "**/AuthRepositoryImpl.kt"
rg -n "com\.google\.firebase" Mobile-2025-Eventing-Organizer -g "**/AuthRepositoryImpl.kt"

# Kiểm tra AppModule không còn Firebase provider
rg -n "FirebaseAuth\|FirebaseFirestore\|FirebaseStorage" Mobile-2025-Eventing -g "**/AppModule.kt"
rg -n "FirebaseAuth\|FirebaseFirestore\|FirebaseStorage" Mobile-2025-Eventing-Organizer -g "**/AppModule.kt"
```

### 8.3 Post-storage migration

```powershell
# Kiểm tra không còn FirebaseStorage
rg -n "FirebaseStorage\|firebase-storage\|storage\.reference" Mobile-2025-Eventing -g "**/*.kt" -g "!**/build/**"
rg -n "FirebaseStorage\|firebase-storage\|storage\.reference" Mobile-2025-Eventing-Organizer -g "**/*.kt" -g "!**/build/**"

# Kiểm tra UserRepositoryImpl dùng API upload thay vì Storage
rg -n "putFile\|downloadUrl\|STORAGE_BUCKET_URL" Mobile-2025-Eventing -g "**/*.kt" -g "!**/build/**"
rg -n "putFile\|downloadUrl\|STORAGE_BUCKET_URL" Mobile-2025-Eventing-Organizer -g "**/*.kt" -g "!**/build/**"
```

### 8.4 Post-push migration (Project 1)

```powershell
# Kiểm tra không còn FirebaseMessagingService
rg -n "FirebaseMessagingService\|MyFirebaseMessagingService" Mobile-2025-Eventing -g "**/*.kt" -g "!**/build/**"

# Kiểm tra đã dùng OneSignal
rg -n "OneSignal\|com\.onesignal" Mobile-2025-Eventing -g "**/*.kt" -g "!**/build/**"

# Kiểm tra payload eventId/type được giữ nguyên
rg -n "eventId\|type" Mobile-2025-Eventing -g "**/service/*.kt" -g "!**/build/**"
```

### 8.5 Build verification

```powershell
# Clean build – Project 1
Set-Location -LiteralPath "Mobile-2025-Eventing"
./gradlew clean assembleDebug   # timeout 300000

# Clean build – Project 2
Set-Location -LiteralPath "Mobile-2025-Eventing-Organizer"
./gradlew clean assembleDebug   # timeout 300000

# Kiểm tra không còn google-services dependency trong build.gradle.kts
rg -n "google-services\|firebase-" Mobile-2025-Eventing/app/build.gradle.kts
rg -n "google-services\|firebase-" Mobile-2025-Eventing-Organizer/app/build.gradle.kts
```

### 8.6 Backend compatibility check

```powershell
# Kiểm tra auth endpoints deployed (cần health check)
curl -s -o /dev/null -w "%{http_code}" https://api.domain.com/auth/me

# Kiểm tra storage signed URL endpoint
curl -s -o /dev/null -w "%{http_code}" https://api.domain.com/media/upload-url

# Kiểm tra notification provider config
rg -n "ONESIGNAL\|oneSignal" Server-2025-Eventing/.env
rg -n "ONESIGNAL\|oneSignal" Server-2025-Eventing/config/
```

---

## 9. Phase Order & Dependencies

```text
Phase B (backend ports) ──► Phase F (auth backend) ──► Mobile Auth
                              │
                              ├──► Phase G (storage backend) ──► Mobile Storage
                              │
                              └──► Phase H (push backend) ──► Mobile Push
```

Mobile không thể migration trước backend endpoints sẵn sàng.

### Mobile implementation branches đề xuất

| Branch | Nội dung | Backend gate |
|---|---|---|
| `agent/copilot-phase-b-mobile-auth-map` | Read-only; xác nhận danh sách file | Phase B done |
| `agent/copilot-phase-f-mobile-auth` | AuthRepositoryImpl, NetworkModule, TokenManager | Phase F auth endpoints ready |
| `agent/copilot-phase-g-mobile-storage` | UserRepositoryImpl upload flow | Phase G storage endpoints ready |
| `agent/copilot-phase-h-mobile-push` | OneSignal integration | Phase H push endpoints ready |
| `agent/copilot-phase-i-mobile-cleanup` | Xoá Firebase deps, google-services.json, build config | All phases done |

---

## Tóm tắt

| Mục | Chi tiết |
|---|---|
| Auth migration | Xoá FirebaseAuth; thay bằng `/auth/*` endpoints + TokenManager + JWT interceptor. 4 file sửa, 2 file tạo mới mỗi project. |
| Network token/session | Interceptor dùng TokenManager thay vì `auth.currentUser?.getIdToken()`. AppModule bỏ Firebase providers. |
| Storage migration | UserRepositoryImpl bỏ FirebaseStorage; dùng backend signed URL flow. Endpoint `/media/upload-url` cần triển khai trước. |
| Push migration | Project 1: MyFirebaseMessagingService → OneSignal handler. Giữ nguyên `eventId`/`type` payload. Project 2: không push, chỉ sửa token management. |
| Files later touched | ~28 file mỗi project (auth DI, repository, ViewModel, Navigation, build.gradle, manifest). |
| Backend gates | G1–G7: Auth endpoints, token contract, user port, refresh rotation, storage endpoint, OneSignal key, legacy UID bridge. |
| P0 risks | Auth lockout (R1), token refresh race (R2), storage URL broken (R3), OAuth flow break (R4). |
| P1 risks | Deep link (R5), OneSignal payload (R6), concurrent auth state (R7), CA violation (R8). |
| P2 risks | Google Services plugin (R9), FCM transport (R10), `firebase_common_keep` (R11), Facebook SDK (R12), dirty worktree (R13). |
| CMD verification | 6 nhóm command: pre-migration, post-auth, post-storage, post-push, build, backend compatibility. |
