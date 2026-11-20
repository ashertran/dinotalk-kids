-- Chicken Talk — Idempotent PostgreSQL Schema (Docker init + Server startup)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. PARENT ACCOUNTS, CONSENT & KID PROFILES (Child-safety first)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'parent', -- parent | teacher | admin
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parent_consents (
  account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  verified_adult BOOLEAN NOT NULL DEFAULT FALSE,
  allow_push_to_talk BOOLEAN NOT NULL DEFAULT TRUE,
  store_raw_audio BOOLEAN NOT NULL DEFAULT FALSE, -- MUST remain FALSE by default
  allow_ai_guide BOOLEAN NOT NULL DEFAULT TRUE,
  session_limit_minutes INT NOT NULL DEFAULT 15,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kid_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '🐥',
  age_band TEXT NOT NULL DEFAULT '6-10', -- 6-8 | 9-10 | 6-10
  cefr_level TEXT NOT NULL DEFAULT 'A0', -- A0 | A1 | A2
  preferred_lang TEXT NOT NULL DEFAULT 'vi',
  stars INT NOT NULL DEFAULT 0,
  streak_days INT NOT NULL DEFAULT 0,
  last_active_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Parent-approved private buddies only (zero stranger discovery)
CREATE TABLE IF NOT EXISTS approved_buddies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_id UUID NOT NULL REFERENCES kid_profiles(id) ON DELETE CASCADE,
  buddy_nickname TEXT NOT NULL,
  buddy_avatar TEXT NOT NULL DEFAULT '🐰',
  approved_by_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cooperative Mission Progress
CREATE TABLE IF NOT EXISTS mission_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_id UUID NOT NULL REFERENCES kid_profiles(id) ON DELETE CASCADE,
  world_id TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  is_demo_mode BOOLEAN NOT NULL DEFAULT TRUE,
  phrases_practiced TEXT[] DEFAULT '{}',
  badge_id TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safety & Privacy Incident Reports
CREATE TABLE IF NOT EXISTS safety_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TOPICS & CONVERSATION MEMORY
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_id UUID REFERENCES kid_profiles(id) ON DELETE CASCADE,
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
  input_mode TEXT DEFAULT 'voice', -- voice | text | hint | picture
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. LEARNING BEHAVIOR & SPACED REPETITION
CREATE TABLE IF NOT EXISTS learning_behavior_events (
  id BIGSERIAL PRIMARY KEY,
  kid_id UUID NOT NULL REFERENCES kid_profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  skill_tag TEXT,
  is_correct BOOLEAN,
  latency_ms INT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_behavior_kid_time ON learning_behavior_events(kid_id, created_at DESC);

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

-- 4. RAG KNOWLEDGE BASE + PERSONAL MEMORY
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
ALTER TABLE agent_traces ADD COLUMN IF NOT EXISTS skills_used TEXT[] DEFAULT '{}';

-- Seed Chicken Talk curriculum docs when empty
INSERT INTO curriculum_docs (topic_tag, skill_tag, cefr_level, title, content, example_en, explain_vi)
SELECT * FROM (VALUES
('magic_garden', 'like_dislike', 'A0', 'Finding Clues Together', 'Ask where friends or objects are and invite your buddy with Let''s go!', 'Where is Milo? Go left! Let''s go!', 'Dùng Where is...? để hỏi ở đâu, và Let''s go! để cùng bạn đi khám phá!'),
('my_little_home', 'like_dislike', 'A0', 'Expressing Preferences (I like)', 'With I/You/We/They use like without adding s.', 'I like the yellow lamp. Put it here!', 'Với I luôn nói I like (không thêm s), rất dễ nhớ!'),
('pet', 'has_have', 'A1', 'Describing Pets (have / has)', 'I/You/We/They use have; He/She/It/Milo uses has.', 'Milo has a blue collar and I have a toy bone.', '1 bạn cún (Milo / It) dùng has, còn I dùng have!'),
('magic_garden', 'present_continuous', 'A1', 'Actions Happening Now', 'Use am/is/are + V-ing for actions happening right now.', 'Milo is hiding behind the tree!', 'Nhớ có am/is/are trước động từ đuôi -ing nhé!'),
('happy_food_market', 'articles', 'A0', 'Polite Shopping with a / an', 'Use an before vowel sounds (a, e, i, o, u) for smooth speaking.', 'Can I have an apple and a banana, please?', 'Trước apple/orange dùng an để đọc nối âm thật mượt!')
) AS seed(topic_tag, skill_tag, cefr_level, title, content, example_en, explain_vi)
WHERE NOT EXISTS (SELECT 1 FROM curriculum_docs);
