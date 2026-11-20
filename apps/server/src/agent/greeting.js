import { pool } from "../db/pool.js";
import { getBehaviorSnapshot } from "../services/behavior.service.js";
import { callGeminiDirect } from "./orchestrator.js";
import { isBlocked, logAgentTrace, parseAgentJson } from "./harness.js";

// Chicky's warm opening greeting when the child opens Talk with Chicky
const GREETING_FIELDS = ["reply", "translationVi", "sentenceGrammar", "suggestions", "topicIdeas"];
const GREETING_SCHEMA = {
  type: "OBJECT",
  properties: {
    reply: { type: "STRING" },
    translationVi: { type: "STRING" },
    sentenceGrammar: { type: "STRING" },
    suggestions: { type: "ARRAY", minItems: 3, maxItems: 3, items: { type: "STRING" } },
    topicIdeas: { type: "ARRAY", minItems: 3, maxItems: 3, items: { type: "STRING" } }
  },
  required: GREETING_FIELDS,
  propertyOrdering: GREETING_FIELDS
};

const SPARKS = [
  "finding Milo the playful puppy in the Magic Garden",
  "decorating a cozy treehouse together",
  "picking sweet strawberries at the Happy Food Market",
  "following glowing butterfly footprints",
  "making rainbow fruit smoothies for a garden picnic",
  "building a cozy nest with soft yellow pillows"
];

function vietnamHour() {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Ho_Chi_Minh" }).format(new Date()));
}

function cleanList(list, max, maxLen) {
  return (Array.isArray(list) ? list : [])
    .map(x => String(x || "").trim())
    .filter(x => x && x.length <= maxLen && !isBlocked(x))
    .slice(0, max);
}

export async function orchestrateGreeting({ kidId }) {
  const t0 = Date.now();
  const behavior = await getBehaviorSnapshot(kidId);
  const memRes = await pool.query(
    `SELECT summary_text FROM kid_memory_vectors
     WHERE kid_id = $1 AND memory_type = 'interest'
     ORDER BY created_at DESC LIMIT 5`,
    [kidId]
  );
  const memories = memRes.rows.map(r => `- ${r.summary_text}`).join("\n");
  const sparks = [...SPARKS].sort(() => Math.random() - 0.5).slice(0, 2);
  const hour = vietnamHour();
  const partOfDay = hour < 11 ? "morning" : hour < 14 ? "lunchtime" : hour < 18 ? "afternoon" : "evening";
  const { nickname, age_band, cefr_level } = behavior.kid;

  const systemPrompt = `You are Chicky 🐥, the warm, curious, encouraging golden baby chicken AI English Guide in Chicken Talk for ${nickname} (age ${age_band}, CEFR ${cefr_level}).
The child just opened your chat space. It is ${partOfDay} in Vietnam.

SAFETY & PERSONALITY:
- You are an AI playmate & guide (never pretend to be a human child; never ask for personal info like school, address, phone, or photos).
- Be kind, cheerful, patient, and playful — never strict.

What you know about ${nickname}:
${memories || "- Building your first happy adventure together!"}
Fresh play ideas: ${sparks.join(", ")}.

OUTPUT FIELDS (JSON enforced):
- "reply": 2 short, cheerful English sentences (${cefr_level === "A0" ? "5-9 simple words each" : "simple A1-A2 English"}). Greet ${nickname} warmly and offer 2 fun adventure choices.
- "translationVi": natural Vietnamese translation of "reply".
- "sentenceGrammar": "💡 Mẹo nhỏ: ..." one friendly Vietnamese tip on how to reply naturally (e.g. "Let's...", "I want to...").
- "suggestions": exactly 3 short, ready-to-say English sentences (max 8 words each).
- "topicIdeas": exactly 3 short play world ideas, each "1 emoji + 2-4 English words" (e.g. "🌿 Magic Garden").`;

  let modelUsed = "greeting_fallback";
  let data = null;
  try {
    const out = await callGeminiDirect(systemPrompt, [{ role: "user", parts: [{ text: "(The child waves hello to Chicky.)" }] }], GREETING_SCHEMA);
    const parsed = parseAgentJson(out.text);
    if (parsed && !isBlocked(parsed.reply)) {
      data = {
        reply: parsed.reply.slice(0, 300),
        translationVi: String(parsed.translationVi || ""),
        sentenceGrammar: String(parsed.sentenceGrammar || ""),
        suggestions: cleanList(parsed.suggestions, 3, 80),
        topicIdeas: cleanList(parsed.topicIdeas, 3, 40)
      };
      modelUsed = out.model;
    }
  } catch (err) {
    console.warn(`[Chicky] Greeting LLM fallback: ${err.message}`);
  }

  await logAgentTrace({
    kidId, intent: "greeting", route: "ChickyGreetingAgent", modelUsed,
    latencyMs: Date.now() - t0, guardrailPassed: Boolean(data), guardrailFlags: data ? [] : ["greeting_fallback"], rawValidJson: Boolean(data)
  });

  return data && data.suggestions.length ? data : null;
}
