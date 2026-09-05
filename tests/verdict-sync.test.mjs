// Which verdict a client keeps after a poll. Getting this wrong stranded the
// opponent on a finished result while the host had already rematched.
import { nextVerdict } from '../src/services/roomSync.js';

let fails = 0, checks = 0;
const ok = (cond, msg) => {
  checks++;
  if (!cond) { fails++; console.log('  FAIL: ' + msg); }
  else console.log('  ok  : ' + msg);
};

const OLD = { winner: 'for', headline: 'Nadia wins by concession.' };
const NEW = { winner: 'against', headline: 'Theo takes it.' };

console.log('=== A rematch clears the finished verdict ===');
ok(nextVerdict('lobby', null, OLD) === null, 'back in the lobby, the old verdict is dropped');
ok(nextVerdict('debate', null, OLD) === null, 'a new debate under way drops it too');
ok(nextVerdict('review', null, OLD) === null, 'review drops it');

console.log('\n=== A verdict in flight is not blanked ===');
ok(nextVerdict('judging', null, OLD) === OLD, 'during judging the local verdict survives a null from the server');
ok(nextVerdict('scoring', null, OLD) === OLD, 'during jury scoring it survives too');
ok(nextVerdict('verdict', null, OLD) === OLD, 'on the verdict screen it survives a poll that omits it');

console.log('\n=== The server wins when it has one ===');
ok(nextVerdict('verdict', NEW, OLD) === NEW, "the server's verdict replaces a stale local one");
ok(nextVerdict('judging', NEW, null) === NEW, 'a fresh verdict arrives during judging');
ok(nextVerdict('lobby', NEW, OLD) === null, 'a lobby phase clears even if the server still echoes one');

console.log('\n=== Nothing anywhere ===');
ok(nextVerdict('verdict', null, null) === null, 'no verdict at all stays null, never undefined');
ok(nextVerdict(undefined, null, OLD) === OLD, 'an unknown phase is treated as "keep what we have"');

console.log(`\n${checks} checks, ${fails ? fails + ' FAILURES' : 'all passed'}`);
process.exit(fails ? 1 : 0);
