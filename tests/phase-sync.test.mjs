// Which screen a client follows the room onto. Getting this wrong stranded a
// player on a finished verdict while their opponent played the rematch.
import { nextClientPhase } from '../src/services/roomSync.js';

let fails = 0, checks = 0;
const ok = (cond, msg) => {
  checks++;
  if (!cond) { fails++; console.log('  FAIL: ' + msg); }
  else console.log('  ok  : ' + msg);
};

const REMOTE = ['lobby', 'debate', 'review', 'judging', 'scoring', 'verdict'];
const LOCAL = ['room_lobby', 'transition', 'debate', 'deliberating', 'scoring', 'verdict'];

console.log('=== The rematch strand ===');
// The host rematches and starts again inside one poll interval, so this
// client never sees `lobby` -- it goes straight from verdict to debate.
ok(nextClientPhase('debate', 'verdict') === 'debate', 'a client left on the verdict joins the new debate');
ok(nextClientPhase('debate', 'deliberating') === 'debate', 'a client stuck on the loading screen joins it too');
ok(nextClientPhase('debate', 'scoring') === 'debate', 'so does a juror left on the scoring screen');
ok(nextClientPhase('review', 'verdict') === 'deliberating', 'a stale verdict no longer blocks deliberation');
ok(nextClientPhase('judging', 'verdict') === 'deliberating', 'nor does it block judging');

console.log('\n=== The ordinary way in ===');
ok(nextClientPhase('debate', 'room_lobby') === 'transition', 'from the room lobby you get the versus screen');
ok(nextClientPhase('debate', 'lobby') === 'transition', 'and from the front lobby too');
ok(nextClientPhase('debate', 'transition') === null, 'the versus screen is not interrupted');
ok(nextClientPhase('debate', 'debate') === null, 'a debate in progress stays put');

console.log('\n=== Each phase lands somewhere sensible ===');
ok(nextClientPhase('lobby', 'verdict') === 'room_lobby', 'a reset room pulls everyone back to the room lobby');
ok(nextClientPhase('lobby', 'room_lobby') === null, 'already in the room lobby, stay');
ok(nextClientPhase('review', 'debate') === 'deliberating', 'the end of a debate opens the loading screen');
ok(nextClientPhase('judging', 'deliberating') === null, 'review and judging share one screen, so no flicker between them');
ok(nextClientPhase('scoring', 'debate') === 'scoring', 'a jury room opens scoring for the panel');
ok(nextClientPhase('verdict', 'deliberating') === 'verdict', 'the result replaces the loading screen');
ok(nextClientPhase('verdict', 'verdict') === null, 'the result screen is not re-entered on every poll');

console.log('\n=== No pair strands a client ===');
for (const r of REMOTE) {
  for (const l of LOCAL) {
    const target = nextClientPhase(r, l);
    // Either it moves you, or you are already somewhere valid for that phase.
    const settled = {
      lobby: ['room_lobby'],
      debate: ['debate', 'transition'],
      review: ['deliberating'],
      judging: ['deliberating'],
      scoring: ['scoring'],
      verdict: ['verdict'],
    }[r];
    const landsWell = target ? settled.includes(target) || target === 'transition' : settled.includes(l);
    if (!landsWell) {
      ok(false, `remote=${r} local=${l} -> ${target} leaves the client adrift`);
    }
  }
}
ok(true, `every remote/local pair (${REMOTE.length}x${LOCAL.length}) resolves to a valid screen`);

console.log('\n=== Nonsense is not a reason to move ===');
ok(nextClientPhase(undefined, 'debate') === null, 'an unknown phase leaves the client alone');
ok(nextClientPhase('bogus', 'verdict') === null, 'so does one the client does not recognise');

console.log(`\n${checks} checks, ${fails ? fails + ' FAILURES' : 'all passed'}`);
process.exit(fails ? 1 : 0);
