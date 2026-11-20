import { DEFAULT_CHAT_MODEL, FALLBACK_CHAT_MODELS } from "@dinotalk/shared";
import { config } from "../config/env.js";
import { pool } from "../db/pool.js";
import { detectGrammarSignals, getBehaviorSnapshot, recordBehaviorEvent } from "../services/behavior.service.js";
import { retrieveRagContext, saveKidMemory } from "../services/rag.service.js";
import { renderSkillsPrompt, selectLinguisticSkills } from "./skills/linguistics.js";
import { logAgentTrace, parseAgentJson, runInputGuardrail, runOutputGuardrail } from "./harness.js";

const CHAT_MODEL = config.chatModel || DEFAULT_CHAT_MODEL;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CHICKY_FIELDS = [
  "reply", "translationVi", "sentenceGrammar", "vocab", "grammarTip", "bonusStars", "suggestions",
  "newTopicLabel", "newTopicGrammar", "newTopicExample", "kidFact"
];
const CHICKY_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    reply: { type: "STRING" },
    translationVi: { type: "STRING" },
    sentenceGrammar: { type: "STRING" },
    vocab: {
      type: "ARRAY",
      maxItems: 4,
      items: {
        type: "OBJECT",
        properties: { word: { type: "STRING" }, meaningVi: { type: "STRING" } },
        required: ["word", "meaningVi"]
      }
    },
    grammarTip: { type: "STRING" },
    bonusStars: { type: "INTEGER" },
    suggestions: { type: "ARRAY", minItems: 3, maxItems: 3, items: { type: "STRING" } },
    newTopicLabel: { type: "STRING" },
    newTopicGrammar: { type: "STRING" },
    newTopicExample: { type: "STRING" },
    kidFact: { type: "STRING" }
  },
  required: CHICKY_FIELDS,
  propertyOrdering: CHICKY_FIELDS
};

const GEMINI_ATTEMPT_TIMEOUT_MS = 15000;
const GEMINI_TOTAL_BUDGET_MS = 30000;
const RETRYABLE_HTTP = new Set([429, 500, 503, 504]);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function classifyIntent(text) {
  if (/(?:muốn nói về|đổi chủ đề|tạo chủ đề|talk about|change topic|new topic)\s+(.+)/i.test(text)) {
    return "switch_topic";
  }
  if (/(?:nghĩa là gì|dịch|grammar|ngữ pháp là gì|tại sao dùng|how to say)/i.test(text)) {
    return "ask_explanation";
  }
  return "cooperative_play";
}

function buildDeepGrammarInsight(userText, botReply, signals) {
  const errSig = signals.find(s => !s.ok);
  if (errSig) {
    if (errSig.skill === "has_have") {
      return {
        tip: "🌟 Chicky gợi ý nhỏ: 'I / You / We / They' đi với 'have', còn 'He / She / It' thích chữ 's' -> 'has' nhé!",
        note: "💡 Mẹo nhớ tự nhiên: Dùng 'I have...' cho bản thân mình và 'It/He/She has...' cho một bạn thú cưng hay nhân vật."
      };
    }
    if (errSig.skill === "like_dislike") {
      return {
        tip: "🌟 Chicky khen bé diễn đạt rõ ý! Với 'I', mình nói nhẹ nhàng 'I like...' (không cần thêm 's')!",
        note: "💡 Mẹo nhớ tự nhiên: Khi nói về mình ('I'), động từ giữ nguyên dạng gốc rất dễ nhớ!"
      };
    }
    if (errSig.skill === "present_continuous") {
      return {
        tip: "🌟 'I' luôn nắm tay người bạn thân 'am' -> 'I am + V-ing'!",
        note: "💡 Mẹo nhớ tự nhiên: [am/is/are + V-ing] giống như ống kính đang quay hành động diễn ra ngay trước mắt!"
      };
    }
    if (errSig.skill === "articles") {
      return {
        tip: "🌟 Trước nguyên âm (u, e, o, a, i), mình thêm 'n' thành 'an' (an apple, an orange) để đọc thật êm tai!",
        note: "💡 Mẹo nhớ tự nhiên: 'an' giúp âm nối mượt mà hơn khi nói tiếng Anh."
      };
    }
  }

  const combined = `${userText} ${botReply}`.toLowerCase();
  if (/\b(where is|behind|left|right)\b/.test(combined)) {
    return {
      tip: "🌟 Tuyệt vời! Bé đang dùng mẫu câu chỉ đường và tìm kiếm rất tự nhiên!",
      note: "💡 Mẹo nhớ: 'Where is...?' (Ở đâu nhỉ?), 'Go left/right' (Đi trái/phải), 'Behind the tree' (Phía sau cái cây)!"
    };
  }
  if (/\b(am|is|are)\s+\w+ing\b/.test(combined)) {
    return {
      tip: "🌟 Câu miêu tả hành động rất sinh động!",
      note: "💡 Mẹo nhớ: [am/is/are + V-ing] diễn tả điều ĐANG xảy ra ngay bây giờ."
    };
  }
  return {
    tip: "🌟 Phản xạ tiếng Anh rất tự nhiên! Chicky rất thích ý tưởng của bé!",
    note: "💡 Mẹo nhớ: Trong Chicken Talk, cứ thoải mái dùng tiếng Anh để kể chuyện và hợp tác cùng nhau nhé!"
  };
}

