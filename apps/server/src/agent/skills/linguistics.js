// Linguistic Skills cho Agent Bobo.
// Mỗi skill = 1 mảng ngôn ngữ học (ngữ âm, hình thái, ngữ nghĩa, ngữ dụng, diễn ngôn, chuyển di L1, trộn mã).
// Cơ chế "progressive disclosure" giống Agent Skills: mỗi lượt chat chỉ chạy detect() rẻ tiền (regex) trên câu của bé,
// rồi nạp phần instructions của tối đa MAX_ACTIVE_SKILLS skill liên quan nhất vào system prompt → prompt gọn cho model lite.

export const MAX_ACTIVE_SKILLS = 3;

const VI_DIACRITICS = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const SUBJECTS = "i|you|we|they|he|she|it";
const ADJECTIVES = "happy|sad|hungry|thirsty|tired|sleepy|angry|scared|hot|cold|big|small|good|bad|fine|ok|okay|sick|bored|excited|fun|funny|cute|strong|fast";
const BASE_VERBS = "go|play|eat|run|swim|fly|read|draw|sing|dance|sleep|jump|watch|like|have|want|see|make";
const COUNT_NOUNS = "dog|cat|bird|fish|apple|banana|car|book|friend|toy|ball|egg|dinosaur|star|flower|robot|cake|rocket|monkey";
// Danh từ đếm được có số nhiều thêm -s (không có fish/sheep/pizza...).
const PLURAL_S_NOUNS = "dog|cat|bird|apple|banana|car|book|friend|toy|ball|egg|dinosaur|star|flower|robot|rocket|monkey";
const NUMBERS = "two|three|four|five|six|seven|eight|nine|ten|many|some|lots of|a lot of|\\d+";

// Các lỗi chuyển di từ tiếng Việt (ngôn ngữ đơn lập: không biến hình, không mạo từ, tính từ đứng sau danh từ, không cần "to be").
const L1_TRANSFER_PATTERNS = [
  {
    rx: /\bi very (like|love|want|happy|hungry)\b/i,
    label: "'very' + verb (from Vietnamese 'rất thích')",
    fix: "I really like ... / I like ... very much"
  },
  {
    // Chỉ bắt chủ ngữ đầu mệnh đề để tránh "make it big".
    rx: new RegExp(`(^|[.!?,]\\s*|\\b(?:and|but|because|so)\\s+)(${SUBJECTS})\\s+(${ADJECTIVES})\\b`, "i"),
    label: "missing 'to be' before an adjective (Vietnamese 'Em vui' has no copula)",
    fix: "I am happy / She is hungry"
  },
  {
    rx: new RegExp(`\\b(i am|i'm|he is|she is|it is|we are|they are|you are)\\s+(${BASE_VERBS})\\b`, "i"),
    label: "'be' + base verb (Vietnamese 'đang/là' mapped to am/is/are)",
    fix: "I go ... / I am going ..."
  },
  {
    rx: new RegExp(`\\b(${NUMBERS})\\s+(${PLURAL_S_NOUNS})\\b`, "i"),
    label: "missing plural -s after a number (Vietnamese nouns don't change: 'hai con chó')",
    fix: "two dogs / three apples"
  },
  {
    rx: new RegExp(`\\b(${COUNT_NOUNS}|house|car|hat)\\s+(big|small|red|blue|green|yellow|pink|cute|little|new)\\b`, "i"),
    label: "adjective after the noun (Vietnamese order 'con chó to')",
    fix: "a big dog / a red car"
  },
  {
    rx: /\bgo (school|park|zoo|beach|market)\b/i,
    label: "missing preposition 'to' (Vietnamese 'đi học / đi công viên')",
    fix: "go to school / go to the park"
  }
];

const has = (rx, text) => rx.test(text);

