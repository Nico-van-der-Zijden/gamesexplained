'use strict';
// The game's cycles for each stretch of a part's main program, beside the port's calls in it: the
// lockstep's timing (kit/c64/lockstep.js) from the moments stopped at a checkpoint, a row of JSON
// for each stretch, which scripts/fit-cost.js fits the page's pacing to; and each raster
// interrupt's own cycles, by its handler's address, its nested interrupts taken out.
//   node time-stretches.js <out.jsonl> <map|bat|frt|trn|end> [moment filter] [frames] [seed]
// Each row: { st, part, from, to, wait, polls, cycles, calls }; a last row { irq: { 'part@addr':
// [cycles, ...] } } with a sample of each handler's.
const fs = require('fs');
const { fromMoment, makePort } = require('../test/lockstep.js');
const lib = require('../test/lib.js');
const [out, what, filter = '', frames = 3000, seed = 1] = process.argv.slice(2);
if (!what) { console.log('usage: node time-stretches.js out.jsonl <map|bat|frt|trn|end> [filter] [frames] [seed]'); process.exit(2); }
const fd = fs.openSync(out, 'a');
const irq = {};
for (const f of lib.states('cp-' + what + '-' + filter)) {
  let n = 0;
  const P = makePort();
  const stack = [];
  const onMachine = m => {
    m.onInterrupt = (mm, v) => stack.push({ at: mm.ram[v] | mm.ram[v + 1] << 8, c0: mm.cpu.cycles, inner: 0, part: P.part });
    m.onReturn = (mm, v, c) => {
      const e = stack.pop();
      if (!e) return;
      if (stack.length) stack[stack.length - 1].inner += c;
      const k = e.part + '@' + e.at.toString(16);
      const list = irq[k] || (irq[k] = []);
      if (list.length < 2000) list.push(c - e.inner);
    };
  };
  try {
    const r = fromMoment(what, f, { frames: +frames, seed: +seed, onMachine, timing: s => {
      n++;
      fs.writeSync(fd, JSON.stringify({ st: f, part: P.part, from: s.from, to: s.to, wait: s.wait, polls: s.polls,
        cycles: s.cycles, calls: s.calls }) + '\n');
    }, port: P });
    console.log(f, n, 'stretches', r.res.ok ? 'ok' : 'differs at pass ' + r.res.passes);
  } catch (e) { console.log(f, 'threw', e.message.slice(0, 200)); }
}
fs.writeSync(fd, JSON.stringify({ irq }) + '\n');