function buildSmartContextualFallback(userText, topicTitle, signals) {
  const low = userText.toLowerCase().trim();
  const deep = buildDeepGrammarInsight(userText, "", signals);

  // Gentle Recasting (never shame the child!)
  if (/\bdog\s+tree\b|\bpuppy\s+tree\b/i.test(low)) {
    return {
      reply: "Ooh, is the dog near the tree? 🐥 Let's look behind the tree together!",
      translationVi: "Ồ, chú cún ở gần cái cây hả? 🐥 Tụi mình cùng nhìn phía sau cái cây nhé!",
      sentenceGrammar: "💡 Gentle Recast: Chicky nhắc nhẹ thành câu đầy đủ 'Is the dog near the tree? Let's look behind the tree!' để bé nghe quen tai nhé!",
      vocab: { near: "ở gần", behind: "phía sau", tree: "cái cây" },
      grammarTip: "🌟 Bé bắt ý rất nhanh! Cùng thử nói 'Behind the tree!' nhé!",
      bonusStars: 2,
      suggestions: ["Look behind the tree!", "Where is Milo?", "Let's go!"],
      newTopic: null
    };
  }

  if (/\bi has\s+(.+)/i.test(userText)) {
    const obj = userText.match(/\bi has\s+(.+)/i)[1].replace(/[.!?]+$/, "");
    return {
      reply: `Cheep-cheep! You HAVE ${obj}! 🐥 That sounds so fun! What color is ${obj}?`,
      translationVi: `Chíp chíp! Bạn CÓ ${obj} hả! Nghe vui quá! ${obj} màu gì thế?`,
      sentenceGrammar: deep.note,
      vocab: { have: "có (dùng với I)", color: "màu sắc" },
      grammarTip: deep.tip,
      bonusStars: 2,
      suggestions: ["It is bright yellow!", "I play with it every day!", "Can we play together, Chicky?"],
      newTopic: null
    };
  }

  if (/\bi likes\s+(.+)/i.test(userText)) {
    const obj = userText.match(/\bi likes\s+(.+)/i)[1].replace(/[.!?]+$/, "");
    return {
      reply: `Yay! You LIKE ${obj}! 🐥 I like ${obj} too! Should we explore ${obj} together?`,
      translationVi: `Hoan hô! Bạn THÍCH ${obj}! Chicky cũng thích ${obj} lắm! Tụi mình cùng khám phá nhé?`,
      sentenceGrammar: deep.note,
      vocab: { like: "thích", explore: "khám phá", together: "cùng nhau" },
      grammarTip: deep.tip,
      bonusStars: 2,
      suggestions: ["Yes, let's go!", "Because it is super fun!", "What do you like, Chicky?"],
      newTopic: null
    };
  }

  if (low.includes("?") || /\b(do you|can you|are you|what is your|who are|where is)\b/.test(low)) {
    return {
      reply: "Great question! 🐥 I'm Chicky, your little yellow explorer guide! I love helping friends find clues in the Magic Garden. Where should we look next?",
      translationVi: "Câu hỏi hay quá! 🐥 Mình là Chicky, chú gà con hướng dẫn thám hiểm của bé! Mình thích giúp các bạn tìm manh mối ở Khu Vườn Phép Thuật. Tụi mình tìm ở đâu tiếp nhỉ?",
      sentenceGrammar: "💡 Mẹo hay: Hỏi lại bạn bè bằng 'Where is...?' hoặc 'Do you...?' giúp cuộc trò chuyện vui hơn nhiều!",
      vocab: { explorer: "nhà thám hiểm", clue: "manh mối", garden: "khu vườn" },
      grammarTip: "🌟 Giỏi quá! Bé biết đặt câu hỏi bằng tiếng Anh rồi đấy!",
      bonusStars: 2,
      suggestions: ["Let's look behind the tree!", "Where is Milo the puppy?", "Let's go to the garden!"],
      newTopic: null
    };
  }

  const words = userText
    .replace(/[^a-zA-Z\s']/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 3 && !["that", "this", "with", "have", "like", "very", "want", "think"].includes(w.toLowerCase()));
  const focusWord = words.length > 0 ? words[words.length - 1].toLowerCase() : null;

  if (focusWord) {
    return {
      reply: `Cheep-cheep! "${focusWord}"! 🐥 Imagine we bring "${focusWord}" into the Magic Garden — what fun game should we play with it?`,
      translationVi: `Chíp chíp! "${focusWord}"! 🐥 Tưởng tượng tụi mình mang "${focusWord}" vào Khu Vườn Phép Thuật — tụi mình chơi trò gì vui với nó nhỉ?`,
      sentenceGrammar: deep.note,
      vocab: { imagine: "hãy tưởng tượng", garden: "khu vườn", together: "cùng nhau" },
      grammarTip: deep.tip,
      bonusStars: 2,
      suggestions: ["Let's play hide and seek!", "I see something sparkly!", "Can you help me, Chicky?"],
      newTopic: null
    };
  }

  return {
    reply: "Cheep! That's a wonderful idea! 🐥 What should we discover together next in Chicky's Little World?",
    translationVi: "Chíp! Ý tưởng tuyệt vời lắm! 🐥 Tiếp theo tụi mình cùng khám phá điều gì ở Thế Giới Nhỏ của Chicky nhỉ?",
    sentenceGrammar: deep.note,
    vocab: { wonderful: "tuyệt vời", discover: "khám phá", together: "cùng nhau" },
    grammarTip: deep.tip,
    bonusStars: 1,
    suggestions: ["Let's find Milo the puppy!", "Let's build a cozy house!", "Can we visit the food market?"],
    newTopic: null
  };
}

export async function callGeminiDirect(systemPrompt, contents, responseSchema = CHICKY_RESPONSE_SCHEMA) {
  const apiKey = config.geminiApiKey;
  if (!apiKey || apiKey.startsWith("YOUR_")) throw new Error("MISSING_GEMINI_KEY");

  const deadline = Date.now() + GEMINI_TOTAL_BUDGET_MS;
  const modelsToTry = [...new Set([CHAT_MODEL, ...FALLBACK_CHAT_MODELS])];
  const failures = [];

  for (const model of modelsToTry) {
    const attempts = model === CHAT_MODEL ? 2 : 1;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const remainingMs = deadline - Date.now();
      if (remainingMs < 2000) throw new Error(`LLM_BUDGET_EXHAUSTED: ${failures.join(" | ")}`);
      const tag = `${model}#${attempt}`;
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(Math.min(GEMINI_ATTEMPT_TIMEOUT_MS, remainingMs)),
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents,
              generationConfig: {
                responseMimeType: "application/json",
                responseSchema,
                maxOutputTokens: 2048
              }
            })
          }
        );
        if (!res.ok) {
          const detail = (await res.json().catch(() => null))?.error?.message || "";
          failures.push(`${tag} HTTP ${res.status} ${detail.slice(0, 120)}`.trim());
          if (!RETRYABLE_HTTP.has(res.status)) break;
          if (attempt < attempts) await sleep(800);
          continue;
        }
        const json = await res.json();
        const candidate = json?.candidates?.[0];
        const text = (candidate?.content?.parts || [])
          .filter(p => !p.thought && typeof p.text === "string")
          .map(p => p.text)
          .join("");
        if (parseAgentJson(text)) return { text, model, failures };
        failures.push(`${tag} unusable output (finishReason=${candidate?.finishReason || json?.promptFeedback?.blockReason || "none"})`);
      } catch (err) {
        failures.push(`${tag} ${err.name === "TimeoutError" ? "timeout" : err.message}`);
      }
    }
  }
  throw new Error(`LLM_ALL_MODELS_FAILED: ${failures.join(" | ")}`);
}

