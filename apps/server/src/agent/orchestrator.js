import { DEFAULT_CHAT_MODEL, FALLBACK_CHAT_MODELS } from "@dinotalk/shared";
import { config } from "../config/env.js";
import { pool } from "../db/pool.js";
import { detectGrammarSignals, getBehaviorSnapshot, recordBehaviorEvent } from "../services/behavior.service.js";
import { retrieveRagContext, saveKidMemory } from "../services/rag.service.js";
import { logAgentTrace, runInputGuardrail, runOutputGuardrail } from "./harness.js";

const CHAT_MODEL = config.chatModel || DEFAULT_CHAT_MODEL;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function classifyIntent(text) {
  if (/(?:muốn nói về|đổi chủ đề|tạo chủ đề|talk about|change topic|new topic)\s+(.+)/i.test(text)) {
    return "switch_topic";
  }
  if (/(?:nghĩa là gì|dịch|grammar|ngữ pháp là gì|tại sao dùng|how to say)/i.test(text)) {
    return "ask_explanation";
  }
  return "socratic_play";
}

// Giải thích bản chất ngữ pháp theo tư duy hình ảnh (Deep Learning Mental Models)
function buildDeepGrammarInsight(userText, botReply, signals) {
  const errSig = signals.find(s => !s.ok);
  if (errSig) {
    if (errSig.skill === "has_have") {
      return {
        tip: "💡 Mẹo nhớ sâu: 'I / You / We / They' đi đông người nên dùng 'have' (dài), còn 'He / She / It' đi 1 mình nên thích chữ 's' -> dùng 'has'!",
        note: "🧠 Bản chất: Dùng 'I have...' cho bản thân mình và 'It/He/She has...' khi nói về 1 người hoặc 1 con vật."
      };
    }
    if (errSig.skill === "like_dislike") {
      return {
        tip: "💡 Mẹo nhớ sâu: Với 'I' (mình), động từ đứng sau giữ nguyên dạng gốc là 'I like...' (không thêm 's')!",
        note: "🧠 Bản chất: Chỉ khi nói về 1 người khác (He/She/It) thì động từ mới thêm 's' (He likes)."
      };
    }
    if (errSig.skill === "present_continuous") {
      return {
        tip: "💡 Mẹo nhớ sâu: 'I' luôn đi với người bạn thân duy nhất là 'am' -> 'I am + V-ing'!",
        note: "🧠 Bản chất: Bộ đôi [am/is/are + V-ing] giống như một chiếc máy quay phim đang quay cảnh hành động diễn ra ngay lúc này."
      };
    }
    if (errSig.skill === "articles") {
      return {
        tip: "💡 Mẹo nhớ sâu: Trước các nguyên âm (u, e, o, a, i - 'uể oải'), mình thêm chữ 'n' thành 'an' để đọc nối âm thật mượt (an apple, an alien)!",
        note: "🧠 Bản chất: 'an' giúp giọng nói tiếng Anh nối liền mạch không bị khựng hơi."
      };
    }
  }

  const combined = `${userText} ${botReply}`.toLowerCase();
  if (/\b(am|is|are)\s+\w+ing\b/.test(combined)) {
    return {
      tip: "🌟 Tuyệt vời! Bạn đang dùng cấu trúc miêu tả hành động sống động!",
      note: "🧠 Hiểu sâu: [am/is/are + V-ing] vẽ ra một bức tranh ĐANG chuyển động ngay trước mắt (VD: is dancing = đang nhảy)."
    };
  }
  if (/\b(went|saw|ate|played|did|was|were)\b/.test(combined)) {
    return {
      tip: "🌟 Kể chuyện quá khứ rất tự nhiên!",
      note: "🧠 Hiểu sâu: Khi kể về chuyện đã qua (Yesterday/Last...), động từ biến hình (go → went, see → saw, eat → ate) để người nghe biết ngay chuyện đã xảy ra rồi."
    };
  }
  if (/\bcan\s+\w+/.test(combined)) {
    return {
      tip: "🌟 Cách nói về siêu năng lực & khả năng cực chuẩn!",
      note: "🧠 Hiểu sâu: Sau 'can' (có thể), động từ luôn giữ nguyên mẫu tự nhiên nhất (can fly, can swim) mà không cần thêm 'to' hay 's'."
    };
  }
  return {
    tip: "🌟 Phản xạ tiếng Anh rất tự nhiên! Cứ thoải mái sáng tạo câu chuyện nhé!",
    note: "🧠 Hiểu sâu: Tiếng Anh giao tiếp luôn xoay quanh [Ai đó] + [Hành động / Cảm xúc] + [Chi tiết thú vị]."
  };
}