export const LINGUISTIC_SKILLS = [
  {
    id: "l1_transfer_vi",
    name: "Contrastive Analysis (Vietnamese → English)",
    domain: "Syntax & Morphosyntax",
    description: "Nhận diện lỗi do chuyển di cấu trúc tiếng Việt và recast tự nhiên.",
    detect({ text, signals }) {
      const hits = L1_TRANSFER_PATTERNS.filter(p => p.rx.test(text));
      if (hits.length) return { score: 5, evidence: hits };
      // has/have, I likes... cũng là chuyển di: tiếng Việt không chia động từ theo ngôi.
      if (signals.some(s => !s.ok)) return { score: 3, evidence: [] };
      return null;
    },
    instructions(_ctx, evidence) {
      const detected = evidence.length
        ? `Detected in the child's sentence:\n${evidence.map(e => `  • ${e.label} → model: "${e.fix}"`).join("\n")}\n`
        : "";
      return `${detected}- Vietnamese is an isolating language: no verb agreement, no plural endings, no articles, no copula before adjectives, adjectives follow nouns. Treat these errors as natural transfer, never as "wrong".
- Recast ONCE inside "reply" with the correct form stressed by context (e.g. child: "I very like cats" → "You REALLY like cats! Me too!"). Do not correct more than one structure per turn.
- In "sentenceGrammar", contrast the two languages in a vivid picture (e.g. "Tiếng Việt nói 'con chó to', tiếng Anh thích đặt màu sắc/kích cỡ lên TRƯỚC: a big dog").`;
    }
  },
  {
    id: "code_switching",
    name: "Bilingual Code-Switching Support",
    domain: "Sociolinguistics",
    description: "Bé chen tiếng Việt vào câu tiếng Anh → cung cấp từ tiếng Anh còn thiếu.",
    detect({ text, intent }) {
      if (!VI_DIACRITICS.test(text)) return null;
      // Câu hỏi "nghĩa là gì" bằng tiếng Việt là hỏi giải thích, không phải trộn mã.
      return { score: intent === "ask_explanation" ? 1 : 4, evidence: [] };
    },
    instructions() {
      return `- The child mixed Vietnamese into English — a healthy bilingual strategy, praise it implicitly.
- Identify the Vietnamese word(s), give the English equivalent naturally inside "reply" (e.g. "Oh, a 'con mèo'? A CAT! What color is your cat?") and add it to "vocab".
- Make the first suggestion the child's full sentence re-said entirely in English.`;
    }
  },
  {
    id: "phonology",
    name: "Phonology & Pronunciation Coaching",
    domain: "Phonetics & Phonology",
    description: "Hướng dẫn phát âm, trọng âm, âm cuối – những điểm khó với người Việt.",
    detect({ text, inputMode }) {
      if (has(/(phát âm|đọc (thế nào|sao|như nào|ra sao)|pronounc|how (do|to|can) (i )?say|spell)/i, text)) {
        return { score: 5, evidence: ["explicit_request"] };
      }
      if (inputMode === "voice" && has(/\b\w*(th|sh|ch)\w*\b|\b\w+(st|sk|ts|ks|nd|ld)s?\b/i, text)) {
        return { score: 2, evidence: ["voice_tricky_sounds"] };
      }
      return null;
    },
    instructions(_ctx, evidence) {
      const explicit = evidence.includes("explicit_request");
      return `- Vietnamese learners commonly: drop final consonants (cat → "ca", dogs → "dog"), simplify clusters (street → "sờ-trít"), replace /θ/ /ð/ with /t/ /d/ or /th/, merge /ʃ/ and /s/, and give every syllable equal stress (Vietnamese is syllable-timed and tonal).
${explicit
  ? `- The child asked how to say something: in "sentenceGrammar", break the word into syllables, mark the STRESSED syllable in capitals (e.g. "DI-no-saur", "ba-NA-na"), and give one kid-friendly mouth tip (e.g. "/θ/: thè lưỡi nhẹ ra giữa hai hàm răng rồi thổi hơi").
- Never use IPA alone; pair it with a Vietnamese-friendly hint. Avoid spelling English sounds with Vietnamese syllables that teach a wrong final sound.`
  : `- Weave 1 word with a tricky sound from the child's sentence into "reply" so they hear it modeled again. Keep tips subtle; only mention pronunciation in "grammarTip" if it is fun (e.g. "Thử kéo dài âm cuối 's' như con rắn sssss 🐍").`}`;
    }
  },
  {
    id: "lexical_semantics",
    name: "Lexical Semantics & Vocabulary Depth",
    domain: "Semantics",
    description: "Giải nghĩa bằng hình ảnh, thang nghĩa (good→great→amazing), collocation.",
    detect({ text, intent }) {
      if (intent === "ask_explanation") return { score: 4, evidence: ["asked_meaning"] };
      if (has(/\b(good|nice|big|small|happy|bad|very)\b/i, text)) return { score: 2, evidence: ["basic_words"] };
      return null;
    },
    instructions({ cefr }) {
      return `- Explain meaning through images, opposites, and real-world examples, not definitions. Prefer concrete nouns and action verbs${cefr === "A0" ? " (child is A0: stay with everyday, picturable words)" : ""}.
- Build semantic scales to upgrade basic words: good → great → amazing; big → huge → GIANT; happy → excited → super happy. Model ONE upgraded word in "reply".
- Teach words in natural chunks/collocations ("have breakfast", "play football", "ride a bike") rather than isolated words; put chunks in "vocab" when useful.
- If a word has several meanings, give only the meaning used in this context.`;
    }
  },
  {
    id: "morphology",
    name: "Morphology & Word Building",
    domain: "Morphology",
    description: "Tách từ thành 'mảnh Lego': từ ghép, tiền tố, hậu tố, số nhiều.",
    detect({ text, intent }) {
      if (has(/\b(un|re)[a-z]{4,}\b|\b[a-z]{3,}(ful|less|ness|est)\b|\b(sun|rain|star|snow|butter|foot|tooth|bed|class|home)[a-z]{3,}\b/i, text)) {
        return { score: 3, evidence: ["complex_word"] };
      }
      if (intent === "ask_explanation") return { score: 2, evidence: [] };
      return null;
    },
    instructions() {
      return `- Show words as LEGO blocks: compounds (sun + flower = sunflower), prefixes (un- = "không": unhappy), suffixes (-er = người làm: teacher, player; -ful = đầy: colorful), plural -s/-es.
- In "sentenceGrammar", break down at most one word into its parts in Vietnamese, then invite the child to build a new word with the same block (e.g. "play → player, vậy sing → ?").
- Only use morphemes that are productive and kid-level; skip etymology.`;
    }
  },
  {
    id: "pragmatics",
    name: "Pragmatics & Polite Speech Acts",
    domain: "Pragmatics",
    description: "Lời nhờ vả, chào hỏi, cảm ơn, xin lỗi phù hợp ngữ cảnh.",
    detect({ text }) {
      if (has(/\b(give me|i want|bring me|tell me|show me|do it)\b/i, text) && !has(/\bplease\b/i, text)) {
        return { score: 3, evidence: ["bare_request"] };
      }
      if (has(/\b(hi|hello|bye|goodbye|good (morning|night|afternoon)|thank|thanks|sorry)\b/i, text)) {
        return { score: 2, evidence: ["social_routine"] };
      }
      return null;
    },
    instructions(_ctx, evidence) {
      return evidence.includes("bare_request")
        ? `- The child made a direct request. Respond warmly, then model a softer form once ("Can I have..., please?", "Could you show me...?") — playful, never moralizing.
- In "sentenceGrammar", explain that English adds "please / Can I...?" the way Vietnamese adds "ạ / nhé / dạ" to sound polite.`
        : `- The child used a social routine (greeting, thanks, apology). Mirror it and model a natural response pair (Thank you → You're welcome! / Sorry → That's okay!).
- Suggest one natural follow-up phrase that keeps the conversation going (e.g. "How are you today?").`;
    }
  },
  {
    id: "discourse",
    name: "Discourse & Narrative Building",
    domain: "Discourse Analysis",
    description: "Giúp bé nối câu thành câu chuyện: first/then/finally, because/so.",
    detect({ text }) {
      const words = text.trim().split(/\s+/).length;
      if (has(/\b(yesterday|last (night|week|weekend)|and then|then|first|after that|because|so)\b/i, text)) {
        return { score: 3, evidence: ["narrative_markers"] };
      }
      if (words >= 10) return { score: 2, evidence: ["long_utterance"] };
      return null;
    },
    instructions() {
      return `- The child is telling a story or giving reasons. Scaffold the narrative: ask "And then what happened?" / "Why?" to extend it.
- Model ONE linking word in "reply" (first, then, after that, finally, because, so, but) and make one suggestion use a connector.
- Keep tense consistent with the child's story (past events → past tense) and recast tense slips naturally.`;
    }
  }
];

