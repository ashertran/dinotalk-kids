# Chicken Talk — MVP Backlog & Phase Tracker

## Completed in Current Prototype (Phases 1–3)

- [x] **Phase 1 — Foundation Docs:** Vision, PRD, Game Design, UX Flow, Architecture, Child Safety, Test Strategy, Decisions.
- [x] **Phase 2 — Brand & Design System:**
  - Original **Chicken Talk** SVG logo & warm palette (`#FFD54F`, `#73C9F5`, `#FF986A`, `#A8E6CF`, `#FFF9E8`).
  - Original animated SVG mascot **Chicky** with 9 animation states (`idle`, `greeting`, `talking`, `listening`, `thinking`, `pointing`, `celebrating`, `hinting`, `goodbye`).
  - Rounded child-friendly typography (`Fredoka` + `Nunito`), large touch targets, tablet-landscape-first responsive layout.
- [x] **Phase 3 — Playable Prototype (Zero-Credential Runnable):**
  - Animated Splash Screen + Kids Home + Chicky's Little World Selection (World 1 playable, Worlds 2–3 previewed).
  - Private Buddy Lobby with Approved Buddies, Role Selector (Map Scout / Clue Spotter), Audio/Mic readiness test, and clearly labeled Demo Mode.
  - Full playable **World 1: The Missing Puppy** (4 Information Gap stages, interactive 2.5D Magic Garden SVG scene, Push-to-Talk + Picture Action Cards + Level 0–3 Adaptive Hints, Gentle Recasting, Simulated Buddy Luna, Pause/Mute/Safe Exit).
  - Shared Mission Completion celebration + Teamwork Badge + Chicky Goodbye.
  - Upgraded *Talk with Chicky* conversational AI & full 7-part Parent Space behind Parent Gate.
  - Automated unit & API test suite (`npm test`).

## Next Steps Toward Safe Real-Child Multiplayer (Phases 4–6)

### Phase 4 — Authoritative Realtime Multiplayer
- [ ] Server-side PostgreSQL `approved_buddies` verification middleware before room join.
- [ ] Authoritative WebSocket game room state synchronization + reconnection recovery.
- [ ] LiveKit / WebRTC **audio-only** Push-to-Talk voice rooms with short-lived server-minted tokens.
- [ ] Server-enforced parent session termination & idle timeout.

### Phase 5 — Controlled AI & Curriculum Expansion
- [ ] Pre-approved dialogue template library & safety review pipeline for generative speech.
- [ ] Build **World 2: My Little Home** cooperative house-decorating mission.
- [ ] Build **World 3: Happy Food Market** cooperative party-shopping mission.
- [ ] Expand PostgreSQL progress telemetry & weekly parent summary email/export.

### Phase 6 — Pilot Readiness & Independent Safety Audit
- [ ] Cross-device tablet (iPad Safari, Android Chrome) & desktop E2E testing.
- [ ] Network disruption & room-reconnection chaos tests.
- [ ] Legal & child-safety review (VPC, retention policy, privacy notice) before live child pilot.
