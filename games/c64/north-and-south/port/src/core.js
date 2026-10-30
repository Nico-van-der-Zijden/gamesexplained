// North & South's port: P, the game's routines on the game's memory. Each part's routines are a
// file of their own that adds its functions to P (NSGroups); this makes P and installs them.
//
// The conventions every routine keeps:
// - P.M is the game's 64 KB, read and written at the game's addresses, self-modified operands
//   included. M[1] holds the processor port's data register, which the game writes as $01; the
//   RAM under it is never used. P.io is the chips (kit/c64/lockstep.js lists its functions) and
//   the tapes: P.io.file(name) gives a file's { addr, bytes } by its two-letter name.
// - A routine is P.<part>_<its listing label>(r), the part being the one whose listing names it
//   (res, tit, men, map, bat, frt, trn, end): r holds the registers it is entered with ({ a, x,
//   y, c }, those it reads), and it returns the registers it leaves ({ a, x, y }, and c, z or n
//   where a caller reads them). That is the kit's standIn's form, so the game's own code can stand
//   in for any routine not yet written (in the tests only).
// - A routine that waits (for the raster, for fire, for the interrupt's frame count, in a delay
//   loop), or calls one that does, is a generator: it yields where time passes, as
//   kit/c64/lockstep.js describes (a bare yield for each turn of a loop that polls, { cycles: n }
//   for a delay loop, { cp: a } at a checkpoint), and is called with yield*. P.GEN names them;
//   each group adds its own. P.CPS[part] lists the places its routines yield { cp }, P.PASS[part]
//   the start of its main loop's pass, P.IRQS[part] its interrupt handlers by address and
//   P.IRQ_BYTES[part] the bytes they write that its main program reads, P.IGNORE[part] the
//   bytes where a routine keeps a register the port's caller does not hand it (the operands a
//   routine saves A, X or Y in), which the tests leave out (kit/skills/core/70-minisite/play.md).
// - P.spend(n) counts the cycles a routine takes, as the page's clock charges them; P.take()
//   hands the count over at a yield and clears it.
// - A byte an interrupt writes and the main program reads is read through P.irqByte(a): on the
//   page that is M[a]; in the lockstep it is what the game's code read there.
// - The sound drivers are the game's own code run on the kit's 6502 (P.sound), which the kit
//   counts as a port of them (kit/skills/core/70-minisite, "The sound").
(function (root) {
'use strict';
const G = root.NSGroups = root.NSGroups || {};
function makePort(M, io, opts = {}) {
  const P = { M, GEN: new Set(), CPS: {}, IRQS: {}, IRQ_BYTES: {}, PASS: {}, IGNORE: {}, cost: 0 };
  // every part's checkpoints together (each part's are P.CPS[part])
  Object.defineProperty(P, 'CHECKPOINTS', { get: () => [].concat(...Object.values(P.CPS)) });
  // P.io is one object for good, so that a routine may keep it (const io = P.io): giving P a new
  // set of chips (the lockstep does) replaces its members
  const IO = Object.assign({}, io);
  Object.defineProperty(P, 'io', { enumerable: true, get: () => IO,
    set: v => { for (const k of Object.keys(IO)) delete IO[k]; Object.assign(IO, v); } });
  P.irqByte = a => (IO.irqByte ? IO.irqByte(a) : M[a]);
  // A polling loop's first read: through irqByte while the stretch has not yet polled, and from M
  // once it has, when the lockstep has run the interrupts to the line the game is on (P.polled is
  // the lockstep's to set: on at a turn of a polling loop, off at a checkpoint or a raster wait)
  P.polled = false;
  P.pollFirst = a => (P.polled ? M[a] : P.irqByte(a));
  P.spend = n => { P.cost += n; };
  P.take = () => { const n = P.cost; P.cost = 0; return n; };
  // the chips at $D000-$DFFF while $01 shows them, RAM under them otherwise (no ROMs: the parts
  // run with $01 = $35 or $25, and the port never reads a ROM)
  const ioIn = () => (M[1] & 3) !== 0 && (M[1] & 4) !== 0;
  P.rd = a => (a >= 0xD000 && a < 0xE000 && ioIn() ? IO.read(a) : M[a]);
  P.wr = (a, v) => { v &= 255; if (a >= 0xD000 && a < 0xE000 && ioIn()) IO.write(a, v); else M[a] = v; };
  // the chips by name, for the routines that always have them in
  P.vic = (r, v) => IO.vicWrite(r, v & 255);
  P.vicR = r => IO.vicRead(r);
  P.sid = (r, v) => IO.sidWrite(r, v & 255);
  // A sound driver's entry, the game's own code run on the kit's 6502 over P.M and P.io, as the
  // interrupt handlers call it; its cycles are spent where it runs.
  let cpu = null;
  P.run6502 = (entry, regs = {}) => {
    if (!cpu) {
      const CPU = (root.C64Cpu && root.C64Cpu.CPU) || null;
      if (!CPU) throw new Error('run6502: no C64Cpu (site/lib/cpu6502.js) on the page');
      cpu = new CPU(M, { port: { dir: 0x2F, data: M[1] }, io: { read: a => IO.read(a), write: (a, v) => IO.write(a, v) } });
    }
    cpu.portWrite(0, 0x2F); cpu.portWrite(1, M[1]);
    const c0 = cpu.cycles, r = { d: 0, sp: 0xF0 };
    for (const k of ['a', 'x', 'y', 'c']) if (regs[k] !== undefined) r[k] = regs[k];
    cpu.call(entry, r, { maxSteps: 200000 });
    P.spend(cpu.cycles - c0);
    M[1] = cpu.pdata;
    return { a: cpu.a, x: cpu.x, y: cpu.y, c: cpu.c };
  };
  for (const name of Object.keys(G)) if (!opts.only || opts.only.includes(name)) G[name](P);
  if (opts.standIn) opts.standIn(P);
  return P;
}
root.NSPort = { makePort };
})(typeof window !== 'undefined' ? window : globalThis);
