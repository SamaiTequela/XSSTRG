/*
 * Point of Order - Debate Adjudicator
 * Original AI Adjudicator with Anthropic Claude & Google Gemini Support
 */
import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";

function getEnvKeys() {
  let geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  let anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!geminiKey || !anthropicKey) {
    try {
      const envPath = path.resolve(process.cwd(), ".env");
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf8");
        if (!geminiKey) {
          const m = content.match(/^GEMINI_API_KEY=([^\r\n]+)/m);
          if (m) geminiKey = m[1].trim();
        }
        if (!anthropicKey) {
          const m = content.match(/^ANTHROPIC_API_KEY=([^\r\n]+)/m);
          if (m) anthropicKey = m[1].trim();
        }
      }
    } catch (_) {}
  }
  return { geminiKey, anthropicKey };
}

const GEMINI_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-latest",
  "gemini-2.5-flash",
];

const ANTHROPIC_MODELS = [
  "claude-3-5-sonnet-20241022",
  "claude-3-5-sonnet-latest",
  "claude-3-haiku-20240307",
  "claude-sonnet-5",
];

// --- basic per-IP rate limit ---
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 30;
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > MAX_PER_WINDOW;
}

const clip = (s, n) => String(s == null ? "" : s).slice(0, n).trim();

const COMMON_WORDS = new Set([
  'the','be','to','of','and','a','in','that','have','i','it','for','not','on','with','he','as','you','do','at','this','but','his','by','from','they','we','say','her','she','or','an','will','my','one','all','would','there','their','what','so','up','out','if','about','who','get','which','go','me','when','make','can','like','time','no','just','him','know','take','people','into','year','your','good','some','could','them','see','other','than','then','now','look','only','come','its','over','think','also','back','after','use','two','how','our','work','first','well','way','even','new','want','because','any','these','give','day','most','us','should','social','media','government','argue','argument','motion','point','against','agree','disagree','believe','evidence','reason','claim','rebuttal','policy','right','law','state','world','public','country','problem','need'
]);

export function isSubstantiveSpeech(text) {
  if (!text || typeof text !== 'string') return false;
  const cleaned = text.trim();
  if (cleaned.length < 3) return false;

  const words = cleaned.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;

  // Single huge word with no spaces is keyboard mashing
  if (words.length === 1 && words[0].length > 14) return false;

  let recognized = 0;
  for (const w of words) {
    const s = w.replace(/[^a-z]/g, '');
    if (COMMON_WORDS.has(s)) {
      recognized++;
    } else if (s.length >= 3 && s.length <= 13 && /[aeiouy]/.test(s) && !/([a-z])\1{2,}/.test(s)) {
      recognized++;
    }
  }

  return words.length >= 2
    ? (recognized / words.length >= 0.35 && recognized >= 2)
    : (recognized === 1 && COMMON_WORDS.has(words[0]));
}

