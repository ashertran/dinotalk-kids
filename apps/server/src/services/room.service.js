// ==========================================================================
// CHICKEN TALK — Server-Authoritative Private Room & Mission State Service
// Enforces:
//   - Approved buddy authorization only (no stranger discovery)
//   - Explicit demo mode labeling when paired with simulated buddy
//   - Server-side Information Gap role & stage progression validation
//   - Reconnection state snapshots & parent-controlled session termination
// ==========================================================================

import crypto from "node:crypto";
import {
  MISSING_PUPPY_STAGES,
  evaluateMissionUtterance,
  validateBuddyAccess
} from "@dinotalk/shared";

// In-memory room store for local/MVP runtime (swap to Redis in multi-instance prod)
const rooms = new Map();

function generateRoomId() {
  return "rm_" + crypto.randomBytes(6).toString("hex");
}

function sanitizeRoomForClient(room, viewerRole = null) {
  const stage = MISSING_PUPPY_STAGES[Math.min(room.stageIndex, MISSING_PUPPY_STAGES.length - 1)];
  const role = viewerRole || room.hostRole;
  return {
    roomId: room.roomId,
    worldId: room.worldId,
    missionId: room.missionId,
    status: room.status, // lobby | active | paused | completed | terminated
    isDemoMode: room.isDemoMode,
    buddy: {
      id: room.buddy.id,
      name: room.buddy.name,
      avatar: room.buddy.avatar,
      isDemoBot: Boolean(room.buddy.isDemoBot)
    },
    role,
    stageIndex: room.stageIndex,
    totalStages: MISSING_PUPPY_STAGES.length,
    stageId: stage.id,
    yourClue: role === "map_scout" ? stage.mapScoutClue : stage.clueSpotterClue,
    foundClues: [...room.foundClues],
    phrasesPracticed: [...room.phrasesPracticed],
    reconnectedCount: room.reconnectedCount,
    updatedAt: room.updatedAt
  };
}

export function createPrivateRoom({
  hostKidId = "local_kid",
  buddyId,
  approvedBuddies = [],
  role = "map_scout",
  worldId = "magic_garden",
  missionId = "missing_puppy"
}) {
  const access = validateBuddyAccess({ buddyId, approvedBuddies });
  if (!access.allowed) {
    const err = new Error(access.message);
    err.statusCode = 403;
    err.code = access.reason;
    throw err;
  }

  const roomId = generateRoomId();
  const hostRole = role === "clue_spotter" ? "clue_spotter" : "map_scout";
  const now = new Date().toISOString();

  const room = {
    roomId,
    hostKidId,
    worldId,
    missionId,
    buddy: access.buddy,
    isDemoMode: access.isSimulatedDemo,
    hostRole,
    partnerRole: hostRole === "map_scout" ? "clue_spotter" : "map_scout",
    status: "active",
    stageIndex: 0,
    foundClues: [],
    phrasesPracticed: [],
    reconnectedCount: 0,
    createdAt: now,
    updatedAt: now
  };

  rooms.set(roomId, room);
  return sanitizeRoomForClient(room, hostRole);
}

export function getRoomSnapshot(roomId, { isReconnect = false, viewerRole = null } = {}) {
  const room = rooms.get(roomId);
  if (!room) {
    const err = new Error("Private room not found or expired.");
    err.statusCode = 404;
    err.code = "ROOM_NOT_FOUND";
    throw err;
  }
  if (isReconnect && room.status !== "terminated") {
    room.reconnectedCount += 1;
    room.updatedAt = new Date().toISOString();
  }
  return sanitizeRoomForClient(room, viewerRole);
}

export function applyMissionAction(roomId, { utterance = "", hotspotId = null, hintLevel = 1 } = {}) {
  const room = rooms.get(roomId);
  if (!room) {
    const err = new Error("Private room not found.");
    err.statusCode = 404;
    err.code = "ROOM_NOT_FOUND";
    throw err;
  }
  if (room.status === "terminated") {
    const err = new Error("Session was ended by a parent.");
    err.statusCode = 403;
    err.code = "SESSION_TERMINATED";
    throw err;
  }
  if (room.status === "completed") {
    return {
      alreadyCompleted: true,
      evaluation: { matched: true, chickyState: "celebrating", chickyReply: "You already rescued Milo together!" },
      room: sanitizeRoomForClient(room)
    };
  }

  const currentStage = MISSING_PUPPY_STAGES[room.stageIndex];
  const effectiveUtterance =
    utterance && String(utterance).trim()
      ? String(utterance)
      : hotspotId === currentStage.requiredHotspot
        ? currentStage.targetPhrase
        : "";

  const evaluation = evaluateMissionUtterance({
    stageIndex: room.stageIndex,
    utterance: effectiveUtterance,
    hintLevel
  });

  if (evaluation.matched) {
    if (!room.foundClues.includes(currentStage.requiredHotspot)) {
      room.foundClues.push(currentStage.requiredHotspot);
    }
    const practiced = evaluation.phrasePracticed || currentStage.targetPhrase;
    if (!room.phrasesPracticed.includes(practiced)) {
      room.phrasesPracticed.push(practiced);
    }
    if (room.stageIndex >= MISSING_PUPPY_STAGES.length - 1) {
      room.status = "completed";
    } else {
      room.stageIndex += 1;
    }
    room.updatedAt = new Date().toISOString();
  }

  return {
    evaluation,
    room: sanitizeRoomForClient(room)
  };
}

export function setRoomPauseState(roomId, paused) {
  const room = rooms.get(roomId);
  if (!room) {
    const err = new Error("Private room not found.");
    err.statusCode = 404;
    throw err;
  }
  if (room.status === "active" || room.status === "paused") {
    room.status = paused ? "paused" : "active";
    room.updatedAt = new Date().toISOString();
  }
  return sanitizeRoomForClient(room);
}

export function terminatePrivateRoom(roomId, reason = "parent_terminated") {
  const room = rooms.get(roomId);
  if (!room) {
    const err = new Error("Private room not found.");
    err.statusCode = 404;
    throw err;
  }
  room.status = "terminated";
  room.terminatedReason = reason;
  room.updatedAt = new Date().toISOString();
  return sanitizeRoomForClient(room);
}
