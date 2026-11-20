# Chicken Talk — Product Requirements Document (PRD)

## 1. Overview

Chicken Talk is a safe, cooperative, AI-guided English playground for children aged 6–10. This PRD defines the MVP scope centered on **World 1: The Magic Garden — The Missing Puppy**, Chicky's adaptive AI guidance, Kid & Parent spaces, and an isolated local Demo Mode with a clearly labeled simulated buddy.

## 2. Target Personas

- **Young Explorer (Age 6–10, CEFR A0–A2):** Prefers bright illustrations, spoken audio, big tap targets, and collaborative stories over walls of text.
- **Parent / Guardian:** Wants confidence that their child is safe (no strangers, no ads, no raw audio recording by default), controls who their child plays with, and wants a simple snapshot of English phrases practiced.

## 3. Core User Stories

### Kids Space
- **K1 — Warm Welcome:** As a child, I see Chicky greet me by name with voice and animation so I feel excited to play.
- **K2 — World & Mission Selection:** As a child, I pick *The Magic Garden* and see *World 2* and *World 3* teased as upcoming adventures.
- **K3 — Safe Buddy Lobby:** As a child, I only see parent-approved buddies (or a clearly labeled Demo Bot buddy) and can check my mic or choose picture-card mode before starting.
- **K4 — Information Gap Gameplay:** As a child, I hold complementary clues (Map Scout or Clue Spotter) and communicate with my buddy using Push-to-Talk, Picture Cards, or Hint Phrases to rescue Milo the puppy.
- **K5 — Adaptive Chicky Scaffolding:** As a child, if I speak partially (e.g., *"dog tree"*), Chicky gently recasts it (*"Is the puppy near the tree? Let's look!"*) and offers Level 0–3 hints without shaming me.
- **K6 — Shared Celebration:** As a child, I celebrate rescuing Milo with my buddy and Chicky, see the phrases we used together, and receive a cooperative badge.
- **K7 — Always-Available Safety Controls:** As a child, I can mute audio, ask Chicky for help, pause, or safely exit at any moment.

### Parent Space
- **P1 — Parent Gate & Account:** As a parent, I pass a simple adult check to manage account login/registration and child profile (nickname, age 6–10, avatar, CEFR level).
- **P2 — Consent & Privacy:** As a parent, I review privacy terms, confirm no default raw audio/transcript storage, and can delete all local child data in one click.
- **P3 — Approved Buddies:** As a parent, I approve or revoke trusted buddies so my child never interacts with strangers.
- **P4 — Session Controls:** As a parent, I set session length limits, Push-to-Talk permissions, default hint scaffolding level, and can end an active session.
- **P5 — Learning Progress Summary:** As a parent, I view missions completed, target phrases practiced, speaking engagement, and grammar comfort trends without stressful grades.
- **P6 — Safety Reporting:** As a parent, I can log a safety concern or review safety notices.

## 4. Functional Scope

### In Scope (MVP Prototype + Current Release)
- Original Chicken Talk brand identity, vector logo, and animated Chicky mascot (9 states)
- Responsive tablet-landscape-first & desktop/mobile web app (`apps/web`)
- Complete playable World 1 (*The Missing Puppy*) with 4 cooperative scenes, Information Gap dual roles, Push-to-Talk + Picture Cards + 3-Level Adaptive Hints, gentle recasting, and clearly labeled Simulated Buddy Demo Mode
- Upgraded *Talk with Chicky* open conversational companion with backend Gemini + RAG support and deterministic offline fallback
- Complete Parent Space (Auth, Consent, Profile, Approved Buddies, Session Controls, Progress Dashboard, Safety Reporting)
- Local zero-credential startup (`npm run dev` or static serve)

### Explicitly Out of Scope
- Public social network or stranger matchmaking
- Camera / video calling in Kids Space
- Public text chat, advertisements, or in-app purchases
- Competitive leaderboards or stressful timed quiz rankings
- 3D open-world rendering
