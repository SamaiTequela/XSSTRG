import fs from 'fs';
import path from 'path';

function getApiKey() {
  let key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) {
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const match = content.match(/GEMINI_API_KEY=([^\r\n]+)/);
        if (match) key = match[1].trim();
      }
    } catch (_) {}
  }
  return key;
}

const MODELS = ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash', 'gemini-pro-latest'];

export const VERDICT_SCHEMA = {
  type: "OBJECT",
  properties: {
    winner: { type: "STRING", enum: ["for", "against", "draw"] },
    winnerName: { type: "STRING" },
    headline: { type: "STRING" },
    rationale: { type: "STRING" },
    scores: {
      type: "OBJECT",
      properties: {
        for: { type: "INTEGER" },
        against: { type: "INTEGER" }
      },
      required: ["for", "against"]
    },
    for: {
      type: "OBJECT",
      properties: {
        score: { type: "INTEGER" },
        strengths: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              point: { type: "STRING" },
              citationQuote: { type: "STRING" },
              turnNo: { type: "INTEGER" }
            },
            required: ["point", "citationQuote", "turnNo"]
          }
        },
        weaknesses: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              point: { type: "STRING" },
              citationQuote: { type: "STRING" },
              turnNo: { type: "INTEGER" }
            },
            required: ["point", "citationQuote", "turnNo"]
          }
        }
      },
      required: ["score", "strengths", "weaknesses"]
    },
    against: {
      type: "OBJECT",
      properties: {
        score: { type: "INTEGER" },
        strengths: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              point: { type: "STRING" },
              citationQuote: { type: "STRING" },
              turnNo: { type: "INTEGER" }
            },
            required: ["point", "citationQuote", "turnNo"]
          }
        },
        weaknesses: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              point: { type: "STRING" },
              citationQuote: { type: "STRING" },
              turnNo: { type: "INTEGER" }
            },
            required: ["point", "citationQuote", "turnNo"]
          }
        }
      },
      required: ["score", "strengths", "weaknesses"]
    },
    individualScores: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          judgeLabel: { type: "STRING" },
          scoreFor: { type: "INTEGER" },
          scoreAgainst: { type: "INTEGER" },
          remarks: { type: "STRING" }
        },
        required: ["judgeLabel", "scoreFor", "scoreAgainst", "remarks"]
      }
    }
  },
  required: ["winner", "winnerName", "headline", "rationale", "scores", "for", "against", "individualScores"]
};

export async function adjudicateDebate({ motion, nameFor = 'Alex', nameAgainst = 'Sam', transcript = [] }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const prompt = `You are a prestigious chief parliamentary debate adjudicator. Adjudicate this competitive debate objectively based strictly on argument logic, empirical evidence, direct rebuttal engagement, and weighing of impacts.
Ignore typing pace, word count, and superficial rhetoric.

MOTION BEFORE THE HOUSE:
"This house believes that ${motion}"

SPEAKERS:
- Proposition (FOR): ${nameFor}
- Opposition (AGAINST): ${nameAgainst}

DEBATE RECORD (CHRONOLOGICAL TRANSCRIPT):
${transcript.map((t, idx) => `[Turn ${t.turnNo || idx + 1}] ${t.speaker || (t.side === 'for' ? nameFor : nameAgainst)} (${t.side.toUpperCase()}): ${t.text}${t.isConcession ? ' [CONCESSION]' : ''}`).join('\n\n')}

ADJUDICATION GUIDELINES:
1. Determine the winner ('for', 'against', or 'draw' if exactly even).
2. Assign numerical scores (1-10) for each side based on debate rigor.
3. For both Proposition and Opposition, highlight at least 1-2 distinct strong points and 1-2 areas for improvement. Every point MUST include an exact citation quote and the turn number from the transcript where it appeared.
4. Synthesize 3 anonymous juror ballots (Judge 1, Judge 2, Judge 3) reflecting panel deliberation consensus and individual feedback perspectives.
5. Provide a punchy headline (< 14 words) and an executive rationale narrative explaining the central clash.

Generate your verdict conforming strictly to the requested JSON schema.`;

  let lastError = null;

  for (const model of MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: VERDICT_SCHEMA
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        lastError = new Error(`Model ${model} returned ${response.status}: ${errText}`);
        continue;
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        return parsed;
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("All Gemini adjudication models failed.");
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

    const { motion, nameFor, nameAgainst, transcript } = body || {};
    if (!motion || !transcript || !Array.isArray(transcript)) {
      return res.status(400).json({ error: "Missing motion or transcript array." });
    }

    const verdict = await adjudicateDebate({ motion, nameFor, nameAgainst, transcript });
    return res.status(200).json(verdict);
  } catch (err) {
    console.error("Adjudication error:", err);
    return res.status(500).json({ error: err.message || "Failed to adjudicate debate." });
  }
}
