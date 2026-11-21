import { config, REPO_ROOT } from "./config/env.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import {
  APP_BRAND,
  WORLDS_CATALOG,
  MISSING_PUPPY_STAGES,
  evaluateMissionUtterance,
  getAdaptiveHint
} from "@dinotalk/shared";
import { pool, ensureDatabaseReady } from "./db/pool.js";
import { loginParent, registerParent, requireAuth } from "./services/auth.service.js";
import { getBehaviorSnapshot, recordBehaviorEvent } from "./services/behavior.service.js";
import { ensureCurriculumEmbeddings } from "./services/rag.service.js";
import { orchestrateChat } from "./agent/orchestrator.js";
import { orchestrateGreeting } from "./agent/greeting.js";
import { runInputGuardrail } from "./agent/harness.js";
import {
  createPrivateRoom,
  getRoomSnapshot,
  applyMissionAction,
  setRoomPauseState,
  terminatePrivateRoom
} from "./services/room.service.js";

const frontendDir = path.join(REPO_ROOT, "apps/web");

// In-memory privacy-safe report buffer when running locally without PostgreSQL
const localSafetyLog = [];

export function createApp({ skipDbInit = false } = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Serve Chicken Talk static frontend directly at http://localhost:4000
  app.use(express.static(frontendDir));
  app.get("/", (_req, res) => {
    res.sendFile(path.join(frontendDir, "index.html"));
  });

  let dbReady = false;
  const dbReadyPromise = skipDbInit
    ? Promise.resolve()
    : ensureDatabaseReady()
        .then(() => {
          dbReady = true;
          console.log("✅ Chicken Talk PostgreSQL Database & Schema ready!");
          return ensureCurriculumEmbeddings();
        })
        .catch(e => {
          dbReady = false;
          console.warn("ℹ️ Running in Zero-DB Demo Mode (PostgreSQL unavailable):", e.message);
        });

  // Public Zero-Credential Endpoints (Work offline / without Postgres or Gemini)
  app.get("/api/worlds", (_req, res) => {
    res.json({
      brand: APP_BRAND,
      worlds: WORLDS_CATALOG,
      missingPuppyStagesCount: MISSING_PUPPY_STAGES.length
    });
  });

  // WebRTC ICE Servers (STUN + TURN relay for Desktop <-> Mobile 4G/NAT video calls)
  let cachedMeteredIce = { servers: null, expiresAt: 0 };
  app.get("/api/rtc/ice", async (_req, res) => {
    const baseStun = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun.cloudflare.com:3478" },
      { urls: "stun:stun.relay.metered.ca:80" }
    ];
    const defaultTurn = [
      {
        urls: "turn:turn.evan-brass.net:3478?transport=udp",
        username: "user",
        credential: "password"
      },
      {
        urls: "turn:turn.evan-brass.net:3478?transport=tcp",
        username: "user",
        credential: "password"
      }
    ];

    if (config.meteredTurnApiUrl) {
      if (cachedMeteredIce.servers && Date.now() < cachedMeteredIce.expiresAt) {
        return res.json({ iceServers: [...baseStun, ...cachedMeteredIce.servers], source: "metered_cache" });
      }
      try {
        const r = await fetch(config.meteredTurnApiUrl, { signal: AbortSignal.timeout(3000) });
        if (r.ok) {
          const list = await r.json();
          if (Array.isArray(list) && list.length > 0) {
            cachedMeteredIce = { servers: list, expiresAt: Date.now() + 5 * 60 * 1000 };
            return res.json({ iceServers: [...baseStun, ...list], source: "metered" });
          }
        }
      } catch {}
    }

    if (config.turnUrls.length > 0) {
      const customTurn = { urls: config.turnUrls };
      if (config.turnUsername) customTurn.username = config.turnUsername;
      if (config.turnCredential) customTurn.credential = config.turnCredential;
      return res.json({ iceServers: [...baseStun, customTurn, ...defaultTurn], source: "env_turn" });
    }

    return res.json({ iceServers: [...baseStun, ...defaultTurn], source: "default_turn" });
  });

  app.post("/api/mission/hint", (req, res) => {
    const { stageIndex = 0, utterance = "", hintLevel = 1 } = req.body || {};
    if (utterance && String(utterance).trim()) {
      const evalResult = evaluateMissionUtterance({
        stageIndex: Number(stageIndex) || 0,
        utterance: String(utterance),
        hintLevel: Number(hintLevel)
      });
      return res.json({
        mode: "deterministic_chicky_guide",
        ...evalResult
      });
    }
    return res.json({
      mode: "deterministic_chicky_guide",
      hint: getAdaptiveHint(Number(stageIndex) || 0, Number(hintLevel))
    });
  });

  app.post("/api/safety/report", async (req, res) => {
    const category = String(req.body?.category || "general").slice(0, 60);
    const guard = runInputGuardrail(String(req.body?.details || ""));
    const safeDetails = (guard.sanitizedText || "Parent/child safety report").slice(0, 400);
    const entry = {
      id: `sr_${Date.now()}`,
      category,
      details: safeDetails,
      createdAt: new Date().toISOString()
    };

    if (dbReady) {
      try {
        await pool.query(
          `INSERT INTO safety_reports (category, details) VALUES ($1, $2)`,
          [category, safeDetails]
        );
      } catch {
        localSafetyLog.push(entry);
      }
    } else {
      localSafetyLog.push(entry);
      if (localSafetyLog.length > 50) localSafetyLog.shift();
    }

    res.json({ ok: true, reportId: entry.id, storedInDb: dbReady });
  });

  // Server-Authoritative Private Room Routes (Approved Buddies Only + Reconnection + Action Enforcement)
  app.post("/api/rooms/create", (req, res) => {
    try {
      const room = createPrivateRoom(req.body || {});
      res.status(201).json({ ok: true, room });
    } catch (e) {
      res.status(e.statusCode || 400).json({ ok: false, error: e.code || "ROOM_CREATE_ERROR", message: e.message });
    }
  });

  app.get("/api/rooms/:roomId/state", (req, res) => {
    try {
      const room = getRoomSnapshot(req.params.roomId, {
        isReconnect: req.query.reconnect === "1",
        viewerRole: req.query.role || null
      });
      res.json({ ok: true, room });
    } catch (e) {
      res.status(e.statusCode || 404).json({ ok: false, error: e.code || "ROOM_NOT_FOUND", message: e.message });
    }
  });

  app.post("/api/rooms/:roomId/action", (req, res) => {
    try {
      const result = applyMissionAction(req.params.roomId, req.body || {});
      res.json({ ok: true, ...result });
    } catch (e) {
      res.status(e.statusCode || 400).json({ ok: false, error: e.code || "ACTION_ERROR", message: e.message });
    }
  });

  app.post("/api/rooms/:roomId/pause", (req, res) => {
    try {
      const room = setRoomPauseState(req.params.roomId, Boolean(req.body?.paused));
      res.json({ ok: true, room });
    } catch (e) {
      res.status(e.statusCode || 404).json({ ok: false, error: e.message });
    }
  });

  app.post("/api/rooms/:roomId/terminate", (req, res) => {
    try {
      const room = terminatePrivateRoom(req.params.roomId, req.body?.reason || "parent_terminated");
      res.json({ ok: true, room });
    } catch (e) {
      res.status(e.statusCode || 404).json({ ok: false, error: e.message });
    }
  });

  // Health Check
  app.get("/api/health", async (_req, res) => {
    await dbReadyPromise;
    try {
      await pool.query("SELECT 1");
      res.json({ ok: true, app: APP_BRAND.name, db: "connected", service: "chickentalk-server" });
    } catch (e) {
      res.json({
        ok: true,
        app: APP_BRAND.name,
        db: "demo_offline",
        demoPlayable: true,
        service: "chickentalk-server",
        note: "Demo mode works locally without PostgreSQL"
      });
    }
  });

  // DB-backed routes wait briefly for DB init
  app.use(["/api/auth", "/api/agent", "/api/behavior"], async (_req, _res, next) => {
    await dbReadyPromise;
    next();
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
    } catch {
      res.status(401).json({ error: "Sai email hoặc mật khẩu" });
    }
  });

  // Orchestrated Chicky AI Chat
  app.post("/api/agent/chat", requireAuth, async (req, res) => {
    try {
      const out = await orchestrateChat({ kidId: req.user.kidId, ...req.body });
      res.json(out);
    } catch (e) {
      res.status(500).json({ error: "AGENT_ERROR", detail: e.message });
    }
  });

  // Chicky opening greeting
  app.post("/api/agent/greet", requireAuth, async (req, res) => {
    try {
      const out = await orchestrateGreeting({ kidId: req.user.kidId });
      if (!out) return res.status(503).json({ error: "GREETING_UNAVAILABLE" });
      res.json(out);
    } catch (e) {
      res.status(500).json({ error: "AGENT_ERROR", detail: e.message });
    }
  });

  // Behavior Event Tracking
  app.post("/api/behavior/event", requireAuth, async (req, res) => {
    try {
      await recordBehaviorEvent(req.user.kidId, req.body);
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // Parent Learning Summary Dashboard
  app.get("/api/behavior/summary", requireAuth, async (req, res) => {
    try {
      res.json(await getBehaviorSnapshot(req.user.kidId));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return app;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const app = createApp();
  const PORT = config.port;
  app.listen(PORT, () => {
    console.log(`🐥 Chicken Talk Server + Web Playground running at http://localhost:${PORT}`);
  });
}
