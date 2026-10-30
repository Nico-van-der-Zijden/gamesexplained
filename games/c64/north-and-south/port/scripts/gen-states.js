'use strict';
// The moments the port's tests start from, in work/states (never committed): the game on the
// kit's machine from the title's hand-over, played by the autopilot (port/test/drive.js), saved
// every so often in each part with the files whose bytes are still where they loaded.
//   node port/scripts/gen-states.js <name> <frames> [cc|human] [years] [every] [seed]
// cc: the computer on both sides; human: the Union a person, the stick moved at random.
// NS_TRAIN=1 loads the train (file 6) wherever the map asks for the fort (file 5), for the train's
// moments, which a war seldom reaches; NS_ONLY=<part> saves that part's moments alone.
const lib = require('../test/lib.js');
const { drive } = require('../test/drive.js');
const [name, frames, mode, years, every, seed] = [process.argv[2] || 'g1', +(process.argv[3] || 40000), process.argv[4] || 'cc',
  +(process.argv[5] || 0), +(process.argv[6] || 400), +(process.argv[7] || 1)];
let s = seed >>> 0 || 1;
const rnd = n => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return Math.floor(s / 4294967296 * n); };
const m = lib.machine('entry.vsf', { part: 'title' });
const F = lib.files();
const owner = new Array(65536).fill(null);
const put = n => { const f = F[n]; for (let i = 0; i < f.bytes.length; i++) owner[(f.addr + i) & 0xFFFF] = n; };
put('TP');
let held = 0x1F, holdFor = 0;
const D = drive(m, { cc: mode === 'cc', years, input: (D, mm) => {
  if (mode !== 'human' || D.part === 'men' || D.part === 'tit') return;
  const pc = mm.cpu.pc;
  if (pc >= 0x096C && pc <= 0x0980) return;
  if (holdFor-- <= 0) {
    const DIRS = [0, 1, 2, 4, 8, 5, 9, 6, 10];
    held = 0x1F & ~DIRS[rnd(DIRS.length)] & ~(rnd(4) === 0 ? 0x10 : 0);
    holdFor = 2 + rnd(20);
  }
  mm.joy = held;
} });
const lh = m.hooks[0x0A63];
m.hooks[0x0A63] = c => { if (process.env.NS_TRAIN && c.m[0x08CB] === 5) c.m[0x08CB] = 6; const r = lh(c); put(lib.fileAsked(c.m)); return r; };
const loaded = () => {
  const names = new Set(), whole = [];
  for (let a = 0; a < 65536; a++) if (owner[a]) names.add(owner[a]);
  for (const n of names) { const f = F[n]; let ok = true; for (let i = 0; i < f.bytes.length && ok; i++) ok = owner[(f.addr + i) & 0xFFFF] === n; if (ok) whole.push(n); }
  return whole;
};
const counts = {};
let saved = 0;
for (let f = 0; f < frames; f++) {
  D.step();
  // the short parts (the title, the menu, the ending) every 25 frames
  const short = D.part === 'tit' || D.part === 'men' || D.part === 'end';
  if (f % (short ? 25 : every) === (short ? 24 : every - 1) && !m.depth && (!process.env.NS_ONLY || D.part === process.env.NS_ONLY)) {
    const p = D.part, k = counts[p] = (counts[p] || 0) + 1;
    lib.save(`${p}-${name}-${String(k).padStart(3, '0')}`, m, { part: p, loaded: loaded(), frame: m.frames, mode });
    saved++;
  }
}
console.log(name + ': ' + saved + ' moments', JSON.stringify(counts), 'parts entered', D.log.map(x => x[1]).join(' '));
