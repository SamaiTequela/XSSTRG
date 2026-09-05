// Pure game-state logic for online rooms — no HTTP, no Redis, no clocks beyond
// Date.now(). Kept separate from api/room.js so it can be unit-tested directly.

export const PER_SECS = [30, 300, 600, 900, 1200, 1800]; // 30 = TEMPORARY TEST MODE
export const MAX_MOTION = 300;
export const MAX_NAME = 24;
export const MAX_TEXT = 1500;
export const MAX_TURNS = 80;
export const STALE_MS = 20000;
export const JUDGE_TAKEOVER_MS = 25000;

// Crowd Jury mode constants
export const MAX_SPECTATORS = 10;
export const MIN_SPECTATORS = 1;
export const JUDGE_SCORING_MS = 120000; // 2 minutes

// Prep time before a speaker's own clock starts, keyed by seconds per speaker.
// They may start early; when it runs out the turn begins on its own.
export const PREP_MS = { 30: 5000, 300: 20000, 600: 30000, 900: 45000, 1200: 60000, 1800: 60000 };
export const prepMsFor = (perSecs) => PREP_MS[perSecs] || PREP_MS[300];

const nowMs = () => Date.now();
export const clip = (s, n) => String(s == null ? "" : s).slice(0, n).trim();

export const emptySeat = () => ({ clientId: "", name: "", lastSeen: 0 });

export function freshSpectator(clientId, name) {
  return {
    clientId,
    name: clip(name, MAX_NAME),
    lastSeen: nowMs(),
    scoreFor: null,
    scoreAgainst: null,
    remarks: "",
    ready: false,
  };
}

export function freshRoom(code, motion, perSecs, judgeMode) {
  const t = nowMs();
  return {
    code,
    v: 1,
    phase: "lobby", // lobby | debate | judging | scoring | verdict
    createdAt: t,
    updatedAt: t,
    host: null,
    config: {
      motion: clip(motion, MAX_MOTION) || "This house must first pick a motion.",
      perSecs: PER_SECS.includes(perSecs) ? perSecs : 300,
      judgeMode: !!judgeMode,
    },
    seats: { for: emptySeat(), against: emptySeat() },
    spectators: [], // only used in judgeMode
    clock: { active: null, turnStartedAt: null, prepUntil: null, remaining: { for: 0, against: 0 } },
    turnNo: 1,
    transcript: [],
    ready: { for: false, against: false },
    judgeOwner: null,
    judgeStartedAt: null,
    scoringStartedAt: null, // when spectator scoring phase began
    verdict: null,
    verdictNotice: null,
    endedReason: null,
  };
}

// Prep is stored as a deadline, not a timer, so it resolves the same way on
// every read without needing a write. Once the deadline passes the speaking
// clock is treated as having started exactly then — a player who lets prep
// lapse doesn't get the overrun for free.
export function settlePrep(room) {
  const p = room.clock.prepUntil;
  if (!p) return false;
  if (nowMs() < p) return false;
  room.clock.turnStartedAt = p;
  room.clock.prepUntil = null;
  return true;
}

function beginPrep(room) {
  room.clock.turnStartedAt = null;
  room.clock.prepUntil = nowMs() + prepMsFor(room.config.perSecs);
}

export function seatOf(room, clientId) {
  if (clientId && room.seats.for.clientId === clientId) return "for";
  if (clientId && room.seats.against.clientId === clientId) return "against";
  return null;
}

export function spectatorOf(room, clientId) {
  if (!room.spectators) return null;
  return room.spectators.find((s) => s.clientId === clientId) || null;
}

export function liveRemaining(room, side) {
  let r = room.clock.remaining[side] || 0;
  if (room.phase === "debate" && room.clock.active === side && room.clock.turnStartedAt) {
    r -= nowMs() - room.clock.turnStartedAt;
  }
  return r < 0 ? 0 : r;
}

// A side is out of time once its committed remainder is spent. Callers check
// this after commitClock, so the running turn is already banked.
function outOfTime(room, side) {
  return (room.clock.remaining[side] || 0) <= 0;
}

