'use strict';
// Moments stopped where the port can take over: from each moment of a part in work/states (made by
// gen-states.js), the game run on until its program counter is at one of the part's main-loop
// checkpoints outside an interrupt, and saved again as cp-<part>-<moment>.json with that checkpoint
// as from (never committed).
//   node port/scripts/gen-cps.js <part> [filter] [max frames]
const lib = require('../test/lib.js');
const { drive } = require('../test/drive.js');
// the places each part's main loop can be resumed from: the port's checkpoints but its start-up's
// and the pause's
const { makePort } = require('../test/lockstep.js');
const P = makePort();
const NOT = new Set([0x8007, 0x8024, 0x8050, 0x8057, 0x805E]);
const CPS = { map: [0x0C42, 0x0C45, 0x0C48, 0x0C4B, 0x0C4E, 0x0C51, 0x0C54, 0x0C57, 0x0C5A, 0x0C5D, 0x0C60] };
for (const p of ['bat', 'frt', 'trn', 'end']) CPS[p] = P.CPS[p].filter(a => !NOT.has(a));
const part = process.argv[2] || 'map', filter = process.argv[3] || '', maxFrames = +(process.argv[4] || 6000);
let n = 0, saved = 0;
for (const f of lib.states(part + '-' + filter)) {
  const s = lib.readState(f);
  const NEED = { map: ['M1', 'M2', 'M3'], bat: ['BS'], frt: ['S1'], trn: ['S2'], end: ['CS'] }[part];
  if (!s.loaded || !NEED.every(x => s.loaded.includes(x))) continue;
  n++;
  const m = lib.restore(s.machine);
  const D = drive(m, { cc: s.mode === 'cc', part });
  let hit = -1;
  for (const a of CPS[part]) { const prev = m.hooks[a]; m.hooks[a] = c => { if (!m.depth && hit < 0) { hit = a; m.stopFlag = true; return true; } return prev ? prev(c) : false; }; }
  for (let i = 0; i < maxFrames && hit < 0; i++) D.step();
  for (const a of CPS[part]) delete m.hooks[a];
  if (hit < 0 || D.part !== part) continue;
  lib.save('cp-' + f.replace(/\.json$/, ''), m, { part, loaded: s.loaded, from: hit, mode: s.mode, frame: m.frames });
  saved++;
}
console.log(part + ': ' + saved + ' of ' + n + ' moments stopped at a checkpoint');
