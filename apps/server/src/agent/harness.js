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

export function runOutputGuardrail(rawText, fallback) {
  const flags = [];
  let parsed = null;
  let rawValidJson = true;

  try {
    const cleaned = (rawText || "").replace(/```json|```/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(match ? match[0] : cleaned);
  } catch {
    rawValidJson = false;
    flags.push("json_repair_fallback");
    return { data: fallback, flags, rawValidJson, passed: false };
  }

  // Ép chuẩn schema cho trẻ 6+ tuổi
  const reply = typeof parsed.reply === "string" && parsed.reply.length > 0 ? parsed.reply.slice(0, 360) : fallback.reply;
  for (const rx of BLOCKED_PATTERNS) {
    if (rx.test(reply)) {
      flags.push("output_safety_blocked");
      return { data: fallback, flags, rawValidJson, passed: false };
    }
  }

  return {
    passed: true,
    flags,
    rawValidJson,
    data: {
      reply,
      translationVi: String(parsed.translationVi || fallback.translationVi || ""),
      sentenceGrammar: String(parsed.sentenceGrammar || fallback.sentenceGrammar || ""),
      vocab: typeof parsed.vocab === "object" && parsed.vocab ? parsed.vocab : {},
      grammarTip: String(parsed.grammarTip || fallback.grammarTip || "🌟 Great speaking!"),
      bonusStars: parsed.bonusStars === 2 ? 2 : 1,
      suggestions: Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0
        ? parsed.suggestions.slice(0, 3).map(String)
        : fallback.suggestions,
      newTopic: parsed.newTopic && parsed.newTopic.label ? parsed.newTopic : null
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
