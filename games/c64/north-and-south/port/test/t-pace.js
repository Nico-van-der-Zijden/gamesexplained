'use strict';
// The page's pace against the game's: from each moment of a part stopped at a checkpoint (the
// computer playing both sides), the game on the kit's machine and the page's machine (page/runtime.js,
// with port/cost.json) each run for the same frames by the same autopilot, and the steps of the part's
// main loop each made counted (a part whose heavy passes are set off by a byte the interrupt writes,
// the battle's redraws, parts from the game once a few cycles move one by a pass, so the median says
// more than the mean): on the machine as its program counter reaches each step's call outside
// an interrupt, on the page as the page's clock runs past the port's checkpoint there.
//   node port/test/t-pace.js <map|bat|frt|trn|end> [frames] [moment filter]
const fs = require('fs'), path = require('path');
const lib = require('./lib.js');
const { drive } = require('./drive.js');
const { game } = require(path.join(lib.REPO, 'kit/scripts/port_check.js'));
const g = game(lib.GAME);
globalThis.window = globalThis;
g.lib('c64'); g.lib('sid'); g.lib('cpu6502');
const SRC = path.join(lib.GAME, 'port/src');
require(path.join(SRC, 'syms.js')); require(path.join(SRC, 'core.js'));
for (const f of fs.readdirSync(SRC).sort()) if (/^g-.*\.js$/.test(f)) require(path.join(SRC, f));
require(path.join(lib.GAME, 'port/page/runtime.js'));
const { pack } = require('../scripts/pack-data.js');
const part = process.argv[2] || 'map', FRAMES = +(process.argv[3] || 2500), FILTER = process.argv[4] || '';
const MAIN = { map: P => P.map_map_main, bat: P => P.bat_battle_main, frt: P => P.frt_fort_main, trn: P => P.trn_train_main, end: P => P.end_ending_main };
const cost = JSON.parse(fs.readFileSync(path.join(lib.GAME, 'port/cost.json'), 'utf8'));
const p = pack(), data = { machine: p.machine, files: {} };
for (const [k, v] of Object.entries(p.files)) data.files[k] = { addr: v.addr, bytes: Buffer.from(v.bytes).toString('base64') };
// the steps: the part's checkpoints but its start-up's and the pause's
const P0 = NSPort.makePort(new Uint8Array(65536), {});
const NOT = new Set([0x8007, 0x8024, 0x8050, 0x8057, 0x805E]);
// (the map's: the calls of its main loop, not the battle panel's raster waits)
const STEPS = new Set(part === 'map' ? P0.STEP_PASSES.map : P0.CPS[part].filter(a => !NOT.has(a)));
function gameSteps(s) {
  const m = lib.restore(s.machine);
  const D = drive(m, { cc: true, part });
  let n = 0;
  for (const a of STEPS) { const prev = m.hooks[a]; m.hooks[a] = c => { if (!m.depth && D.part === part) n++; return prev ? prev(c) : false; }; }
  for (let fr = 0; fr < FRAMES; fr++) D.step();
  return n;
}
function pageSteps(s) {
  const rt = NSPage.create({ data, cost });
  let steps = 0, due = 0;
  rt.restore(s.machine, P => (function* () {
    P.enter(part);
    const it = MAIN[part](P).call(P, part === 'map' ? { from: s.from } : { resume: s.from });
    let v;
    for (;;) { const r = it.next(v); if (r.done) return; if (r.value && STEPS.has(r.value.cp) && P.part === part) due++; v = yield r.value; }
  })());
  let waiting = false, fire = 0;
  const w = rt.P.res_wait_fire;
  rt.P.res_wait_fire = function* (...a) { waiting = true; try { return yield* w.apply(this, a); } finally { waiting = false; } };
  for (let fr = 0; fr < FRAMES; fr++) {
    if (fire > 0) { fire--; rt.input.joy = fire ? 0x0F : 0x1F; } else if (waiting) { fire = 4; rt.input.joy = 0x0F; } else rt.input.joy = 0x1F;
    // a step counted once the clock has run past it: the yields made in the frame just run
    const F = rt.runFrame(); if (F && fr % 50 === 0) C64.renderFrame(F);
    steps += due; due = 0;
  }
  return steps;
}
let sum = 0, n = 0;
const errs = [];
const rows = [];
for (const f of lib.states('cp-' + part + '-').filter(n => (/-cc|-tr/).test(n) && n.includes(FILTER))) {
  const s = lib.readState(f);
  let ps;
  try { ps = pageSteps(s); } catch (e) { rows.push(f + ': the page threw ' + e.message); continue; }
  const gs = gameSteps(s), err = (ps - gs) / Math.max(1, gs);
  if (gs >= 10) { sum += Math.abs(err); n++; errs.push(err); }
  rows.push(f + ': page ' + ps + ' steps, game ' + gs + ' (' + (err * 100).toFixed(1) + ' %)');
  console.log(rows[rows.length - 1]);
}
errs.sort((a, b) => a - b);
const med = n ? errs[Math.floor((n - 1) / 2)] : 0;
console.log(n + ' moments with 10 steps or more: the page\'s steps off the game\'s by ' + (n ? (sum / n * 100).toFixed(1) : '-') + ' % on average, ' + (med * 100).toFixed(1) + ' % at the median');
process.exit(0);
