#!/usr/bin/env node
// Hold the page's keyboard (index.html's ib-keys block) against the game's own key tests. For each
// test the page lists (IB_TESTS in play, IB_TITLE_TESTS on the title screen), the game's four
// instructions at its address (LDA #value, STA $DC00, LDA $DC01, AND #column) run on the kit's 6502
// over the listing's bytes once for each of the 64 keys held down alone, with $DC01 answering as
// the keyboard does: a column's bit is 0 when the held key is on a row driven low and in that
// column. The test answers for a key when the AND gives 0. The page's ibJobs must give the job for
// exactly the keys the game's code answers for. Every LDA #/STA $DC00/LDA $DC01/AND # in the game's
// code at $426B-$707E must be one the page lists, or one of the other fire tests the page's fire
// covers ($5B4F, $5B98, $5BBA: waits on the message screens) or the second pause test ($662C).
//   node games/c64/i-ball/test_keys.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] || 'index.html';
const { IB_TESTS, IB_TITLE_TESTS, ibJobs } = g.run(page, 'ib-keys', 'IB_TESTS', 'IB_TITLE_TESTS', 'ibJobs');
const L = g.listing();
let bad = 0, runs = 0;
const fail = (...w) => { if (bad++ < 20) console.log('DIFFERS', ...w); };
const listed = new Set();
for (const [set, tests] of [['play', IB_TESTS], ['title', IB_TITLE_TESTS]]) for (const t of tests) {
  const at = parseInt(t.where.split('$')[1], 16);
  listed.add(at);
  const r = L.ram;
  if (r[at] !== 0xA9 || r[at + 2] !== 0x8D || r[at + 3] !== 0x00 || r[at + 4] !== 0xDC || r[at + 5] !== 0xAD || r[at + 6] !== 0x01 || r[at + 7] !== 0xDC || r[at + 8] !== 0x29) {
    fail(set, t.job, t.where, 'is not a key test'); continue;
  }
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    const m = L.ram.slice();
    let driven = 0xFF;
    const io = {
      read(a) { if (a === 0xDC01) return (row >= 0 && !(driven >> row & 1)) ? 0xFF & ~(1 << col) : 0xFF; throw new Error('read $' + a.toString(16)); },
      write(a, v) { if (a === 0xDC00) { driven = v; return; } throw new Error('write $' + a.toString(16)); },
    };
    const cpu = new CPU(m, { port: 0x35, io });
    cpu.pc = at; cpu.run({ until: at + 10, maxSteps: 10 });
    runs++;
    const game = cpu.a === 0, pageSays = ibJobs(tests, row, col).includes(t.job);
    if (game !== pageSays) fail(set, t.job, t.where, `key row ${row} column ${col}`, 'game', game, 'page', pageSays);
  }
}
const others = new Set([0x5B4F, 0x5B98, 0x5BBA, 0x662C]);
for (let a = 0x426B; a < 0x707E; a++) {
  const r = L.ram;
  if (r[a] === 0xA9 && r[a + 2] === 0x8D && r[a + 3] === 0 && r[a + 4] === 0xDC && r[a + 5] === 0xAD && r[a + 6] === 1 && r[a + 7] === 0xDC && r[a + 8] === 0x29 && !listed.has(a)) {
    if (!others.has(a)) fail('a key test at $' + a.toString(16).toUpperCase() + ' that the page leaves out');
    else {
      // the extra tests must test the same keys as a listed one: fire ($01, column 1) or pause ($04, column 7)
      const same = [...IB_TESTS].some((t) => t.dc00 === r[a + 1] && 1 << t.col === r[a + 9]);
      if (!same) fail('the key test at $' + a.toString(16).toUpperCase() + ' tests keys no listed test does');
    }
  }
}
console.log(`${IB_TESTS.length + IB_TITLE_TESTS.length} tests, ${runs} key presses: ` + (bad ? bad + ' differences' : 'every key does what the game\'s code does'));
process.exit(bad ? 1 : 0);