function commitClock(room) {
  if (room.clock.turnStartedAt && room.clock.active) {
    const a = room.clock.active;
    const elapsed = nowMs() - room.clock.turnStartedAt;
    room.clock.remaining[a] = Math.max(0, (room.clock.remaining[a] || 0) - elapsed);
  }
  room.clock.turnStartedAt = null;
}

// A clock that runs out has to move the floor on its own.
//
// The floor used to advance only when the speaker's own browser noticed the
// flag and posted a turn. If that speaker had nothing typed, their client
// moved the floor in local state and told nobody, so the server still had the
// floor with the flagged speaker while both screens showed the opponent
// speaking: the opponent's submit came back "It isn't your turn" and the room
// was wedged until it expired. A backgrounded or closed tab wedged it the same
// way. The server settles it instead, so any client's next poll unsticks the
// room no matter whose tab is awake.
export function flagPending(room) {
  return (
    room.phase === "debate" &&
    !!room.clock.active &&
    !room.clock.prepUntil &&
    !!room.clock.turnStartedAt &&
    liveRemaining(room, room.clock.active) <= 0
  );
}

export function settleFlag(room) {
  if (!flagPending(room)) return false;
  const side = room.clock.active;
  const opp = side === "for" ? "against" : "for";
  commitClock(room);
  room.endRequest = null;
  if (outOfTime(room, opp)) {
    toReview(room, "flag");
    return true;
  }
  // No speech is recorded: nothing was submitted, and an empty turn in the
  // record is not something the speaker said.
  room.clock.active = opp;
  room.turnNo += 1;
  beginPrep(room);
  return true;
}

// The debate is over, but nobody goes to the adjudicator until both speakers
// have said they're done reading the record.
function toReview(room, reason) {
  commitClock(room);
  room.clock.prepUntil = null;
  room.phase = "review";
  room.endedReason = reason;
  room.ready = { for: false, against: false };
  room.judgeOwner = null;
  room.judgeStartedAt = null;
  room.verdict = null;
  room.verdictNotice = null;
}

function toJudging(room) {
  if (room.config.judgeMode) {
    // In judge mode: go directly to spectator scoring phase
    room.phase = "scoring";
    room.scoringStartedAt = nowMs();
    // Reset all spectator scores
    if (room.spectators) {
      room.spectators.forEach((s) => {
        s.scoreFor = null;
        s.scoreAgainst = null;
        s.remarks = "";
        s.ready = false;
      });
    }
    room.verdict = null;
    room.verdictNotice = null;
  } else {
    room.phase = "judging";
    room.judgeOwner = room.host;
    room.judgeStartedAt = nowMs();
    room.verdict = null;
    room.verdictNotice = null;
  }
}

export function resetToLobby(room) {
  room.phase = "lobby";
  room.clock = { active: null, turnStartedAt: null, prepUntil: null, remaining: { for: 0, against: 0 } };
  room.turnNo = 1;
  room.transcript = [];
  room.ready = { for: false, against: false };
  room.verdict = null;
  room.verdictNotice = null;
  room.endedReason = null;
  room.judgeOwner = null;
  room.judgeStartedAt = null;
  room.scoringStartedAt = null;
  room.endRequest = null;
  room.concededBy = null;
  // Reset spectator ready/scores on lobby reset
  if (room.spectators) {
    room.spectators.forEach((s) => {
      s.scoreFor = null;
      s.scoreAgainst = null;
      s.remarks = "";
      s.ready = false;
    });
  }
}

function seatView(s) {
  return {
    filled: !!s.clientId,
    name: s.name || "",
    stale: s.clientId ? nowMs() - s.lastSeen > STALE_MS : false,
  };
}

function spectatorView(s) {
  return {
    clientId: s.clientId,
    name: s.name || "",
    stale: nowMs() - s.lastSeen > STALE_MS,
    ready: s.ready,
    // A juror name never travels beside that juror's score -- the jury is
    // anonymous. The published verdict carries the scores shuffled and
    // unnamed in individualScores; only myScore shows you your own.
    hasScored: s.scoreFor !== null && s.scoreAgainst !== null,
  };
}