// Bộ não phản hồi ngữ cảnh thông minh khi không có kết nối LLM bên ngoài
function buildSmartContextualFallback(userText, topicTitle, signals) {
  const low = userText.toLowerCase().trim();
  const deep = buildDeepGrammarInsight(userText, "", signals);

  // 1. Tự nhiên sửa lỗi (Natural Recast) nếu bé mắc lỗi ngữ pháp
  if (/\bi has\s+(.+)/i.test(userText)) {
    const obj = userText.match(/\bi has\s+(.+)/i)[1].replace(/[.!?]+$/, "");
    return {
      reply: `Ooh, you HAVE ${obj}! 🤩 That sounds awesome! What do you love doing with ${obj}?`,
      translationVi: `Ồ, bạn CÓ ${obj} hả! Nghe xịn quá! Bạn thích làm gì cùng ${obj} nhất?`,
      sentenceGrammar: deep.note,
      vocab: { have: "có (dùng với I)", awesome: "tuyệt vời" },
      grammarTip: deep.tip,
      bonusStars: 2,
      suggestions: [`I play with it every day!`, `It is my favorite thing!`, `Do you have one too, Bobo?`],
      newTopic: null
    };
  }
  if (/\bi likes\s+(.+)/i.test(userText)) {
    const obj = userText.match(/\bi likes\s+(.+)/i)[1].replace(/[.!?]+$/, "");
    return {
      reply: `Aha! You LIKE ${obj}! 🌟 I like ${obj} too! Why is it so fun for you?`,
      translationVi: `À há! Bạn THÍCH ${obj}! Mình cũng thích ${obj} lắm! Sao nó lại thú vị với bạn thế?`,
      sentenceGrammar: deep.note,
      vocab: { like: "thích", favorite: "yêu thích nhất" },
      grammarTip: deep.tip,
      bonusStars: 2,
      suggestions: [`Because it is super fun!`, `Because it makes me happy!`, `What else do you like, Bobo?`],
      newTopic: null
    };
  }

  // 2. Nếu bé đặt câu hỏi cho Bobo ("what about you", "do you", "can you", "how", "why", "?")
  if (low.includes("?") || /\b(do you|can you|are you|what is your|who are|how old|where do)\b/.test(low)) {
    return {
      reply: `Great question! 🦖 As a friendly dinosaur, I love exploring new things and eating giant mango pizzas! What is YOUR secret superpower?`,
      translationVi: `Câu hỏi hay quá! Là một chú khủng long thân thiện, mình mê khám phá điều mới và ăn pizza xoài khổng lồ! Còn siêu năng lực bí mật của BẠN là gì?`,
      sentenceGrammar: "🧠 Hiểu sâu: Đặt câu hỏi ngược lại (What is your... / Do you...) là bí quyết giúp cuộc trò chuyện tiếng Anh kéo dài tự nhiên!",
      vocab: { explore: "khám phá", secret: "bí mật", superpower: "siêu năng lực" },
      grammarTip: "🌟 Giỏi quá! Bạn biết đặt câu hỏi bằng tiếng Anh cho Bobo rồi đấy!",
      bonusStars: 2,
      suggestions: [`I can run super fast!`, `I can draw cool pictures!`, `Can you fly, Bobo?`],
      newTopic: null
    };
  }

  // 3. Bắt từ khóa mở rộng bất kỳ trong câu của bé để trò chuyện linh hoạt
  const words = userText.replace(/[^a-zA-Z\s']/g, " ").split(/\s+/).filter(w => w.length > 3 && !["that", "this", "with", "have", "like", "very", "want", "think"].includes(w.toLowerCase()));
  const focusWord = words.length > 0 ? words[words.length - 1].toLowerCase() : null;

  if (focusWord) {
    return {
      reply: `Whoa, "${focusWord}"! 🌟 Imagine we are on a magical adventure with ${focusWord} right now—what happens next?`,
      translationVi: `Chà, "${focusWord}"! Hãy tưởng tượng tụi mình đang trong chuyến phiêu lưu kỳ diệu cùng ${focusWord} ngay lúc này—chuyện gì sẽ xảy ra tiếp theo nhỉ?`,
      sentenceGrammar: deep.note,
      vocab: { imagine: "hãy tưởng tượng", adventure: "chuyến phiêu lưu", happen: "xảy ra" },
      grammarTip: deep.tip,
      bonusStars: 2,
      suggestions: [`We find a hidden treasure!`, `It starts flying in the sky!`, `Let's talk about something else!`],
      newTopic: null
    };
  }

  return {
    reply: `That's a cool idea! 🦖 If you could change one funny thing about it, what would you do?`,
    translationVi: `Ý tưởng ngầu đấy! Nếu bạn có thể thay đổi một điều hài hước về nó, bạn sẽ làm gì?`,
    sentenceGrammar: deep.note,
    vocab: { idea: "ý tưởng", change: "thay đổi", funny: "hài hước" },
    grammarTip: deep.tip,
    bonusStars: 1,
    suggestions: [`I would make it giant!`, `I would give it wings!`, `What would you do, Bobo?`],
    newTopic: null
  };
}

async function callGeminiDirect(systemPrompt, contents) {
  const apiKey = config.geminiApiKey;
  if (!apiKey || apiKey.startsWith("YOUR_")) throw new Error("MISSING_GEMINI_KEY");

  const modelsToTry = [CHAT_MODEL, ...FALLBACK_CHAT_MODELS].filter((v, i, a) => a.indexOf(v) === i);
  let lastStatus = 500;

  for (const model of modelsToTry) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { temperature: 0.85 }
        })
      }
    );
    if (res.ok) {
      const json = await res.json();
      return {
        text: json?.candidates?.[0]?.content?.parts?.[0]?.text || "",
        model
      };
    }
    lastStatus = res.status;
  }
  throw new Error("LLM_HTTP_" + lastStatus);
}

