-- Schema duy nhất của DinoTalk (idempotent): Docker chạy lúc init, server chạy lại khi khởi động.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. AUTH & KID PROFILES (An toàn cho trẻ em: Phụ huynh quản lý tài khoản)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'parent', -- parent | teacher | admin
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kid_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '🦖',
  age_band TEXT NOT NULL DEFAULT '6-8', -- 6-8 | 9-11
  cefr_level TEXT NOT NULL DEFAULT 'A0', -- A0 | A1 | A2
  preferred_lang TEXT NOT NULL DEFAULT 'vi',
  stars INT NOT NULL DEFAULT 0,
  streak_days INT NOT NULL DEFAULT 0,
  last_active_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TOPICS & CONVERSATION MEMORY
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_id UUID REFERENCES kid_profiles(id) ON DELETE CASCADE, -- NULL = chủ đề hệ thống
  title TEXT NOT NULL,
  grammar_target TEXT NOT NULL,
  example_sentence TEXT NOT NULL,
  opener_en TEXT NOT NULL,
  opener_vi TEXT,
  is_builtin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_id UUID NOT NULL REFERENCES kid_profiles(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('kid', 'agent')),
  content TEXT NOT NULL,
  translation_vi TEXT,
  grammar_note TEXT,
  input_mode TEXT DEFAULT 'voice', -- voice | text | hint
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. BEHAVIOR HỌC NGÔN NGỮ (Tracking chi tiết để Agent tự thích nghi)
CREATE TABLE IF NOT EXISTS learning_behavior_events (
  id BIGSERIAL PRIMARY KEY,
  kid_id UUID NOT NULL REFERENCES kid_profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- speak_attempt | hint_used | word_lookup | trans_clicked | grammar_error | grammar_ok | race_answer | topic_switch
  skill_tag TEXT, -- like_dislike | has_have | present_continuous | past_simple | articles
  is_correct BOOLEAN,
  latency_ms INT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_behavior_kid_time ON learning_behavior_events(kid_id, created_at DESC);

-- Bảng tổng hợp mức thành thạo từng kỹ năng (Spaced Repetition)
CREATE TABLE IF NOT EXISTS kid_skill_mastery (
  kid_id UUID NOT NULL REFERENCES kid_profiles(id) ON DELETE CASCADE,
  skill_tag TEXT NOT NULL,
  mastery_score INT NOT NULL DEFAULT 30 CHECK (mastery_score BETWEEN 0 AND 100),
  error_count INT NOT NULL DEFAULT 0,
  correct_count INT NOT NULL DEFAULT 0,
  last_practiced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_review_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (kid_id, skill_tag)
);

-- 4. RAG KNOWLEDGE BASE + PERSONAL MEMORY (pgvector 768 chiều cho gemini-embedding-001)
CREATE TABLE IF NOT EXISTS curriculum_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_tag TEXT NOT NULL,
  skill_tag TEXT NOT NULL,
  cefr_level TEXT NOT NULL DEFAULT 'A1',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  example_en TEXT NOT NULL,
  explain_vi TEXT NOT NULL,
  embedding vector(768)
);

CREATE INDEX IF NOT EXISTS idx_curriculum_hnsw ON curriculum_docs USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS kid_memory_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_id UUID NOT NULL REFERENCES kid_profiles(id) ON DELETE CASCADE,
  summary_text TEXT NOT NULL,
  memory_type TEXT NOT NULL DEFAULT 'mistake_or_interest',
  embedding vector(768),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kid_mem_hnsw ON kid_memory_vectors USING hnsw (embedding vector_cosine_ops);

-- 5. AGENT HARNESS & OBSERVABILITY TRACES
CREATE TABLE IF NOT EXISTS agent_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_id UUID REFERENCES kid_profiles(id) ON DELETE SET NULL,
  intent TEXT NOT NULL,
  route TEXT NOT NULL,
  rag_doc_ids UUID[] DEFAULT '{}',
  model_used TEXT NOT NULL,
  latency_ms INT NOT NULL,
  guardrail_passed BOOLEAN NOT NULL,
  guardrail_flags TEXT[] DEFAULT '{}',
  raw_valid_json BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed dữ liệu mẫu cho RAG (chỉ nạp khi bảng trống; embedding được tạo lúc server khởi động)
INSERT INTO curriculum_docs (topic_tag, skill_tag, cefr_level, title, content, example_en, explain_vi)
SELECT * FROM (VALUES
('pizza', 'like_dislike', 'A0', 'Dùng I like / I don''t like', 'Với chủ ngữ I/You/We/They dùng like không thêm s.', 'I like cheese pizza, but I don''t like frog pizza.', 'Với I luôn nói I like (không nói I likes).'),
('pet', 'has_have', 'A1', 'Phân biệt have và has', 'I/You/We/They dùng have; He/She/It/My pet dùng has.', 'My pet has three green eyes and I have a dog.', '1 con vật dùng has, còn I dùng have!'),
('space', 'present_continuous', 'A1', 'Thì Hiện Tại Tiếp Diễn', 'Cấu trúc am/is/are + V-ing diễn tả việc đang làm ngay lúc nói.', 'I am flying to Mars and the alien is dancing.', 'Nhớ đủ am/is/are trước động từ đuôi -ing nhé!'),
('school', 'past_simple', 'A2', 'Thì Quá Khứ Đơn với Yesterday', 'Kể chuyện hôm qua dùng động từ quá khứ: went, saw, ate, played.', 'Yesterday I saw a funny monkey at school.', 'Chuyện đã qua rồi dùng saw thay cho see!'),
('general', 'articles', 'A0', 'Dùng a và an', 'Dùng an trước từ bắt đầu bằng nguyên âm u, e, o, a, i.', 'I want an apple and a banana.', 'Trước apple/alien/orange dùng an nhé!')
) AS seed(topic_tag, skill_tag, cefr_level, title, content, example_en, explain_vi)
WHERE NOT EXISTS (SELECT 1 FROM curriculum_docs);
