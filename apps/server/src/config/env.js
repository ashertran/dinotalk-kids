import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = path.resolve(__dirname, "../..");
export const REPO_ROOT = path.resolve(SERVER_ROOT, "../..");

// apps/server/.env (nếu có) được ưu tiên, sau đó tới .env ở root monorepo.
// Sử dụng override: true để giá trị trong file .env luôn được ưu tiên hơn các biến shell cũ bị lưu trong máy.
const ENV_FILES = [path.join(SERVER_ROOT, ".env"), path.join(REPO_ROOT, ".env")];
const explicitPort = process.env.PORT;
dotenv.config({ path: ENV_FILES, override: true });
if (explicitPort) process.env.PORT = explicitPort;

// dotenv KHÔNG ghi đè biến đã có sẵn (export trong shell, `launchctl setenv`, IDE...) → giá trị trong .env bị bỏ qua
// mà không báo gì. Cảnh báo để không lặp lại lỗi: GEMINI_API_KEY cũ (đã hỏng) đặt bằng launchctl thay key mới trong .env.
const fileValues = {};
for (const file of ENV_FILES) {
  if (!fs.existsSync(file)) continue;
  for (const [key, value] of Object.entries(dotenv.parse(fs.readFileSync(file)))) {
    if (!(key in fileValues)) fileValues[key] = value;
  }
}
const shadowed = Object.keys(fileValues).filter(key => process.env[key] !== fileValues[key]);
if (shadowed.length > 0) {
  console.warn(
    `⚠️ Biến môi trường của shell đang GHI ĐÈ .env: ${shadowed.join(", ")} — giá trị trong .env bị bỏ qua.\n` +
    `   Nếu không cố ý: gỡ biến đó (vd. \`unset ${shadowed[0]}\` hoặc \`launchctl unsetenv ${shadowed[0]}\`) rồi mở terminal mới và chạy lại server.`
  );
}

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
