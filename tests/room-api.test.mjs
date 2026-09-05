// Drives the real api/room.js handler with fake req/res objects against the
// in-memory store, so multi-client room behaviour is testable without Redis.
import handler from '../api/room.js';

let fails = 0, checks = 0;
const ok = (cond, msg) => {
  checks++;
  if (!cond) { fails++; console.log('  FAIL: ' + msg); }
  else console.log('  ok  : ' + msg);
};

function makeRes() {
  const res = { statusCode: 200, body: null, headers: {} };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (d) => { res.body = d; return res; };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  return res;
}
const post = async (body) => {
  const res = makeRes();
  await handler({ method: 'POST', body, headers: {}, socket: {} }, res);
  return { status: res.statusCode, ...(res.body || {}) };
};
const get = async (code, clientId) => {
  const res = makeRes();
  await handler({ method: 'GET', query: { code, clientId }, headers: {}, socket: {} }, res);
  return { status: res.statusCode, ...(res.body || {}) };
};

const A = 'cid-alex', B = 'cid-sam', C = 'cid-third', J1 = 'cid-judge1', J2 = 'cid-judge2';

console.log('=== A. Create / join / reachability ===');
const c1 = await post({ action: 'create', clientId: A, name: 'Alex', perSecs: 600, motion: 'This House would test', role: 'for' });
ok(c1.status === 200, 'host can create a room');
const code = c1.view.code;
ok(/^[A-Z0-9]{4}$/.test(code), `code looks sane (${code})`);

const seen = await get(code, B);
ok(seen.status === 200, 'a second client can reach the room by code');
ok(seen.view.seats.for.filled && !seen.view.seats.against.filled, 'guest sees one seat taken');

const j = await post({ action: 'join', code, clientId: B, name: 'Sam', seat: 'against' });
ok(j.status === 200 && j.view.you.side === 'against', 'guest joins the open seat');
const hostView = await get(code, A);
ok(hostView.view.seats.against.filled, 'host sees the guest arrive');
ok(hostView.view.you.isHost === true, 'host keeps host role');

const lower = await post({ action: 'join', code: code.toLowerCase(), clientId: B, name: 'Sam' });
ok(lower.status === 200, 'a lowercase code still finds the room');

const rejoin = await post({ action: 'join', code, clientId: B, name: 'Sam' });
ok(rejoin.status === 200 && rejoin.view.you.side === 'against', 'reconnecting keeps your seat');

const third = await post({ action: 'join', code, clientId: C, name: 'Gate' });
ok(third.status === 409, 'a third player is refused a full room');

const nope = await post({ action: 'join', code: 'ZZZZ', clientId: C, name: 'Lost' });
ok(nope.status === 404 && nope.code === 'NO_ROOM', 'joining a dead code says the room does not exist');

console.log('\n=== B. Requested-code collision (the reported room bug) ===');
const collide = await post({ action: 'create', clientId: C, name: 'Other', perSecs: 600, motion: 'm', role: 'for', code });
ok(collide.status === 200, 'creating with a taken code still succeeds');
ok(collide.view.code !== code, 'but the server allocates a DIFFERENT code');
ok(true, `   -> requested ${code}, got ${collide.view.code} (client must adopt view.code)`);
const stillHost = await get(code, A);
ok(stillHost.view.seats.for.name === 'Alex', 'the original room is untouched by the collision');

console.log('\n=== C. Start guards and the full match ===');
const notHost = await post({ action: 'start', code, clientId: B });
ok(notHost.status === 403, 'only the host may start');
const started = await post({ action: 'start', code, clientId: A });
ok(started.status === 200 && started.view.phase === 'debate', 'host starts the debate');
ok(started.view.clock.active === 'for', 'proposition opens');
ok(started.view.clock.remaining.for === 600000, 'clock seeded in ms');

const wrongTurn = await post({ action: 'turn', code, clientId: B, text: 'not my turn' });
ok(wrongTurn.status === 409 && wrongTurn.code === 'NOT_YOUR_TURN', 'the idle speaker cannot take the floor');

