#!/usr/bin/env node
// Hold the page's disc sequence (index.html's ib-discs block) against the game's own code, on the
// kit's 6502 over the listing's bytes, for every place in the sequence (disc_place, $F5):
// - ibTake(i) must give the place the game's give_extra leaves after a disc is taken ($605C-$6066).
// - ibDie(ram, i) must give the place disc_rollback ($6648) leaves after a death.
// - IB_LOST must name a checkpoint exactly when disc_rollback, sending the sequence there, writes
//   memory other than $F5 and the stack (it clears that extra's flags), and the name must be the
//   extra disc_order ($62C3) gives at that place (IB_EXTRAS, by its number).
//   node games/c64/i-ball/test_discs.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] || 'index.html';
const { ibTake, ibDie, IB_LOST, IB_EXTRAS } = g.run(page, 'ib-discs', 'ibTake', 'ibDie', 'IB_LOST', 'IB_EXTRAS');
const L = g.listing();
let bad = 0;
const fail = (...w) => { if (bad++ < 20) console.log('DIFFERS', ...w); };
const io = { read(a) { throw new Error('read $' + a.toString(16)); }, write(a) { throw new Error('write $' + a.toString(16)); } };
const clears = new Set();
for (let i = 0; i < 32; i++) {
  let m = L.ram.slice(), cpu = new CPU(m, { port: 0x35, io });
  m[0xF5] = i; cpu.pc = 0x605C; cpu.run({ until: 0x6068, maxSteps: 10 });
  if (m[0xF5] !== ibTake(i)) fail(`take at place ${i}: game ${m[0xF5]}, page ${ibTake(i)}`);
  m = L.ram.slice(); cpu = new CPU(m, { port: 0x35, io });
  const w = new Uint8Array(0x10000);
  m[0xF5] = i; cpu.call(0x6648, { a: 0, x: 0, y: 0 }, { maxSteps: 100, writes: w });
  if (m[0xF5] !== ibDie(L.ram, i)) fail(`death at place ${i}: game ${m[0xF5]}, page ${ibDie(L.ram, i)}`);
  let changed = false;
  for (let a = 0x200; a < 0x10000; a++) if (w[a]) changed = true;
  if (changed) clears.add(m[0xF5]);
}
const lost = new Set(Object.keys(IB_LOST).map(Number));
for (const c of new Set([...clears, ...lost])) {
  if (clears.has(c) !== lost.has(c)) fail(`checkpoint ${c}: game ${clears.has(c) ? 'clears an extra' : 'clears nothing'}, page ${IB_LOST[c] || 'nothing'}`);
  else if (IB_LOST[c] !== IB_EXTRAS[L.ram[0x62C3 + c]]) fail(`checkpoint ${c}: page takes away ${IB_LOST[c]}, disc_order gives ${IB_EXTRAS[L.ram[0x62C3 + c]]} there`);
}
console.log(`32 places, ${clears.size} checkpoints that clear an extra: ` + (bad ? bad + ' differences' : 'every take and every death matches the game\'s code'));
process.exit(bad ? 1 : 0);
