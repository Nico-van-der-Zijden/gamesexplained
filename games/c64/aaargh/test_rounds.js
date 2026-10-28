#!/usr/bin/env node
// Hold the How it works page's roll of a round against the game's own picker. index.html's
// ag-rounds block (agCityType) gives the city type for a city count (1 to 4) and a random number
// (1 to 4). Here city_pick ($8444) runs on the kit's simulator over the listing, with the count in
// its place ($803E, the operand of the load at $803D), the place in the table of random numbers
// ($A91E, the operand of the ldx # at $A91D) set, and the number put at the next place in the
// table ($9C12), which city_pick counts on to and reads: the type it leaves in $80A8 must be the
// page's, for all 16 pairs and from every place in the table. The volcano (type 4) must be the
// only fourth city.
// It exits 1 on any difference.
//   node games/c64/aaargh/test_rounds.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { agCityType } = g.run('index.html', 'ag-rounds', 'agCityType');
const L = g.listing();
let bad = 0, cases = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const io = { read() { return 0; }, write() {} };
for (let count = 1; count <= 4; count++) for (let r = 1; r <= 4; r++) for (let at = 0; at < 256; at += 17) {
  const m = L.ram.slice();
  m[0x803E] = count; m[0xA91E] = at; m[0x9C12 + ((at + 1) & 255)] = r;
  new CPU(m, { port: 0x35, io }).call(0x8444, {}, { maxSteps: 100000 });
  const page = agCityType(L.ram, count, r);
  if (m[0x80A8] !== page) fail('count', count, 'number', r, 'place', at, 'game', m[0x80A8], 'page', page);
  if ((page === 4) !== (count === 4)) fail('count', count, 'number', r, 'type', page, 'the volcano belongs to the fourth city only');
  cases++;
}
console.log(`${cases} cases: ` + (bad ? bad + ' differences' : 'the page picks every city type the game\'s picker does, and the volcano is the fourth city of every round'));
process.exit(bad ? 1 : 0);
