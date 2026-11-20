import { pool } from "../db/pool.js";

// Tự động phát hiện lỗi ngữ pháp phổ biến của bé từ câu nói
export function detectGrammarSignals(text) {
  const low = text.toLowerCase();
  const signals = [];
  if (/\bi has\b/.test(low)) signals.push({ skill: "has_have", ok: false });
  if (/\b(he|she|it) have\b/.test(low)) signals.push({ skill: "has_have", ok: false });
  if (/\bi likes\b/.test(low)) signals.push({ skill: "like_dislike", ok: false });
  if (/\bi is\b/.test(low)) signals.push({ skill: "present_continuous", ok: false });
  if (/\ba (apple|orange|alien|elephant|ice)\b/.test(low)) signals.push({ skill: "articles", ok: false });

  if (/\bi have\b|\b(he|she|it) has\b/.test(low)) signals.push({ skill: "has_have", ok: true });
  if (/\bi (like|don't like)\b/.test(low)) signals.push({ skill: "like_dislike", ok: true });
  if (/\b(am|is|are) \w+ing\b/.test(low)) signals.push({ skill: "present_continuous", ok: true });
  if (/\b(yesterday|went|saw|ate|played)\b/.test(low)) signals.push({ skill: "past_simple", ok: true });
  if (/\ban (apple|orange|alien|elephant|ice)\b/.test(low)) signals.push({ skill: "articles", ok: true });
  return signals;
}

export async function recordBehaviorEvent(kidId, { eventType, skillTag = null, isCorrect = null, latencyMs = null, metadata = {} }) {
  if (!kidId || !eventType) return;
  await pool.query(
    `INSERT INTO learning_behavior_events (kid_id, event_type, skill_tag, is_correct, latency_ms, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [kidId, eventType, skillTag, isCorrect, latencyMs, JSON.stringify(metadata || {})]
  );

  if (skillTag && isCorrect !== null && isCorrect !== undefined) {
    const delta = isCorrect ? 8 : -10;
    const reviewHours = isCorrect ? 72 : 4; // Sai thì 4 tiếng sau ôn lại; đúng thì 3 ngày sau
    await pool.query(
      `INSERT INTO kid_skill_mastery (kid_id, skill_tag, mastery_score, error_count, correct_count, next_review_at)
       VALUES ($1, $2, GREATEST(0, LEAST(100, 30 + $3)), $4, $5, NOW() + ($6 || ' hours')::interval)
       ON CONFLICT (kid_id, skill_tag) DO UPDATE SET
         mastery_score = GREATEST(0, LEAST(100, kid_skill_mastery.mastery_score + $3)),
         error_count = kid_skill_mastery.error_count + $4,
         correct_count = kid_skill_mastery.correct_count + $5,
         last_practiced_at = NOW(),
         next_review_at = NOW() + ($6 || ' hours')::interval`,
      [kidId, skillTag, delta, isCorrect ? 0 : 1, isCorrect ? 1 : 0, reviewHours]
    );

    // Tự động nâng trình độ CEFR của bé dựa trên điểm thành thạo trung bình
    const avgRes = await pool.query(
      `SELECT AVG(mastery_score) AS avg_score, COUNT(*) AS cnt FROM kid_skill_mastery WHERE kid_id = $1`,
      [kidId]
    );
    const avg = Number(avgRes.rows[0]?.avg_score || 0);
    const cnt = Number(avgRes.rows[0]?.cnt || 0);
    if (cnt >= 2) {
      const nextCefr = avg >= 75 ? "A2" : avg >= 48 ? "A1" : "A0";
      await pool.query(`UPDATE kid_profiles SET cefr_level = $1 WHERE id = $2`, [nextCefr, kidId]);
    }
  }
}

// Lấy hồ sơ hành vi hiện tại để Orchestrator điều chỉnh độ khó của Agent & hiển thị trên Dashboard Phụ Huynh
export async function getBehaviorSnapshot(kidId) {
  const [kidRes, weakRes, allSkillsRes, statsRes, recentEventsRes, tracesRes] = await Promise.all([
    pool.query(`SELECT id, nickname, avatar, age_band, cefr_level, stars, streak_days, preferred_lang FROM kid_profiles WHERE id = $1`, [kidId]),
    pool.query(`SELECT skill_tag, mastery_score, error_count, correct_count, next_review_at FROM kid_skill_mastery WHERE kid_id = $1 ORDER BY mastery_score ASC LIMIT 3`, [kidId]),
    pool.query(`SELECT skill_tag, mastery_score, error_count, correct_count, last_practiced_at, next_review_at FROM kid_skill_mastery WHERE kid_id = $1 ORDER BY mastery_score ASC`, [kidId]),
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE event_type = 'hint_used') AS hints_used,
         COUNT(*) FILTER (WHERE event_type = 'speak_attempt') AS speak_attempts,
         COUNT(*) FILTER (WHERE event_type = 'word_lookup') AS word_lookups,
         COUNT(*) FILTER (WHERE event_type = 'trans_clicked') AS trans_clicked,
         COUNT(*) FILTER (WHERE event_type = 'race_answer') AS race_answers,
         COUNT(*) FILTER (WHERE event_type = 'grammar_ok') AS grammar_ok,
         COUNT(*) FILTER (WHERE event_type = 'grammar_error') AS grammar_error,
         ROUND(AVG(latency_ms) FILTER (WHERE latency_ms IS NOT NULL)) AS avg_latency_ms
       FROM learning_behavior_events
       WHERE kid_id = $1 AND created_at > NOW() - INTERVAL '7 days'`,
      [kidId]
    ),
    pool.query(
      `SELECT event_type, skill_tag, is_correct, latency_ms, metadata, created_at
       FROM learning_behavior_events
       WHERE kid_id = $1
       ORDER BY created_at DESC LIMIT 12`,
      [kidId]
    ),
    pool.query(
      `SELECT intent, route, skills_used, model_used, latency_ms, guardrail_passed, guardrail_flags, created_at
       FROM agent_traces
       WHERE kid_id = $1
       ORDER BY created_at DESC LIMIT 8`,
      [kidId]
    )
  ]);

  const kid = kidRes.rows[0] || { nickname: "Minh", age_band: "6-8", cefr_level: "A0", stars: 0, streak_days: 0, preferred_lang: "vi" };
  const stats = statsRes.rows[0] || {};
  const speakAttempts = Number(stats.speak_attempts || 0);
  const hintsUsed = Number(stats.hints_used || 0);
  const hintDependency = speakAttempts > 0 ? +(hintsUsed / speakAttempts).toFixed(2) : 0;

  return {
    kid,
    weakSkills: weakRes.rows,
    allSkills: allSkillsRes.rows,
    speakAttempts,
    hintsUsed,
    hintDependency,
    recentLookups: Number(stats.word_lookups || 0),
    transClicked: Number(stats.trans_clicked || 0),
    raceAnswers: Number(stats.race_answers || 0),
    grammarOk: Number(stats.grammar_ok || 0),
    grammarError: Number(stats.grammar_error || 0),
    avgLatencyMs: stats.avg_latency_ms ? Number(stats.avg_latency_ms) : null,
    shouldSimplify: hintDependency > 0.5 || kid.cefr_level === "A0",
    recentEvents: recentEventsRes.rows,
    recentTraces: tracesRes.rows
  };
}
