/*
 * Point of Order - Debate Adjudicator
 * Powered by Google Gemini
 */

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY;

// Available models in priority order for resilience
const MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-pro-latest",
];

// --- basic per-IP rate limit (best-effort; resets when the function cold-starts) ---
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 30;
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear(); // keep the map from growing unbounded
  return list.length > MAX_PER_WINDOW;
}

const clip = (s, n) => String(s == null ? "" : s).slice(0, n).trim();

function buildPrompt({ motion, nameFor, nameAgainst, transcript }) {
  const lines = [];
  lines.push(
    "You are an experienced competitive-debate adjudicator. Judge ONLY the quality of " +
      "argumentation: claims, reasoning, evidence, rebuttal, and persuasiveness. Ignore spelling, " +
      "typing speed, and who wrote more words. Reward direct engagement with the other side."
  );
  lines.push("");
  lines.push(`MOTION: This house believes that "${motion}"`);
  lines.push(`${nameFor} argued FOR the motion.`);
  lines.push(`${nameAgainst} argued AGAINST the motion.`);
  lines.push("");
  lines.push("TRANSCRIPT (in order):");
  if (!transcript.length) lines.push("(no remarks)");
  transcript.forEach((t, i) => {
    lines.push(
      `${i + 1}. ${t.name} (${t.side === "for" ? "FOR" : "AGAINST"}): ` +
        (t.passed ? "[yielded without speaking]" : t.text)
    );
  });
  lines.push("");
  lines.push(
    "Decide who won on the balance of argument. If one side barely engaged, that should be " +
      "reflected. A draw is allowed only if the debate is genuinely level."
  );
  lines.push("");
  lines.push("Reply with ONLY a JSON object of exactly this shape, no prose around it:");
  lines.push(
    '{"winner":"for"|"against"|"draw",' +
      '"headline":"<=14 words naming the result and the deciding reason",' +
      '"rationale":"2-3 sentences on the decision and the central clash",' +
      '"for":{"score":<integer 0-10>,"strengths":["short phrase","short phrase"],' +
      '"weaknesses":["short phrase","short phrase"],"advice":"one concrete sentence"},' +
      '"against":{"score":<integer 0-10>,"strengths":["..."],"weaknesses":["..."],"advice":"..."}}'
  );
  return lines.join("\n");
}

function extractJson(text) {
  if (!text) return null;
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : text;
  try {
    return JSON.parse(candidate.trim());
  } catch {
    /* fall through */
  }
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      /* fall through */
    }
  }
  return null;
}

const clampScore = (n) => {
  n = Math.round(Number(n));
  return Number.isFinite(n) ? Math.max(0, Math.min(10, n)) : null;
};
const strArr = (x) =>
  Array.isArray(x) ? x.filter((i) => typeof i === "string" && i.trim()).slice(0, 5) : [];

function normalizeSide(o) {
  o = o && typeof o === "object" ? o : {};
  return {
    score: clampScore(o.score),
    strengths: strArr(o.strengths),
    weaknesses: strArr(o.weaknesses),
    advice: typeof o.advice === "string" ? o.advice : "",
  };
}

function normalizeVerdict(d) {
  d = d && typeof d === "object" ? d : {};
  const winner = ["for", "against", "draw"].includes(d.winner) ? d.winner : "draw";
  return {
    winner,
    headline: typeof d.headline === "string" ? d.headline : "The house is split.",
    rationale: typeof d.rationale === "string" ? d.rationale : "",
    for: normalizeSide(d.for),
    against: normalizeSide(d.against),
  };
}

async function queryGemini(prompt) {
  let lastError = null;

  for (const model of MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
        GEMINI_API_KEY
      )}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        lastError = new Error(`Model ${model} returned ${response.status}: ${errText}`);
        continue;
      }

      const data = await response.json();
      const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (replyText) {
        return replyText;
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Adjudicator service unavailable.");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const ip =
    (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  if (rateLimited(ip)) {
    return res
      .status(429)
      .json({ error: "Too many verdicts from here. Give it a few minutes and try again." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Bad request." });
  }

  const motion = clip(body.motion, 300);
  const nameFor = clip(body.nameFor, 40) || "For";
  const nameAgainst = clip(body.nameAgainst, 40) || "Against";
  const rawTranscript = Array.isArray(body.transcript) ? body.transcript.slice(0, 40) : [];
  const transcript = rawTranscript
    .map((t) => ({
      side: t && t.side === "against" ? "against" : "for",
      name: clip(t && t.name, 40) || "Speaker",
      passed: !!(t && t.passed),
      text: clip(t && t.text, 1500),
    }))
    .filter((t) => t.passed || t.text);

  if (!motion) return res.status(400).json({ error: "No motion supplied." });
  if (!transcript.some((t) => !t.passed && t.text)) {
    return res.status(200).json({
      verdict: normalizeVerdict({
        winner: "draw",
        headline: "No debate took place.",
        rationale: "Neither speaker put an argument on the record, so there is nothing to judge.",
        for: { score: 0, strengths: [], weaknesses: ["Did not speak to the motion."], advice: "Open with a clear claim and one supporting reason." },
        against: { score: 0, strengths: [], weaknesses: ["Did not speak to the motion."], advice: "Open with a clear claim and one supporting reason." },
      }),
    });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      error: "The judge isn't configured yet. (Server: check GEMINI_API_KEY.)",
    });
  }

  const prompt = buildPrompt({ motion, nameFor, nameAgainst, transcript });

  try {
    const rawOutput = await queryGemini(prompt);
    const parsed = extractJson(rawOutput);

    if (!parsed) {
      return res.status(502).json({
        error: "The adjudicator's reply came back garbled. Hit Rematch to run it again.",
      });
    }
    return res.status(200).json({ verdict: normalizeVerdict(parsed) });
  } catch (err) {
    console.error("judge error:", err);
    return res
      .status(500)
      .json({ error: "The adjudicator is currently unavailable. Try Rematch in a moment." });
  }
}
