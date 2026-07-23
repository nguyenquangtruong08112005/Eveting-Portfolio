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

Sau khi tái cấu trúc, mã nguồn của ứng dụng được tổ chức như sau:

```
/
├── .github/workflows/
│   └── server-ci.yml       # Tự động chạy CI check trên GitHub Actions
├── db/                     # Quản lý cơ sở dữ liệu
│   ├── migrations/         # Lưu trữ các file SQL/JS migration
│   └── migrate.js          # Script thực thi migrations
├── infra/
│   └── docker/
│       └── docker-compose.local.yml # Docker Compose chạy PostgreSQL & Elasticsearch local
├── scripts/                # Các script kiểm tra vận hành (smoke tests, check syntax, seed)
├── src/                    # Thư mục mã nguồn chính của ứng dụng
│   ├── config/             # Cấu hình ứng dụng và kết nối các dịch vụ
│   ├── controllers/        # Tiếp nhận request và điều phối dữ liệu
│   ├── jobs/               # Tác vụ chạy nền tuần kỳ (cron jobs)
│   ├── middleware/         # Middleware lọc request (xác thực, kiểm tra dữ liệu, v.v.)
│   ├── providers/          # Bộ điều hợp kết nối các dịch vụ bên ngoài (AWS S3, Elasticsearch, Postgres)
│   ├── routes/             # Định nghĩa cấu trúc API Endpoints
│   ├── services/           # Xử lý logic nghiệp vụ chính của ứng dụng
│   ├── utils/              # Các hàm tiện ích dùng chung
│   └── app.js              # Khởi tạo Express app và đăng ký middleware/routes
├── app.js                  # Entrypoint tương thích ngược (root) chuyển tiếp đến src/app.js
├── docker-compose.yml      # Cấu hình chạy riêng Elasticsearch (tương thích ngược)
└── package.json            # Định nghĩa scripts và dependencies của hệ thống
```

## ⚙️ Cài đặt và Chạy dự án

### Yêu cầu

- [Node.js](https://nodejs.org/) (phiên bản 18.x hoặc 20.x trở lên)
- [Docker](https://www.docker.com/) (để chạy các dịch vụ local)
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
    Tạo file `.env` ở thư mục gốc và định nghĩa các biến môi trường cần thiết theo cấu hình mẫu.

4.  **Khởi động các dịch vụ cơ sở dữ liệu local (PostgreSQL & Elasticsearch):**
    Sử dụng Docker Compose để dựng nhanh môi trường local:
    ```bash
    docker compose -f infra/docker/docker-compose.local.yml up -d
    ```

5.  **Chạy migrations để thiết lập schema cơ sở dữ liệu:**
    ```bash
    npm run db:migrate
    ```

6.  **Chạy dự án ở chế độ phát triển:**
    ```bash
    npm run dev
    ```
    Server sẽ khởi chạy tại `http://localhost:3000`.

## 📜 Các Scripts có sẵn

Trong file `package.json`, bạn có thể chạy các câu lệnh:

- `npm run dev`: Khởi động server ở chế độ phát triển bằng `nodemon`.
- `npm start`: Chạy server và khởi tạo `ngrok` tunnel (phục vụ test webhook).
- `npm run db:migrate`: Thực thi các tệp tin migrations trong `db/migrations/`.
- `npm run ci:check`: Chạy kiểm tra cú pháp Javascript (`scripts/check-js-syntax.js`) và kiểm thử kết nối của các lazy providers.
- `npm run observability:up`: Khởi chạy stack giám sát (Prometheus, Grafana, Loki, Promtail, Node Exporter).
- `npm run observability:down`: Dừng stack giám sát.
- `npm run logs:tail:app`: Theo dõi log hệ thống thời gian thực (Windows CMD).
- `npm run logs:tail:http`: Theo dõi log HTTP request thời gian thực (Windows CMD).

## 📊 Giám sát & Quan sát (Observability)

Dự án tích hợp sẵn một hệ thống giám sát và ghi log toàn diện:
- **Đường dẫn Log File (định dạng JSONL):**
  - Application Logs: `logs/app.log`
  - HTTP Request Logs: `logs/http.log`
- **Các cổng dịch vụ mặc định:**
  - Prometheus: `http://localhost:9090` (Scrapes metrics tại `/metrics`)
  - Grafana: `http://localhost:3001` (Mặc định: `admin` / `admin`, đã cấu hình sẵn Dashboard)
  - Loki: `http://localhost:3100` (Thu thập log thông qua Promtail)

### Câu lệnh tương thích CMD (Windows) để quản lý Observability:
- Khởi động giám sát:
  ```cmd
  docker compose -f infra\docker\docker-compose.observability.yml up -d
  ```
- Dừng giám sát:
  ```cmd
  docker compose -f infra\docker\docker-compose.observability.yml down
  ```
- Xem log thời gian thực:
  ```cmd
  npm run logs:tail:app
  npm run logs:tail:http
  ```
