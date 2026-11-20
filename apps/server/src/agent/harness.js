import { pool } from "../db/pool.js";

const BLOCKED_PATTERNS = [
  /\b(kill|murder|suicide|porn|sex|drugs|weapon|bomb|gun)\b/i,
  /\b(ignore previous instructions|system prompt|bypass)\b/i
];

// Detect personal info prompts/answers (child safety guardrail)
const PII_SOLICITATION_PATTERNS = [
  /\b(what is your address|where do you live|send me your photo|give me your phone|what school do you go to|tell me your password)\b/i
];

export function runInputGuardrail(userText) {
  const flags = [];
  const trimmed = (userText || "").trim();
  if (!trimmed || trimmed.length > 400) flags.push("invalid_length");
  for (const rx of BLOCKED_PATTERNS) {
    if (rx.test(trimmed)) flags.push("unsafe_or_injection");
  }
  // Mask accidental sensitive info (phone, email)
  const sanitized = trimmed
    .replace(/\b0\d{8,10}\b/g, "[phone]")
    .replace(/\+?\d[\d\s-]{8,14}\d/g, "[phone]")
    .replace(/\S+@\S+\.\S+/g, "[email]");

  if (sanitized !== trimmed) flags.push("pii_redacted");

  return {
    passed: !flags.includes("unsafe_or_injection") && !flags.includes("invalid_length"),
    flags,
    sanitizedText: sanitized
  };
}

export const isBlocked = text =>
  BLOCKED_PATTERNS.some(rx => rx.test(text || "")) ||
  PII_SOLICITATION_PATTERNS.some(rx => rx.test(text || ""));

// Parse JSON returned by Agent. Returns object with non-empty "reply" or null.
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
      kidFact: kidFact && !isBlocked(kidFact) ? kidFact : ""
    }
  };
}

export async function logAgentTrace(trace) {
  try {
    await pool.query(
      `INSERT INTO agent_traces (kid_id, intent, route, rag_doc_ids, skills_used, model_used, latency_ms, guardrail_passed, guardrail_flags, raw_valid_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        trace.kidId,
        trace.intent,
        trace.route,
        trace.ragDocIds || [],
        trace.skillsUsed || [],
        trace.modelUsed,
        trace.latencyMs,
        trace.guardrailPassed,
        trace.guardrailFlags || [],
        trace.rawValidJson
      ]
    );
  } catch {
    // Non-fatal in offline/no-DB demo mode
  }
}