export function aggregateSpectatorVerdict(room) {
  const specs = room.spectators || [];
  const scored = specs.filter((s) => s.scoreFor !== null && s.scoreAgainst !== null);
  if (!scored.length) return null;

  const avgFor = scored.reduce((a, s) => a + s.scoreFor, 0) / scored.length;
  const avgAgainst = scored.reduce((a, s) => a + s.scoreAgainst, 0) / scored.length;
  const roundedFor = Math.round(avgFor * 10) / 10;
  const roundedAgainst = Math.round(avgAgainst * 10) / 10;

  const nameFor = room.seats.for.name || "For";
  const nameAgainst = room.seats.against.name || "Against";

  let winner = "draw";
  let headline = "The jury is split.";
  if (roundedFor > roundedAgainst) {
    winner = "for";
    headline = `${nameFor} wins the jury vote.`;
  } else if (roundedAgainst > roundedFor) {
    winner = "against";
    headline = `${nameAgainst} wins the jury vote.`;
  }

  // The jury votes anonymously. Shuffle before labelling so the display order
  // cannot be read off against the lobby list, and drop the names entirely.
  const shuffled = scored.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const anonymous = shuffled.map((s, i) => ({
    label: "Judge " + (i + 1),
    scoreFor: s.scoreFor,
    scoreAgainst: s.scoreAgainst,
    remarks: (s.remarks || "").trim(),
  }));
  const judgeRemarks = anonymous.filter((j) => j.remarks);

  return {
    winner,
    headline,
    rationale: `The jury of ${scored.length} judge${scored.length !== 1 ? "s" : ""} scored ${nameFor} ${roundedFor}/10 and ${nameAgainst} ${roundedAgainst}/10.`,
    for: {
      score: roundedFor,
      strengths: [],
      weaknesses: [],
      advice: "",
    },
    against: {
      score: roundedAgainst,
      strengths: [],
      weaknesses: [],
      advice: "",
    },
    judgeCount: scored.length,
    judgeRemarks,
    individualScores: anonymous,
  };
}

export function view(room, clientId) {
  settlePrep(room);
  const side = seatOf(room, clientId);
  const spec = spectatorOf(room, clientId);
  const isSpectator = !!spec;
  const revealScores = room.phase === "verdict";

  // Scoring timer — how many ms remain for spectators to score
  let scoringRemainingMs = null;
  if (room.phase === "scoring" && room.scoringStartedAt) {
    scoringRemainingMs = Math.max(0, JUDGE_SCORING_MS - (nowMs() - room.scoringStartedAt));
  }

  return {
    code: room.code,
    v: room.v,
    phase: room.phase,
    serverNow: nowMs(),
    you: {
      side: side,
      isHost: room.host === clientId,
      isSpectator,
      spectatorName: isSpectator ? spec.name : null,
      myScore: isSpectator && revealScores ? { scoreFor: spec.scoreFor, scoreAgainst: spec.scoreAgainst, remarks: spec.remarks } : null,
      hasScored: isSpectator ? (spec.scoreFor !== null && spec.scoreAgainst !== null) : false,
      spectatorReady: isSpectator ? spec.ready : false,
    },
    config: room.config,
    seats: { for: seatView(room.seats.for), against: seatView(room.seats.against) },
    spectators: (room.spectators || []).map((s) => spectatorView(s)),
    clock: {
      active: room.clock.active,
      running: room.phase === "debate" && !!room.clock.turnStartedAt,
      prepUntil: room.clock.prepUntil || null,
      remaining: { for: liveRemaining(room, "for"), against: liveRemaining(room, "against") },
    },
    scoringRemainingMs,
    scoringStartedAt: room.scoringStartedAt || null,
    turnNo: room.turnNo,
    transcript: room.transcript,
    ready: { for: !!room.ready?.for, against: !!room.ready?.against },
    judgeOwner: room.judgeOwner,
    judgeStartedAt: room.judgeStartedAt,
    verdict: room.verdict,
    verdictNotice: room.verdictNotice,
    endedReason: room.endedReason,
    endRequest: room.endRequest ? { from: room.endRequest.from } : null,
    concededBy: room.concededBy || null,
  };
}

