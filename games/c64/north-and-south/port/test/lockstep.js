'use strict';
// The whole port beside the game, pass by pass (kit/c64/lockstep.js), from a hand-over or a
// moment of play. The game runs on kit/c64/machine.js with the tape stood in for (lib.js); what
// the port has not written is the game's own code (standin.js), its interrupt handlers included.
//
// The parts load over each other, so which code is in memory changes as the game goes: the runner
// keeps, for every address, the part whose file last loaded there, and from it the checkpoints
// in play (the resident's, and each part's whose code is still where it put it) and the handler
// for each interrupt (the port's when the part's group has it, the game's code otherwise). The
// passes are the main loop's of the part the port has entered (P.enter), or, for a part the port
// has not written, the script's call of it.
//
//   const r = run({ start: 'title', frames: 3000, input: (f, m) => ... });
const fs = require('fs'), path = require('path');
const lib = require('./lib.js');
const { Lockstep, standIn, describe } = require(path.join(lib.REPO, 'kit/c64/lockstep.js'));
const standin = require('./standin.js');
const SRC = path.join(lib.GAME, 'port/src');

function loadPort() {
  if (!globalThis.C64Cpu) globalThis.C64Cpu = require(path.join(lib.REPO, 'kit/cpu/cpu6502.js'));
  require(path.join(SRC, 'core.js'));
  for (const f of fs.readdirSync(SRC).sort()) if (f !== 'core.js' && f.endsWith('.js')) require(path.join(SRC, f));
  return globalThis.NSPort;
}

// The files and the parts they belong to
const FILE_PART = { TP: 'tit', OC: 'men', OM: 'men', M1: 'map', M2: 'map', M3: 'map', BS: 'bat', S1: 'frt', S2: 'trn', CS: 'end',
  T1: 'txt', T2: 'txt', T3: 'txt', T4: 'txt' };
const PARTS = ['res', 'tit', 'men', 'map', 'bat', 'frt', 'trn', 'end', 'txt'];
const PART_NAME = { res: 'resident', tit: 'title', men: 'menu', map: 'map', bat: 'battle', frt: 'fort', trn: 'train', end: 'ending' };
const ENTRY_CP = { tit: 0x080B, men: 0x0820, map: 0x0844, end: 0x0854 };

function portIO() {
  const F = lib.files();
  return { file: name => F[name] || null };
}

// A port with stand-ins for all it has not written.
function makePort(o = {}) {
  const NS = loadPort();
  const P = NS.makePort(new Uint8Array(65536), portIO(), { only: o.groups });
  const irqBytes = [].concat(...Object.values(P.IRQ_BYTES));
  standin.install(P, ['resident', 'title', 'menu', 'map', 'battle', 'fort', 'train', 'ending'], {
    irqBytes, polls: irqBytes.concat(o.polls || []),
    gen: ['men_menu_main', 'map_map_main', 'end_ending_main', 'bat_battle_main', 'frt_fort_main', 'trn_train_main', 'tit_title_main'] });
  return P;
}

