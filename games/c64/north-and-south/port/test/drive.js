'use strict';
// An autopilot for the game on the kit's machine, for the tests' moments and measurements: it
// answers the title, the menu, the year's text and the tape prompts. With the computer on both
// sides (the menu's Union window clicked) the war then plays itself, the battles, forts and
// trains included.
//   pilot(m, o): the input alone, set on m once a frame by update(), with o.part() naming the
//   part running (the lockstep takes it from the port);
//   drive(m, o): the machine run a frame at a time with the pilot, the part followed by hooks on
//   the machine's entries.
//   const d = drive(m, { cc: true }); d.frames(5000); d.part
const lib = require('./lib.js');

function pilot(m, o = {}) {
  const A = { m };
  let fire = 0, menuStep = 0, menuWait = 0, wasMenu = false;
  const menuTarget = [];
  // the clicks the menu gets: the Union's window for computer against computer when o.cc (the
  // Confederacy is the computer already), the calendar o.years times (1861 and four times round
  // by default, so that the kept year is set: Discoveries), then GO
  if (o.cc) menuTarget.push([50, 88]);
  for (let i = 0; i < (o.years === undefined ? 4 : o.years); i++) menuTarget.push([180, 132]);
  menuTarget.push([234, 203]);
  A.update = () => {
    const pc = m.cpu.pc, part = o.part();
    if (part === 'men' && !wasMenu) { menuStep = 0; menuWait = 60; }
    wasMenu = part === 'men';
    if (fire > 0) { fire--; m.joy = fire ? 0x1F & ~0x10 : 0x1F; return; }
    if (pc >= 0x096C && pc <= 0x0980 && !m.depth) { fire = 4; m.joy = 0x1F & ~0x10; return; }
    if (part === 'tit' && m.frames % 300 === 299) { fire = 4; m.joy = 0x1F & ~0x10; return; }
    if (part === 'men' && menuStep < menuTarget.length) {
      if (menuWait > 0) { menuWait--; m.joy = 0x1F; return; }
      const [x, y] = menuTarget[menuStep];
      const cx = m.ram[0x101E] | m.ram[0x101F] << 8, cy = m.ram[0x1020];
      let j = 0x1F;
      if (cx < x - 2) j &= ~8; else if (cx > x + 2) j &= ~4;
      if (cy < y - 2) j &= ~2; else if (cy > y + 2) j &= ~1;
      if (j === 0x1F) { fire = 4; menuStep++; menuWait = 25; j &= ~0x10; }
      m.joy = j;
      return;
    }
    if (part === 'men') { m.joy = 0x1F; return; }
    if (o.input) o.input(A, m, part); else m.joy = 0x1F;
  };
  return A;
}

// The parts' entries, as the script and the map call them; the map calls an arcade part at
// $8000 (map_colours's place in M2) and is back at $0C95, $0CA3 or $0CB1
const ENTRY = { 0x8000: null, 0x1000: 'men', 0x0C00: 'map', 0x0C95: 'map', 0x0CA3: 'map', 0x0CB1: 'map' };
function drive(m, o = {}) {
  const D = { m, part: o.part || 'tit', log: [], loads: [], frame: 0 };
  const hook = (a, f) => { const prev = m.hooks[a]; m.hooks[a] = c => { if (!m.depth) f(c); return prev ? prev(c) : false; }; };
  let lastLoad = 'TP';
  hook(0x0A63, c => { lastLoad = lib.fileAsked(c.m); D.loads.push([m.frames, lastLoad]); });
  const PART8000 = { TP: 'tit', BS: 'bat', S1: 'frt', S2: 'trn', CS: 'end' };
  const enter = p => { if (p === D.part) return; D.part = p; D.log.push([m.frames, p]); if (D.onPart) D.onPart(p); };
  for (const a of Object.keys(ENTRY)) hook(+a, () => { const p = +a === 0x8000 ? PART8000[lastLoad] : ENTRY[a]; if (p) enter(p); });
  const A = pilot(m, Object.assign({}, o, { part: () => D.part, input: o.input ? (A2, mm, part) => o.input(D, mm, part) : null }));
  D.step = () => { A.update(); m.runFrames(1); D.frame++; };
  D.frames = (n, until) => { for (let i = 0; i < n; i++) { D.step(); if (until && until(D)) return true; } return false; };
  return D;
}

module.exports = { pilot, drive };
