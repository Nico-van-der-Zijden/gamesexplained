'use strict';
// The ending's plain routines alone against the game's (check.js), from the ending's moments:
// the machine, the stick and the keys, the message's row, scroll and characters, and the two
// interrupts, on states with the screen, the scroll and the message's place changed at random.
//   node port/test/t-end.js [name filter] [cases]
const { checks } = require('./check.js');
require('../src/syms.js');
const S = globalThis.NSSyms.end;
const scene = (M, c, rnd) => {
  M[S.ending_screen_no] = rnd(2);
  M[S.message_fine] = rnd(8);
  if (rnd(3) === 0) M[S.message_done] = rnd(2);
  if (rnd(3) === 0) M[S.ending_timer] = rnd(3);
  if (rnd(4) === 0) { const a = [0x847B, 0x850E, 0x858A, 0x862D][rnd(4)] + rnd(0x90); M[0x10] = a & 255; M[0x11] = a >> 8; }
};
const T = (name, setup = scene, o = {}) => Object.assign({ name, setup, outs: [] }, o);
const list = [
  T('end_ending_machine', scene, { outs: ['a'] }), T('end_ending_stick', scene, { outs: ['a', 'x', 'y'] }),
  T('end_ending_key_scan', (M, c, rnd) => { c.game.keys = new Set(rnd(2) ? [[0x3C, 0x0E, 0x17, 0x29][rnd(4)]] : []); }, { outs: ['a', 'x', 'y'] }),
  T('end_message_clear', scene, { outs: ['x', 'y'] }), T('end_message_scroll'), T('end_message_shift', scene, { outs: ['x'] }),
  T('end_message_next', scene, { outs: ['y'] }), T('end_ending_exit'),
];
const filter = process.argv[2] || '', cases = +(process.argv[3] || 800);
const f = checks(list.filter(o => o.name.includes(filter)), { part: 'end', cases });
process.exitCode = f ? 1 : 0;