function run(o) {
  const P = o.port || makePort(o);
  let m, loaded, from;
  if (o.state) {
    const s = lib.readState(o.state);
    m = lib.restore(s.machine);
    loaded = s.loaded; from = s.from;
  } else {
    m = lib.machine(o.vsf, { part: o.vsfPart });
    loaded = o.loaded; from = o.from;
  }
  // which part's file is where
  const owner = new Array(65536).fill('res');
  const F = lib.files();
  const put = name => { const f = F[name]; for (let i = 0; i < f.bytes.length; i++) owner[(f.addr + i) & 0xFFFF] = FILE_PART[name]; };
  for (const n of loaded || []) put(n);
  let ls = null;
  // the checkpoints of the parts whose code is in memory: the game stops only at those (each
  // part's stops are installed on the machine for good, and pass the game on while their part's
  // code is not there)
  const cpsOf = () => {
    const set = new Set(P.CPS.res);
    for (const p of PARTS) if (p !== 'res') for (const a of P.CPS[p] || []) if (owner[a] === p) set.add(a);
    // the raster waits' exits are the map's
    for (const a of P.WAITS || []) if (owner[a] === 'map') set.add(a);
    return set;
  };
  const MAINS = { tit: 'tit_title_main', men: 'men_menu_main', map: 'map_map_main', end: 'end_ending_main',
    bat: 'bat_battle_main', frt: 'frt_fort_main', trn: 'trn_train_main' };
  const passOf = part => (P.PASS[part] !== undefined && P[MAINS[part]] && !P[MAINS[part]].standIn ? P.PASS[part] : ENTRY_CP[part]);
  const passAt = o.passAt || passOf(o.part || 'tit') || 0x080B;
  let active = new Set();
  const resync = () => { if (ls) { active = cpsOf(); active.add(ls.passAt); } };
  P.onLoad = (name) => { put(name); resync(); };
  P.onEnter = (part) => {
    const a = passOf(part);
    if (a !== undefined && ls) { ls.passAt = a; resync(); }
  };
  const handlers = new Map();
  const irqs = new Proxy({}, {
    has: () => true,
    get: (t, k) => {
      const a = +k;
      if (Number.isNaN(a)) return undefined;
      const p = owner[a], name = P.IRQS[p] && P.IRQS[p][a];
      if (name) return name;
      if (!handlers.has(a)) handlers.set(a, standIn(P, a, { irq: true }));
      return handlers.get(a);
    },
  });
  const program0 = o.program || (P2 => (function* () {
    if (o.resume) yield* o.resume(P2);
    yield* P2.res_script({ from: from || null });
  })());
  // each step of a main loop that takes long (the map's, a month) is a pass of its own, so that
  // memory is compared at each: P.STEP_PASSES[part], the steps' checkpoints
  const program = P2 => (function* (g) {
    let v;
    for (;;) {
      const r = g.next(v);
      if (r.done) return r.value;
      const y = r.value;
      if (y && y.cp !== undefined && ls && P.STEP_PASSES && (P.STEP_PASSES[P.part] || []).includes(y.cp)) { ls.passAt = y.cp; resync(); }
      v = yield y;
    }
  })(program0(P2));
  const irqBytes = [].concat(...Object.values(P.IRQ_BYTES));
  const all = new Set([...[].concat(...Object.values(P.CPS)), ...Object.values(ENTRY_CP), ...Object.values(P.PASS), passAt]);
  for (const w of P.WAITS || []) all.delete(w);
  const ignore = (o.ignore || []).concat(...Object.values(P.IGNORE));
  ls = new Lockstep({ machine: m, port: P, program, checkpoints: [...all], waits: P.WAITS || [], passAt,
    irqs, irqBytes, hooks: lib.HOOKS, chips: ['colour', 'vic', 'sid'], ignore, maxFrames: o.maxFrames || 3000,
    timing: o.timing });
  resync();
  const attach = ls.attach.bind(ls);
  ls.attach = function () {
    attach();
    for (const a of [...all, ...(P.WAITS || [])]) {
      const h = m.hooks[a], prev = ls.saved.hooks[a];
      m.hooks[a] = c => (active.has(a) ? h(c) : prev ? prev(c) : false);
    }
  };
  P.M[0] = m.cpu.pdir; P.M[1] = m.cpu.pdata;
  P.lsStop = () => { ls.stopped = true; };
  P.lsPass = a => { ls.passAt = a; resync(); };
  const f0 = m.frames;
  const res = ls.run({ passes: o.passes || 1e9, stopOnDiff: o.stopOnDiff !== false,
    onPass: o.onPass, onFrame: (f, mm, l) => {
      if (o.input) o.input(f, mm, l);
      if (o.frames && f - f0 >= o.frames) l.stopped = true;
    } });
  return { res, ls, m, P };
}

// Input scripts: fire held for a few frames at the frames given
function fireAt(frames, hold = 4) {
  return (f, m) => {
    let on = false;
    for (const t of frames) if (f >= t && f < t + hold) on = true;
    m.joy = on ? 0x1F & ~0x10 : 0x1F;
  };
}