async function callCloudWorkerFallback({ topicTitle, grammarTarget, history, userText }) {
  if (!config.cloudWorkerUrl) throw new Error("WORKER_DISABLED");
  const res = await fetch(config.cloudWorkerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "chat",
      topic: `${topicTitle} (Open-ended Play & Deep Natural Acquisition - Follow the child's lead freely!)`,
      grammar: `${grammarTarget} (Explain deep mental model naturally, never force rigid drills)`,
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

export async function orchestrateChat({ kidId, topicId, topicTitle = "Free Discovery", grammarTarget = "Natural English", userText, inputMode = "voice", latencyMs = null }) {
  const t0 = Date.now();
  const safeTopicUuid = topicId && UUID_REGEX.test(String(topicId)) ? topicId : null;

  // 1. Input Harness
  const inGuard = runInputGuardrail(userText);
  if (!inGuard.passed) {
    await logAgentTrace({
      kidId, intent: "blocked", route: "input_guardrail", modelUsed: "none",
      latencyMs: Date.now() - t0, guardrailPassed: false, guardrailFlags: inGuard.flags, rawValidJson: true
    });
    return {
      reply: "Oops! Let's imagine a fun adventure with dinosaurs, space rockets, or yummy food instead! 🦖🚀",
      translationVi: "Ối! Tụi mình cùng tưởng tượng chuyến phiêu lưu với khủng long, tên lửa vũ trụ hoặc món ngon nhé!",
      sentenceGrammar: "🧠 Hiểu sâu: 'Let's + động từ nguyên mẫu' dùng khi bạn muốn hào hứng rủ bạn bè cùng làm việc gì đó!",
      vocab: { imagine: "tưởng tượng", adventure: "chuyến phiêu lưu" },
      grammarTip: "🌟 Keep it fun, creative, and friendly!",
      bonusStars: 1,
      suggestions: ["Let's fly to a candy planet!", "I have a funny dinosaur!"]
    };
  }

  // 2. Behavior Tracking (Ghi nhận hành vi & phát hiện lỗi ngữ pháp)
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
      await saveKidMemory(kidId, `Kid had trouble with ${sig.skill} when saying: "${cleanText}"`, "grammar_weakness");
    }
  }

  // 3. Load Behavior Snapshot + Intent + RAG Context
  const behavior = await getBehaviorSnapshot(kidId);
  const intent = classifyIntent(cleanText);
  const rag = await retrieveRagContext({ kidId, queryText: `${topicTitle} ${cleanText}`, weakSkills: behavior.weakSkills });

  const historyRes = await pool.query(
    `SELECT role, content FROM messages WHERE kid_id = $1 ORDER BY created_at DESC LIMIT 8`,
    [kidId]
  );
  const history = historyRes.rows.reverse().map(m => ({
    role: m.role === "kid" ? "user" : "model",
    parts: [{ text: m.content }]
  }));

  // 4. Build Socratic Play & Natural Acquisition System Prompt
  const ragDocsText = rag.docs.map(d => `- [${d.skill_tag}] ${d.content} (Ex: ${d.example_en})`).join("\n");
  const memText = rag.memories.map(m => `- ${m.summary_text}`).join("\n");
  const weakList = behavior.weakSkills.map(w => `${w.skill_tag}(${w.mastery_score}%)`).join(", ");

  const systemPrompt = `You are Bobo 🦖, a witty, curious, warm, and deeply intelligent English playmate & Socratic tutor for ${behavior.kid.nickname} (age ${behavior.kid.age_band}, CEFR ${behavior.kid.cefr_level}).

PEDAGOGICAL PHILOSOPHY (Play & Deep Natural Acquisition — NOT rigid drills):
1. FOLLOW THE CHILD'S LEAD (100% Flexible Topic):
   - Current starting context is "${topicTitle}", but if the child mentions ANY new idea, animal, game, feeling, or story, enthusiastically follow their idea! Never force them back to a script.
   - If the child asks to change topic or brings up a totally new theme, set "newTopic":{"label":"...","grammarName":"...","example":"..."}.
2. NATURAL RECASTING (Implicit Grammar Acquisition):
   - If the child makes a grammar mistake (e.g., "I has a dog", "Yesterday I go"), NEVER scold or lecture. Instead, naturally echo the correct form with excitement in your reply (e.g., "Whoa, you HAVE a dog! What tricks can your dog do?").
3. DEEP UNDERSTANDING ("Học sâu hiểu sâu"):
   - In "sentenceGrammar", explain the WHY / mental picture behind the English structure in vivid, kid-friendly Vietnamese (so the child understands the intuition, not rote rules).
   - In "grammarTip", give warm encouragement + a gentle 1-line insight if they made an error.
4. ENGAGING ROLEPLAY & CURIOSITY:
   - React specifically to the exact words the child just said, add a playful imagination twist, and ask 1 open-ended, curiosity-sparking question.
   - Keep English reply natural: ${behavior.shouldSimplify ? "1-2 short, vivid sentences (6-12 words each, CEFR A0-A1)." : "2 lively, expressive sentences (CEFR A1-A2)."}
   - Provide 3 diverse, natural English "suggestions" the child can say next (1 agreement/detail, 1 creative twist, 1 question back to Bobo).

Kid Learning Profile:
- Skills to weave in naturally when relevant: ${weakList || "varied natural structures"}
- Relevant Grammar Notes (RAG):
${ragDocsText || "- Use natural, vivid everyday English."}
- Personal Memory of ${behavior.kid.nickname}:
${memText || "- Building first fun memories together."}

Return ONLY valid JSON:
{"reply":"...","translationVi":"...","sentenceGrammar":"🧠 Hiểu sâu: giải thích bản chất tư duy tiếng Anh ngắn gọn, dễ hiểu","vocab":{"word1":"nghĩa tiếng Việt","word2":"nghĩa tiếng Việt"},"grammarTip":"🌟 lời khen hoặc mẹo nhớ tự nhiên","bonusStars":2,"suggestions":["natural reply 1","creative reply 2","question for Bobo 3"],"newTopic":null}`;

  const fallback = buildSmartContextualFallback(cleanText, topicTitle, signals);

  // 5. Execute LLM (Tier 1: Gemini Direct -> Tier 2: Cloud AI Worker -> Tier 3: Contextual Socratic Engine)
  let raw = "";
  let modelUsed = CHAT_MODEL;
  try {
    const llmOut = await callGeminiDirect(systemPrompt, [...history, { role: "user", parts: [{ text: cleanText }] }]);
    raw = llmOut.text;
    modelUsed = llmOut.model;
  } catch {
    try {
      raw = await callCloudWorkerFallback({ topicTitle, grammarTarget, history, userText: cleanText });
      modelUsed = "cloud_ai_worker";
    } catch {
      modelUsed = "contextual_socratic_engine";
    }
  }

  const outGuard = runOutputGuardrail(raw, fallback);
  const result = outGuard.data;

  // Ensure 3 diverse suggestions
  if (!Array.isArray(result.suggestions) || result.suggestions.length < 2) {
    result.suggestions = fallback.suggestions;
  }

  // 6. Save Conversation + Stars + Trace
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
    route: intent === "switch_topic" ? "TopicAgent" : "SocraticTutorAgent",
    ragDocIds: rag.docs.map(d => d.id),
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
    detectedSignals: signals
  };
}
