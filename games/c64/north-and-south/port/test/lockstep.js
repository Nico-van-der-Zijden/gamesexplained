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
  const cpsOf = () => {
    const set = new Set(P.CPS.res);
    for (const p of PARTS) if (p !== 'res') for (const a of P.CPS[p] || []) if (owner[a] === p) set.add(a);
    return set;
  };
  const passOf = part => (P.PASS[part] !== undefined && !(P[{ tit: 'tit_title_main', men: 'men_menu_main', map: 'map_map_main', end: 'end_ending_main' }[part]] || {}).standIn
    ? P.PASS[part] : ENTRY_CP[part]);
  let passAt = o.passAt || passOf(o.part || 'tit') || 0x080B;
  const resync = () => {
    if (!ls) return;
    ls.cps = cpsOf();
    ls.cps.add(ls.passAt);
  };
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
  const program = o.program || (P2 => (function* () {
    if (o.resume) yield* o.resume(P2);
    yield* P2.res_script({ from: from || null });
  })());
  const irqBytes = [].concat(...Object.values(P.IRQ_BYTES));
  ls = new Lockstep({ machine: m, port: P, program, checkpoints: [...cpsOf(), passAt], passAt,
    irqs, irqBytes, hooks: lib.HOOKS, chips: ['colour', 'vic', 'sid'], ignore: o.ignore || [], maxFrames: o.maxFrames || 3000,
    timing: o.timing });
  ls.cps = cpsOf(); ls.cps.add(passAt);
  P.M[0] = m.cpu.pdir; P.M[1] = m.cpu.pdata;
  const res = ls.run({ passes: o.passes || 1e9, stopOnDiff: o.stopOnDiff !== false,
    onPass: o.onPass, onFrame: (f, mm, l) => {
      if (o.input) o.input(f, mm, l);
      if (o.frames && f >= o.frames) l.stopped = true;
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
  if (what === 'title') r = run({ vsf: 'entry.vsf', vsfPart: 'title', loaded: ['TP'], part: 'tit', resume: function* (P) { P.enter('tit'); yield* P.tit_title_main(); P.enter('res'); },
    from: 'after_title', frames: +(process.argv[3] || 1500), input: fireAt([700]) });
  console.log(describe(r.res));
  console.log('frames', r.m.frames, 'passes', r.res.passes, 'stand-ins used', [...r.P.standIns].length);
  process.exitCode = r.res.ok ? 0 : 1;
}

module.exports = { run, loadPort, makePort, portIO, fireAt, FILE_PART };
