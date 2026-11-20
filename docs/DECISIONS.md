# Chicken Talk — Architecture Decision Records (ADRs)

## ADR-001: Preserve Zero-Build Static Web Frontend + Express Monorepo
- **Status:** Accepted
- **Context:** The existing repository deploys `apps/web` statically to Netlify (`netlify.toml`) and serves `apps/web` directly from `apps/server` (Express on Node 24) for local dev and Render Blueprint deployment.
- **Decision:** Keep `apps/web` as modular, zero-build HTML/CSS/JS with custom SVG components (`chicky.js`, `garden-scene.js`) and design tokens (`tokens.css`), while sharing pure deterministic mission logic in `packages/shared`.
- **Consequences:** Any developer can clone, run `npm install && npm run dev`, and immediately play the complete *The Missing Puppy* demo at `http://localhost:4000` with zero build failures, zero Docker requirement, and zero paid AI keys. Migrating to React + Phaser 2D remains cleanly decoupled for Phase 4+ when Worlds 2–3 and richer physics are needed.

## ADR-002: Remove Open Stranger Rooms & Camera Video Calls from Kids Space
- **Status:** Accepted
- **Context:** The legacy DinoTalk prototype exposed an open 4-digit public MQTT room and WebRTC Split-Camera video call directly to children, plus a competitive timed quiz race.
- **Decision:** Replace those features with **Chicky's Little World** cooperative missions, **Parent-Approved Buddies**, clearly labeled **Simulated Buddy Demo Mode**, and audio-only Push-to-Talk + Picture Action Cards. Retain open-ended *Talk with Chicky* AI companion with upgraded child-safety guardrails.
- **Consequences:** Aligns directly with Chicken Talk's child-safety release blockers (no strangers, no cameras, no stressful leaderboards) while preserving the valuable AI RAG and Parent Analytics foundation.

## ADR-003: Original SVG Chicky Mascot & 2.5D Interactive Garden Scene
- **Status:** Accepted
- **Context:** Relying on static emojis or external third-party image URLs fails offline, lacks consistent proportions, and cannot animate Chicky's 9 emotional/instructional states.
- **Decision:** Author an original inline SVG Chicky character (`apps/web/src/components/chicky.js`) with CSS-driven state animations (`idle`, `greeting`, `talking`, `listening`, `thinking`, `pointing`, `celebrating`, `hinting`, `goodbye`) and an original interactive 2.5D SVG Magic Garden scene (`garden-scene.js`).
- **Consequences:** Crisp vector rendering at every screen density (iPad Retina to desktop), instant zero-latency loading, full offline resilience, and direct interactive hotspots synced with gameplay state.

## ADR-004: Deterministic Local-First Scaffolding with Optional Gemini Enhancement
- **Status:** Accepted
- **Context:** MVP must run end-to-end without paid AI keys and must never break or go off-script during child sessions.
- **Decision:** Implement the Information Gap mission loop, 3-level adaptive hints, and gentle recasting in a pure deterministic engine (`packages/shared/src/mission-engine.js` mirrored for static client execution). Backend `/api/agent/*` remains available when PostgreSQL + Gemini keys are provided, guarded by strict safety harness and deterministic fallback.
- **Consequences:** 100% predictable, child-safe mission completion with zero API cost in demo mode.
