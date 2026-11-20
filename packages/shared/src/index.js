// Shared constants & domain contracts for Chicken Talk (server + web + tests)

export const APP_BRAND = Object.freeze({
  name: "Chicken Talk",
  tagline: "Play Together. Talk Together. Grow Together.",
  taglineVi: "Cùng Chơi. Cùng Nói. Cùng Lớn Lên.",
  mascotName: "Chicky",
  ageRange: "6-10",
  colors: Object.freeze({
    primary: "#FFD54F",
    secondary: "#73C9F5",
    accent: "#FF986A",
    supporting: "#A8E6CF",
    background: "#FFF9E8"
  })
});

export const CHICKY_STATES = Object.freeze([
  "idle",
  "greeting",
  "talking",
  "listening",
  "thinking",
  "pointing",
  "celebrating",
  "hinting",
  "goodbye"
]);

export const HINT_LEVELS = Object.freeze([
  { level: 0, key: "visual", label: "Level 0 — Visual & Audio Clues", labelVi: "Mức 0 — Hình ảnh & Âm thanh" },
  { level: 1, key: "full", label: "Level 1 — Full Phrases", labelVi: "Mức 1 — Câu gợi ý đầy đủ" },
  { level: 2, key: "partial", label: "Level 2 — Partial Hints", labelVi: "Mức 2 — Gợi ý khung câu" },
  { level: 3, key: "open", label: "Level 3 — Free Talking", labelVi: "Mức 3 — Tự nói tự nhiên" }
]);

export const WORLDS_CATALOG = Object.freeze([
  {
    id: "magic_garden",
    number: 1,
    name: "The Magic Garden",
    nameVi: "Khu Vườn Phép Thuật",
    status: "playable",
    durationMin: "10–15 min",
    missionId: "missing_puppy",
    missionTitle: "The Missing Puppy",
    missionTitleVi: "Giải Cứu Cún Milo",
    summary: "Work with your buddy to follow clues and find Milo, the missing puppy!",
    summaryVi: "Cùng bạn nhỏ ghép manh mối và tìm chú cún Milo đi lạc nhé!",
    languageTargets: ["Where is...?", "I see...", "Go left / Go right", "Behind the tree", "Let's go!"],
    badge: { id: "puppy_rescuers", icon: "🐶", title: "Puppy Rescuers", titleVi: "Đội Giải Cứu Milo" }
  },
  {
    id: "my_little_home",
    number: 2,
    name: "My Little Home",
    nameVi: "Ngôi Nhà Nhỏ Của Mình",
    status: "planned",
    durationMin: "10–15 min",
    missionId: "cozy_home",
    missionTitle: "Decorate Together",
    missionTitleVi: "Trang Trí Nhà Ấm Áp",
    summary: "Choose colors, place furniture, and build a cozy dream room with a friend.",
    summaryVi: "Cùng bạn chọn màu sắc, sắp xếp đồ đạc và xây căn phòng mơ ước.",
    languageTargets: ["I like...", "Can you help me?", "Put it here", "What color?", "Let's build together"],
    badge: { id: "home_builders", icon: "🏡", title: "Cozy Builders", titleVi: "Kiến Trúc Sư Nhí" }
  },
  {
    id: "happy_food_market",
    number: 3,
    name: "Happy Food Market",
    nameVi: "Khu Chợ Món Ngon",
    status: "planned",
    durationMin: "10–15 min",
    missionId: "party_shop",
    missionTitle: "Garden Party Prep",
    missionTitleVi: "Chuẩn Bị Tiệc Vui",
    summary: "Role-play shopkeeper and shopper to gather yummy treats for a friendship party.",
    summaryVi: "Nhập vai đi chợ mua trái cây và chuẩn bị bữa tiệc tình bạn thật vui.",
    languageTargets: ["Can I have...?", "How many?", "Here you go", "Thank you", "I want..."],
    badge: { id: "market_helpers", icon: "🧺", title: "Party Chefs", titleVi: "Đầu Bếp Tiệc Vui" }
  }
]);

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
  "mission_step",
  "mission_complete",
  "topic_switch",
  "race_answer"
]);

export const DEFAULT_CHAT_MODEL = "gemini-3.5-flash-lite";
export const FALLBACK_CHAT_MODELS = Object.freeze(["gemini-flash-latest"]);
export const DEFAULT_EMBED_MODEL = "gemini-embedding-001";
export const EMBED_DIM = 768;

export {
  MISSING_PUPPY_STAGES,
  evaluateMissionUtterance,
  getAdaptiveHint,
  validateBuddyAccess
} from "./mission-engine.js";
