'use strict';
// The page's machine (page/runtime.js) in node, from the title's call, on the data the page
// carries (scripts/pack-data.js), played by the autopilot the moments were made with: the title,
// the menu (the computer on both sides, or the Union a person), the year's text and the war. It
// stops on the first frame that throws, and prints where the script was every so often: the part,
// the month and the year. With --whole the same on the tapes' files and the machine with nothing
// blanked, and the two runs' memory compared outside the blanked code at every frame: a byte the
// page reads that pack-data.js blanks shows as the first difference.
//   node port/test/t-page.js [frames] [cc|human] [--whole]
const path = require('path');
const lib = require('./lib.js');
const { game } = require(path.join(lib.REPO, 'kit/scripts/port_check.js'));
const g = game(lib.GAME);
globalThis.window = globalThis;
g.lib('c64'); g.lib('sid'); g.lib('cpu6502');
const SRC = path.join(lib.GAME, 'port/src');
require(path.join(SRC, 'syms.js'));
require(path.join(SRC, 'core.js'));
for (const f of require('fs').readdirSync(SRC).sort()) if (/^g-.*\.js$/.test(f)) require(path.join(SRC, f));
require(path.join(lib.GAME, 'port/page/runtime.js'));
const { pack } = require('../scripts/pack-data.js');
const fs = require('fs');
const args = process.argv.slice(2);
const whole = args.includes('--whole');
const [frames = 6000, mode = 'cc'] = args.filter(a => !a.startsWith('--'));
const cost = fs.existsSync(path.join(lib.GAME, 'port/cost.json')) ? JSON.parse(fs.readFileSync(path.join(lib.GAME, 'port/cost.json'), 'utf8')) : null;
const b64 = u => Buffer.from(u).toString('base64');
function data(full) {
  const p = pack(), o = { machine: p.machine, files: {} };
  if (full) {
    o.machine = lib.machine('entry.vsf', { part: 'title' }).save();
    for (const [k, v] of Object.entries(lib.files())) o.files[k] = { addr: v.addr, bytes: b64(v.bytes) };
  } else for (const [k, v] of Object.entries(p.files)) o.files[k] = { addr: v.addr, bytes: b64(v.bytes) };
  return o;
}
// the autopilot: fire at the title, the menu's clicks (drive.js's), fire at each prompt
function pilot(rt, cc) {
  const clicks = (cc ? [[50, 88]] : []).concat([[180, 132], [180, 132], [180, 132], [180, 132], [234, 203]]);
  let step = 0, wait = 60, fire = 0, inMenu = false, f = 0;
  return () => {
    f++;
    const M = rt.M, part = rt.part;
    if (part === 'men' && !inMenu) { step = 0; wait = 60; }
    inMenu = part === 'men';
    if (fire > 0) { fire--; rt.input.joy = fire ? 0x1F & ~0x10 : 0x1F; return; }
    if (part === 'tit' && f % 300 === 299) { fire = 4; rt.input.joy = 0x0F; return; }
    if (rt.P.waitingFire) { fire = 4; rt.input.joy = 0x0F; return; }
    if (part === 'men' && step < clicks.length) {
      if (wait > 0) { wait--; rt.input.joy = 0x1F; return; }
      const [x, y] = clicks[step], cx = M[0x101E] | M[0x101F] << 8, cy = M[0x1020];
      let j = 0x1F;
      if (cx < x - 2) j &= ~8; else if (cx > x + 2) j &= ~4;
      if (cy < y - 2) j &= ~2; else if (cy > y + 2) j &= ~1;
      if (j === 0x1F) { fire = 4; step++; wait = 25; j &= ~0x10; }
      rt.input.joy = j;
      return;
    }
    rt.input.joy = 0x1F;
  };
}
function machine(full) {
  const rt = NSPage.create({ data: data(full), cost });
  // the prompts wait for fire (res_wait_fire): the pilot presses it
  const w = rt.P.res_wait_fire;
  rt.P.res_wait_fire = function* (...a) { rt.P.waitingFire = true; try { return yield* w.apply(this, a); } finally { rt.P.waitingFire = false; } };
  return rt;
}
const A = machine(false), B = whole ? machine(true) : null;
const pa = pilot(A, mode === 'cc'), pb = B ? pilot(B, mode === 'cc') : null;
const blanked = new Uint8Array(65536);
if (B) {
  const p = pack();
  for (const [k, f] of Object.entries(p.files)) { const w = lib.files()[k]; for (let i = 0; i < f.bytes.length; i++) if (f.bytes[i] !== w.bytes[i]) blanked[f.addr + i] = 1; }
  const r0 = Buffer.from(p.machine.ram, 'base64'), r1 = Buffer.from(lib.machine('entry.vsf', { part: 'title' }).save().ram, 'base64');
  for (let a = 0; a < 65536; a++) if (r0[a] !== r1[a]) blanked[a] = 1;
}
let last = null;
for (let f = 0; f < +frames; f++) {
  // each frame drawn, as the page does: the video memory then watches only what the picture reads
  pa(); try { const F = A.runFrame(); if (F) C64.renderFrame(F); } catch (e) { console.log('frame ' + f + ' (' + A.part + '): ' + (e.stack || e.message).split('\n').slice(0, 6).join('\n  ')); process.exitCode = 1; break; }
  if (B) {
    pb(); { const F = B.runFrame(); if (F) C64.renderFrame(F); }
    for (let a = 0; a < 65536; a++) if (!blanked[a] && A.M[a] !== B.M[a] && a > 1) {
      console.log('frame ' + f + ' (' + A.part + '): $' + a.toString(16) + ' page ' + A.M[a] + ', whole ' + B.M[a]);
      process.exitCode = 1; f = 1e9; break;
    }
  }
  const where = A.part + ' ' + A.M[0x0399] + A.M[0x039A] + ' months';
  if (where !== last || f % 1000 === 0) { console.log('frame ' + f + ': ' + where + ', clock frame ' + Math.floor(A.t / NSPage.FRAME)); last = where; }
}
process.exit(process.exitCode || 0);