if (require.main === module) {
  const what = process.argv[2] || 'title';
  let r;
  if (what === 'game') {
    // the whole game from the title's hand-over, the autopilot playing the computer against itself
    const { pilot } = require('./drive.js');
    let A = null;
    r = run({ vsf: 'entry.vsf', vsfPart: 'title', loaded: ['TP'], part: 'tit',
      resume: function* (P) { P.enter('tit'); yield* P.tit_title_main(); P.enter('res'); }, from: 'after_title',
      frames: +(process.argv[3] || 3000),
      input: (f, m, l) => { if (!A) A = pilot(m, { cc: true, years: +(process.argv[4] || 4), part: () => l.P.part }); A.update(); } });
  } else if (what === 'map') {
    // from the map's moments stopped at a checkpoint (port/scripts/gen-cps.js), the autopilot playing
    const { pilot } = require('./drive.js');
    const filter = process.argv[3] || '', frames = +(process.argv[4] || 2000), seed = +(process.argv[5] || 1);
    let ok = 0, n = 0;
    for (const f of lib.states('cp-map-' + filter)) {
      n++;
      const s = lib.readState(f);
      let A = null, rs = seed;
      const rnd = k => { rs ^= rs << 13; rs >>>= 0; rs ^= rs >>> 17; rs ^= rs << 5; rs >>>= 0; return Math.floor(rs / 4294967296 * k); };
      let held = 0x1F, hold = 0;
      const human = (A2, m) => { if (hold-- <= 0) { held = 0x1F & ~[0, 1, 2, 4, 8, 16, 0][rnd(7)]; hold = 2 + rnd(30); } m.joy = held; };
      let out;
      try {
        out = run({ state: f, part: 'map', frames,
          resume: function* (P) { P.enter('map'); yield* P.map_map_main({ from: s.from }); P.enter('res'); }, from: 'clear3',
          input: (fr, m, l) => { if (!A) A = pilot(m, { cc: s.mode === 'cc', part: () => l.P.part, input: s.mode === 'cc' ? null : human }); A.update(); } });
      } catch (e) { console.log(f + ': ' + (e.stack || e.message).split('\n').slice(0, 5).join('\n  ')); continue; }
      console.log(f + ' (from $' + s.from.toString(16) + '): ' + describe(out.res).split('\n').join('\n  '));
      if (out.res.ok) ok++;
      if (process.argv[6] === 'stop' && !out.res.ok) break;
    }
    console.log(ok + '/' + n + ' moments in step');
    process.exitCode = ok === n ? 0 : 1;
    return;
  } else if (['bat', 'frt', 'trn', 'end'].includes(what)) {
    // from a part's moments stopped at a checkpoint (port/scripts/gen-cps.js), the autopilot playing,
    // to the part's return: for an arcade part the map where it goes back to, for the ending the
    // script's prompt
    const { pilot } = require('./drive.js');
    const MAIN = { bat: 'bat_battle_main', frt: 'frt_fort_main', trn: 'trn_train_main', end: 'end_ending_main' };
    const filter = process.argv[3] || '', frames = +(process.argv[4] || 3000), seed = +(process.argv[5] || 1);
    let ok = 0, n = 0;
    for (const f of lib.states('cp-' + what + '-' + filter)) {
      n++;
      const s = lib.readState(f);
      let A = null, rs = seed;
      const rnd = k => { rs ^= rs << 13; rs >>>= 0; rs ^= rs >>> 17; rs ^= rs << 5; rs >>>= 0; return Math.floor(rs / 4294967296 * k); };
      let held = 0x1F, hold = 0;
      const human = (A2, m) => { if (hold-- <= 0) { held = 0x1F & ~[0, 1, 2, 4, 8, 16, 0, 5, 9][rnd(9)]; hold = 2 + rnd(30); } m.joy = held; };
      const arcade = what !== 'end';
      let out;
      try {
        out = run({ state: f, part: what, frames,
          resume: function* (P) {
            P.enter(what);
            yield* P[MAIN[what]]({ resume: s.from });
            if (!arcade) { P.enter('res'); return; }
            // the last pass where the part has returned to the map
            P.enter('map');
            P.lsPass(P.ARCADE_BACK[what]);
            yield* P.map_arcade_back(what);
            P.lsStop();
            yield { cycles: 0 };
          }, from: arcade ? null : 'clear4',
          input: (fr, m, l) => { if (!A) A = pilot(m, { cc: s.mode === 'cc', part: () => l.P.part, input: s.mode === 'cc' ? null : human }); A.update(); } });
      } catch (e) { console.log(f + ': ' + (e.stack || e.message).split('\n').slice(0, 5).join('\n  ')); continue; }
      console.log(f + ' (from $' + s.from.toString(16) + '): ' + describe(out.res).split('\n').join('\n  '));
      if (out.res.ok) ok++;
      if (process.argv[6] === 'stop' && !out.res.ok) break;
    }
    console.log(ok + '/' + n + ' moments in step');
    process.exitCode = ok === n ? 0 : 1;
    return;
  } else if (what === 'title') r = run({ vsf: 'entry.vsf', vsfPart: 'title', loaded: ['TP'], part: 'tit', resume: function* (P) { P.enter('tit'); yield* P.tit_title_main(); P.enter('res'); },
    from: 'after_title', frames: +(process.argv[3] || 1500), input: fireAt([700]) });
  console.log(describe(r.res));
  console.log('frames', r.m.frames, 'passes', r.res.passes, 'stand-ins used', [...r.P.standIns].length);
  process.exitCode = r.res.ok ? 0 : 1;
}

module.exports = { run, loadPort, makePort, portIO, fireAt, FILE_PART };
