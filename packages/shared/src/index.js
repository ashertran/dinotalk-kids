// Hằng số dùng chung giữa server và (sau này) web.

export const SKILL_TAGS = Object.freeze([
  "like_dislike",
  "has_have",
  "present_continuous",
  "past_simple",
  "articles"
]);

export const CEFR_LEVELS = Object.freeze(["A0", "A1", "A2"]);

export const BEHAVIOR_EVENT_TYPES = Object.freeze([
  "speak_attempt",
  "hint_used",
  "word_lookup",
  "trans_clicked",
  "grammar_error",
  "grammar_ok",
  "race_answer",
  "topic_switch"
]);

export const DEFAULT_CHAT_MODEL = "gemini-2.5-flash-lite";
// Thử lần lượt khi model chính lỗi/quá tải (503). "gemini-flash-latest" là alias Google tự trỏ tới bản Flash
// mới nhất nên không "chết" như gemini-2.0-flash (đã bị gỡ khỏi API → 404).
export const FALLBACK_CHAT_MODELS = Object.freeze(["gemini-flash-latest", "gemini-2.5-flash"]);
export const DEFAULT_EMBED_MODEL = "gemini-embedding-001";
export const EMBED_DIM = 768;
