// Pure game-state logic for online rooms — no HTTP, no Redis, no clocks beyond
// Date.now(). Kept separate from api/room.js so it can be unit-tested directly.

export const PER_SECS = [300, 600, 900];
export const MAX_MOTION = 300;
export const MAX_NAME = 24;
export const MAX_TEXT = 1500;
export const MAX_TURNS = 80;
export const STALE_MS = 20000;
export const JUDGE_TAKEOVER_MS = 25000;

const nowMs = () => Date.now();
export const clip = (s, n) => String(s == null ? "" : s).slice(0, n).trim();

export const emptySeat = () => ({ clientId: "", name: "", lastSeen: 0 });

export function freshRoom(code, motion, perSecs) {
  const t = nowMs();
  return {
    code,
    v: 1,
    phase: "lobby", // lobby | debate | judging | verdict
    createdAt: t,
    updatedAt: t,
    host: null,
    config: {
      motion: clip(motion, MAX_MOTION) || "This house must first pick a motion.",
      perSecs: PER_SECS.includes(perSecs) ? perSecs : 300,
    },
    seats: { for: emptySeat(), against: emptySeat() },
    clock: { active: null, turnStartedAt: null, remaining: { for: 0, against: 0 } },
    turnNo: 1,
    transcript: [],
    judgeOwner: null,
    judgeStartedAt: null,
    verdict: null,
    verdictNotice: null,
    endedReason: null,
  };
}

export function seatOf(room, clientId) {
  if (clientId && room.seats.for.clientId === clientId) return "for";
  if (clientId && room.seats.against.clientId === clientId) return "against";
  return null;
}

export function liveRemaining(room, side) {
  let r = room.clock.remaining[side] || 0;
  if (room.phase === "debate" && room.clock.active === side && room.clock.turnStartedAt) {
    r -= nowMs() - room.clock.turnStartedAt;
  }
  return r < 0 ? 0 : r;
}

function commitClock(room) {
  if (room.clock.turnStartedAt && room.clock.active) {
    const a = room.clock.active;
    const elapsed = nowMs() - room.clock.turnStartedAt;
    room.clock.remaining[a] = Math.max(0, (room.clock.remaining[a] || 0) - elapsed);
  }
  room.clock.turnStartedAt = null;
}

function toJudging(room, reason) {
  commitClock(room);
  room.phase = "judging";
  room.endedReason = reason;
  room.judgeOwner = room.host;
  room.judgeStartedAt = nowMs();
  room.verdict = null;
  room.verdictNotice = null;
}

export function resetToLobby(room) {
  room.phase = "lobby";
  room.clock = { active: null, turnStartedAt: null, remaining: { for: 0, against: 0 } };
  room.turnNo = 1;
  room.transcript = [];
  room.verdict = null;
  room.verdictNotice = null;
  room.endedReason = null;
  room.judgeOwner = null;
  room.judgeStartedAt = null;
}

function seatView(s) {
  return {
    filled: !!s.clientId,
    name: s.name || "",
    stale: s.clientId ? nowMs() - s.lastSeen > STALE_MS : false,
  };
}

export function view(room, clientId) {
  return {
    code: room.code,
    v: room.v,
    phase: room.phase,
    serverNow: nowMs(),
    you: { side: seatOf(room, clientId), isHost: room.host === clientId },
    config: room.config,
    seats: { for: seatView(room.seats.for), against: seatView(room.seats.against) },
    clock: {
      active: room.clock.active,
      running: room.phase === "debate" && !!room.clock.turnStartedAt,
      remaining: { for: liveRemaining(room, "for"), against: liveRemaining(room, "against") },
    },
    turnNo: room.turnNo,
    transcript: room.transcript,
    judgeOwner: room.judgeOwner,
    judgeStartedAt: room.judgeStartedAt,
    verdict: room.verdict,
    verdictNotice: room.verdictNotice,
    endedReason: room.endedReason,
  };
}

