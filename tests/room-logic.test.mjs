import { freshRoom, applyAction, view } from '../lib/room-logic.js';

const A = 'clientA', B = 'clientB', S1 = 'spec1';
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log('  FAIL: ' + msg); } else console.log('  ok  : ' + msg); };
const act = (room, action, cid, body = {}) => {
  const r = applyAction(room, action, cid, body);
  if (r.error) console.log(`  -> ${action}(${cid}) rejected: ${r.error}`);
  return r;
};

console.log('=== 1. Standard AI-judged match ===');
{
  const room = freshRoom('AAAA', 'This House would ban cars', 300, false);
  act(room, 'join', A, { name: 'Ada', seat: 'for' });
  act(room, 'join', B, { name: 'Ben', seat: 'against' });
  ok(view(room, A).you.isHost, 'first joiner is host');
  act(room, 'start', A);
  let v = view(room, A);
  ok(v.phase === 'debate', 'phase debate after start');
  ok(v.clock.active === 'for', 'proposition opens');
  ok(v.clock.running === true, 'opening speaker clock runs immediately (no prep)');
  ok(v.clock.remaining.for === 300000, 'for clock seeded to 300s');

  act(room, 'turn', A, { text: 'Cars kill.' });
  v = view(room, A);
  ok(v.clock.active === 'against', 'floor passes to opposition');
  ok(v.turnNo === 2, 'turn number advances');
  ok(v.clock.prepUntil !== null, 'second speaker gets prep');
  ok(v.transcript.length === 1, 'transcript has one turn');

  act(room, 'speak', B);
  ok(view(room, B).clock.running, 'speak starts the clock early');
  act(room, 'turn', B, { text: 'Cars are freedom.' });

  act(room, 'requestEnd', A);
  ok(view(room, B).endRequest && view(room, B).endRequest.from === 'for', 'end request visible to opponent');
  const bad = applyAction(room, 'respondEnd', A, { accept: true });
  ok(!!bad.error, 'requester cannot accept their own end request');
  act(room, 'respondEnd', B, { accept: true });
  v = view(room, A);
  ok(v.phase === 'review', 'mutual end -> review');
  ok(v.endedReason === 'mutual_end', 'endedReason recorded');

  act(room, 'ready', A);
  ok(view(room, A).phase === 'review', 'one ready is not enough');
  act(room, 'ready', B);
  v = view(room, A);
  ok(v.phase === 'judging', 'both ready -> judging');
  ok(v.judgeOwner === A, 'host owns the judge call');

  act(room, 'setVerdict', A, { verdict: { winner: 'for', headline: 'Ada wins', for: { score: 8 }, against: { score: 6 } } });
  ok(view(room, A).phase === 'verdict', 'verdict published');

  act(room, 'rematch', A);
  v = view(room, A);
  ok(v.phase === 'lobby', 'rematch returns to lobby');
  ok(v.seats.for.name === 'Ben' && v.seats.against.name === 'Ada', 'rematch swaps sides');
  ok(v.transcript.length === 0, 'rematch clears transcript');
  ok(view(room, A).you.side === 'against', 'Ada now sits against');
}

console.log('\n=== 2. Clock exhaustion / flag ===');
{
  const room = freshRoom('BBBB', 'M', 300, false);
  act(room, 'join', A, { name: 'Ada', seat: 'for' });
  act(room, 'join', B, { name: 'Ben', seat: 'against' });
  act(room, 'start', A);
  // Proposition talks straight through its 300s.
  room.clock.turnStartedAt = Date.now() - 301000;
  ok(view(room, A).clock.remaining.for === 0, 'live remaining floors at zero while overrunning');
  act(room, 'turn', A, { text: 'out of time', flagged: true });
  let v = view(room, A);
  ok(v.phase === 'debate', 'one dead clock does not end the debate');
  ok(v.clock.active === 'against', 'floor goes to the side with time');
  ok(v.clock.remaining.for === 0, 'exhausted clock reads zero');
  ok(v.clock.remaining.against === 300000, 'opponent clock untouched by the overrun');

  // Opposition then burns its own clock out too.
  room.clock.prepUntil = null;
  room.clock.turnStartedAt = Date.now() - 301000;
  act(room, 'turn', B, { text: 'me too', flagged: true });
  v = view(room, A);
  ok(v.phase === 'review', 'both clocks dead -> review');
  ok(v.endedReason === 'flag', 'endedReason flag');
}