await post({ action: 'turn', code, clientId: A, text: 'Opening case for the motion.' });
const afterTurn = await get(code, B);
ok(afterTurn.view.clock.active === 'against', 'floor passes to the opposition');
ok(afterTurn.view.transcript.length === 1, 'the speech is on the record');
ok(afterTurn.view.clock.prepUntil !== null, 'incoming speaker gets prep');

await post({ action: 'speak', code, clientId: B });
await post({ action: 'turn', code, clientId: B, text: 'Opposition reply on the motion.' });

await post({ action: 'requestEnd', code, clientId: A });
const selfAccept = await post({ action: 'respondEnd', code, clientId: A, accept: true });
ok(selfAccept.status === 403, 'you cannot accept your own end request');
const ended = await post({ action: 'respondEnd', code, clientId: B, accept: true });
ok(ended.view.phase === 'review', 'mutual end reaches the review phase');

await post({ action: 'ready', code, clientId: A });
const oneReady = await get(code, A);
ok(oneReady.view.phase === 'review', 'one ready is not enough');
const bothReady = await post({ action: 'ready', code, clientId: B });
ok(bothReady.view.phase === 'judging', 'both ready moves to judging');
ok(bothReady.view.judgeOwner === A, 'the host owns the adjudicator call');

const stealVerdict = await post({ action: 'setVerdict', code, clientId: B, verdict: { winner: 'against' } });
ok(stealVerdict.status === 409, 'the other client cannot publish the verdict while the host holds it');

const published = await post({ action: 'setVerdict', code, clientId: A, verdict: { winner: 'for', headline: 'Alex wins' }, notice: null });
ok(published.view.phase === 'verdict' && published.view.verdict.winner === 'for', 'verdict publishes to the room');
const guestSees = await get(code, B);
ok(guestSees.view.verdict?.winner === 'for', 'the guest sees the same verdict');

const rem = await post({ action: 'rematch', code, clientId: A });
ok(rem.view.phase === 'lobby', 'rematch returns the room to the lobby');
ok(rem.view.seats.for.name === 'Sam' && rem.view.seats.against.name === 'Alex', 'rematch swaps the sides');
ok(rem.view.transcript.length === 0, 'rematch clears the record');
const remGuest = await get(code, B);
ok(remGuest.view.you.side === 'for', 'the guest is moved to the other seat too');

console.log('\n=== D. Verdict notice reaches the other device ===');
await post({ action: 'start', code, clientId: A });
await post({ action: 'turn', code, clientId: B, text: 'A speech.' });
await post({ action: 'requestEnd', code, clientId: A });
await post({ action: 'respondEnd', code, clientId: B, accept: true });
await post({ action: 'ready', code, clientId: A });
await post({ action: 'ready', code, clientId: B });
await post({
  action: 'setVerdict', code, clientId: A,
  verdict: { winner: 'for', headline: 'x', isFallback: true },
  notice: 'The adjudicator could not be reached.',
});
const noticed = await get(code, B);
ok(noticed.view.verdictNotice === 'The adjudicator could not be reached.', 'the fallback notice travels to the other device');
ok(noticed.view.verdict?.isFallback === true, 'the fallback flag survives the round trip');

console.log('\n=== E. Crowd Jury ===');
const cj = await post({ action: 'create', clientId: J1, name: 'Judge One', perSecs: 600, motion: 'Jury motion', judgeMode: true, role: 'spectator' });
const jcode = cj.view.code;
ok(cj.view.you.isSpectator === true, 'the jury-room creator can sit on the jury');
await post({ action: 'join', code: jcode, clientId: A, name: 'Alex', seat: 'for' });
await post({ action: 'join', code: jcode, clientId: B, name: 'Sam', seat: 'against' });
const jj = await post({ action: 'join', code: jcode, clientId: J2, name: 'Judge Two', role: 'spectator' });
ok(jj.view.spectators.length === 2, 'a second juror can join');

