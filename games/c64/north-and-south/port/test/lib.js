'use strict';
// What the port's tests share: the game's files, the machine the port is checked against
// (kit/c64/machine.js) with the tape loader stood in for, the moments of play saved in work/, and
// the listings' labels.
//
// The files are the contributor's own tapes read the way the game's loader reads them:
//   python3 games/c64/north-and-south/work/tapdecode.py <side>.tap
// for the four sides, gathered in work/files.json ({ name: { addr, data } }, data in hex), and the
// moments are work/states/*.json (port/scripts/gen-states.js); neither is ever committed.
//
// The machine has no tape. The game loads every file through fast_load (resident $0A63), whose
// interrupt reads the tape's pulses; the machine's hook there stands in for the tape and the
// loader together: it puts the file asked for ($BB/$BC, its two-letter name) where its header
// says, and leaves the loader's bytes, the processor port, the vector at $FFFE and the registers
// as a good load leaves them (load_effect below). The port's fast_load does the same
// (src/g-res.js), so the two meet again at the first instruction after the load.
const fs = require('fs'), path = require('path');
const GAME = path.resolve(__dirname, '../..');
const REPO = path.resolve(GAME, '../../..');
const WORK = path.join(GAME, 'work');
const STATES = path.join(WORK, 'states');
const { Machine } = require(path.join(REPO, 'kit/c64/machine.js'));
const LINE = 63, LINES = 312, FRAME = LINE * LINES;
const hex = (a) => '$' + (a >>> 0).toString(16).toUpperCase().padStart(4, '0');

let FILES = null;
function files() {
  if (!FILES) {
    FILES = {};
    const j = JSON.parse(fs.readFileSync(path.join(WORK, 'files.json'), 'utf8'));
    for (const [k, v] of Object.entries(j)) FILES[k] = { addr: v.addr, bytes: Uint8Array.from(Buffer.from(v.data, 'hex')) };
  }
  return FILES;
}
const fileAsked = M => String.fromCharCode(M[M[0xBB] | M[0xBC] << 8], M[(M[0xBB] | M[0xBC] << 8) + 1]);

// What a good load leaves, the file's bytes aside: the loader's state bytes as its last block
// leaves them (resident $0B88-$0BF9), the processor port with bit 5 set again ($0AAF), the
// loader's interrupt in $FFFE, interrupts on, and A = $FD, X/Y the end, the carry clear.
function loadEffect(M, f, regs) {
  const end = (f.addr + f.bytes.length) & 0xFFFF;
  M.set(f.bytes, f.addr);
  M[0x93] = regs.a; M[0x0B8E] = regs.x; M[0x0B90] = regs.y;
  M[0x0AEC] = 0x16; M[0x0B1A] = 0x1B;
  M[0x90] = 0xFD; M[0x95] = 0x01; M[0x9B] = 0x00; M[0x9C] = 0x00;
  M[0xAC] = end & 255; M[0xAD] = end >> 8; M[0xAE] = 0; M[0xAF] = 0; M[0xB0] = 0x54; M[0xB1] = 0x01;
  M[0xFFFE] = 0xCB; M[0xFFFF] = 0x0A;
  return { a: 0xFD, x: end & 255, y: end >> 8, c: 0, z: 0, n: 1, i: 0 };
}
// What the loader's start leaves ($0A63-$0A9B), before any of the tape is read.
function loadStart(M, regs) {
  M[0x93] = regs.a; M[0x0B8E] = regs.x; M[0x0B90] = regs.y;
  M[0x0AEC] = 0x00; M[0xFFFE] = 0xCB; M[0xFFFF] = 0x0A; M[0x90] = 0x00;
}
// The hook at fast_load: the cpu's memory is the machine's RAM.
function loadHook(c) {
  const name = fileAsked(c.m);
  const f = files()[name];
  // a name no file on the tapes has (the year's file after a second war, Discoveries): the loader
  // starts and waits at $0AA4 for an end that never comes, as it does on the machine
  if (!f) { loadStart(c.m, { a: c.a, x: c.x, y: c.y }); c.portWrite(1, ((c.pdata & 0xDC) | 1) & 255); c.i = 0; c.pc = 0x0AA4; return false; }
  const port = (((c.pdata & 0xDC) | 1) | 0x20) & 255;
  c.m[0xC0] = port;
  const r = loadEffect(c.m, f, { a: c.a, x: c.x, y: c.y });
  c.portWrite(1, port);
  c.setRegs({ a: r.a, x: r.x, y: r.y, c: r.c, z: r.z, n: r.n });
  c.i = 0;
  c.cycles += 20000;                     // the load itself takes seconds; the machine moves on a little
  c.rts();
  return false;
}
const HOOKS = { 0x0A63: loadHook };