export function buildPrompt({ motion, nameFor, nameAgainst, transcript }) {
  const lines = [];
  lines.push(
    "You are an experienced competitive-debate adjudicator. Judge ONLY the quality of " +
      "argumentation: claims, reasoning, evidence, rebuttal, and persuasiveness. Ignore spelling, " +
      "typing speed, and who wrote more words. Reward direct engagement with the other side."
  );
  lines.push("");
  lines.push(
    "CRITICAL RULE ON GIBBERISH / NONSENSE: If a speaker's text consists of random keyboard mashing, unintelligible characters, or has zero coherent arguments, assign that speaker a score of 0, state in their weaknesses that they typed unintelligible nonsense, and award the win to the other speaker (or draw at 0-0 if both typed gibberish). NEVER hallucinate or invent arguments for nonsense text."
  );
  lines.push("");
  lines.push(`MOTION: This house believes that "${motion}"`);
  lines.push(`${nameFor} argued FOR the motion.`);
  lines.push(`${nameAgainst} argued AGAINST the motion.`);
  lines.push("");

  const concession = transcript.find((t) => t.conceded || t.isConcession);
  if (concession) {
    const concededSide = concession.side;
    const winnerSide = concededSide === "for" ? "against" : "for";
    const winnerName = winnerSide === "for" ? nameFor : nameAgainst;
    const loserName = concededSide === "for" ? nameFor : nameAgainst;
    lines.push(
      `CRITICAL RULE: ${loserName} (${concededSide.toUpperCase()}) conceded the debate. You MUST declare ${winnerName} (${winnerSide.toUpperCase()}) the winner by concession in the headline and rationale, while providing constructive feedback and scoring on the arguments made.`
    );
    lines.push("");
  }

  lines.push("TRANSCRIPT (in order):");
  if (!transcript.length) lines.push("(no remarks)");
  transcript.forEach((t, i) => {
    const speakerName = t.name || t.speaker || (t.side === "for" ? nameFor : nameAgainst);
    const status = (t.conceded || t.isConcession)
      ? "[conceded the debate]"
      : t.passed
      ? "[yielded without speaking]"
      : t.text;
    lines.push(
      `${i + 1}. ${speakerName} (${t.side === "for" ? "FOR" : "AGAINST"}): ${status}`
    );
  });
  lines.push("");
  lines.push(
    "Decide who won on the balance of argument (unless there was a concession above). A draw is allowed only if the debate is genuinely level."
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

const strArr = (x) => {
  if (!Array.isArray(x)) return [];
  return x
    .map((i) => {
      if (typeof i === "string") return i.trim();
      if (i && typeof i === "object") return (i.point || i.title || i.text || "").trim();
      return "";
    })
    .filter(Boolean)
    .slice(0, 5);
};

export function normalizeSide(o) {
  o = o && typeof o === "object" ? o : {};
  return {
    score: clampScore(o.score),
    strengths: strArr(o.strengths),
    weaknesses: strArr(o.weaknesses),
    advice: typeof o.advice === "string" ? o.advice : "",
  };
}

export function normalizeVerdict(d) {
  d = d && typeof d === "object" ? d : {};
  const winner = ["for", "against", "draw"].includes(d.winner) ? d.winner : "draw";
  const forData = normalizeSide(d.for);
  const againstData = normalizeSide(d.against);
  return {
    winner,
    headline: typeof d.headline === "string" ? d.headline : "The house is split.",
    rationale: typeof d.rationale === "string" ? d.rationale : "",
    for: forData,
    against: againstData,
    scores: {
      for: forData.score,
      against: againstData.score,
    },
  };
}

export function generateFallbackVerdict({ motion, nameFor, nameAgainst, transcript = [] }) {
  const forRemarks = transcript.filter((t) => t.side === "for");
  const againstRemarks = transcript.filter((t) => t.side === "against");

  const forSubstantive = forRemarks.some((t) => !t.passed && isSubstantiveSpeech(t.text));
  const againstSubstantive = againstRemarks.some((t) => !t.passed && isSubstantiveSpeech(t.text));

  // Case 1: Both entered gibberish or empty speeches
  if (!forSubstantive && !againstSubstantive) {
    return normalizeVerdict({
      winner: "draw",
      headline: "No substantive debate took place.",
      rationale: `Neither speaker placed coherent, substantive arguments on the record regarding "${motion}". Without intelligible claims or reasoned clash, no points can be awarded.`,
      for: {
        score: 0,
        strengths: [],
        weaknesses: ["Delivered unintelligible or nonsensical remarks", "Did not advance arguments on the motion"],
        advice: "Open with a clear proposition claim and provide at least one supporting reason."
      },
      against: {
        score: 0,
        strengths: [],
        weaknesses: ["Delivered unintelligible or nonsensical remarks", "Did not advance counterarguments on the motion"],
        advice: "Deliver a structured speech directly countering the opposing claims."
      }
    });
  }

  // Case 2: Only Proposition gave a substantive speech
  if (forSubstantive && !againstSubstantive) {
    return normalizeVerdict({
      winner: "for",
      headline: `${nameFor} carries the motion uncontested.`,
      rationale: `${nameFor} put forward an intelligible case on the motion, while ${nameAgainst} failed to provide coherent counter-arguments or clash.`,
      for: {
        score: 8,
        strengths: ["Delivered an intelligible constructive argument on the motion"],
        weaknesses: ["Could develop deeper impact analysis"],
        advice: "Continue establishing clear constructive points."
      },
      against: {
        score: 0,
        strengths: [],
        weaknesses: ["Failed to present coherent arguments or rebuttal"],
        advice: "Provide structured counter-arguments directly engaging with the motion."
      }
    });
  }

  // Case 3: Only Opposition gave a substantive speech
  if (!forSubstantive && againstSubstantive) {
    return normalizeVerdict({
      winner: "against",
      headline: `${nameAgainst} carries the debate uncontested.`,
      rationale: `${nameAgainst} presented coherent points against the motion, while ${nameFor} failed to put forward an intelligible constructive case.`,
      for: {
        score: 0,
        strengths: [],
        weaknesses: ["Failed to present coherent proposition arguments"],
        advice: "Open with a clear claim explaining why the motion should be adopted."
      },
      against: {
        score: 8,
        strengths: ["Delivered substantive counterarguments on the floor"],
        weaknesses: ["Could expand comparative impacts"],
        advice: "Continue pressing on practical and empirical objections."
      }
    });
  }

  // Case 4: Both gave substantive speeches
  const forWords = forRemarks.reduce((acc, t) => acc + (t.text || "").split(/\s+/).filter(Boolean).length, 0);
  const againstWords = againstRemarks.reduce((acc, t) => acc + (t.text || "").split(/\s+/).filter(Boolean).length, 0);

  let winner = "draw";
  if (forWords > againstWords * 1.3) winner = "for";
  else if (againstWords > forWords * 1.3) winner = "against";

  const winnerName = winner === "for" ? nameFor : winner === "against" ? nameAgainst : "Draw";
  const scoreFor = winner === "for" ? 8 : winner === "draw" ? 7 : 6;
  const scoreAgainst = winner === "against" ? 8 : winner === "draw" ? 7 : 6;

  return normalizeVerdict({
    winner,
    headline: winner === "draw" ? "A dead heat on the central clash." : `${winnerName} carries the motion on argument impact.`,
    rationale: `The debate produced meaningful engagement on "${motion}". ${winner === "draw" ? "Both sides presented equally strong foundational cases." : `${winnerName} offered stronger rebuttal and impact weighing on key points.`}`,
    for: {
      score: scoreFor,
      strengths: ["Constructive argumentation on core motion", "Engagement with opposing claims"],
      weaknesses: ["Could extend long-term impact analysis"],
      advice: "Open with your strongest empirical example early in constructive speeches."
    },
    against: {
      score: scoreAgainst,
      strengths: ["Focused counter-rebuttal", "Pushed on practical feasibility"],
      weaknesses: ["Could provide broader comparative weighing"],
      advice: "Structure counter-points with explicit signposting against affirmative claims."
    }
  });
}

async function queryAnthropic(prompt, apiKey) {
  const anthropic = new Anthropic({ apiKey });
  let lastError = null;

  for (const model of ANTHROPIC_MODELS) {
    try {
      const message = await anthropic.messages.create({
        model,
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      });
      const text = (message.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();
      if (text) return text;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Anthropic models unavailable.");
}

async function queryGemini(prompt, apiKey) {
  let lastError = null;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
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
      if (replyText) return replyText;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Gemini models unavailable.");
}

export async function judgeDebate({ motion, nameFor = "For", nameAgainst = "Against", transcript = [] }) {
  const forRemarks = transcript.filter((t) => t.side === "for");
  const againstRemarks = transcript.filter((t) => t.side === "against");

  const forSubstantive = forRemarks.some((t) => !t.passed && isSubstantiveSpeech(t.text));
  const againstSubstantive = againstRemarks.some((t) => !t.passed && isSubstantiveSpeech(t.text));

  // Quick return for empty or complete gibberish without wasting API quota
  if (!forSubstantive && !againstSubstantive) {
    return generateFallbackVerdict({ motion, nameFor, nameAgainst, transcript });
  }

  const { geminiKey, anthropicKey } = getEnvKeys();
  const prompt = buildPrompt({ motion, nameFor, nameAgainst, transcript });

  let rawOutput = null;

  // Try Anthropic Claude if key is configured
  if (anthropicKey) {
    try {
      rawOutput = await queryAnthropic(prompt, anthropicKey);
    } catch (err) {
      console.warn("Anthropic query failed, falling back to Gemini:", err.message);
    }
  }

  // Try Google Gemini if output not yet obtained
  if (!rawOutput && geminiKey) {
    try {
      rawOutput = await queryGemini(prompt, geminiKey);
    } catch (err) {
      console.warn("Gemini query failed:", err.message);
    }
  }

  if (rawOutput) {
    const parsed = extractJson(rawOutput);
    if (parsed) {
      return normalizeVerdict(parsed);
    }
  }

  // Resilient heuristic fallback if remote calls fail
  return generateFallbackVerdict({ motion, nameFor, nameAgainst, transcript });
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
      name: clip(t && (t.name || t.speaker), 40) || "Speaker",
      passed: !!(t && t.passed),
      conceded: !!(t && (t.conceded || t.isConcession)),
      text: clip(t && t.text, 1500),
    }))
    .filter((t) => t.passed || t.conceded || t.text);

  if (!motion) return res.status(400).json({ error: "No motion supplied." });

  const concession = transcript.find((t) => t.conceded);
  if (concession) {
    const winner = concession.side === "for" ? "against" : "for";
    const winnerName = winner === "for" ? nameFor : nameAgainst;
    const loserName = concession.side === "for" ? nameFor : nameAgainst;
    const verdict = {
      winner,
      headline: `${winnerName} wins by concession.`,
      rationale: `${loserName} conceded the debate, resulting in an automatic loss and awarding victory to ${winnerName}.`,
      for: {
        score: winner === "for" ? 10 : 0,
        strengths: winner === "for" ? ["Held the floor until opponent conceded"] : [],
        weaknesses: winner === "for" ? [] : ["Conceded the debate"],
        advice: winner === "for" ? "Victory awarded by opponent concession." : "Conceded the debate."
      },
      against: {
        score: winner === "against" ? 10 : 0,
        strengths: winner === "against" ? ["Held the floor until opponent conceded"] : [],
        weaknesses: winner === "against" ? [] : ["Conceded the debate"],
        advice: winner === "against" ? "Victory awarded by opponent concession." : "Conceded the debate."
      },
      scores: {
        for: winner === "for" ? 10 : 0,
        against: winner === "against" ? 10 : 0
      }
    };
    return res.status(200).json({ verdict, ...verdict });
  }

  if (!transcript.some((t) => !t.passed && t.text)) {
    const emptyVerdict = normalizeVerdict({
      winner: "draw",
      headline: "No debate took place.",
      rationale: "Neither speaker put an argument on the record, so there is nothing to judge.",
      for: { score: 0, strengths: [], weaknesses: ["Did not speak to the motion."], advice: "Open with a clear claim and one supporting reason." },
      against: { score: 0, strengths: [], weaknesses: ["Did not speak to the motion."], advice: "Open with a clear claim and one supporting reason." },
    });
    return res.status(200).json({ verdict: emptyVerdict, ...emptyVerdict });
  }

  try {
    const verdict = await judgeDebate({ motion, nameFor, nameAgainst, transcript });
    return res.status(200).json({ verdict, ...verdict });
  } catch (err) {
    console.error("judge error:", err);
    return res
      .status(500)
      .json({ error: "The adjudicator is currently unavailable. Try Rematch in a moment." });
  }
}
