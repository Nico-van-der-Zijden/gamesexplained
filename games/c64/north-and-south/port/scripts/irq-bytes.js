'use strict';
// The bytes each part's interrupts write and its main program reads (kit/c64/lockstep.js,
// irqBytes): the game on the kit's machine from the title's hand-over, played by the autopilot
// (port/test/drive.js, the computer on both sides), with the processor's read and write trackers
// switched between the interrupts' and the main program's as each interrupt is taken and returns.
//   node port/scripts/irq-bytes.js [frames] [years]
const path = require('path');
const lib = require('../test/lib.js');
const { drive } = require('../test/drive.js');
const frames = +(process.argv[2] || 60000), years = +(process.argv[3] || 3);
const m = lib.machine('entry.vsf', { part: 'title' });
const D = drive(m, { cc: true, years });
const per = {};
const sets = p => per[p] || (per[p] = { irqW: new Uint8Array(65536), mainR: new Uint8Array(65536), irqR: new Uint8Array(65536), mainW: new Uint8Array(65536), frames: 0 });
let cur = sets(D.part);
const c = m.cpu, orig = c.run.bind(c);
c.run = opts => orig(Object.assign({}, opts, m.depth ? { writes: cur.irqW, reads: cur.irqR } : { writes: cur.mainW, reads: cur.mainR }));
D.onPart = p => { cur = sets(p); };
const t0 = Date.now();
for (let f = 0; f < frames; f++) { D.step(); cur.frames++; }
console.log('players', m.ram[0x382], m.ram[0x383], 'year', m.ram[0x389], 'arcade', m.ram[0x387]);
console.log('frames', frames, 'in', Date.now() - t0, 'ms; parts', D.log.length, 'entries; last', D.log.slice(-12).map(x => x.join(':')).join(' '));
const ram = a => a >= 2 && (a < 0x100 || a >= 0x200) && (a < 0xD000 || a >= 0xE000);
for (const [p, s] of Object.entries(per)) {
  const both = [];
  for (let a = 0; a < 65536; a++) if (ram(a) && s.irqW[a] && s.mainR[a]) both.push(a);
  console.log(p, s.frames + ' frames:', both.map(lib.hex).join(' '));
}