console.log('\n=== 3. Concession ===');
{
  const room = freshRoom('CCCC', 'M', 300, false);
  act(room, 'join', A, { name: 'Ada', seat: 'for' });
  act(room, 'join', B, { name: 'Ben', seat: 'against' });
  act(room, 'start', A);
  act(room, 'turn', A, { text: 'opening' });
  act(room, 'concede', B);
  const v = view(room, A);
  ok(v.phase === 'verdict', 'concession jumps straight to verdict');
  ok(v.verdict.winner === 'for', 'non-conceder wins');
  ok(v.concededBy === 'against', 'concededBy recorded');
  ok(v.verdict.for.score === 10 && v.verdict.against.score === 0, 'scores 10/0');
}

console.log('\n=== 4. Crowd Jury match ===');
{
  const room = freshRoom('DDDD', 'M', 300, true);
  act(room, 'join', S1, { name: 'Jo', role: 'spectator' });
  act(room, 'join', A, { name: 'Ada', seat: 'for' });
  act(room, 'join', B, { name: 'Ben', seat: 'against' });
  ok(view(room, S1).you.isHost, 'first spectator became host');

  const noJudges = freshRoom('EEEE', 'M', 300, true);
  act(noJudges, 'join', A, { name: 'Ada', seat: 'for' });
  act(noJudges, 'join', B, { name: 'Ben', seat: 'against' });
  ok(!!applyAction(noJudges, 'start', A, {}).error, 'cannot start jury mode with no judges');

  act(room, 'start', S1);
  ok(view(room, A).phase === 'debate', 'jury match starts');
  act(room, 'turn', A, { text: 'for arg' });
  act(room, 'speak', B);
  act(room, 'turn', B, { text: 'against arg' });
  act(room, 'requestEnd', A);
  act(room, 'respondEnd', B, { accept: true });
  act(room, 'ready', A);
  act(room, 'ready', B);
  let v = view(room, S1);
  ok(v.phase === 'scoring', 'jury mode -> scoring, not judging');
  ok(v.scoringRemainingMs > 0, 'scoring timer runs');
  ok(!!applyAction(room, 'submitJudgement', A, { scoreFor: 8, scoreAgainst: 4 }).error, 'players cannot score');
  act(room, 'submitJudgement', S1, { scoreFor: 8, scoreAgainst: 4, remarks: 'clear win' });
  v = view(room, S1);
  ok(v.phase === 'verdict', 'all judges scored -> verdict');
  ok(v.verdict.winner === 'for', 'jury winner computed');
  ok(v.verdict.individualScores.length === 1, 'anonymous scorecard present');
  ok(v.you.myScore && v.you.myScore.scoreFor === 8, 'juror sees own score at verdict');
  ok(!v.spectators.some((s) => 'scoreFor' in s), 'spectator list never leaks scores');
}

console.log('\n=== 5. Leave / abandonment ===');
{
  const room = freshRoom('FFFF', 'M', 300, false);
  act(room, 'join', A, { name: 'Ada', seat: 'for' });
  act(room, 'join', B, { name: 'Ben', seat: 'against' });
  act(room, 'start', A);
  act(room, 'turn', A, { text: 'x' });
  act(room, 'leave', B);
  const v = view(room, A);
  ok(v.phase === 'lobby', 'a speaker leaving mid-debate returns the room to the lobby');
  ok(v.seats.against.filled === false, 'seat freed');
  ok(v.transcript.length === 0, 'transcript cleared');
}

console.log(fails ? `\n${fails} FAILURES` : '\nall assertions passed');

process.exit(fails ? 1 : 0);
