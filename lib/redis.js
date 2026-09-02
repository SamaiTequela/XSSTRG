// Shared Redis helper for the online-room API. Lives outside /api so Vercel
// doesn't turn it into its own route; api/room.js imports it.
//
// Reads connection details from whichever env vars your provider set:
//   - Upstash (Vercel Marketplace):  UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
//   - Vercel KV (legacy):            KV_REST_API_URL / KV_REST_API_TOKEN
// If none are present, getRedis() returns null and the room API replies with a
// clear "online play isn't set up" message instead of crashing.

import { Redis } from "@upstash/redis";

let client = null;
let resolved = false;

export function getRedis() {
  if (resolved) return client;
  resolved = true;

  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.STORAGE_REST_API_URL ||
    "";
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.STORAGE_REST_API_TOKEN ||
    "";

  client = url && token ? new Redis({ url, token }) : null;
  return client;
}

const TTL_SECONDS = 6 * 60 * 60; // rooms self-destruct after 6 idle hours
const roomKey = (code) => `poo:room:${code}`;
const lockKey = (code) => `poo:lock:${code}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function readRoom(redis, code) {
  const raw = await redis.get(roomKey(code));
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw; // some client versions auto-deserialize
}

export async function writeRoom(redis, room) {
  room.updatedAt = Date.now();
  await redis.set(roomKey(room.code), JSON.stringify(room), { ex: TTL_SECONDS });
}

export async function roomExists(redis, code) {
  return (await redis.exists(roomKey(code))) === 1;
}

// Coarse per-room lock so two simultaneous actions can't clobber each other.
// Turn-based play means real contention is rare; this just keeps it correct.
export async function withLock(redis, code, fn) {
  let acquired = false;
  for (let i = 0; i < 25; i++) {
    const ok = await redis.set(lockKey(code), "1", { nx: true, ex: 5 });
    if (ok === "OK") {
      acquired = true;
      break;
    }
    await sleep(80);
  }
  if (!acquired) {
    const e = new Error("LOCK_TIMEOUT");
    e.code = "LOCK_TIMEOUT";
    throw e;
  }
  try {
    return await fn();
  } finally {
    try {
      await redis.del(lockKey(code));
    } catch {
      /* lock will expire on its own */
    }
  }
}
