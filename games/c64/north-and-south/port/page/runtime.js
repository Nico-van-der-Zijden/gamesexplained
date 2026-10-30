// The Play page's machine: the port (src/) run as the C64 would run the game, on chips of its own.
// It runs in the browser and in node (test/t-page.js, ../test_play.js), and refers to nothing but
// NSPort, the port's groups, site/lib/c64.js (the frames), site/lib/sid.js (the SID's bus) and
// site/lib/cpu6502.js (the sound drivers' 6502).
//
//   const rt = NSPage.create({ data, cost })
//     data     { machine, files }: the machine as the script leaves it when it calls the title
//              (kit/c64/machine.js's save(): memory, colour RAM, the chips and the clock) and the
//              tapes' fourteen files by their two-letter names ({ addr, bytes }, base64), every
//              instruction of the game left out but the sound drivers' (scripts/pack-data.js)
//     cost     what the main programs' stretches and the interrupts cost on the game
//              (scripts/fit-cost.js, cost.json): { seg: { 'part:from>to': cycles }, call: { routine:
//              cycles }, irq: { 'part@handler': cycles } }
//   rt.runFrame()      one frame of time: the program runs until the clock reaches the frame's end;
//                      returns the frame that ends there, for C64.renderFrame
//   rt.shown           that frame's number
//   rt.input           { keys: Set of key names (kit/c64/machine.js's), joy: port 2, joy1: port 1,
//                      active low }
//   rt.onSid(f)        f(register, value, cycle) for every write to the SID
//   rt.part            the part the script is in: tit, men, map, bat, frt, trn, end, or res (the
//                      script itself: a load, the year's text, the prompt to turn the tape)
//   rt.restore(state, entry)   a machine saved by the tests (kit/c64/machine.js's save()), and the
//                      program started at entry(P), a generator (test/t-page.js)
//
// The clock. A PAL machine: 312 lines of 63 cycles. Each stretch of the program moves the clock on
// by its cost, and the raster interrupts that fall due on the way run on their lines, their own
// time added; a turn of a polling loop moves it to the next line, a raster wait to its line. In
// the map, the battle, the fort, the train and the ending a stretch costs what it cost the game:
// the stretch's own cycles (seg, by the checkpoints it runs between) and each routine the port
// called in it at its own (call), fitted on the game's passes from moments of play; the title, the
// menu and the script count their own cycles with each yield (P.spend), and the sound drivers'
// 6502 counts its own. Each interrupt takes the median of the game's handler's cycles (irq).
//
// The tapes. A load takes the file at once (src/g-res.js, fast_load), as a tape loader that never
// fails would, and no tape is played: the prompts to turn the tape over still wait for fire.
(function (root) {
'use strict';
const LINE = 63, LINES = 312, FRAME = LINE * LINES;
// the keys by the KERNAL's numbers (row x 8 + column), as kit/c64/machine.js names them
const KEY = {
  DEL: 0x00, RETURN: 0x01, RIGHT: 0x02, F7: 0x03, F1: 0x04, F3: 0x05, F5: 0x06, DOWN: 0x07,
  '3': 0x08, W: 0x09, A: 0x0A, '4': 0x0B, Z: 0x0C, S: 0x0D, E: 0x0E, LSHIFT: 0x0F,
  '5': 0x10, R: 0x11, D: 0x12, '6': 0x13, C: 0x14, F: 0x15, T: 0x16, X: 0x17,
  '7': 0x18, Y: 0x19, G: 0x1A, '8': 0x1B, B: 0x1C, H: 0x1D, U: 0x1E, V: 0x1F,
  '9': 0x20, I: 0x21, J: 0x22, '0': 0x23, M: 0x24, K: 0x25, O: 0x26, N: 0x27,
  '+': 0x28, P: 0x29, L: 0x2A, '-': 0x2B, '.': 0x2C, ':': 0x2D, '@': 0x2E, ',': 0x2F,
  '£': 0x30, '*': 0x31, ';': 0x32, HOME: 0x33, RSHIFT: 0x34, '=': 0x35, UP: 0x36, '/': 0x37,
  '1': 0x38, LEFT: 0x39, CTRL: 0x3A, '2': 0x3B, SPACE: 0x3C, CBM: 0x3D, Q: 0x3E, STOP: 0x3F,
};
// the parts whose stretches the fit prices; the others count their own cycles
const FITTED = new Set(['map', 'bat', 'frt', 'trn', 'end']);
// the least a stretch between two checkpoints costs, whatever the fit gave it
const MIN_STRETCH = 10;
// the frames kept ahead of the one shown: more than the longest stretch (a load's)
const AHEAD = 40;

function create(o) {
  const NS = root.NSPort;
  const b64 = s => typeof Buffer !== 'undefined' ? new Uint8Array(Buffer.from(s, 'base64')) : Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const M = new Uint8Array(new ArrayBuffer(0x10000));
  const colour = new Uint8Array(new ArrayBuffer(0x400));
  const vic = new Uint8Array(0x40), sidw = new Uint8Array(0x20), sidListeners = [];
  let cmp = 0, latch = 0, enable = 0;
  let pra = 0xFF, ddra = 0, ddrb = 0, pra2 = 0x97, ddra2 = 0x3F;
  const bus = root.C64Sid ? root.C64Sid.engine().createBus('6581') : null;
  const input = { keys: new Set(), joy: 0x1F, joy1: 0x1F };

  // ---- the clock, and the frames as the beam draws them
  let t = 0, lastLine = -1;
  // inside an interrupt handler the beam moves on by what the handler has spent so far (P.spend):
  // the menu's waits for a line there, and the sprites reused down the screen look at the line
  let inIrq = false;
  const lineNow = () => Math.floor(t / LINE);
  const beamLine = () => Math.floor((inIrq ? t + P.cost : t) / LINE);
  const keep = {};
  const vm = root.C64 ? root.C64.videoMemory(M, colour, { keep, frames: AHEAD + 2 }) : null;
  let frameIdx = 0, cur = null;
  const done = [];
  const bank = () => 3 - ((pra2 | ~ddra2) & 3);
  function begin() {
    const f = vm ? vm.begin() : { mem: M.slice(), colour: colour.slice() };
    cur = { frame: frameIdx, vic: Array.from(vic.subarray(0, 47)), cia2: [pra2, ddra2], writes: [], mem: f.mem, colourMem: f.colour, keep };
  }
  // the lines the clock has passed (the latch set on the compare's), and the frames it has finished
  function roll() {
    const ln = lineNow();
    while (lastLine < ln) { lastLine++; if (lastLine % LINES === cmp) latch |= 1; }
    if (vm) vm.at(t, cur.writes, bank());
    while (t >= (frameIdx + 1) * FRAME) {
      done.push(cur); if (done.length > AHEAD) done.shift();
      frameIdx++;
      begin();
    }
  }

  // ---- the chips
  function ioRead(a) {
    if (a >= 0xD000 && a < 0xD400) {
      const r = a & 0x3F, ln = beamLine() % LINES;
      if (r === 0x12) return ln & 255;
      if (r === 0x11) return (vic[0x11] & 0x7F) | ((ln >> 8) << 7);
      if (r === 0x19) { roll(); return latch | 0x70 | ((latch & enable) ? 0x80 : 0); }
      if (r === 0x1A) return enable | 0xF0;
      return vic[r];
    }
    if (a >= 0xD400 && a < 0xD800) return bus ? bus.read(a & 0x1F, t, 0) : 0;
    if (a >= 0xD800 && a < 0xDC00) return colour[a - 0xD800] | 0xF0;
    if (a >= 0xDC00 && a < 0xDD00) {
      const r = a & 15;
      if (r === 0) return (ddra ? (pra | ~ddra) & 0xFF : 0xE0 | input.joy) & (0xE0 | input.joy);
      if (r === 1) {
        let v = 0xFF;
        const rows = ddra ? pra & ddra : 0xFF;
        for (const name of input.keys) {
          const k = KEY[name];
          if (k !== undefined && !(rows & (1 << (k >> 3)))) v &= ~(1 << (k & 7));
        }
        return v & (0xE0 | input.joy1) & 0xFF;
      }
      if (r === 2) return ddra;
      if (r === 3) return ddrb;
      return 0;
    }
    if (a >= 0xDD00 && a < 0xDE00) {
      const r = a & 15;
      if (r === 0) return (pra2 | ~ddra2) & 0xFF;
      if (r === 2) return ddra2;
      return 0;
    }
    return 0;
  }
  function ioWrite(a, v) {
    v &= 255;
    if (a >= 0xD000 && a < 0xD400) {
      const r = a & 0x3F;
      if (r < 47 && r !== 0x19 && r !== 0x1A) cur.writes.push([lineNow() % LINES, t % LINE + 1, 0xD000 + r, v]);
      if (r === 0x12) cmp = (cmp & 0x100) | v;
      else if (r === 0x11) { cmp = (cmp & 0xFF) | ((v & 0x80) << 1); vic[r] = v; }
      else if (r === 0x19) { roll(); latch &= ~v & 0x0F; }
      else if (r === 0x1A) enable = v & 0x0F;
      else vic[r] = v;
      return;
    }
    if (a >= 0xD400 && a < 0xD800) {
      sidw[a & 0x1F] = v;
      if (bus) bus.write(v, t);
      for (const f of sidListeners) f(a & 0x1F, v, t);
      return;
    }
    if (a >= 0xD800 && a < 0xDC00) { colour[a - 0xD800] = v & 15; return; }
    if (a >= 0xDC00 && a < 0xDD00) {
      const r = a & 15;
      if (r === 0) pra = v; else if (r === 2) ddra = v; else if (r === 3) ddrb = v;
      return;
    }
    if (a >= 0xDD00 && a < 0xDE00) {
      const r = a & 15;
      if (r === 0 || r === 2) {
        if (r === 0) pra2 = v; else ddra2 = v;
        cur.writes.push([lineNow() % LINES, t % LINE + 1, a & 0xFFFF, v]);
      }
    }
  }

  // ---- the tapes' files, as the loader would put them in memory
  const files = {};
  for (const [k, f] of Object.entries(o.data.files)) files[k] = { addr: f.addr, bytes: b64(f.bytes) };
  const io = {
    read: ioRead, write: ioWrite,
    vicRead: r => ioRead(0xD000 | (r & 0x3F)), vicWrite: (r, v) => ioWrite(0xD000 | (r & 0x3F), v),
    sidRead: r => ioRead(0xD400 | (r & 0x1F)), sidWrite: (r, v) => ioWrite(0xD400 | (r & 0x1F), v),
    colourRead: i => colour[i & 0x3FF], colourWrite: (i, v) => ioWrite(0xD800 | (i & 0x3FF), v),
    ciaRead: r => ioRead(0xDC00 | (r & 0x0F)), ciaWrite: (r, v) => ioWrite(0xDC00 | (r & 0x0F), v),
    cia2Read: r => ioRead(0xDD00 | (r & 0x0F)), cia2Write: (r, v) => ioWrite(0xDD00 | (r & 0x0F), v),
    irqByte: a => irqByte(a),
    file: name => files[name] || null,
  };

  // ---- the program, and what its stretches cost
  const P = NS.makePort(M, io);
  const model = o.cost || { seg: {}, call: {}, irq: {} };
  let calls = Object.create(null), counting = true, owed = 0;
  const GENERATOR = Object.getPrototypeOf(function* () {}).constructor;
  for (const name of Object.keys(model.call)) {
    const f = P[name];
    if (typeof f !== 'function') continue;
    const c = model.call[name];
    P[name] = f instanceof GENERATOR
      ? function* (...a) { if (counting) called(name, c); return yield* f.apply(this, a); }
      : function (...a) { if (counting) called(name, c); return f.apply(this, a); };
  }
  // a part the fit has no stretches of counts its own cycles, as the title does
  const inModel = new Set(Object.keys(model.seg).map(k => k.split(':')[0]));
  const fitted = () => FITTED.has(P.part) && inModel.has(P.part);
  // a routine called: what was called before it is paid for once it comes to a line's time
  function called(name, c) {
    if (!fitted()) return;
    calls[name] = (calls[name] || 0) + 1;
    owed += c;
    if (owed >= LINE) { const d = callsCost(); if (d >= 1) advance(Math.round(d)); }
  }
  function callsCost() {
    const c = owed;
    owed = 0;
    calls = Object.create(null);
    return c;
  }
  function cost(from, to) {
    return Math.round((model.seg[P.part + ':' + from.toString(16) + '>' + to.toString(16)] || 0) + callsCost());
  }
  // A byte the interrupt writes, read in the middle of a stretch: the clock first moves on by what
  // the stretch has cost so far, so that the interrupts due in that time have run
  function irqByte(a) {
    if (counting) {
      const c = fitted() ? callsCost() : P.take();
      if (c >= 1) advance(Math.round(c));
    }
    return M[a];
  }

  // ---- the interrupts: the raster's, through the vector at $FFFE, to the port's handler for it in
  // the part the script is in. The loader's own (the tape's pulses) is never due: no tape plays
  function handler() {
    const at = M[0xFFFE] | M[0xFFFF] << 8;
    const own = P.IRQS[P.part];
    if (own && own[at]) return [P.part, own[at], at];
    for (const p of Object.keys(P.IRQS)) if (P.IRQS[p][at]) return [p, P.IRQS[p][at], at];
    return null;
  }
  const spent = { work: 0, wait: 0, irq: 0 };
  function runIrq() {
    const h = handler();
    if (!h) { latch &= ~1; return 0; }
    const [part, name, at] = h;
    counting = false;
    const before = P.take();
    inIrq = true;
    try { P[name](); } finally { counting = true; inIrq = false; }
    const own = P.take();
    P.cost = before;
    const c = model.irq[part + '@' + at.toString(16)] || own || 100;
    t += c; roll();
    spent.irq += c;
    return c;
  }
  // the clock at which the next raster interrupt falls due, or Infinity
  function nextIrq() {
    if (!(enable & 1) || cmp >= LINES) return Infinity;
    let L = Math.floor((lastLine + 1) / LINES) * LINES + cmp;
    if (L <= lastLine) L += LINES;
    return L * LINE;
  }
  function advance(dt, wait) {
    spent[wait ? 'wait' : 'work'] += dt;
    let end = t + dt, n = 0;
    for (;;) {
      if (++n > 100000) throw new Error('advance: an interrupt that never lets the clock move, at line ' + (lineNow() % LINES) + ' in ' + P.part);
      if (latch & enable & 1) { const c = runIrq(); end += c; continue; }
      const at = nextIrq();
      if (at > end) break;
      t = Math.max(t, at); roll();
    }
    t = Math.max(t, end); roll();
  }

  let it = null, lastCp = null;
  function step() {
    const r = it.next();
    if (r.done) throw new Error('the program ended');
    const y = r.value;
    if (y && y.cp !== undefined) {
      let dt;
      if (fitted() && lastCp !== null) { P.take(); dt = Math.max(MIN_STRETCH, cost(lastCp, y.cp)); }
      else { callsCost(); dt = y.cycles || 0; }
      lastCp = y.cp;
      advance(dt);
    } else if (y && y.wait !== undefined) {
      // a raster wait: what the stretch has cost so far, then on to the line
      const c = fitted() ? callsCost() : P.take();
      if (c >= 1) advance(Math.round(c));
      const ln = lineNow() % LINES, to = y.wait % LINES;
      const d = (to - ln + LINES) % LINES;
      if (d) advance(d * LINE - t % LINE, true);
      lastCp = null;
    } else if (y && y.cycles !== undefined) {
      const c = fitted() ? callsCost() : 0;
      advance(Math.round(c) + y.cycles);
    } else {
      // a turn of a polling loop: what the stretch has cost so far, then on to the next line
      const c = fitted() ? callsCost() : P.take();
      if (c >= 1) advance(Math.round(c));
      advance(LINE - t % LINE, true);
    }
  }
  function runUntil(until) {
    let guard = 0;
    while (t < until) {
      step();
      if (++guard > 2e6) throw new Error('runUntil: no progress in ' + P.part);
    }
  }
  function frameAt(n) {
    if (!done.length) return undefined;
    const i = n - done[0].frame;
    return done[Math.max(0, Math.min(done.length - 1, i))];
  }
  let target = null;
  function runFrame() {
    if (target === null) target = t;
    target += FRAME;
    if (t < target) runUntil(target);
    return frameAt(Math.floor(target / FRAME) - 1);
  }
  const keepNow = {};
  function now() {
    return { frame: frameIdx, vic: Array.from(vic.subarray(0, 47)), cia2: [pra2, ddra2], writes: [], mem: M, colourMem: colour, keep: keepNow };
  }

  function restore(s, entry) {
    M.set(b64(s.ram)); colour.set(b64(s.colour).subarray(0, 0x400));
    M[0] = s.cpu.pdir; M[1] = s.cpu.pdata;
    for (let r = 0; r < 0x40; r++) vic[r] = s.vic[r];
    for (let r = 0; r < 0x20; r++) sidw[r] = s.sidw ? s.sidw[r] : 0;
    if (bus && s.sidBus) bus.load(s.sidBus);
    cmp = s.cmp; latch = s.latch; enable = s.enable;
    pra = s.pra; ddra = s.ddra; ddrb = s.ddrb; pra2 = s.pra2; ddra2 = s.ddra2;
    t = s.cpu.cycles; lastLine = s.lastLine; target = null;
    frameIdx = Math.floor(t / FRAME);
    if (vm) vm.at(-1, [], 0);
    done.length = 0; begin();
    P.take(); callsCost();
    it = entry(P); lastCp = null;
  }
  // the script from its call of the title, as the game goes on from there
  restore(o.data.machine, Q => (function* () {
    Q.enter('tit');
    yield* Q.tit_title_main();
    Q.enter('res');
    yield* Q.res_script({ from: 'after_title' });
  })());
  return {
    M, colour, vic, sidw, input, KEY, P, files, spent,
    get t() { return t; }, get frame() { return frameIdx; }, get target() { return target; }, get part() { return P.part; },
    get shown() { return target === null ? frameIdx - 1 : Math.floor(target / FRAME) - 1; },
    runFrame, now, runUntil, restore, lastFrame: () => (target === null ? done[done.length - 1] : frameAt(Math.floor(target / FRAME) - 1)),
    onSid: f => sidListeners.push(f),
  };
}
root.NSPage = { create, LINE, LINES, FRAME, KEY };
})(typeof window !== 'undefined' ? window : globalThis);
