'use strict';
// The resident's plain routines alone against the game's (check.js), from moments of every part, with $01 as the script calls them ($37, the chips in):
// the screen's clearing, the text mode and the machine quietened before a load.
const { checks } = require('./check.js');
let f = 0;
for (const part of ['tit', 'men', 'map', 'bat', 'end']) {
  f += checks([
    { name: 'res_quiet_machine', outs: [] },
    { name: 'res_clear_screen', outs: ['a'] },
    { name: 'res_text_mode', outs: ['a'] },
  ], { part, cases: 60, port: 0x37 });
}
process.exitCode = f ? 1 : 0;
