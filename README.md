# 🦖 DinoTalk Kids — Production AI English Learning Platform

Hệ thống học tiếng Anh giao tiếp AI, Thi Đua Thời Gian Thực (MQTT), Gọi Video 2 Chiều (WebRTC Split-Camera) và Phân Tích Hành Vi Học Ngôn Ngữ (PostgreSQL + `pgvector` RAG + Agent Harness) dành cho trẻ em 6–11 tuổi.

---

## 🏗️ 1. Kiến trúc hệ thống

```text
dinotalk-kids/
├── index.html                  # Giao diện chính (Chat AI, Phòng 4 Số, Split-Camera, Thi Đua, Chủ Đề, Phụ Huynh)
├── styles.css                  # Giao diện hoạt hình thân thiện cho trẻ 6–11 tuổi + Responsive Mobile
├── app.js                      # Logic Frontend + WebRTC + MQTT + Local/Cloud Behavior Engine
├── requirements.txt            # Danh sách thư viện (hỗ trợ Python/Script & tham chiếu thư viện hệ thống)
├── README.md                   # Hướng dẫn cài đặt và vận hành toàn hệ thống
└── dinotalk-backend/           # Production Backend (Node.js + Express + PostgreSQL + pgvector)
    ├── docker-compose.yml      # Khởi chạy PostgreSQL 16 + pgvector trong 1 lệnh
    ├── package.json            # Khai báo thư viện Node.js (npm install)
    ├── requirements.txt        # Danh sách thư viện cài đặt
    ├── .env.example            # Mẫu cấu hình biến môi trường
    ├── db/
    │   └── schema.sql          # Toàn bộ bảng PostgreSQL + HNSW Vector Index (768d) + Seed RAG
    └── src/
        ├── db.js               # Kết nối Pool PostgreSQL
        ├── auth.js             # Đăng ký / Đăng nhập Phụ huynh + Hồ sơ Bé + JWT
        ├── behavior.js         # Phân tích hành vi học, phát hiện lỗi ngữ pháp & Spaced Repetition (SRS)
        ├── rag.js              # Nhúng vector (gemini-embedding-001) & truy vấn pgvector
        ├── harness.js          # Input/Output Guardrails (chặn từ xấu, ẩn PII, ép chuẩn JSON Schema) & Trace Log
        ├── orchestrator.js     # Bộ não điều phối Agent + Adaptive CEFR (A0→A2) + RAG + Memory
        └── server.js           # Express REST API Server
```

---

## 📦 2. Cài đặt thư viện (Install Libraries)

### A. Cài đặt thư viện cho Backend (Node.js — Chính)
Backend sử dụng **Node.js (ES Modules)**, danh sách thư viện nằm trong `dinotalk-backend/package.json` (`express`, `pg`, `jsonwebtoken`, `cors`, `dotenv`):

```bash
cd dinotalk-backend
npm install
```

### B. Cài đặt qua `requirements.txt` (Nếu dùng môi trường Python / Chạy Web Server tĩnh / Công cụ test)
Trên macOS (`zsh`), dùng `python3 -m pip` hoặc `pip3` (thay vì `pip`):

```bash
python3 -m pip install -r requirements.txt
# Hoặc dùng môi trường ảo (khuyên dùng trên macOS):
python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
```

---

## 🚀 3. Hướng dẫn chạy toàn bộ hệ thống (Step-by-Step)

### Bước 1: Khởi chạy Database PostgreSQL 16 + `pgvector`
Yêu cầu máy đã bật **Docker Desktop**:

```bash
cd dinotalk-backend
docker compose up -d
```
> Lệnh này sẽ tự động tải image `pgvector/pgvector:pg16`, mở cổng `5432` và tự động chạy file `db/schema.sql` để tạo toàn bộ bảng + dữ liệu mẫu RAG.

### Bước 2: Cấu hình biến môi trường (`.env`)
Trong thư mục `dinotalk-backend/`, copy file `.env.example` thành `.env`:

