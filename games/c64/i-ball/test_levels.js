#!/usr/bin/env node
// Hold the page's level maps (index.html's ib-levels block) against the game's own code. For each
// of the 16 levels, build_level_map ($4B2F) runs on the kit's 6502 over the listing's bytes with
// the level's number in $28, as the game runs it before play, and builds the map at $097E. ibMap
// must give the same 240 rows of 24 characters, and ibColours the same colours the routine sets:
// multicolour register 2 ($D023) and the cells' colour (the value it keeps in $F2, less the
// multicolour bit 8).
//   node games/c64/i-ball/test_levels.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] || 'index.html';
const { ibMap, ibColours } = g.run(page, 'ib-levels', 'ibMap', 'ibColours');
const L = g.listing();
let bad = 0, cells = 0;
const fail = (...w) => { if (bad++ < 20) console.log('DIFFERS', ...w); };
for (let level = 0; level < 16; level++) {
  const m = L.ram.slice(), vic = {};
  const io = {
    read(a) { if (a >= 0xD800 && a < 0xDC00) return 0; throw new Error('read $' + a.toString(16)); },
    write(a, v) { if (a >= 0xD000 && a < 0xDC00) { vic[a] = v; return; } throw new Error('write $' + a.toString(16)); },
  };
  const cpu = new CPU(m, { port: 0x35, io });
  m[0x28] = level;
  cpu.call(0x4B2F, { a: 0, x: 0, y: 0 }, { maxSteps: 5e6 });
  const map = ibMap(L.ram, level);
  for (let i = 0; i < map.length; i++, cells++) if (m[0x097E + i] !== map[i]) { fail(`level ${level + 1}: map row ${(i / 24) | 0} column ${i % 24}: game $${m[0x097E + i].toString(16)}, page $${map[i].toString(16)}`); break; }
  const col = ibColours(L.ram, level);
  if ((vic[0xD023] & 15) !== col[2]) fail(`level ${level + 1}: $D023 game ${vic[0xD023]}, page ${col[2]}`);
  if ((m[0xF2] & 7) !== col[3] || (m[0xF2] & 8) !== 8) fail(`level ${level + 1}: colour game ${m[0xF2]}, page ${col[3]}`);
}
console.log(`16 levels, ${cells.toLocaleString('en')} characters: ` + (bad ? bad + ' differences' : 'every map and colour matches the game\'s code'));
process.exit(bad ? 1 : 0);