// Chấm điểm & chọn skill cho lượt chat hiện tại.
export function selectLinguisticSkills({ text, intent, inputMode, signals = [], cefr = "A0" }, max = MAX_ACTIVE_SKILLS) {
  const ctx = { text: text || "", intent, inputMode, signals, cefr };
  return LINGUISTIC_SKILLS
    .map((skill, order) => {
      let hit = null;
      try {
        hit = skill.detect(ctx);
      } catch {
        hit = null; // Một skill lỗi không được làm hỏng cả lượt chat
      }
      return hit && hit.score > 0 ? { skill, order, score: hit.score, evidence: hit.evidence || [] } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, max)
    .map(({ skill, score, evidence }) => ({
      id: skill.id,
      name: skill.name,
      domain: skill.domain,
      score,
      evidence,
      instructions: skill.instructions(ctx, evidence)
    }));
}

// Khối prompt chèn vào system prompt của Bobo.
export function renderSkillsPrompt(activeSkills) {
  if (!activeSkills.length) return "";
  const blocks = activeSkills.map(s => `### Skill: ${s.name} [${s.domain}]\n${s.instructions}`).join("\n\n");
  return `
ACTIVE LINGUISTIC SKILLS (chosen for this turn from the child's sentence — apply them inside the normal output fields, keep the playful tone, never turn the reply into a lecture):
${blocks}
`;
}