const startJury = await post({ action: 'start', code: jcode, clientId: J1 });
ok(startJury.view.phase === 'debate', 'the juror host can start the debate');
await post({ action: 'turn', code: jcode, clientId: A, text: 'Proposition case for the jury.' });
await post({ action: 'speak', code: jcode, clientId: B });
await post({ action: 'turn', code: jcode, clientId: B, text: 'Opposition case for the jury.' });
await post({ action: 'requestEnd', code: jcode, clientId: A });
await post({ action: 'respondEnd', code: jcode, clientId: B, accept: true });
await post({ action: 'ready', code: jcode, clientId: A });
const scoring = await post({ action: 'ready', code: jcode, clientId: B });
ok(scoring.view.phase === 'scoring', 'a jury room goes to scoring, not to the AI');

const playerScores = await post({ action: 'submitJudgement', code: jcode, clientId: A, scoreFor: 9, scoreAgainst: 1 });
ok(playerScores.status === 403, 'debaters cannot score themselves');
const badScore = await post({ action: 'submitJudgement', code: jcode, clientId: J1, scoreFor: 99, scoreAgainst: 1 });
ok(badScore.status === 400, 'out-of-range scores are refused');

await post({ action: 'submitJudgement', code: jcode, clientId: J1, scoreFor: 8, scoreAgainst: 5, remarks: 'Prop clearer.' });
const midScoring = await get(jcode, A);
ok(midScoring.view.phase === 'scoring', 'one juror scoring does not end deliberation');
ok(!JSON.stringify(midScoring.view.spectators).includes('8'), 'a debater cannot read juror scores mid-deliberation');
const done = await post({ action: 'submitJudgement', code: jcode, clientId: J2, scoreFor: 6, scoreAgainst: 7 });
ok(done.view.phase === 'verdict', 'the last juror closes the scoring');
ok(done.view.verdict.judgeCount === 2, 'both jurors counted');
ok(done.view.verdict.individualScores.length === 2, 'the anonymous scorecard is published');
ok(!done.view.verdict.individualScores.some((s) => s.name || s.clientId), 'the scorecard carries no juror identity');
const myScore = await get(jcode, J1);
ok(myScore.view.you.myScore?.scoreFor === 8, 'a juror can see their own score afterwards');

console.log('\n=== F. Abandonment and concession ===');
const ab = await post({ action: 'create', clientId: A, name: 'Alex', perSecs: 600, motion: 'm', role: 'for' });
const acode = ab.view.code;
await post({ action: 'join', code: acode, clientId: B, name: 'Sam', seat: 'against' });
await post({ action: 'start', code: acode, clientId: A });
await post({ action: 'turn', code: acode, clientId: A, text: 'Opening.' });
const left = await post({ action: 'leave', code: acode, clientId: B });
ok(left.view.phase === 'lobby', 'a speaker leaving mid-debate returns the room to the lobby');
ok(!left.view.seats.against.filled, 'their seat is freed for someone else');

const cc = await post({ action: 'create', clientId: A, name: 'Alex', perSecs: 600, motion: 'm', role: 'for' });
const ccode = cc.view.code;
await post({ action: 'join', code: ccode, clientId: B, name: 'Sam', seat: 'against' });
await post({ action: 'start', code: ccode, clientId: A });
await post({ action: 'turn', code: ccode, clientId: A, text: 'Opening.' });
const conceded = await post({ action: 'concede', code: ccode, clientId: B });
ok(conceded.view.phase === 'verdict', 'a concession ends the match immediately');
ok(conceded.view.verdict.winner === 'for', 'the other speaker wins');
const oppSees = await get(ccode, A);
ok(oppSees.view.concededBy === 'against', 'the opponent is told who conceded');

