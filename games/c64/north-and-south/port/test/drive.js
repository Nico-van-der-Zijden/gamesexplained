'use strict';
// An autopilot for the game on the kit's machine, for the tests' moments and measurements: it
// answers the title, the menu, the year's text and the tape prompts, and follows which part is
// running. With the computer on both sides (the menu's flags) the war then plays itself, the
// battles, forts and trains included.
//   const d = drive(m, { cc: true }); d.frames(5000); d.part
const lib = require('./lib.js');

// The parts' entries, as the script and the map call them
const ENTRY = { 0x8000: null, 0x1000: 'men', 0x0C00: 'map' };
function drive(m, o = {}) {
  const D = { m, part: o.part || 'tit', log: [], loads: [], frame: 0 };
  const hook = (a, f) => { const prev = m.hooks[a]; m.hooks[a] = c => { if (!m.depth) f(c); return prev ? prev(c) : false; }; };
  let lastLoad = 'TP';
  hook(0x0A63, c => { lastLoad = lib.fileAsked(c.m); D.loads.push([m.frames, lastLoad]); });
  const PART8000 = { TP: 'tit', BS: 'bat', S1: 'frt', S2: 'trn', CS: 'end' };
  for (const a of Object.keys(ENTRY)) hook(+a, () => {
    D.part = +a === 0x8000 ? PART8000[lastLoad] : ENTRY[a];
    D.log.push([m.frames, D.part]);
    if (D.onPart) D.onPart(D.part);
  });
  // back in the map after an arcade sequence ($0CB1 reloads M2)
  hook(0x0CAE, () => { D.part = 'map'; D.log.push([m.frames, 'map']); if (D.onPart) D.onPart('map'); });
  hook(0x0CB4, () => { D.part = 'map'; });
  let fire = 0, steps = 0;
  const menuTarget = [];
  // the clicks the menu gets: the Union's window for computer against computer when o.cc (the Confederacy is the computer already), the year,
  // then GO
  if (o.cc) menuTarget.push([50, 88]);
  // the calendar: o.years clicks (1861 and four, so that the kept year is set, Discoveries)
  for (let i = 0; i < (o.years || 4); i++) menuTarget.push([180, 132]);
  menuTarget.push([234, 203]);
  let menuStep = 0, menuWait = 0;
  D.step = () => {
    const pc = m.cpu.pc;
    if (fire > 0) { fire--; m.joy = 0x1F & ~0x10; if (!fire) m.joy = 0x1F; }
    else if (pc >= 0x096C && pc <= 0x0980 && !m.depth) { fire = 3; }
    else if (D.part === 'tit' && m.frames % 300 === 299) fire = 3;
    else if (D.part === 'men' && menuStep < menuTarget.length) {
      if (menuWait > 0) { menuWait--; m.joy = 0x1F; }
      else {
        const [x, y] = menuTarget[menuStep];
        const cx = m.ram[0x101E] | m.ram[0x101F] << 8, cy = m.ram[0x1020];
        let j = 0x1F;
        if (cx < x - 2) j &= ~8; else if (cx > x + 2) j &= ~4;
        if (cy < y - 2) j &= ~2; else if (cy > y + 2) j &= ~1;
        if (j === 0x1F) { fire = 3; menuStep++; menuWait = 25; }
        m.joy = j;
      }
    } else if (D.part !== 'men') { menuStep = 0; }
    if (o.input) o.input(D, m);
    m.runFrames(1);
    D.frame++;
  };
  D.frames = (n, until) => { for (let i = 0; i < n; i++) { D.step(); if (until && until(D)) return true; } return false; };
  return D;
}

module.exports = { drive };