```bash
cp .env.example .env
```

Mở file `dinotalk-backend/.env` và điền `GEMINI_API_KEY` của bạn:

```env
PORT=4000
DATABASE_URL=postgresql://dinotalk:dinotalk_secret_password@localhost:5432/dinotalk_db
JWT_SECRET=thay-bang-chuoi-bi-mat-dai-hon-32-ky-tu
GEMINI_API_KEY=AIzaSy_KEY_CUA_BAN
GEMINI_CHAT_MODEL=gemini-2.5-flash-lite
GEMINI_EMBED_MODEL=gemini-embedding-001
```

### Bước 3: Khởi động API Backend Server
```bash
cd dinotalk-backend
npm run dev
```
Khi thành công, terminal sẽ hiển thị:
```text
DinoTalk Backend running at http://localhost:4000
```
Kiểm tra nhanh trạng thái Database tại: `http://localhost:4000/api/health`

### Bước 4: Mở giao diện Frontend (`index.html`)
Mở một terminal mới tại thư mục gốc `dinotalk-kids/` và chạy 1 trong 2 lệnh sau:

```bash
# Cách 1: Dùng Python (có sẵn trên macOS/Linux)
python3 -m http.server 8080

# Cách 2: Dùng Node npx
npx serve -l 8080 .
```
Sau đó mở trình duyệt tại địa chỉ: **`http://localhost:8080`**

---

## 🔌 4. Danh sách API Endpoints (`http://localhost:4000`)

| Method | Endpoint | Auth | Mô tả |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/health` | Không | Kiểm tra kết nối API Server & PostgreSQL |
| `POST` | `/api/auth/register` | Không | Đăng ký tài khoản Phụ huynh + tạo Hồ sơ Bé (`email`, `password`, `kidNickname`, `ageBand`, `cefrLevel`) |
| `POST` | `/api/auth/login` | Không | Đăng nhập Phụ huynh, trả về `token` (JWT) và hồ sơ của bé |
| `POST` | `/api/agent/chat` | `Bearer <JWT>` | Gửi câu nói của bé qua Input Guardrail → Behavior Tracking → `pgvector` RAG → Gemini Agent → Output Guardrail |
| `POST` | `/api/behavior/event` | `Bearer <JWT>` | Ghi nhận hành vi học (`speak_attempt`, `hint_used`, `word_lookup`, `trans_clicked`, `race_answer`, `topic_switch`) |
| `GET` | `/api/behavior/summary` | `Bearer <JWT>` | Lấy dữ liệu tổng hợp cho **Dashboard Phụ Huynh** (KPI 7 ngày, kỹ năng yếu, điểm thành thạo SRS, lịch sử sự kiện) |

---

## 🌟 5. Tính năng nổi bật trên Frontend

1. **🔐 Đăng ký / Đăng nhập Phụ huynh & Hồ sơ Bé**:
   - Bấm nút **`🔐 Đăng nhập`** trên thanh Header để tạo tài khoản hoặc đăng nhập.
   - Tự động lưu JWT Token và đồng bộ số Sao (`⭐`), trình độ `CEFR` (`A0 → A1 → A2`).
2. **📊 Dashboard Phụ Huynh (`Tab Phụ Huynh`)**:
   - Theo dõi lượt luyện nói 7 ngày qua, tỷ lệ bấm Gợi ý, số lần tra từ/dịch câu.
   - Biểu đồ thanh mức độ thành thạo 5 nhóm ngữ pháp trọng tâm theo thuật toán **Spaced Repetition (SRS)**.
   - Nhật ký hành vi thời gian thực (hoạt động ngay cả khi chạy chế độ Local chưa bật Docker).
3. **📹 Gọi Video 2 Chiều (1-Screen Split Camera) & Phòng 4 Số**:
   - Hai bé nhập chung mã phòng 4 số để nói chuyện, gọi Video chia đôi màn hình và mời nhau Thi Đua trực tiếp.
