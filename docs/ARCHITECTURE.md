# Chicken Talk — System Architecture

## 1. Architectural Strategy

This repository evolves an existing Node.js + Express + PostgreSQL monorepo (`apps/web`, `apps/server`, `packages/shared`) into **Chicken Talk** while preserving zero-friction local execution, static Netlify frontend hosting, and Render backend deployment.

```text
dinotalk-kids/ (Chicken Talk Workspace)
├── apps/
│   ├── web/                          # Static PWA-ready frontend (tablet-landscape-first)
│   │   ├── index.html                # Splash, Kids Home, Worlds, Lobby, Mission, Chicky Chat, Parent Space
│   │   ├── manifest.webmanifest      # Web App Manifest
│   │   ├── assets/logo.svg           # Original Chicken Talk vector logo
│   │   └── src/
│   │       ├── styles/tokens.css     # Brand design tokens (#FFD54F, #73C9F5, #FF986A, #A8E6CF, #FFF9E8)
│   │       ├── styles/main.css       # Design system, 9 Chicky animations, 2.5D Magic Garden styles
│   │       ├── components/chicky.js  # Reusable SVG Chicky mascot with 9 animation states
│   │       ├── components/garden-scene.js # Interactive 2.5D Magic Garden SVG renderer
│   │       ├── data/mission-data.js  # Worlds catalog, Missing Puppy 4-stage script, hints, recasts
│   │       ├── mission.js            # Cooperative game loop, Information Gap, Simulated Buddy Demo Mode
│   │       └── app.js                # Navigation, Parent Gate, Parent Space, Chicky Chat, TTS/STT, Analytics
│   └── server/                       # Express REST API + Static Server + AI Guide Harness
│       ├── db/schema.sql             # Idempotent PostgreSQL schema (accounts, profiles, buddies, consents, RAG)
│       ├── src/
│       │   ├── app.js                # REST endpoints (/api/health, /api/auth/*, /api/agent/*, /api/mission/*, /api/safety/*)
│       │   ├── agent/                # Chicky Orchestrator, Greeting Agent, Safety Harness, Linguistic Skills
│       │   ├── config/env.js         # Env-based config (no hardcoded API keys)
│       │   ├── db/pool.js            # PostgreSQL pool with local bootstrap & pgvector/JSONB fallback
│       │   └── services/             # Auth (scrypt + JWT), Behavior/SRS, RAG embeddings
│       └── test/chickentalk.test.js  # Node native unit & API test suite
└── packages/
    └── shared/                       # Shared brand constants, mission engine, hint & safety helpers
        └── src/
            ├── index.js
            └── mission-engine.js     # Deterministic server/shared Missing Puppy logic & recaster
```

## 2. Offline-First & Zero-Credential Guarantee

- **Frontend (`apps/web`)**: Runs completely locally without PostgreSQL or Gemini API keys. All mission progression, Chicky gentle recasts, 3-level adaptive hints, Push-to-Talk, TTS voice, and Simulated Buddy behavior execute deterministically out of the box.
- **Backend (`apps/server`)**: Starts cleanly even if PostgreSQL is offline, serves `apps/web` at `http://localhost:4000`, and serves deterministic `/api/mission/hint` and `/api/worlds` routes. When PostgreSQL + `GEMINI_API_KEY` are configured, parent accounts, RAG memory, and Gemini-enhanced Chicky chat activate automatically.

## 3. Realtime & Production Roadmap (Phase 4+)

The current prototype intentionally isolates demo gameplay to a **clearly labeled Simulated Buddy mode** (and optional local-only approved-buddy BroadcastChannel preview) until mandatory Phase 4 server-side controls are deployed:
- **Authoritative Private Rooms**: Server-enforced WebSocket rooms verifying parent-approved buddy pairs in PostgreSQL before issuing room tokens.
- **Voice Transport**: LiveKit / WebRTC audio-only Push-to-Talk tracks (strictly no video/camera streams in Kids Space) with server-issued short-lived room tokens.
- **AI Orchestration**: Controlled server-side templates + safety harness + mandatory parent safety review before any generative voice is enabled.
