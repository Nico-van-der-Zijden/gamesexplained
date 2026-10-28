#!/usr/bin/env node
// Hold the Maps tab's places against the game's own code. levels.html's ag-city block (agCity)
// builds each place on the site's 6502 (site/lib/cpu6502.js, as C64Cpu): it sets the city type
// ($80A8), and $8691 for the cave as cave_setup ($AC2B) does, then runs city_build ($853E) and one
// step of animate_chars ($B463). Here the game does the same on the kit's simulator
// (kit/cpu/cpu6502.js) over the listing, with the chips answered by a model of its own: the same
// two calls, from the same memory. The character set ($C000-$C7FF), the screen and its sprite
// pointers ($C800-$CBFF), the copy of the screen ($7918-$7CD7), the characters' colours
// ($A2A1-$A3A0), the colour RAM and the four colour registers must then match for all nine places,
// and each place must have a screen, more than 50 different characters on it.
// It exits 1 on any difference.
//   node games/c64/aaargh/test_levels.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game, differ } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
g.lib('cpu6502');
const { agCity } = g.run('levels.html', 'ag-city', 'agCity');
const L = g.listing();
let bad = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
for (const t of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
  const page = agCity(L.ram, t, globalThis.C64Cpu);
  const m = L.ram.slice(), colour = new Uint8Array(1024), vic = new Uint8Array(64);
  const io = {
    read(a) {
      if (a >= 0xD800 && a < 0xDC00) return colour[a - 0xD800] | 0xF0;
      if (a >= 0xD000 && a < 0xD040) return vic[a & 63];
      throw new Error('the game read $' + a.toString(16));
    },
    write(a, v) {
      if (a >= 0xD800 && a < 0xDC00) { colour[a - 0xD800] = v & 15; return; }
      if (a >= 0xD000 && a < 0xD040) { vic[a & 63] = v; return; }
      throw new Error('the game wrote $' + a.toString(16));
    },
  };
  m[0x80A8] = t; if (t === 9) m[0x8691] = 1; else m[0x8691] = 0;
  const cpu = new CPU(m, { port: 0x35, io });
  cpu.call(0x853E, {}, { maxSteps: 2000000 });
  cpu.call(0xB463, {}, { maxSteps: 100000 });
  const at = differ(m, page.mem, [[0x7918, 0x7CD7], [0xA2A1, 0xA3A0], [0xC000, 0xCBFF]]);
  if (at >= 0) fail('place', t, 'memory at $' + at.toString(16), 'game', m[at], 'page', page.mem[at]);
  const ca = differ(colour, page.colour, [[0, 999]]);
  if (ca >= 0) fail('place', t, 'colour RAM at', ca, 'game', colour[ca], 'page', page.colour[ca]);
  for (const r of [0x20, 0x21, 0x22, 0x23]) if (vic[r] !== page.vic[r]) fail('place', t, '$D0' + r.toString(16), 'game', vic[r], 'page', page.vic[r]);
  const kinds = new Set(page.mem.subarray(0xC828, 0xCBE8)).size;
  if (kinds <= 50) fail('place', t, 'only', kinds, 'different characters on its screen');
}
console.log('9 places: ' + (bad ? bad + ' differences' : 'the characters, the screen, its copy, the colours and the colour registers match the game\'s code'));
process.exit(bad ? 1 : 0);
