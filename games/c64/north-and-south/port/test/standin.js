'use strict';
// The game's own code standing in for the routines the port has not written yet, in the tests only
// (kit/c64/lockstep.js's standIn and standInGen, made for this game): the kit's simulator on P's
// memory and chips, with the processor port as P keeps it in M[1]; every routine the port has
// written, but those that wait, runs as the port's when the game's code calls it, and fast_load
// is the port's (the tape stood in for). A routine that waits stands in as a generator
// (standInGen), which yields where the game's code polls.
const path = require('path');
const lib = require('./lib.js');
const { CPU } = require(path.join(lib.REPO, 'kit/cpu/cpu6502.js'));
const { standInGen } = require(path.join(lib.REPO, 'kit/c64/lockstep.js'));

const regsOf = c => ({ a: c.a, x: c.x, y: c.y, n: c.n, v: c.v, z: c.z, c: c.c });

// The simulator reading the interrupt's bytes through P.irqByte, as the port's own code does.
function standInCpu(P, irqBytes) {
  const B = new Uint8Array(65536);
  for (const a of irqBytes) B[a] = 1;
  class StandInCPU extends CPU {
    rd(a) { return B[a] && this.rk[a >>> 8] === 0 ? P.irqByte(a) : super.rd(a); }
    rdz(a) { return B[a] ? P.irqByte(a) : super.rdz(a); }
  }
  return new StandInCPU(P.M, { port: { dir: 0x2F, data: P.M[1] }, io: { read: x => P.io.read(x), write: (x, v) => P.io.write(x, v) } });
}

// Hooks for the game's code: each plain routine the port has written runs as the port's.
function portHooks(P, names) {
  const hooks = {};
  const call = (f) => c => {
    P.M[1] = c.pdata;
    const r0 = regsOf(c), sp = c.sp;
    const r = f.call(P, Object.assign({}, r0)) || {};
    const out = Object.assign({}, r0);
    for (const k of Object.keys(out)) if (r[k] !== undefined) out[k] = typeof r[k] === 'boolean' ? +r[k] : r[k];
    c.setRegs(out);
    c.sp = sp;
    c.portWrite(1, P.M[1]);
    c.rts();
    return false;
  };
  for (const [label, a] of names) {
    const f = P[label];
    if (typeof f !== 'function' || P.GEN.has(label) || f.standIn) continue;
    hooks[a] = call(f);
  }
  hooks[0x0A63] = call(P.res_fast_load);
  return hooks;
}

// Fill P with stand-ins for every label of parts the port has not written. polls: RAM addresses
// the game's waiting loops read (the interrupt's bytes), for standInGen.
function install(P, parts, o = {}) {
  const names = new Map();
  for (const part of parts) for (const [k, a] of lib.labels(part)) if (!names.has(k)) names.set(k, a);
  for (const k of Object.keys(P)) {
    if (typeof P[k] !== 'function' || !/^[a-z]{3}_/.test(k)) continue;
    const gen = P[k].constructor.name === 'GeneratorFunction';
    if (gen !== P.GEN.has(k)) throw new Error(k + (gen ? ' is a generator that GEN leaves out' : ' is in GEN but is not a generator'));
  }
  const irqBytes = o.irqBytes || [];
  let hooks = null, cpu = null, depth = 0;
  P.standIns = new Set();
  for (const [label, a] of names) {
    if (typeof P[label] === 'function') continue;
    P.standIns.add(label);
    if (P.GEN.has(label) || (o.gen && o.gen.includes(label))) {
      P.GEN.add(label);
      const g = standInGen(P, a, { polls: o.polls || [], port: P.M[1] });
      P[label] = function* (r) { return yield* g(r); };
    } else {
      P[label] = function (r) {
        if (!cpu) cpu = standInCpu(P, irqBytes);
        if (!hooks) hooks = portHooks(P, names);
        const regs = { d: 0 };
        r = r || {};
        for (const k of ['a', 'x', 'y', 'n', 'v', 'z', 'c']) if (r[k] !== undefined) regs[k] = r[k];
        if (depth) regs.sp = cpu.sp;
        cpu.portWrite(0, 0x2F); cpu.portWrite(1, P.M[1]);
        depth++;
        try { cpu.call(a, regs, { hooks, maxSteps: 5e6 }); } finally { depth--; }
        P.M[1] = cpu.pdata;
        return regsOf(cpu);
      };
    }
    P[label].standIn = true;
  }
  return P;
}

module.exports = { install, portHooks, standInCpu };
