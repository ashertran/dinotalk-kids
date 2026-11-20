# 🐣 Chicken Talk — AI Social English Playground

> **Play Together. Talk Together. Grow Together.**  
> *An interactive, child-safe English-learning game for children aged 6–10 starring **Chicky**, a curious golden baby chicken explorer.*

[![Netlify Status](https://api.netlify.com/api/v1/badges/bff3a876-d812-42b7-9c22-c900109ea22c/deploy-status)](https://app.netlify.com/projects/bong-gon-talk/deploys)

---

## ✨ What's Included in This Playable Prototype

- **Original Brand & Visual Identity:** Custom Chicken Talk SVG logo (`apps/web/assets/logo.svg`), warm kid-friendly palette (`#FFD54F`, `#73C9F5`, `#FF986A`, `#A8E6CF`, `#FFF9E8`), and rounded typography (`Fredoka` + `Nunito`).
- **Animated Mascot — Chicky (9 States):** Original inline SVG character with smooth CSS states for `idle`, `greeting`, `talking`, `listening`, `thinking`, `pointing`, `celebrating`, `hinting`, and `goodbye`.
- **Chicky's Little World (World Selection):**
  - **World 1 — The Magic Garden (*Playable*):** Full 4-stage cooperative mission **The Missing Puppy** (*Find Milo!*) with interactive 2.5D SVG scene.
  - **World 2 — My Little Home (*Planned Extension*):** Preview card with target language (`I like...`, `Can you help me?`, `Put it here`, `What color?`, `Let's build together`).
  - **World 3 — Happy Food Market (*Planned Extension*):** Preview card with target language (`Can I have...?`, `How many?`, `Here you go`, `Thank you`, `I want...`).
- **Information Gap Gameplay + Adaptive Scaffolding:**
  - Dual Explorer Roles (**Map Scout 🗺️** vs **Clue Spotter 🔎**) plus a Demo Mode **"Peek Partner Clue"** preview.
  - Multi-modal play: **Push-to-Talk voice**, **Picture Action Cards**, and **Level 0–3 Adaptive Hints** (zero requirement for perfect speech recognition).
  - **Gentle Recasting:** Partial phrases like `"Dog tree!"` are warmly recast (`"Is the dog near the tree? Let's look behind the tree!"`) with zero punitive errors.
  - **Explicit Demo Mode Transparency:** Simulated second player (**Luna 🐰**) is clearly labeled `"Simulated Buddy • Demo Mode"`.
- **Talk with Chicky AI:** Friendly, safety-guarded conversational playmate with tap-any-word pronunciation, Vietnamese helper toggle, optional Gemini + PostgreSQL RAG backend, and deterministic offline fallback.
- **Adult-Gated Parent Space:** Parent Gate math check, parent account login/register, consent & privacy controls (no raw audio stored by default), child profile & avatar manager, approved trusted buddy manager, session limits & **"End Active Kid Session"**, calm learning progress dashboard, safety reporting, and one-click local data deletion.

---

## 🏗️ Project Structure

```text
dinotalk-kids/ (Chicken Talk Workspace)
├── package.json                        # Root scripts: dev, start, test, db:up, db:down
├── docker-compose.yml                  # Optional PostgreSQL 16 + pgvector for cloud/DB mode
├── netlify.toml                        # Static deploy config for apps/web
├── render.yaml                         # Render Blueprint for apps/server + PostgreSQL
├── docs/                               # Phase 1 Foundation Documentation
│   ├── PRODUCT_VISION.md
│   ├── PRD.md
│   ├── GAME_DESIGN.md
│   ├── UX_FLOW.md
│   ├── ARCHITECTURE.md
│   ├── CHILD_SAFETY.md
│   ├── MVP_BACKLOG.md
│   ├── TEST_STRATEGY.md
│   └── DECISIONS.md
├── packages/shared/src/
│   ├── index.js                        # Shared brand tokens, worlds catalog, safety constants
│   └── mission-engine.js               # Deterministic Missing Puppy engine, hints & gentle recaster
├── apps/web/                           # Zero-build responsive PWA frontend (Netlify + Express)
│   ├── index.html                      # Splash, Home, Worlds, Lobby, Mission, Chicky Chat, Parent Space
│   ├── manifest.webmanifest
│   ├── assets/logo.svg                 # Original Chicken Talk vector logo
│   └── src/
│       ├── styles/tokens.css           # Brand color, typography, spacing & touch-target tokens
│       ├── styles/main.css             # Complete UI design system & 9 Chicky state animations
│       ├── components/chicky.js        # Original animated SVG Chicky mascot
│       ├── components/garden-scene.js  # Interactive 2.5D Magic Garden SVG stage
│       ├── data/mission-data.js        # Worlds catalog, 4-stage script, hints, recaster
│       ├── mission.js                  # Playable Missing Puppy gameplay controller
│       └── app.js                      # Navigation, Parent Gate, Parent Space, Chicky Chat, TTS/STT
└── apps/server/                        # Express API + Static Server + AI Safety Harness
    ├── db/schema.sql                   # Idempotent PostgreSQL schema + Magic Garden RAG seed
    ├── src/
    │   ├── app.js                      # REST API (/api/health, /api/worlds, /api/mission/hint, /api/safety/report, /api/auth/*, /api/agent/*, /api/behavior/*)
    │   ├── agent/                      # Chicky Orchestrator, Greeting, Guardrail Harness, Linguistic Skills
    │   └── services/                   # Parent Auth (scrypt + JWT), Behavior/SRS, RAG
    └── test/chickentalk.test.js        # Automated Node unit & API tests
```

---

## 🚀 Quick Start (Zero External AI Credentials Needed)

Requires **Node.js ≥ 20**. Works completely locally **without PostgreSQL or a Gemini API key**:

```bash
npm install
npm run dev
```

Then open **`http://localhost:4000`** in your browser and play the entire **The Missing Puppy** mission right away!

### Run Automated Tests

```bash
npm test
```

### Optional: Enable Full PostgreSQL + Gemini AI Chat Mode

```bash
cp .env.example .env   # Fill in GEMINI_API_KEY and JWT_SECRET (openssl rand -hex 32)
npm run db:up          # Starts PostgreSQL 16 + pgvector on port 5432
npm run dev            # Opens at http://localhost:4000
```

---

## 🛡️ Child Safety & Roadmap Toward Real-Child Multiplayer

> **Important:** The current build runs cooperative gameplay in **Isolated Demo Mode** with a clearly labeled simulated buddy (**Luna 🐰**). Live child-to-child multiplayer MUST NOT be opened until the following Phase 4–6 blockers are verified (see [docs/CHILD_SAFETY.md](docs/CHILD_SAFETY.md)):

1. **Server-Side Buddy Authorization:** Enforce `approved_buddies` verification on PostgreSQL before issuing private room tokens.
2. **Authoritative WebSocket Sync & Audio-Only Voice:** Add server-authoritative WebSocket room state + LiveKit/WebRTC audio-only Push-to-Talk (zero camera streams in Kids Space).
3. **Worlds 2 & 3 Expansion:** Implement *My Little Home* and *Happy Food Market* cooperative missions.
4. **Formal Safety & Legal Review:** Complete verifiable parental consent (VPC) and independent child-privacy review prior to any pilot with real children.
