#!/usr/bin/env node
// Hold index.html's music player against the game's own code. The page's lm-music block
// (createDriver) runs the game's players on the kit's 6502 as sid.js hands it; this runs the same
// players on the simulator itself, making the calls each tune lists (as the game makes them: see
// work/mktunes.js), and compares every SID write of every frame, in order, for 6,000 frames of
// every tune (two minutes). It also checks that the players' code the page carries is the committed
// listings' bytes, and that tune A, the one level 1 loads, is the game part's bytes at $3652.
//   node games/c64/lemmings/test_music.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname);
const { createDriver } = g.run('index.html', 'lm-music', 'createDriver');
const mt = g.read('reference/lem-tunes.js').match(/window\.LEM_TUNES = (\{.*\});/);
if (!mt) { console.error('no LEM_TUNES in reference/lem-tunes.js'); process.exit(1); }
const D = JSON.parse(mt[1]);
let bad = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
// the bytes the page carries against the listings
const owner = { game: 'game', intro: 'intro', ending: 'ending', SA: 'game' };
for (const [name, part] of Object.entries(owner)) {
  const L = g.listing('parts/' + part + '/listing.json');
  for (const [base, hex] of D.blocks[name]) for (let i = 0; i < hex.length / 2; i++)
    if (!L.has[base + i] || L.ram[base + i] !== parseInt(hex.substr(2 * i, 2), 16)) { fail(`block ${name} at $${(base + i).toString(16)} is not part ${part}'s byte`); break; }
}
if (D.tunes.length !== 11) fail('expected 11 tunes, found', D.tunes.length);
const FRAMES = 6000;
D.tunes.forEach((T, t) => {
  const m = new Uint8Array(0x10000);
  for (const b of T.blocks) for (const [base, hex] of D.blocks[b]) for (let i = 0; i < hex.length / 2; i++) m[base + i] = parseInt(hex.substr(2 * i, 2), 16);
  let writes = [];
  const io = {
    read(a) { return 0; },
    write(a, v) { if (a >= 0xD400 && a <= 0xD418) writes.push(a - 0xD400, v); },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
  for (const [e, a, x] of T.calls) cpu.call(e, { a, x, y: 0, d: 0 });
  let first = writes;
  const drv = createDriver(D, kit);
  drv.init(t);
  let notes = 0;
  for (let f = 0; f < FRAMES; f++) {
    writes = [];
    cpu.call(T.play, { d: 0 });
    const want = first.concat(writes); first = [];
    drv.play();
    if (want.join() !== drv.writes.join()) { fail(T.name, 'frame', f, 'game', want.join().slice(0, 100), 'page', drv.writes.join().slice(0, 100)); break; }
    for (let i = 0; i < want.length; i += 2) if (want[i] < 21 && want[i] % 7 === 4 && want[i + 1] & 1) notes++;
  }
  if (notes < 100) fail(T.name, 'plays almost nothing:', notes, 'gate-on writes');
  console.log(`${T.name}: ${FRAMES} frames, ${notes} gate-on writes`);
});
if (bad) { console.log(`FAILED: ${bad} difference(s)`); process.exit(1); }
console.log('OK - the page plays every tune as the game\'s own players do');
