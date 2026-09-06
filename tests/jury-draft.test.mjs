// The Crowd Jury's live view of the speech being written. It used to travel
// over a BroadcastChannel, so a panel on their own devices saw nothing.
import { freshRoom, applyAction, view, DRAFT_STALE_MS } from '../lib/room-logic.js';

const A = 'clientA', B = 'clientB', J = 'juror1';
let fails = 0, checks = 0;
const ok = (cond, msg) => {
  checks++;
  if (!cond) { fails++; console.log('  FAIL: ' + msg); }
  else console.log('  ok  : ' + msg);
};
const act = (room, action, cid, body = {}) => applyAction(room, action, cid, body);

const juryRoom = () => {
  const room = freshRoom('JURY', 'This House would ban cars', 300, true);
  act(room, 'join', A, { name: 'Ada', seat: 'for' });
  act(room, 'join', B, { name: 'Ben', seat: 'against' });
  act(room, 'join', J, { name: 'Jo', role: 'spectator' });
  act(room, 'start', A);
  return room;
};

console.log('=== The panel sees the speech being written ===');
{
  const room = juryRoom();
  ok(room.clock.active === 'for', 'the proposition opens');
  act(room, 'draft', A, { text: 'Cars kill thousands every year.' });
  const jv = view(room, J);
  ok(jv.draft !== null, 'a juror is given the live draft');
  ok(jv.draft.text === 'Cars kill thousands every year.', 'and it is the actual text');
  ok(jv.draft.wordCount === 5, 'with a word count');
  ok(jv.draft.side === 'for', 'attributed to the speaker holding the floor');
}

console.log('\n=== It is the panel\'s alone ===');
{
  const room = juryRoom();
  act(room, 'draft', A, { text: 'My secret argument.' });
  ok(view(room, B).draft === null, 'the opposing speaker is never shown it');
  ok(view(room, A).draft === null, 'nor is the speaker themselves handed it back');
  ok(view(room, J).draft !== null, 'only the juror sees it');
}

console.log('\n=== Only the speaker with the floor may write ===');
{
  const room = juryRoom(); // 'for' holds the floor
  const r = act(room, 'draft', B, { text: 'Not my turn.' });
  ok(r.mutated === false, 'the waiting speaker cannot stream a draft');
  ok(view(room, J).draft === null, 'so the panel is shown nothing');
}

console.log('\n=== It stops when the speech is delivered ===');
{
  const room = juryRoom();
  act(room, 'draft', A, { text: 'Half an argument' });
  ok(view(room, J).draft !== null, 'streaming while writing');
  act(room, 'turn', A, { text: 'Half an argument, finished.' });
  ok(view(room, J).draft === null, 'cleared once the turn is entered into the record');
  ok(room.transcript.length === 1, 'and the speech is in the record');
}

console.log('\n=== A speaker who vanishes leaves nothing behind ===');
{
  const room = juryRoom();
  act(room, 'draft', A, { text: 'Trailing off...' });
  room.draft.at -= DRAFT_STALE_MS + 1000; // as if they closed the tab
  ok(view(room, J).draft === null, 'a stale draft is not left on the jury screen');
}

console.log('\n=== Not a thing outside a jury room ===');
{
  const room = freshRoom('PLAIN', 'This House would ban cars', 300, false);
  act(room, 'join', A, { name: 'Ada', seat: 'for' });
  act(room, 'join', B, { name: 'Ben', seat: 'against' });
  act(room, 'start', A);
  const r = act(room, 'draft', A, { text: 'No jury here.' });
  ok(r.mutated === false, 'an AI-judged room does not store drafts at all');
}

console.log('\n=== A new match starts clean ===');
{
  const room = juryRoom();
  act(room, 'draft', A, { text: 'Something' });
  act(room, 'requestEnd', A);
  act(room, 'respondEnd', B, { accept: true });
  ok(room.draft === null, 'ending the debate clears the draft');
}

console.log(`\n${checks} checks, ${fails ? fails + ' FAILURES' : 'all passed'}`);
process.exit(fails ? 1 : 0);