// Mutates `room` in place. Returns { mutated } or { error, status, code }.
// The caller bumps room.v and persists when mutated is true.
export function applyAction(room, action, clientId, body) {
  settlePrep(room);
  // An expired clock is settled before the action is judged, so a player never
  // acts against a floor the server has not caught up with. Its mutation is
  // folded into the result so the caller persists it even when the action
  // itself changes nothing (a plain `ping`, say).
  const settled = settleFlag(room);
  const withSettle = (r) => (settled && !r.error ? { ...r, mutated: true } : r);
  const side = seatOf(room, clientId);
  const isHost = room.host === clientId;
  const spec = spectatorOf(room, clientId);
  const isSpectator = !!spec;
  const touch = () => {
    if (side) room.seats[side].lastSeen = nowMs();
    if (spec) spec.lastSeen = nowMs();
  };

  // Wrapped so every branch's result passes through withSettle().
  const result = (() => {
  switch (action) {
    case "join": {
      const name = clip(body.name, MAX_NAME);
      const role = body.role === "spectator" ? "spectator" : "player";

      if (side) {
        if (name) room.seats[side].name = name;
        room.seats[side].lastSeen = nowMs();
        return { mutated: true };
      }

      // Returning spectator
      if (spec) {
        if (name) spec.name = name;
        spec.lastSeen = nowMs();
        return { mutated: true };
      }

      if (!name) return { error: "Enter a name to join.", status: 400, code: "NEED_NAME" };

      // Spectator join (Crowd Jury mode only)
      if (role === "spectator" && room.config.judgeMode) {
        if (room.phase !== "lobby") {
          return { error: "Spectators can only join before the debate starts.", status: 409, code: "DEBATE_STARTED" };
        }
        if (!room.spectators) room.spectators = [];
        if (room.spectators.length >= MAX_SPECTATORS) {
          return { error: "The judge panel is full (max 10).", status: 409, code: "JUDGES_FULL" };
        }
        room.spectators.push(freshSpectator(clientId, name));
        if (!room.host) room.host = clientId;
        return { mutated: true };
      }

      // Player join
      let seat = null;
      if (body.seat === "for" && !room.seats.for.clientId) {
        seat = "for";
      } else if (body.seat === "against" && !room.seats.against.clientId) {
        seat = "against";
      } else if (!room.seats.for.clientId) {
        seat = "for";
      } else if (!room.seats.against.clientId) {
        seat = "against";
      }
      if (!seat) return { error: "This room already has two speakers.", status: 409, code: "FULL" };
      room.seats[seat] = { clientId, name, lastSeen: nowMs() };
      if (!room.host) room.host = clientId;
      return { mutated: true };
    }

    case "switchSeat": {
      if (room.phase !== "lobby") return { error: "Cannot switch seats after debate starts.", status: 409 };
      const target = body.seat; // 'for' | 'against' | 'spectator'
      const name = clip(body.name, MAX_NAME) || (side ? room.seats[side].name : spec ? spec.name : "Speaker");

      if (target === "for" || target === "against") {
        if (room.seats[target].clientId && room.seats[target].clientId !== clientId) {
          return { error: `That seat is already taken by ${room.seats[target].name}.`, status: 409 };
        }
        // Evacuate prior position
        if (spec) room.spectators = (room.spectators || []).filter((s) => s.clientId !== clientId);
        if (side && side !== target) room.seats[side] = emptySeat();

        room.seats[target] = { clientId, name, lastSeen: nowMs() };
        touch();
        return { mutated: true };
      }

      if (target === "spectator" && room.config.judgeMode) {
        if (side) room.seats[side] = emptySeat();
        if (!spec) {
          if (!room.spectators) room.spectators = [];
          if (room.spectators.length >= MAX_SPECTATORS) {
            return { error: "The judge panel is full.", status: 409 };
          }
          room.spectators.push(freshSpectator(clientId, name));
        } else {
          spec.name = name;
          spec.lastSeen = nowMs();
        }
        touch();
        return { mutated: true };
      }

      return { error: "Invalid target seat.", status: 400 };
    }

    case "ping": {
      if (!side && !spec) return { mutated: false };
      if (side) room.seats[side].lastSeen = nowMs();
      if (spec) spec.lastSeen = nowMs();
      return { mutated: true };
    }

    case "leave": {
      if (!side && !spec) return { mutated: false };

      if (spec) {
        // Spectator leaving
        room.spectators = room.spectators.filter((s) => s.clientId !== clientId);
        if (room.host === clientId) {
          const otherSpec = room.spectators[0];
          const otherPlayer = room.seats.for.clientId || room.seats.against.clientId;
          room.host = otherPlayer || (otherSpec && otherSpec.clientId) || null;
        }
        return { mutated: true };
      }

      // Player leaving
      room.seats[side] = emptySeat();
      if (room.host === clientId) {
        const otherSide = side === "for" ? "against" : "for";
        room.host = room.seats[otherSide].clientId || null;
      }
      if (room.phase === "debate" || room.phase === "review" || room.phase === "judging" || room.phase === "scoring") resetToLobby(room);
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
      if (room.config.judgeMode) {
        const specCount = (room.spectators || []).length;
        if (specCount < MIN_SPECTATORS) {
          return { error: `At least ${MIN_SPECTATORS} judge must join before starting.`, status: 409, code: "NEED_JUDGES" };
        }
      }
      const ms = room.config.perSecs * 1000;
      resetToLobby(room);
      room.clock.remaining = { for: ms, against: ms };
      room.clock.active = "for"; // Proposition delivers the opening speech
      room.phase = "debate";
      // Opening speaker begins their turn immediately without prep time
      room.clock.prepUntil = null;
      room.clock.turnStartedAt = nowMs();
      touch();
      return { mutated: true };
    }

    // Start speaking before prep runs out.
    case "speak": {
      if (room.phase !== "debate") return { mutated: false };
      if (!side) return { error: "You're not in this debate.", status: 403 };
      if (room.clock.active !== side) {
        return { error: "It isn't your turn.", status: 409, code: "NOT_YOUR_TURN" };
      }
      if (!room.clock.prepUntil) return { mutated: false }; // already speaking
      room.clock.prepUntil = null;
      room.clock.turnStartedAt = nowMs();
      touch();
      return { mutated: true };
    }

    case "turn": {
      if (room.phase !== "debate") return { mutated: false };
      if (!side) return { error: "You're not in this debate.", status: 403 };
      if (room.clock.active !== side) {
        return { error: "It isn't your turn.", status: 409, code: "NOT_YOUR_TURN" };
      }
      const durationMs = room.clock.turnStartedAt ? Math.max(0, nowMs() - room.clock.turnStartedAt) : 0;
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
          durationMs,
        });
        if (room.transcript.length > MAX_TURNS) room.transcript.shift();
      }
      room.endRequest = null;
      // A speaker whose clock runs out loses the floor, not the debate. The
      // floor goes to whoever can still answer; if that is nobody, the record
      // closes. `flagged` only tells us this turn was cut short by the clock.
      const opp = side === "for" ? "against" : "for";
      if (outOfTime(room, side) && outOfTime(room, opp)) {
        toReview(room, "flag");
      } else {
        room.clock.active = outOfTime(room, opp) ? side : opp;
        room.turnNo += 1;
        beginPrep(room);
      }
      touch();
      return { mutated: true };
    }

    case "concede": {
      if (room.phase !== "debate") return { mutated: false };
      if (!side) return { error: "You're not in this debate.", status: 403 };
      const durationMs = (room.clock.active === side && room.clock.turnStartedAt)
        ? Math.max(0, nowMs() - room.clock.turnStartedAt)
        : 0;
      commitClock(room);
      room.clock.prepUntil = null;
      room.transcript.push({
        side,
        name: room.seats[side].name || "Speaker",
        conceded: true,
        passed: true,
        text: "",
        at: nowMs(),
        durationMs,
      });
      room.concededBy = side;
      room.endRequest = null;
      room.endedReason = "concession";
      room.judgeOwner = null;
      room.judgeStartedAt = null;

      const winner = side === "for" ? "against" : "for";
      const winnerName = room.seats[winner].name || (winner === "for" ? "For the motion" : "Against the motion");
      const loserName = room.seats[side].name || (side === "for" ? "For the motion" : "Against the motion");

      // Automatic loss for the player who conceded:
      room.phase = "verdict";
      room.verdict = {
        winner,
        headline: `${winnerName} wins by concession.`,
        rationale: `${loserName} conceded the debate, resulting in an automatic loss and awarding victory to ${winnerName}.`,
        for: {
          score: winner === "for" ? 10 : 0,
          strengths: winner === "for" ? [{ point: "Held the floor until opponent conceded", example: "" }] : [],
          weaknesses: winner === "for" ? [] : [{ point: "Conceded the debate", example: "" }],
          advice: winner === "for" ? "Victory awarded by opponent concession." : "Conceded the debate."
        },
        against: {
          score: winner === "against" ? 10 : 0,
          strengths: winner === "against" ? [{ point: "Held the floor until opponent conceded", example: "" }] : [],
          weaknesses: winner === "against" ? [] : [{ point: "Conceded the debate", example: "" }],
          advice: winner === "against" ? "Victory awarded by opponent concession." : "Conceded the debate."
        }
      };
      touch();
      return { mutated: true };
    }

    case "requestEnd": {
      if (room.phase !== "debate") return { mutated: false };
      if (!side) return { error: "You're not in this debate.", status: 403 };
      if (room.clock.active !== side) {
        return { error: "Only the speaker who has the stage can request to end.", status: 403 };
      }
      if (room.endRequest) return { mutated: false };
      room.endRequest = { from: side, at: nowMs() };
      touch();
      return { mutated: true };
    }

    case "cancelEndRequest": {
      if (room.phase !== "debate") return { mutated: false };
      if (!side) return { error: "You're not in this debate.", status: 403 };
      if (!room.endRequest || room.endRequest.from !== side) return { mutated: false };
      room.endRequest = null;
      touch();
      return { mutated: true };
    }

    case "respondEnd": {
      if (room.phase !== "debate") return { mutated: false };
      if (!side) return { error: "You're not in this debate.", status: 403 };
      if (!room.endRequest) return { error: "No pending request to end the debate.", status: 409 };
      if (room.endRequest.from === side) {
        return { error: "You cannot respond to your own end request.", status: 403 };
      }
      if (body.accept) {
        commitClock(room);
        room.endRequest = null;
        toReview(room, "mutual_end");
        touch();
        return { mutated: true };
      } else {
        room.endRequest = null;
        touch();
        return { mutated: true };
      }
    }

    case "flag": {
      if (room.phase !== "debate") return { mutated: false };
      if (!room.clock.active) return { mutated: false };
      if (liveRemaining(room, "for") > 1500 || liveRemaining(room, "against") > 1500) {
        return { error: "There's still time on the clock.", status: 409 };
      }
      toReview(room, "flag");
      touch();
      return { mutated: true };
    }

    case "end": {
      if (room.phase !== "debate") return { mutated: false };
      if (!side) return { error: "You're not in this debate.", status: 403 };
      if (room.clock.active !== side) {
        return { error: "Only the speaker who has the stage can request to end.", status: 403 };
      }
      if (room.endRequest) return { mutated: false };
      room.endRequest = { from: side, at: nowMs() };
      touch();
      return { mutated: true };
    }

    // Both speakers must confirm before the adjudicator is called.
    case "ready": {
      if (room.phase !== "review") return { mutated: false };
      if (!side) return { error: "You're not in this debate.", status: 403 };
      if (room.ready[side]) return { mutated: false };
      room.ready[side] = true;
      if (room.ready.for && room.ready.against) toJudging(room);
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

    // Crowd Jury: spectator submits their score and remarks
    case "submitJudgement": {
      if (room.phase !== "scoring") {
        return { error: "Scoring is not open right now.", status: 409 };
      }
      if (!isSpectator) {
        return { error: "Only judges can submit a judgement.", status: 403 };
      }
      const scoreFor = Number(body.scoreFor);
      const scoreAgainst = Number(body.scoreAgainst);
      if (!Number.isFinite(scoreFor) || scoreFor < 0 || scoreFor > 10) {
        return { error: "Score for must be 0–10.", status: 400 };
      }
      if (!Number.isFinite(scoreAgainst) || scoreAgainst < 0 || scoreAgainst > 10) {
        return { error: "Score against must be 0–10.", status: 400 };
      }
      spec.scoreFor = Math.round(scoreFor);
      spec.scoreAgainst = Math.round(scoreAgainst);
      spec.remarks = clip(body.remarks || "", 600);
      spec.ready = true;
      spec.lastSeen = nowMs();

      // Check if all spectators are done or timer expired
      const allReady = room.spectators.every((s) => s.ready);
      const timerExpired = nowMs() - (room.scoringStartedAt || 0) >= JUDGE_SCORING_MS;
      if (allReady || timerExpired) {
        const verdict = aggregateSpectatorVerdict(room);
        room.verdict = verdict;
        room.phase = "verdict";
      }
      return { mutated: true };
    }

    // Crowd Jury: spectator marks ready without a score (uses 0s or skips)
    case "spectatorReady": {
      if (room.phase !== "scoring") return { mutated: false };
      if (!isSpectator) {
        return { error: "Only judges can mark ready.", status: 403 };
      }
      spec.ready = true;
      spec.lastSeen = nowMs();

      const allReady = room.spectators.every((s) => s.ready);
      const timerExpired = nowMs() - (room.scoringStartedAt || 0) >= JUDGE_SCORING_MS;
      if (allReady || timerExpired) {
        const verdict = aggregateSpectatorVerdict(room);
        room.verdict = verdict;
        room.phase = "verdict";
      }
      return { mutated: true };
    }

    // Crowd Jury: server-side check if scoring timer has expired → auto-finalize
    case "checkScoringTimer": {
      if (room.phase !== "scoring") return { mutated: false };
      const timerExpired = nowMs() - (room.scoringStartedAt || 0) >= JUDGE_SCORING_MS;
      if (timerExpired) {
        const verdict = aggregateSpectatorVerdict(room);
        room.verdict = verdict;
        room.phase = "verdict";
        return { mutated: true };
      }
      return { mutated: false };
    }

    // Crowd Jury: reallocate roles — swap players/spectators
    case "reallocate": {
      if (room.phase !== "verdict") return { mutated: false };
      if (!isHost) return { error: "Only the host can reallocate roles.", status: 403 };

      // body.players = [clientId, clientId] (the two who will be players)
      // Everyone else becomes a spectator
      const allParticipants = [
        ...([room.seats.for.clientId, room.seats.against.clientId].filter(Boolean)),
        ...(room.spectators || []).map((s) => s.clientId),
      ];

      const nameMap = {};
      if (room.seats.for.clientId) nameMap[room.seats.for.clientId] = room.seats.for.name;
      if (room.seats.against.clientId) nameMap[room.seats.against.clientId] = room.seats.against.name;
      (room.spectators || []).forEach((s) => { nameMap[s.clientId] = s.name; });

      const newPlayers = Array.isArray(body.players)
        ? body.players.filter((id) => allParticipants.includes(id)).slice(0, 2)
        : [];

      if (newPlayers.length !== 2) {
        return { error: "Choose exactly two players.", status: 400 };
      }

      room.seats.for = { clientId: newPlayers[0], name: nameMap[newPlayers[0]] || "Speaker", lastSeen: nowMs() };
      room.seats.against = { clientId: newPlayers[1], name: nameMap[newPlayers[1]] || "Speaker", lastSeen: nowMs() };

      const newSpectatorIds = allParticipants.filter((id) => !newPlayers.includes(id));
      room.spectators = newSpectatorIds.map((id) => freshSpectator(id, nameMap[id] || "Judge"));

      resetToLobby(room);
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
  })();

  return withSettle(result);
}
