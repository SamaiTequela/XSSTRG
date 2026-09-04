/*
 * Point of Order - Adjudicate Endpoint
 * Delegates directly to original AI adjudicator in api/judge.js
 */
import { judgeDebate, generateFallbackVerdict } from './judge.js';

export { generateFallbackVerdict };

export async function adjudicateDebate({ motion, nameFor = 'Alex', nameAgainst = 'Sam', transcript = [] }) {
  return judgeDebate({ motion, nameFor, nameAgainst, transcript });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { motion, nameFor = 'Alex', nameAgainst = 'Sam', transcript = [] } = body || {};
    if (!motion || !Array.isArray(transcript)) {
      return res.status(400).json({ error: "Missing motion or transcript array." });
    }

    const verdict = await judgeDebate({ motion, nameFor, nameAgainst, transcript });
    return res.status(200).json({ ...verdict, verdict });
  } catch (err) {
    console.error("Adjudication error:", err);
    return res.status(500).json({ error: err.message || "Failed to adjudicate debate." });
  }
}
