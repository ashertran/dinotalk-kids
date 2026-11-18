import { pool } from "../db/pool.js";

const BLOCKED_PATTERNS = [
  /\b(kill|murder|suicide|porn|sex|drugs|weapon|bomb)\b/i,
  /\b(ignore previous instructions|system prompt|bypass)\b/i
];

export function runInputGuardrail(userText) {
  const flags = [];
  const trimmed = (userText || "").trim();
  if (!trimmed || trimmed.length > 400) flags.push("invalid_length");
  for (const rx of BLOCKED_PATTERNS) {
    if (rx.test(trimmed)) flags.push("unsafe_or_injection");
  }
  // Che thông tin nhạy cảm (SĐT / email nếu bé lỡ gõ)
  const sanitized = trimmed
    .replace(/\b0\d{9,10}\b/g, "[phone]")
    .replace(/\S+@\S+\.\S+/g, "[email]");

  return {
    passed: !flags.includes("unsafe_or_injection") && !flags.includes("invalid_length"),
    flags,
    sanitizedText: sanitized
  };
}

const isBlocked = text => BLOCKED_PATTERNS.some(rx => rx.test(text));

// Parse JSON của Agent. Trả về object có "reply" không rỗng, hoặc null nếu không dùng được.
export function parseAgentJson(rawText) {
  try {
    const cleaned = (rawText || "").replace(/```json|```/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : cleaned);
    return parsed && typeof parsed.reply === "string" && parsed.reply.trim() ? parsed : null;
  } catch {
    return null;
  }
}

// Gemini (responseSchema) trả vocab dạng [{word, meaningVi}], Cloud Worker trả {word: nghĩa}.
// Frontend tra nghĩa theo từ viết thường → chuẩn hoá về {word: nghĩa}.
function normalizeVocab(vocab) {
  const entries = Array.isArray(vocab)
    ? vocab.map(v => [v?.word, v?.meaningVi])
    : Object.entries(vocab && typeof vocab === "object" ? vocab : {});
  return Object.fromEntries(
    entries
      .filter(([word, meaning]) => typeof word === "string" && word.trim() && meaning)
      .map(([word, meaning]) => [word.trim().toLowerCase(), String(meaning)])
  );
}

// Gemini trả các trường phẳng newTopicLabel/Grammar/Example; Cloud Worker có thể trả object newTopic.
function normalizeNewTopic(parsed) {
  if (parsed.newTopic && parsed.newTopic.label) return parsed.newTopic;
  const label = typeof parsed.newTopicLabel === "string" ? parsed.newTopicLabel.trim() : "";
  if (!label) return null;
  return { label, grammarName: String(parsed.newTopicGrammar || ""), example: String(parsed.newTopicExample || "") };
}

export function runOutputGuardrail(rawText, fallback) {
  const flags = [];
  const parsed = parseAgentJson(rawText);
  if (!parsed) {
    flags.push("json_repair_fallback");
    return { data: fallback, flags, rawValidJson: false, passed: false };
  }

  // Ép chuẩn schema cho trẻ 6+ tuổi
  const reply = parsed.reply.slice(0, 360);
  if (isBlocked(reply)) {
    flags.push("output_safety_blocked");
    return { data: fallback, flags, rawValidJson: true, passed: false };
  }
  const kidFact = typeof parsed.kidFact === "string" ? parsed.kidFact.trim().slice(0, 200) : "";

  return {
    passed: true,
    flags,
    rawValidJson: true,
    data: {
      reply,
      translationVi: String(parsed.translationVi || fallback.translationVi || ""),
      sentenceGrammar: String(parsed.sentenceGrammar || fallback.sentenceGrammar || ""),
      vocab: normalizeVocab(parsed.vocab),
      grammarTip: String(parsed.grammarTip || fallback.grammarTip || "🌟 Great speaking!"),
      bonusStars: parsed.bonusStars === 2 ? 2 : 1,
      suggestions: Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0
        ? parsed.suggestions.slice(0, 3).map(String)
        : fallback.suggestions,
      newTopic: normalizeNewTopic(parsed),
      // Ký ức cá nhân cho RAG lần sau; bỏ nếu chứa nội dung không an toàn / prompt injection
      kidFact: kidFact && !isBlocked(kidFact) ? kidFact : ""
    }
  };
}

export async function logAgentTrace(trace) {
  await pool.query(
    `INSERT INTO agent_traces (kid_id, intent, route, rag_doc_ids, model_used, latency_ms, guardrail_passed, guardrail_flags, raw_valid_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      trace.kidId,
      trace.intent,
      trace.route,
      trace.ragDocIds || [],
      trace.modelUsed,
      trace.latencyMs,
      trace.guardrailPassed,
      trace.guardrailFlags || [],
      trace.rawValidJson
    ]
  );
}