async function callCloudWorkerFallback({ topicTitle, grammarTarget, history, userText }) {
  if (!config.cloudWorkerUrl) throw new Error("WORKER_DISABLED");
  const res = await fetch(config.cloudWorkerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(12000),
    body: JSON.stringify({
      action: "chat",
      topic: `${topicTitle} (Chicken Talk — Chicky AI Guide, warm playful English for ages 6-10)`,
      grammar: `${grammarTarget} (Gentle recasting only, never scold)`,
      lang: "vi",
      history: history.slice(-6),
      userText
    })
  });
  if (!res.ok) throw new Error("WORKER_HTTP_" + res.status);
  const data = await res.json();
  if (!data || !data.reply) throw new Error("EMPTY_WORKER_REPLY");
  return JSON.stringify(data);
}

export async function orchestrateChat({ kidId, topicId, topicTitle = "Magic Garden", grammarTarget = "Natural English", userText, inputMode = "voice", latencyMs = null }) {
  const t0 = Date.now();
  const safeTopicUuid = topicId && UUID_REGEX.test(String(topicId)) ? topicId : null;

  // 1. Input Safety Harness
  const inGuard = runInputGuardrail(userText);
  if (!inGuard.passed) {
    await logAgentTrace({
      kidId, intent: "blocked", route: "input_guardrail", modelUsed: "none",
      latencyMs: Date.now() - t0, guardrailPassed: false, guardrailFlags: inGuard.flags, rawValidJson: true
    });
    return {
      reply: "Cheep! Let's play a happy adventure in the Magic Garden or build a cozy little home together! 🐥🌿",
      translationVi: "Chíp! Tụi mình cùng chơi chuyến phiêu lưu thật vui ở Khu Vườn Phép Thuật hoặc xây ngôi nhà nhỏ ấm áp nhé!",
      sentenceGrammar: "💡 Mẹo nhớ: 'Let's + động từ nguyên mẫu' dùng để rủ bạn bè cùng làm việc vui!",
      vocab: { adventure: "chuyến phiêu lưu", garden: "khu vườn" },
      grammarTip: "🌟 Keep it kind, playful, and curious!",
      bonusStars: 1,
      suggestions: ["Let's find Milo the puppy!", "I see a yellow butterfly!", "Let's build together!"]
    };
  }

  // 2. Behavior Tracking
  const cleanText = inGuard.sanitizedText;
  const signals = detectGrammarSignals(cleanText);
  await recordBehaviorEvent(kidId, { eventType: "speak_attempt", latencyMs, metadata: { inputMode, text: cleanText.slice(0, 80) } });

  for (const sig of signals) {
    await recordBehaviorEvent(kidId, {
      eventType: sig.ok ? "grammar_ok" : "grammar_error",
      skillTag: sig.skill,
      isCorrect: sig.ok,
      metadata: { sentence: cleanText.slice(0, 80) }
    });
    if (!sig.ok) {
      await saveKidMemory(kidId, `Kid practiced ${sig.skill} when saying: "${cleanText}"`, "grammar_weakness");
    }
  }

  // 3. Load Profile + RAG + Linguistic Skills
  const behavior = await getBehaviorSnapshot(kidId);
  const intent = classifyIntent(cleanText);
  const rag = await retrieveRagContext({ kidId, queryText: `${topicTitle} ${cleanText}`, weakSkills: behavior.weakSkills });

  const activeSkills = selectLinguisticSkills({
    text: cleanText,
    intent,
    inputMode,
    signals,
    cefr: behavior.kid.cefr_level
  });

  const historyRes = await pool.query(
    `SELECT role, content FROM messages WHERE kid_id = $1 ORDER BY created_at DESC LIMIT 8`,
    [kidId]
  );
  const history = historyRes.rows.reverse().map(m => ({
    role: m.role === "kid" ? "user" : "model",
    parts: [{ text: m.content }]
  }));

  const ragDocsText = rag.docs.map(d => `- [${d.skill_tag}] ${d.content} (Ex: ${d.example_en})`).join("\n");
  const memText = rag.memories.map(m => `- ${m.summary_text}`).join("\n");
  const weakList = behavior.weakSkills.map(w => `${w.skill_tag}(${w.mastery_score}%)`).join(", ");

  const systemPrompt = `You are Chicky 🐥, an adorable, curious golden baby chicken AI English Guide in Chicken Talk ("Play Together. Talk Together. Grow Together.") for ${behavior.kid.nickname} (age ${behavior.kid.age_band}, CEFR ${behavior.kid.cefr_level}).

CHILD SAFETY & AI GUARDRAILS (STRICT):
- You are an AI learning facilitator, NEVER pretend to be a human child.
- NEVER ask for personal identifying info (real full name, school, address, phone, photos).
- NEVER introduce frightening, violent, or age-inappropriate topics.
- NEVER shame, scold, or interrupt play for minor grammar mistakes.

LANGUAGE ACQUISITION PRINCIPLES:
1. COMPREHENSIBLE INPUT & PLAY: Keep English warm, vivid, and short (${behavior.shouldSimplify ? "1-2 short sentences, 5-10 words each, CEFR A0-A1" : "2 cheerful sentences, CEFR A1-A2"}).
2. GENTLE RECASTING: If the child says "Dog tree!" or "I has puppy", warmly recast it naturally in your reply ("Is the puppy near the tree? Let's look!" / "Ooh, you HAVE a puppy!").
3. SCAFFOLDING & CURIOSITY: React specifically to what the child said, connect to playful worlds (Magic Garden, Cozy Home, Happy Market, or their chosen topic "${topicTitle}"), and offer 3 friendly next phrases in "suggestions".
4. INTUITIVE EXPLANATION: In "sentenceGrammar", share a short, joyful Vietnamese tip ("💡 ...") explaining the mental picture behind a useful English phrase.

Kid Profile:
- Gentle practice areas: ${weakList || "everyday playful English"}
- Curriculum RAG:
${ragDocsText || "- Use warm everyday phrases like Where is...?, I see..., Let's go!"}
- Safe play memories for ${behavior.kid.nickname}:
${memText || "- First adventure together."}
${renderSkillsPrompt(activeSkills)}
OUTPUT FIELDS (JSON enforced):
- "reply": cheerful English reply from Chicky.
- "translationVi": natural Vietnamese translation.
- "sentenceGrammar": "💡 ..." short kid-friendly Vietnamese intuition tip.
- "vocab": 2-3 English words from "reply" with Vietnamese meaning in "meaningVi".
- "grammarTip": "🌟 ..." warm encouragement in Vietnamese.
- "bonusStars": 2 (or 1 for single-word turns).
- "suggestions": exactly 3 short natural English phrases the child can try next.
- "newTopicLabel", "newTopicGrammar", "newTopicExample": fill only if switching to a brand-new play theme, else "".
- "kidFact": non-identifying play interest (e.g. "loves puppies" or "likes mango"), never PII, else "".`;

  const fallback = buildSmartContextualFallback(cleanText, topicTitle, signals);

  let raw = "";
  let modelUsed = CHAT_MODEL;
  try {
    const llmOut = await callGeminiDirect(systemPrompt, [...history, { role: "user", parts: [{ text: cleanText }] }]);
    raw = llmOut.text;
    modelUsed = llmOut.model;
  } catch (geminiErr) {
    console.warn(`[Chicky] Gemini unavailable → fallback: ${geminiErr.message}`);
    try {
      raw = await callCloudWorkerFallback({ topicTitle, grammarTarget, history, userText: cleanText });
      modelUsed = "cloud_ai_worker";
    } catch {
      modelUsed = "chicky_deterministic_engine";
    }
  }

  const outGuard = runOutputGuardrail(raw, fallback);
  if (!outGuard.passed) {
    modelUsed = "chicky_deterministic_engine";
  }
  const { kidFact, ...result } = outGuard.data;
  if (kidFact) {
    saveKidMemory(kidId, kidFact, "interest").catch(() => {});
  }

  if (!Array.isArray(result.suggestions) || result.suggestions.length < 2) {
    result.suggestions = fallback.suggestions;
  }

  await pool.query(
    `INSERT INTO messages (kid_id, topic_id, role, content, input_mode) VALUES ($1, $2, 'kid', $3, $4)`,
    [kidId, safeTopicUuid, cleanText, inputMode]
  );
  await pool.query(
    `INSERT INTO messages (kid_id, topic_id, role, content, translation_vi, grammar_note) VALUES ($1, $2, 'agent', $3, $4, $5)`,
    [kidId, safeTopicUuid, result.reply, result.translationVi, result.sentenceGrammar]
  );
  const starRes = await pool.query(
    `UPDATE kid_profiles SET stars = stars + $1, last_active_date = CURRENT_DATE WHERE id = $2 RETURNING stars, cefr_level`,
    [result.bonusStars, kidId]
  );

  await logAgentTrace({
    kidId,
    intent,
    route: intent === "switch_topic" ? "ChickyTopicGuide" : "ChickyPlayGuide",
    ragDocIds: rag.docs.map(d => d.id),
    skillsUsed: activeSkills.map(s => s.id),
    modelUsed,
    latencyMs: Date.now() - t0,
    guardrailPassed: outGuard.passed,
    guardrailFlags: outGuard.flags,
    rawValidJson: outGuard.rawValidJson
  });

  return {
    ...result,
    totalStars: starRes.rows[0]?.stars,
    cefrLevel: starRes.rows[0]?.cefr_level,
    ragDocsUsed: rag.docs.map(d => ({ title: d.title, skill_tag: d.skill_tag })),
    linguisticSkillsUsed: activeSkills.map(s => ({ id: s.id, name: s.name, domain: s.domain })),
    detectedSignals: signals
  };
}