// Mutates `room` in place. Returns { mutated } or { error, status, code }.
// The caller bumps room.v and persists when mutated is true.
export function applyAction(room, action, clientId, body) {
  const side = seatOf(room, clientId);
  const isHost = room.host === clientId;
  const touch = () => {
    if (side) room.seats[side].lastSeen = nowMs();
  };

  switch (action) {
    case "join": {
      const name = clip(body.name, MAX_NAME);
      if (side) {
        if (name) room.seats[side].name = name;
        room.seats[side].lastSeen = nowMs();
        return { mutated: true };
      }
      if (!name) return { error: "Enter a name to join.", status: 400, code: "NEED_NAME" };
      const seat = !room.seats.for.clientId ? "for" : !room.seats.against.clientId ? "against" : null;
      if (!seat) return { error: "This room already has two speakers.", status: 409, code: "FULL" };
      room.seats[seat] = { clientId, name, lastSeen: nowMs() };
      if (!room.host) room.host = clientId;
      return { mutated: true };
    }

    case "ping": {
      if (!side) return { mutated: false };
      room.seats[side].lastSeen = nowMs();
      return { mutated: true };
    }

    case "leave": {
      if (!side) return { mutated: false };
      room.seats[side] = emptySeat();
      if (room.host === clientId) {
        const otherSide = side === "for" ? "against" : "for";
        room.host = room.seats[otherSide].clientId || null;
      }
      if (room.phase === "debate" || room.phase === "judging") resetToLobby(room);
      return { mutated: true };
    }

    case "config": {
      if (!isHost) return { error: "Only the host can change the setup.", status: 403 };
      if (room.phase !== "lobby") return { mutated: false };
      const m = clip(body.motion, MAX_MOTION);
      if (typeof body.motion === "string" && m) room.config.motion = m;
      if (PER_SECS.includes(Number(body.perSecs))) room.config.perSecs = Number(body.perSecs);
      touch();
      return { mutated: true };
    }

    case "start": {
      if (!isHost) return { error: "Only the host can start the debate.", status: 403 };
      if (room.phase !== "lobby") return { mutated: false };
      if (!room.seats.for.clientId || !room.seats.against.clientId) {
        return { error: "Both seats need a speaker first.", status: 409 };
      }
      const ms = room.config.perSecs * 1000;
      resetToLobby(room);
      room.clock.remaining = { for: ms, against: ms };
      room.clock.active = Math.random() < 0.5 ? "for" : "against";
      room.clock.turnStartedAt = nowMs();
      room.phase = "debate";
      touch();
      return { mutated: true };
    }

    case "turn": {
      if (room.phase !== "debate") return { mutated: false };
      if (!side) return { error: "You're not in this debate.", status: 403 };
      if (room.clock.active !== side) {
        return { error: "It isn't your turn.", status: 409, code: "NOT_YOUR_TURN" };
      }
      commitClock(room);
      const passed = !!body.passed;
      const flagged = !!body.flagged;
      const text = passed ? "" : clip(body.text, MAX_TEXT);
      if (text || passed || flagged) {
        room.transcript.push({
          side,
          name: room.seats[side].name || "Speaker",
          passed: (passed || flagged) && !text,
          text,
          at: nowMs(),
        });
        if (room.transcript.length > MAX_TURNS) room.transcript.shift();
      }
      if ((room.clock.remaining[side] || 0) <= 0 || flagged) {
        toJudging(room, "flag");
      } else {
        room.clock.active = side === "for" ? "against" : "for";
        room.turnNo += 1;
        room.clock.turnStartedAt = nowMs();
      }
      touch();
      return { mutated: true };
    }

    case "flag": {
      if (room.phase !== "debate") return { mutated: false };
      if (!room.clock.active) return { mutated: false };
      if (liveRemaining(room, room.clock.active) > 1500) {
        return { error: "There's still time on the clock.", status: 409 };
      }
      toJudging(room, "flag");
      touch();
      return { mutated: true };
    }

    case "end": {
      if (room.phase !== "debate") return { mutated: false };
      if (!side) return { error: "You're not in this debate.", status: 403 };
      commitClock(room);
      if (room.clock.active === side) {
        const text = clip(body.text, MAX_TEXT);
        if (text) {
          room.transcript.push({
            side,
            name: room.seats[side].name || "Speaker",
            passed: false,
            text,
            at: nowMs(),
          });
        }
      }
      toJudging(room, "manual");
      touch();
      return { mutated: true };
    }

    case "claimJudge": {
      if (room.phase !== "judging") return { mutated: false };
      const stale = !room.judgeStartedAt || nowMs() - room.judgeStartedAt > JUDGE_TAKEOVER_MS;
      if (!stale && room.judgeOwner && room.judgeOwner !== clientId) {
        return { error: "Someone else is fetching the verdict.", status: 409, code: "NOT_JUDGE" };
      }
      room.judgeOwner = clientId;
      room.judgeStartedAt = nowMs();
      touch();
      return { mutated: true };
    }

    case "setVerdict": {
      if (room.phase !== "judging") return { mutated: false };
      const stale = !room.judgeStartedAt || nowMs() - room.judgeStartedAt > JUDGE_TAKEOVER_MS;
      if (room.judgeOwner && room.judgeOwner !== clientId && !stale) {
        return { error: "The host is fetching the verdict.", status: 409, code: "NOT_JUDGE" };
      }
      room.verdict = body.verdict && typeof body.verdict === "object" ? body.verdict : null;
      room.verdictNotice = typeof body.notice === "string" ? body.notice : null;
      room.phase = "verdict";
      touch();
      return { mutated: true };
    }

    case "rematch": {
      if (room.phase !== "verdict") return { mutated: false };
      const f = room.seats.for;
      room.seats.for = room.seats.against;
      room.seats.against = f;
      resetToLobby(room);
      touch();
      return { mutated: true };
    }

    case "newMotion": {
      if (room.phase !== "verdict") return { mutated: false };
      const m = clip(body.motion, MAX_MOTION);
      if (m) room.config.motion = m;
      resetToLobby(room);
      touch();
      return { mutated: true };
    }

    default:
      return { error: "Unknown action.", status: 400 };
  }
}