console.log('\n=== G. Concurrency (per-room lock) ===');
const race = await post({ action: 'create', clientId: A, name: 'Alex', perSecs: 600, motion: 'm', role: 'for' });
const rcode = race.view.code;
await post({ action: 'join', code: rcode, clientId: B, name: 'Sam', seat: 'against' });
await post({ action: 'start', code: rcode, clientId: A });
const both = await Promise.all([
  post({ action: 'turn', code: rcode, clientId: A, text: 'First simultaneous speech.' }),
  post({ action: 'turn', code: rcode, clientId: A, text: 'Second simultaneous speech.' }),
]);
const accepted = both.filter((r) => r.status === 200 && !r.error).length;
const finalRace = await get(rcode, A);
ok(finalRace.view.transcript.length === 1, `simultaneous submits record one turn (accepted=${accepted}, recorded=${finalRace.view.transcript.length})`);


console.log('\n=== H. An expired clock settles itself (the wedged-room bug) ===');
{
  const w = await post({ action: 'create', clientId: A, name: 'Nadia', perSecs: 30, motion: 'm', role: 'for' });
  const wcode = w.view.code;
  await post({ action: 'join', code: wcode, clientId: B, name: 'Theo', seat: 'against' });
  await post({ action: 'start', code: wcode, clientId: A });
  await post({ action: 'turn', code: wcode, clientId: A, text: 'Opening speech.' });

  // Theo now holds the floor. Burn his whole clock without him submitting
  // anything -- the case where his tab is asleep, closed, or he simply sat there.
  const store = globalThis.__debateGameMemoryStore;
  const key = `poo:room:${wcode}`;
  const room = JSON.parse(store.map.get(key));
  room.clock.prepUntil = null;
  room.clock.turnStartedAt = Date.now() - 31000;
  store.map.set(key, JSON.stringify(room));

  // The OPPONENT polls. Nobody sent an action on Theo's behalf.
  const poll = await get(wcode, A);
  ok(poll.view.clock.active === 'for', 'a read by the opponent moves the floor off the dead clock');
  ok(poll.view.clock.remaining.against === 0, "the flagged speaker's clock is spent");
  ok(poll.view.clock.remaining.for > 0, 'the opponent keeps the time they had');
  ok(poll.view.transcript.length === 1, 'no empty speech is added to the record');
  ok(poll.view.phase === 'debate', 'the debate continues');

  // And the opponent can now actually speak, which was the wedge.
  const spoke = await post({ action: 'speak', code: wcode, clientId: A });
  ok(spoke.status === 200, 'the opponent can take the floor');
  const submitted = await post({ action: 'turn', code: wcode, clientId: A, text: 'Second speech.' });
  ok(submitted.status === 200 && !submitted.error, 'their submit is accepted instead of "It isn\'t your turn"');
  ok(submitted.view.transcript.length === 2, 'the speech reaches the record');
}

console.log('\n=== I. Both clocks dead ends the debate ===');
{
  const d = await post({ action: 'create', clientId: A, name: 'Nadia', perSecs: 30, motion: 'm', role: 'for' });
  const dcode = d.view.code;
  await post({ action: 'join', code: dcode, clientId: B, name: 'Theo', seat: 'against' });
  await post({ action: 'start', code: dcode, clientId: A });
  await post({ action: 'turn', code: dcode, clientId: A, text: 'Opening.' });

  const store = globalThis.__debateGameMemoryStore;
  const key = `poo:room:${dcode}`;
  const room = JSON.parse(store.map.get(key));
  room.clock.prepUntil = null;
  room.clock.turnStartedAt = Date.now() - 31000;
  room.clock.remaining.for = 0; // the opener used theirs up too
  store.map.set(key, JSON.stringify(room));

  const poll = await get(dcode, B);
  ok(poll.view.phase === 'review', 'two dead clocks end the debate rather than wedging it');
  ok(poll.view.endedReason === 'flag', 'the record says the clocks ran out');

  await post({ action: 'ready', code: dcode, clientId: A });
  const judged = await post({ action: 'ready', code: dcode, clientId: B });
  ok(judged.view.phase === 'judging', 'the match still reaches the adjudicator afterwards');
}

console.log(`\n${checks} checks, ${fails ? fails + ' FAILURES' : 'all passed'}`);
process.exit(fails ? 1 : 0);
