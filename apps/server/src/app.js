import { config, REPO_ROOT } from "./config/env.js";
import path from "node:path";
import express from "express";
import cors from "cors";
import { pool, ensureDatabaseReady } from "./db/pool.js";
import { loginParent, registerParent, requireAuth } from "./services/auth.service.js";
import { getBehaviorSnapshot, recordBehaviorEvent } from "./services/behavior.service.js";
import { ensureCurriculumEmbeddings } from "./services/rag.service.js";
import { orchestrateChat } from "./agent/orchestrator.js";

const frontendDir = path.join(REPO_ROOT, "apps/web");

const app = express();
app.use(cors());
app.use(express.json());

// Phục vụ trực tiếp giao diện Frontend (apps/web) tại http://localhost:4000
app.use(express.static(frontendDir));
app.get("/", (_req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

const dbReadyPromise = ensureDatabaseReady()
  .then(() => {
    console.log("✅ PostgreSQL Database & Schema sẵn sàng!");
    return ensureCurriculumEmbeddings();
  })
  .catch(e => {
    console.warn("Database init warning:", e.message);
  });

app.use("/api", async (_req, _res, next) => {
  await dbReadyPromise;
  next();
});

// Health Check
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: "connected", service: "dinotalk-server" });
  } catch (e) {
    res.status(503).json({ ok: false, db: "disconnected", error: e.message });
  }
});

// Auth Routes
app.post("/api/auth/register", async (req, res) => {
  try {
    res.json(await registerParent(req.body));
  } catch (e) {
    res.status(400).json({ error: e.code === "23505" ? "Email này đã được đăng ký!" : e.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    res.json(await loginParent(req.body));
  } catch (e) {
    res.status(401).json({ error: "Sai email hoặc mật khẩu" });
  }
});

// Orchestrated AI Agent Chat
app.post("/api/agent/chat", requireAuth, async (req, res) => {
  try {
    const out = await orchestrateChat({ kidId: req.user.kidId, ...req.body });
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: "AGENT_ERROR", detail: e.message });
  }
});

// Behavior Event Tracking (hint_used, word_lookup, trans_clicked, race_answer, topic_switch)
app.post("/api/behavior/event", requireAuth, async (req, res) => {
  try {
    await recordBehaviorEvent(req.user.kidId, req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Dashboard phụ huynh xem tiến độ & điểm yếu của bé
app.get("/api/behavior/summary", requireAuth, async (req, res) => {
  try {
    res.json(await getBehaviorSnapshot(req.user.kidId));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`DinoTalk Backend + Web UI running at http://localhost:${PORT}`);
});
