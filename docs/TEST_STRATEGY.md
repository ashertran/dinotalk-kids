# Chicken Talk — Test Strategy

## 1. Automated Verification Levels

### Unit Tests (`apps/server/test/chickentalk.test.js` — `npm test`)
- **Mission Engine (`packages/shared/src/mission-engine.js`):**
  - Verifies all 4 stages of *The Missing Puppy* Information Gap progression from start to rescue completion.
  - Verifies **Gentle Recasting** for fragmented or imperfect child utterances (e.g., `"dog tree!"` → warm recast *"Is the puppy near the tree? Let's look!"* without punitive error messages).
  - Verifies **Adaptive Hint Levels (0–3)** return appropriate visual/full/partial/open scaffolding.
  - Verifies **Buddy Authorization** blocks unapproved buddy IDs and explicitly marks Demo Mode simulated peers.
- **Safety Guardrails (`apps/server/src/agent/harness.js`):**
  - Blocks unsafe/age-inappropriate keywords and prompt-injection patterns.
  - Redacts phone numbers and email addresses before processing or logging.
  - Guarantees deterministic fallback when LLM returns invalid JSON or blocked text.

### API / Integration Tests (`apps/server/test/chickentalk.test.js`)
- Verifies Express server endpoints (`/api/worlds`, `/api/mission/hint`, `/api/safety/report`) respond with typed JSON contracts even when PostgreSQL and Gemini credentials are absent.

### Interactive Browser Verification
- Launches the local application (`http://localhost:4000`) and walks through:
  1. Animated Splash Screen → Kids Home
  2. World Selection (World 1 playable, Worlds 2–3 teased)
  3. Buddy Lobby (Demo Mode transparency label, Role selection, Mic check)
  4. Full 4-stage playthrough of *The Missing Puppy* using Picture Cards, Adaptive Hints, and Gentle Recast
  5. Pause / Mute / Safe Exit controls
  6. Shared Mission Completion celebration & Chicky Goodbye
  7. Parent Gate → Parent Space (Consent, Approved Buddies, Session Controls, Progress Summary)

## 2. Running Tests Locally

```bash
npm test
```

## 3. Honest Coverage Boundaries

- Live two-device WebRTC audio and PostgreSQL live integration are **not** claimed tested in unit runs when Docker/Postgres is stopped; those require Phase 4 staging tests with active DB and LiveKit credentials.
