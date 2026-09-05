// Verdict normalisation: what the adjudicator returns is model output, so the
// shape has to be defended before it reaches the screen. No network, no quota.
import { normalizeVerdict, normalizeSide } from '../api/judge.js';

let fails = 0, checks = 0;
const ok = (cond, msg) => {
  checks++;
  if (!cond) { fails++; console.log('  FAIL: ' + msg); }
  else console.log('  ok  : ' + msg);
};

console.log('=== Placeholder points never reach the screen ===');
for (const junk of ['none', 'None.', 'N/A', 'n/a', 'nil', '-', '--', 'nothing', 'nothing of note', 'No strengths identified', 'no points', 'null']) {
  const s = normalizeSide({ score: 0, strengths: [junk], weaknesses: ['typed nonsense'] });
  ok(s.strengths.length === 0, `"${junk}" is dropped, not rendered as a strong point`);
}

console.log('\n=== Real points survive ===');
{
  const s = normalizeSide({
    score: 7,
    strengths: ['Nothing was conceded on the central clash', 'None of the rebuttals landed, but the framing held'],
    weaknesses: [],
  });
  ok(s.strengths.length === 2, 'a real point that merely begins with a placeholder word is kept');
}

console.log('\n=== Shape defence ===');
{
  const s = normalizeSide({ score: 99, strengths: 'not an array', weaknesses: null });
  ok(s.score === 10, 'a score above 10 is clamped');
  ok(Array.isArray(s.strengths) && s.strengths.length === 0, 'a non-array strengths field becomes an empty list');
  ok(Array.isArray(s.weaknesses), 'a null weaknesses field becomes an empty list');

  ok(normalizeSide({ score: -5 }).score === 0, 'a negative score is clamped to zero');
  ok(normalizeSide({ score: 'seven' }).score === null, 'an unparseable score becomes null rather than NaN');

  const objectPoints = normalizeSide({ strengths: [{ point: 'Clear impact weighing' }, { text: 'Good signposting' }, { nope: 1 }] });
  ok(objectPoints.strengths.length === 2, 'points given as objects are flattened, empties dropped');

  const many = normalizeSide({ strengths: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] });
  ok(many.strengths.length === 5, 'the list is capped at five points');
}

console.log('\n=== Verdict envelope ===');
{
  const v = normalizeVerdict({ winner: 'proposition', for: { score: 8 }, against: { score: 5 } });
  ok(v.winner === 'draw', 'an unrecognised winner falls back to a draw rather than a crash');
  ok(v.scores.for === 8 && v.scores.against === 5, 'the flat scores mirror the per-side scores');
  ok(typeof v.headline === 'string' && v.headline.length > 0, 'a missing headline is filled in');

  const w = normalizeVerdict({ winner: 'against', headline: 'Sam takes it', rationale: 'Because.', for: {}, against: {} });
  ok(w.winner === 'against' && w.headline === 'Sam takes it', 'a valid verdict passes through intact');

  ok(normalizeVerdict(null).winner === 'draw', 'null input does not throw');
  ok(normalizeVerdict('nonsense').winner === 'draw', 'a string body does not throw');
}

console.log(`\n${checks} checks, ${fails ? fails + ' FAILURES' : 'all passed'}`);
process.exit(fails ? 1 : 0);