// A machine from a snapshot in a part's work/ (or the game's), with the hook.
function machine(vsf, o = {}) {
  const file = fs.existsSync(vsf) ? vsf : [path.join(GAME, 'parts', o.part || '', 'work', vsf), path.join(WORK, vsf)].find(f => fs.existsSync(f));
  if (!file) throw new Error('machine: no snapshot ' + vsf);
  const m = Machine.fromSnapshot(file, { dma: o.dma !== false, passAt: o.passAt });
  Object.assign(m.hooks, HOOKS);
  return m;
}
function restore(s, o = {}) {
  const m = Machine.restore(s, o);
  Object.assign(m.hooks, HOOKS);
  return m;
}

// The moments: work/states/<part>-<name>.json, a machine's save() with the part and passAt.
function save(name, m, extra = {}) {
  fs.mkdirSync(STATES, { recursive: true });
  const s = Object.assign({ machine: m.save() }, extra);
  fs.writeFileSync(path.join(STATES, name + '.json'), JSON.stringify(s));
  return s;
}
function readState(name) { return JSON.parse(fs.readFileSync(path.join(STATES, name.endsWith('.json') ? name : name + '.json'), 'utf8')); }
function states(filter = '') { return fs.existsSync(STATES) ? fs.readdirSync(STATES).filter((f) => f.endsWith('.json') && f.includes(filter)).sort() : []; }

// Each part's listing: its routines' labels by name, prefixed as the port names them.
const PREFIX = { resident: 'res', title: 'tit', menu: 'men', map: 'map', battle: 'bat', fort: 'frt', train: 'trn', ending: 'end' };
const LISTINGS = {};
function listing(part) {
  if (!LISTINGS[part]) LISTINGS[part] = JSON.parse(fs.readFileSync(path.join(GAME, 'parts', part, 'listing.json'), 'utf8'));
  return LISTINGS[part];
}
function labels(part) {
  const out = new Map();
  for (const r of listing(part).records) if (r.t === 'code' && r.l) out.set(PREFIX[part] + '_' + r.l, r.a);
  return out;
}

// A run of the machine on until the processor is at address a outside an interrupt.
function stopAt(m, a, maxFrames = 3000) {
  const prev = m.hooks[a];
  let hit = false;
  m.hooks[a] = (c) => { if (m.depth) return prev ? prev(c) : false; hit = true; m.stopFlag = true; return true; };
  try {
    for (let f = 0; f < maxFrames && !hit; f++) m.runCycles(FRAME);
  } finally { if (prev) m.hooks[a] = prev; else delete m.hooks[a]; }
  if (!hit) throw new Error('stopAt: ' + hex(a) + ' not reached in ' + maxFrames + ' frames (pc ' + hex(m.cpu.pc) + ')');
  return m;
}

module.exports = { GAME, REPO, WORK, STATES, FRAME, LINE, LINES, PREFIX, files, fileAsked, loadEffect, loadStart, loadHook, HOOKS,
  machine, restore, save, readState, states, listing, labels, stopAt, hex };
