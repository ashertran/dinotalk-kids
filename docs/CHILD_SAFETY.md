# Chicken Talk — Child Safety & Privacy Requirements

> **Release Blocker Policy:** Child safety is a release blocker, not an optional enhancement. Real child-to-child multiplayer testing MUST NOT open until mandatory server-side authorization, adult consent verification, audio-only transport, and independent safety review are complete.

## 1. Mandatory Safeguards Implemented in Prototype

1. **Adult-Gated Parent Space:** Parent onboarding, privacy preferences, buddy approval, session controls, and account deletion live behind a Parent Gate separated from Kids Space.
2. **Explicit AI & Demo Mode Transparency:**
   - **Chicky** is always presented transparently as an AI English guide, never as a human child.
   - **Demo Mode Buddy (Luna 🐰)** carries an explicit `"Simulated Buddy • Demo Mode"` badge and notice so children and parents never confuse demo mode with a live peer session.
3. **No Stranger Discovery / No Public Social Features:**
   - Removed open 4-digit public MQTT stranger room discovery and removed Split-Camera video calling from Kids Space.
   - Lobby displays only parent-approved buddies (plus the isolated Demo Mode bot).
4. **No Camera & No Unrestricted Peer Text Chat:**
   - Camera is completely excluded from Kids Space gameplay.
   - Mission interaction uses Push-to-Talk voice, pre-approved Picture Action Cards, and controlled phrase scaffolds.
5. **Always-Available Child Escape Hatches:**
   - Immediate **Mute** (`🔊/🔇`), **Help** (`💡`), **Pause** (`⏸`), **Safe Exit** (`🚪`), and **Safety Report** (`🛡️`) controls visible throughout gameplay.
   - Parent-controlled **"End Active Kid Session"** button immediately terminates any active mission.
6. **Data Minimization & Zero Raw Audio Storage by Default:**
   - Raw voice audio is never uploaded or stored; browser Web Speech recognition processes ephemerally only while Push-to-Talk is pressed.
   - Parent Space exposes consent toggles, data minimization status, and one-click **"Delete All Local Child Data"**.
7. **Server & Client AI Guardrails (`apps/server/src/agent/harness.js`):**
   - Blocks unsafe/age-inappropriate topics and prompt-injection attempts.
   - Masks accidental personal identifying info (phone numbers, emails, street/school hints).
   - Enforces deterministic safe fallback whenever external AI fails or produces unapproved output.

## 2. Pre-Pilot Legal & Compliance Notice

Chicken Talk implements privacy-by-design engineering practices inspired by COPPA and GDPR-K principles, **but does not claim legal compliance** without formal legal counsel, verifiable parental consent (VPC) integration, and an independent child-safety audit prior to live child multiplayer pilot launch.
