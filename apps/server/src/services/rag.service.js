import { DEFAULT_EMBED_MODEL, EMBED_DIM } from "@dinotalk/shared";
import { config } from "../config/env.js";
import { pool, hasPgVector } from "../db/pool.js";

const EMBED_MODEL = config.embedModel || DEFAULT_EMBED_MODEL;

export async function embedText768(text) {
  const apiKey = config.geminiApiKey;
  if (!apiKey || apiKey.startsWith("YOUR_")) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: { parts: [{ text }] },
          outputDimensionality: EMBED_DIM
        })
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.embedding?.values || null;
  } catch {
    return null;
  }
}

// Đảm bảo các bài học mẫu trong Postgres đã có vector embedding
export async function ensureCurriculumEmbeddings() {
  const missing = await pool.query(`SELECT id, title, content, example_en FROM curriculum_docs WHERE embedding IS NULL`);
  for (const doc of missing.rows) {
    const vec = await embedText768(`${doc.title}. ${doc.content} Example: ${doc.example_en}`);
    if (vec) {
      const cast = hasPgVector ? "::vector" : "::jsonb";
      await pool.query(`UPDATE curriculum_docs SET embedding = $1${cast} WHERE id = $2`, [JSON.stringify(vec), doc.id]);
    }
  }
}

// Truy vấn RAG kết hợp Kiến thức ngữ pháp + Ký ức cá nhân của bé
export async function retrieveRagContext({ kidId, queryText, weakSkills = [] }) {
  const vec = hasPgVector ? await embedText768(queryText) : null;
  if (!vec || !hasPgVector) {
    // Fallback tìm theo skill yếu hoặc bài học phù hợp
    const tags = weakSkills.map(s => s.skill_tag);
    const fb = await pool.query(
      `SELECT id, title, skill_tag, content, example_en, explain_vi
       FROM curriculum_docs
       WHERE ($1::text[] = '{}' OR skill_tag = ANY($1))
       LIMIT 2`,
      [tags]
    );
    const memFb = await pool.query(
      `SELECT id, summary_text, memory_type
       FROM kid_memory_vectors
       WHERE kid_id = $1
       ORDER BY created_at DESC LIMIT 2`,
      [kidId]
    );
    return { docs: fb.rows, memories: memFb.rows };
  }

  const vecLiteral = JSON.stringify(vec);
  const [docsRes, memRes] = await Promise.all([
    pool.query(
      `SELECT id, title, skill_tag, content, example_en, explain_vi,
              1 - (embedding <=> $1::vector) AS similarity
       FROM curriculum_docs
       WHERE embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT 3`,
      [vecLiteral]
    ),
    pool.query(
      `SELECT id, summary_text, memory_type
       FROM kid_memory_vectors
       WHERE kid_id = $1 AND embedding IS NOT NULL
       ORDER BY embedding <=> $2::vector
       LIMIT 2`,
      [kidId, vecLiteral]
    )
  ]);

  return { docs: docsRes.rows, memories: memRes.rows };
}

export async function saveKidMemory(kidId, summaryText, memoryType = "mistake_or_interest") {
  const vec = await embedText768(summaryText);
  const cast = hasPgVector ? "::vector" : "::jsonb";
  await pool.query(
    `INSERT INTO kid_memory_vectors (kid_id, summary_text, memory_type, embedding)
     VALUES ($1, $2, $3, $4${cast})`,
    [kidId, summaryText, memoryType, vec ? JSON.stringify(vec) : null]
  );
}
