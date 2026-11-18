# 🦖 DinoTalk Kids — Production AI English Learning Platform

[![Netlify Status](https://api.netlify.com/api/v1/badges/bff3a876-d812-42b7-9c22-c900109ea22c/deploy-status)](https://app.netlify.com/projects/bong-gon-talk/deploys)

Hệ thống học tiếng Anh giao tiếp AI, Thi Đua Thời Gian Thực (MQTT), Gọi Video 2 Chiều (WebRTC Split-Camera) và Phân Tích Hành Vi Học Ngôn Ngữ (PostgreSQL + `pgvector` RAG + Agent Harness) dành cho trẻ em 6–11 tuổi.

---

## 🏗️ 1. Kiến trúc hệ thống (npm workspaces monorepo)

```text
dinotalk-kids/
├── package.json                 # Root workspace (npm run dev / db:up / db:down)
├── docker-compose.yml           # PostgreSQL 16 + pgvector (tự chạy apps/server/db/schema.sql)
├── .env.example                 # Mẫu biến môi trường (copy thành .env ở root)
├── netlify.toml                 # Deploy tĩnh apps/web lên Netlify
├── requirements.txt             # Thư viện Python tuỳ chọn (script test / nạp dữ liệu)
├── apps/
│   ├── web/                     # Frontend tĩnh (vanilla JS, không cần build)
│   │   ├── index.html           # Chat AI, Phòng 4 Số, Split-Camera, Thi Đua, Chủ Đề, Phụ Huynh
│   │   └── src/
│   │       ├── app.js           # Logic Frontend + WebRTC + MQTT + Local/Cloud Behavior Engine
│   │       └── styles/main.css  # Giao diện hoạt hình cho trẻ 6–11 tuổi + Responsive
│   └── server/                  # Backend Node.js (Express + PostgreSQL + pgvector)
│       ├── db/schema.sql        # Schema duy nhất (idempotent) + HNSW index + seed RAG
│       └── src/
│           ├── app.js           # Express REST API + phục vụ apps/web
│           ├── config/env.js    # Nạp .env + cấu hình tập trung (JWT, Gemini, Worker URL)
│           ├── db/pool.js       # Pool PostgreSQL, tự khởi tạo DB local & chạy schema.sql
│           ├── agent/
│           │   ├── orchestrator.js  # Bộ não Agent + Adaptive CEFR (A0→A2) + RAG + Memory
│           │   └── harness.js       # Guardrails Input/Output + Trace Log
│           └── services/
│               ├── auth.service.js      # Đăng ký / Đăng nhập Phụ huynh + Hồ sơ Bé + JWT
│               ├── behavior.service.js  # Phân tích hành vi, lỗi ngữ pháp & SRS
│               └── rag.service.js       # Embedding (gemini-embedding-001) & truy vấn pgvector
└── packages/
    └── shared/                  # @dinotalk/shared — hằng số dùng chung (skill tags, CEFR, model mặc định)
```

---

## 📦 2. Cài đặt

Yêu cầu Node.js ≥ 20.6 và Docker Desktop (hoặc PostgreSQL local).

```bash
npm install          # Cài toàn bộ workspace từ thư mục root
cp .env.example .env # Điền GEMINI_API_KEY và JWT_SECRET (openssl rand -hex 32)
```

Thư viện Python (tuỳ chọn, chỉ cho script phụ trợ):

```bash
python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
```

---

## 🚀 3. Chạy hệ thống

```bash
npm run db:up   # Bước 1: PostgreSQL 16 + pgvector (cổng 5432)
npm run dev     # Bước 2: API + Web UI tại http://localhost:4000
```

- Kiểm tra nhanh: `http://localhost:4000/api/health`
- Server tự phục vụ giao diện `apps/web`, nên mở luôn **`http://localhost:4000`** là dùng được.
- Không có Docker? Server sẽ tự tạo role/database trên PostgreSQL local (role app không có quyền SUPERUSER) và chuyển sang chế độ vector JSONB nếu thiếu `pgvector`.
- Chỉ chạy frontend tĩnh: `npx serve -l 8080 apps/web` (frontend gọi API tại `http://localhost:4000` khi chạy localhost).

Biến môi trường chính (`.env` ở root, hoặc `apps/server/.env` để ghi đè):

| Biến | Ý nghĩa |
| :--- | :--- |
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL |
| `JWT_SECRET` | Bắt buộc ≥ 32 ký tự khi `NODE_ENV=production` |
| `GEMINI_API_KEY` | Key Gemini (chat + embedding) |
| `GEMINI_CHAT_MODEL` / `GEMINI_EMBED_MODEL` | Model chat / embedding |
| `CLOUD_WORKER_URL` | LLM fallback tầng 2 (để trống để tắt) |

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
