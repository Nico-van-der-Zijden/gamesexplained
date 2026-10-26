#!/usr/bin/env node
// Hold the page's speech player (index.html's ib-speech block) against the samples' bytes. ibSample
// runs the game's say ($C1F3) and sample_nmi ($C199) on the kit's 6502; this test decodes the
// same samples straight from the listing instead, as sample_nmi's code reads them: from the first
// page say takes from $C1EB to the page before the end page it takes from $C1EF, each byte giving
// its low four bits on one interrupt and its high four on the next. The volumes the page plays
// must be that sequence, for every sample at three pitches, one interrupt every pitch + 1 cycles.
// It also checks that say puts sample_nmi in the NMI vector, and that the game's calls of say
// load the sample numbers the page gives them: 0 on the title screen ($6E7E), 1 for a death
// ($505D) and 2 at the end of a game ($5F41).
//   node games/c64/i-ball/test_speech.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] || 'index.html';
const { ibSample, IB_SAMPLES } = g.run(page, 'ib-speech', 'ibSample', 'IB_SAMPLES');
const L = g.listing(), r = L.ram;
let bad = 0, total = 0;
const fail = (...w) => { if (bad++ < 20) console.log('DIFFERS', ...w); };
const WHERE = { 0: [0x6E7E, 'the title screen'], 1: [0x505D, 'a death'], 2: [0x5F41, 'the end of a game'] };
for (const s of IB_SAMPLES) {
  const [at, where] = WHERE[s.n];
  if (r[at] !== 0x20 || r[at + 1] !== 0xF3 || r[at + 2] !== 0xC1 || r[at - 2] !== 0xA9 || r[at - 1] !== s.n) fail(`no LDA #${s.n} / JSR say at $${at.toString(16)}`);
  if (s.where !== where) fail(s.name, 'page says', s.where, 'game plays it on', where);
  const from = r[0xC1EB + s.n] << 8, to = r[0xC1EF + s.n] << 8, want = [];
  for (let a = from; a < to; a++) want.push(r[a] & 15, r[a] >> 4);
  for (const pitch of [0x5A, 0x8C, 0xFA]) {
    const got = ibSample(r, kit, s.n, pitch);
    total += got.vols.length;
    if (got.period !== pitch + 1) fail(s.name, 'pitch', pitch, 'period', got.period);
    if (got.vols.length !== want.length) fail(s.name, 'pitch', pitch, 'length', got.vols.length, 'bytes give', want.length);
    for (let i = 0; i < want.length; i++) if (got.vols[i] !== want[i]) { fail(s.name, 'pitch', pitch, 'volume ' + i, got.vols[i], 'bytes give', want[i]); break; }
  }
}
// say sets the NMI vector (RAM at $FFFA with the ROMs out) to sample_nmi
const m = r.slice(), cpu = new kit.CPU(m, { port: 0x35, io: { read: () => 0x81, write() {} } });
cpu.call(0xC1F3, { a: 0, x: 0, y: 0 }, { maxSteps: 100000 });
if ((m[0xFFFA] | m[0xFFFB] << 8) !== 0xC199) fail('say leaves the NMI vector at $' + (m[0xFFFA] | m[0xFFFB] << 8).toString(16));
console.log(`${IB_SAMPLES.length} samples at 3 pitches, ${total.toLocaleString('en')} volumes: ` + (bad ? bad + ' differences' : 'every volume matches the samples\' bytes'));
process.exit(bad ? 1 : 0);
