// Online-room API for Point of Order. One file, two verbs:
//
//   GET  /api/room?code=ABCD&clientId=...            -> current room "view"
//   POST /api/room   { action, code, clientId, ... }  -> mutate, returns fresh view
//
// The server holds the authoritative game state (seats, clock, transcript,
// phase). Clocks are stored as "milliseconds remaining" plus a server
// timestamp for the running turn; each client renders the live countdown
// locally so nothing has to stream over the wire.
//
// Game-state rules live in ../lib/room-logic.js (unit-tested separately).

import { getRedis, readRoom, writeRoom, roomExists, withLock } from "../lib/redis.js";
import {
  freshRoom, freshSpectator, applyAction, view,
  PER_SECS, MAX_MOTION, MAX_NAME, clip,
  JUDGE_SCORING_MS,
} from "../lib/room-logic.js";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1
const nowMs = () => Date.now();
const randCode = () =>
  Array.from({ length: 4 }, () => CODE_ALPHABET[(Math.random() * CODE_ALPHABET.length) | 0]).join("");

// --- best-effort per-IP cap on room creation (resets on cold start) ---
const WINDOW_MS = 10 * 60 * 1000;
const MAX_CREATE = 20;
const creates = new Map();
function createLimited(ip) {
  const t = nowMs();
  const list = (creates.get(ip) || []).filter((x) => t - x < WINDOW_MS);
  list.push(t);
  creates.set(ip, list);
  if (creates.size > 3000) creates.clear();
  return list.length > MAX_CREATE;
}
const ipOf = (req) =>
  (req?.headers?.["x-forwarded-for"] || "").toString().split(",")[0].trim() ||
  req?.socket?.remoteAddress ||
  "unknown";

export default async function handler(req, res) {
  const redis = getRedis();
  if (!redis) {
    return res.status(503).json({
      error:
        "Online play isn't set up on this deployment yet. (Server: add an Upstash Redis store in the Vercel dashboard — see the README.)",
      code: "NO_REDIS",
    });
  }

  try {
    if (req.method === "GET") return await handleGet(req, res, redis);
    if (req.method === "POST") return await handlePost(req, res, redis);
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed." });
  } catch (err) {
    if (err && err.code === "LOCK_TIMEOUT") {
      return res.status(503).json({ error: "The room is busy right now — try again in a moment." });
    }
    console.error("room error:", err);
    return res.status(500).json({ error: "Something went wrong with the room." });
  }
}

async function handleGet(req, res, redis) {
  const code = clip(req.query.code, 8).toUpperCase();
  const clientId = clip(req.query.clientId, 80);
  if (!code) return res.status(400).json({ error: "No room code." });
  const room = await readRoom(redis, code);
  if (!room) {
    return res.status(404).json({ error: "That room doesn't exist, or it has expired.", code: "NO_ROOM" });
  }

  // Opportunistically finalize scoring phase if timer expired (no lock needed — idempotent)
  if (room.phase === "scoring" && room.scoringStartedAt) {
    const elapsed = nowMs() - room.scoringStartedAt;
    if (elapsed >= JUDGE_SCORING_MS) {
      // Use the lock to safely finalize
      try {
        await withLock(redis, code, async () => {
          const r2 = await readRoom(redis, code);
          if (r2 && r2.phase === "scoring") {
            const { applyAction: apply } = await import("../lib/room-logic.js");
            const result = apply(r2, "checkScoringTimer", clientId, {});
            if (result.mutated) {
              r2.v += 1;
              await writeRoom(redis, r2);
            }
          }
        });
        const updated = await readRoom(redis, code);
        if (updated) return res.status(200).json({ view: view(updated, clientId) });
      } catch (_) { /* ignore lock errors on GET */ }
    }
  }

  return res.status(200).json({ view: view(room, clientId) });
}

async function handlePost(req, res, redis) {
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }
  if (!body || typeof body !== "object") return res.status(400).json({ error: "Bad request." });

  const action = clip(body.action, 24);
  const clientId = clip(body.clientId, 80);
  if (!clientId) return res.status(400).json({ error: "Missing client id." });

  // create is special: there's no room to lock yet
  if (action === "create") {
    if (createLimited(ipOf(req))) {
      return res.status(429).json({ error: "You've created a lot of rooms. Give it a few minutes." });
    }
    const name = clip(body.name, MAX_NAME) || "Speaker";
    const perSecs = Number(body.perSecs);
    const motion = clip(body.motion, MAX_MOTION);
    const judgeMode = !!body.judgeMode;
    // Crowd Jury rooms let the creator sit on the jury instead of debating.
    const asSpectator = judgeMode && body.role === "spectator";

    let code = null;
    const requestedCode = clip(body.code, 8).toUpperCase();
    if (requestedCode && requestedCode.length === 4 && !(await roomExists(redis, requestedCode))) {
      code = requestedCode;
    } else {
      for (let i = 0; i < 6; i++) {
        const c = randCode();
        if (!(await roomExists(redis, c))) {
          code = c;
          break;
        }
      }
    }
    if (!code) return res.status(503).json({ error: "Couldn't allocate a room. Try again." });

    const room = freshRoom(code, motion, PER_SECS.includes(perSecs) ? perSecs : 600, judgeMode);
    room.host = clientId;

    if (asSpectator) {
      room.spectators = [freshSpectator(clientId, name)];
    } else {
      let mySide = "for";
      if (body.role === "against") {
        mySide = "against";
      } else if (body.role === "for") {
        mySide = "for";
      } else {
        mySide = Math.random() < 0.5 ? "for" : "against";
      }
      room.seats[mySide] = { clientId, name, lastSeen: nowMs() };
    }

    await writeRoom(redis, room);
    return res.status(200).json({ view: view(room, clientId) });
  }

  const code = clip(body.code, 8).toUpperCase();
  if (!code) return res.status(400).json({ error: "No room code." });

  const out = await withLock(redis, code, async () => {
    const room = await readRoom(redis, code);
    if (!room) {
      return { status: 404, json: { error: "That room doesn't exist, or it has expired.", code: "NO_ROOM" } };
    }

    // Opportunistically check scoring timer on any POST if in scoring phase
    if (room.phase === "scoring" && room.scoringStartedAt) {
      const elapsed = nowMs() - room.scoringStartedAt;
      if (elapsed >= JUDGE_SCORING_MS) {
        const timerResult = applyAction(room, "checkScoringTimer", clientId, {});
        if (timerResult.mutated) {
          room.v += 1;
          await writeRoom(redis, room);
          return { status: 200, json: { view: view(room, clientId) } };
        }
      }
    }

    const r = applyAction(room, action, clientId, body);
    if (r.error) return { status: r.status || 400, json: { error: r.error, code: r.code } };
    if (r.mutated) {
      room.v += 1;
      await writeRoom(redis, room);
    }
    return { status: 200, json: { view: view(room, clientId) } };
  });

  return res.status(out.status).json(out.json);
}
