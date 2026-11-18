import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = path.resolve(__dirname, "../..");
export const REPO_ROOT = path.resolve(SERVER_ROOT, "../..");

// apps/server/.env (nếu có) được ưu tiên, sau đó tới .env ở root monorepo.
dotenv.config({ path: [path.join(SERVER_ROOT, ".env"), path.join(REPO_ROOT, ".env")] });

const isProd = process.env.NODE_ENV === "production";

function resolveJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (isProd) throw new Error("JWT_SECRET phải được đặt (>= 32 ký tự) khi NODE_ENV=production");
  console.warn("⚠️ JWT_SECRET chưa đặt hoặc quá ngắn — đang dùng secret dev, KHÔNG dùng cho production.");
  return secret || "dev_only_insecure_secret_change_me_please";
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://dinotalk:dinotalk_secret_password@localhost:5432/dinotalk_db",
  jwtSecret: resolveJwtSecret(),
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  chatModel: process.env.GEMINI_CHAT_MODEL,
  embedModel: process.env.GEMINI_EMBED_MODEL,
  // Tier 2 fallback LLM. Để trống để tắt.
  cloudWorkerUrl: process.env.CLOUD_WORKER_URL || ""
};
