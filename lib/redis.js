// Shared Redis helper for the online-room API. Lives outside /api so Vercel
// doesn't turn it into its own route; api/room.js imports it.
//
// Reads connection details from whichever env vars your provider set:
//   - Upstash (Vercel Marketplace):  UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
//   - Vercel KV (legacy):            KV_REST_API_URL / KV_REST_API_TOKEN
// If none are present, getRedis() returns null and the room API replies with a
// clear "online play isn't set up" message instead of crashing.

import { Redis } from "@upstash/redis";

class MemoryStore {
  constructor() {
    this.map = new Map();
  }
  async get(key) {
    const val = this.map.get(key);
    return val !== undefined ? val : null;
  }
  async set(key, value, opts) {
    if (opts && opts.nx && this.map.has(key)) {
      return null;
    }
    this.map.set(key, value);
    return "OK";
  }
  async exists(key) {
    return this.map.has(key) ? 1 : 0;
  }
  async del(key) {
    this.map.delete(key);
    return 1;
  }
}

// Global in-memory fallback shared across function invocations in the same process
const fallbackStore = globalThis.__debateGameMemoryStore || (globalThis.__debateGameMemoryStore = new MemoryStore());

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

  if (url && token) {
    client = new Redis({ url, token });
    return client;
  }

  // No credentials. The in-memory store is only honest in a single local
  // process: on a serverless platform each invocation may land on a different
  // instance, so the host creates a room in one instance's map and the guest
  // looks for it in another's and is told the room does not exist. That reads
  // as a flaky room bug rather than the configuration error it is, so when
  // deployed, return null and let the API say online play is not set up.
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    console.error(
      "Online rooms disabled: no UPSTASH_REDIS_REST_URL/TOKEN (or KV_REST_API_*) configured."
    );
    client = null;
    return client;
  }

  client = fallbackStore;
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
