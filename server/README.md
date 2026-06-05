# Hệ thống Quản lý Sự kiện - Server-2025-Eventing

Đây là hệ thống backend cho một ứng dụng quản lý và bán vé sự kiện. Được xây dựng bằng Node.js và Express, hệ thống cung cấp một API RESTful toàn diện để quản lý người dùng, sự kiện, vé, thanh toán, và nhiều hơn nữa.

## ✨ Tính năng chính

- **Quản lý Sự kiện:** Tạo, đọc, cập nhật, xóa sự kiện, quản lý địa điểm và nhà tổ chức.
- **Quản lý Vé:** Xử lý các loại vé, giá cả, số lượng và QR code.
- **Xác thực & Quản lý Người dùng:** Đăng ký, đăng nhập (JWT), quản lý hồ sơ người dùng và phân quyền.
- **Thanh toán:** Tích hợp với cổng thanh toán (ví dụ: ZaloPay).
- **Thông báo:** Gửi thông báo đẩy (push notifications) qua OneSignal.
- **Tìm kiếm:** Tích hợp Elasticsearch để tìm kiếm sự kiện và nội dung khác một cách hiệu quả.
- **Đánh giá & Bình luận:** Người dùng có thể đánh giá và bình luận về các sự kiện.
- **Khuyến mãi:** Tạo và quản lý các chương trình khuyến mãi.
- **Quản trị:** Các chức năng dành cho quản trị viên hệ thống.
- **Phân tích:** Theo dõi và phân tích dữ liệu hệ thống.

## 🚀 Công nghệ sử dụng

- **Backend:** Node.js, Express.js
- **Database/Search:** Elasticsearch
- **Dịch vụ Cloud:** Elasticsearch, OneSignal
- **Containerization:** Docker
- **Xác thực:** JSON Web Tokens (JWT)
- **Thanh toán:** Tích hợp ZaloPay (dựa trên cấu hình)
- **Upload File:** Multer
- **Tác vụ nền:** Node-cron cho các công việc định kỳ (ví dụ: gửi email nhắc nhở).

## 📂 Cấu trúc thư mục

```
/
├── config/         # Cấu hình cho các dịch vụ (DB, ZaloPay)
├── controllers/    # Logic xử lý request và response
├── jobs/           # Các tác vụ chạy nền (cron jobs)
├── middleware/     # Các middleware (xác thực, giới hạn request)
├── routes/         # Định nghĩa các API endpoints
├── seed/           # Dữ liệu mẫu để khởi tạo hệ thống
├── services/       # Logic nghiệp vụ chính của ứng dụng
├── utils/          # Các hàm tiện ích (tạo QR, validators)
├── app.js          # File khởi tạo chính của ứng dụng
└── docker-compose.yml # Cấu hình để chạy ứng dụng với Docker
```

## ⚙️ Cài đặt và Chạy dự án

### Yêu cầu

- [Node.js](https://nodejs.org/) (phiên bản 18.x trở lên)
- [Docker](https://www.docker.com/) (tùy chọn)
- npm

### Hướng dẫn

1.  **Clone repository:**
    ```bash
    git clone <URL_CUA_REPOSITORY>
    cd Server-2025-Eventing
    ```

2.  **Cài đặt các dependencies:**
    ```bash
    npm install
    ```

3.  **Cấu hình môi trường:**
    Tạo một file `.env` ở thư mục gốc và định nghĩa các biến môi trường cần thiết. Bạn có thể tham khảo các file trong thư mục `config/` để biết các biến cần thiết (ví dụ: thông tin kết nối Elasticsearch, khóa bí mật cho JWT).

4.  **Chạy dự án ở chế độ phát triển:**
    Lệnh này sẽ khởi động server với `nodemon`, tự động khởi động lại khi có thay đổi.
    ```bash
    npm run dev
    ```
    Server sẽ chạy tại `http://localhost:3000`.

5.  **Chạy dự án với Docker (tùy chọn):**
    ```bash
    docker-compose up -d
    ```

## 📜 Scripts có sẵn

Trong file `package.json`, có các scripts sau:

- `npm run dev`: Chạy server ở chế độ development bằng `nodemon`.
- `npm start`: Chạy server và `ngrok` để tạo tunnel public (hữu ích cho việc test webhook).