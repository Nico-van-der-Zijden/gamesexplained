'use strict';
// The Play tab as the page runs it, on a clean checkout: the page's own blocks (the port, the page's
// machine, the pacing) run in node on the game the page carries, from the script's call of the
// title. The port's own tests hold each routine and each part's main loop to the game's code
// (port/test, with a contributor's tapes and moments); this one holds the page that is published,
// with nothing from work/. An autopilot plays it: fire at the title, the menu's Union window
// clicked so the computer plays both sides, the calendar, GO, fire at each prompt. Then
// - the title, the menu, the script and the map each run, and the war's months go on;
// - the war reaches an arcade part, a battle, a fort or a train, and comes back to the map;
// - no frame throws, and the clock keeps to the frames.
//   node games/c64/north-and-south/test_play.js [frames]
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the page's scripts hand over on window
g.lib('c64'); g.lib('sid');
g.lib('cpu6502');                   // the 6502 the port's sound drivers run on, as play.html loads it
const PAGE = 'play.html', page = g.read(PAGE);
const blocks = [...page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)].map(m => m[1]);
for (const b of ['port/src/syms.js', 'port/src/core.js', 'port/page/runtime.js']) if (!blocks.includes(b)) { console.log('FAIL: play.html has no ' + b); process.exit(1); }
// each block hands over what it defines on window: the labels, the port's maker, its groups, the machine
const DEFINES = b => (b.endsWith('/syms.js') ? 'NSSyms' : b.endsWith('/core.js') ? 'NSPort' : b.endsWith('/runtime.js') ? 'NSPage' : 'NSGroups');
for (const b of blocks) g.run(PAGE, b, DEFINES(b));
const { NSPage, C64 } = globalThis;
const cost = JSON.parse(/^window\.NS_COST = (.*);$/m.exec(page)[1]);
const data = JSON.parse(/<script type="application\/json" id="ns-data">([^<]*)<\/script>/.exec(page)[1]);
const FRAMES = +process.argv[2] || 60000;

let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
// every label a part's routines name (S. its own part's, R. the resident's) is one of the part's
// labels: a name only another part has is undefined there, and M[undefined] writes nowhere
const PART_OF = { 'g-res': 'res', 'g-tit': 'tit', 'g-men': 'men', 'g-map': 'map', 'g-bat': 'bat', 'g-frt': 'frt', 'g-trn': 'trn', 'g-end': 'end' };
for (const m of page.matchAll(/^\/\* port\/src\/(g-[a-z]+)\d*\.js \*\/$([\s\S]*?)<\/script>/gm)) {
  const part = PART_OF[m[1]], S = globalThis.NSSyms[part], R = globalThis.NSSyms.res;
  if (!S) { fail('port/src/' + m[1] + '*.js: no part of that name'); continue; }
  for (const n of m[2].matchAll(/\b([SR])\.([A-Za-z_]\w*)/g)) {
    if ((n[1] === 'S' ? S : R)[n[2]] === undefined) fail('port/src/' + m[1] + ': ' + n[0] + ' is no label of the ' + (n[1] === 'S' ? part : 'res'));
  }
}
const rt = NSPage.create({ data, cost });
// the prompts wait for fire (res_wait_fire): the autopilot presses it while one waits
let waiting = false;
const w = rt.P.res_wait_fire;
rt.P.res_wait_fire = function* (...a) { waiting = true; try { return yield* w.apply(this, a); } finally { waiting = false; } };
const clicks = [[50, 88], [180, 132], [180, 132], [180, 132], [180, 132], [234, 203]];
let step = 0, wait = 60, fire = 0, inMenu = false;
function pilot(f) {
  const M = rt.M, part = rt.part;
  if (part === 'men' && !inMenu) { step = 0; wait = 60; }
  inMenu = part === 'men';
  if (fire > 0) { fire--; rt.input.joy = fire ? 0x0F : 0x1F; return; }
  if ((part === 'tit' && f % 300 === 299) || waiting) { fire = 4; rt.input.joy = 0x0F; return; }
  if (part === 'men' && step < clicks.length) {
    if (wait > 0) { wait--; rt.input.joy = 0x1F; return; }
    const [x, y] = clicks[step], cx = M[0x101E] | M[0x101F] << 8, cy = M[0x1020];
    let j = 0x1F;
    if (cx < x - 2) j &= ~8; else if (cx > x + 2) j &= ~4;
    if (cy < y - 2) j &= ~2; else if (cy > y + 2) j &= ~1;
    if (j === 0x1F) { fire = 4; step++; wait = 25; j &= ~0x10; }
    rt.input.joy = j;
    return;
  }
  rt.input.joy = 0x1F;
}
const seen = [], months = new Set();
let arcadeBack = false, last = null, f = 0;
const ARCADE = new Set(['bat', 'frt', 'trn']);
for (; f < FRAMES; f++) {
  pilot(f);
  let F;
  try { F = rt.runFrame(); } catch (e) { fail('frame ' + f + ' (' + rt.part + '): ' + e.message); break; }
  // drawn now and then, as the page draws every frame: the video memory then watches only what
  // the picture reads
  if (F && f % 50 === 0) C64.renderFrame(F);
  if (rt.part !== last) {
    if (ARCADE.has(last) && rt.part === 'map') arcadeBack = true;
    seen.push(rt.part); last = rt.part;
  }
  if (rt.part === "map") { const mo = rt.M[0x0399] * 10 + rt.M[0x039A]; if (!months.has(mo) && process.env.PACE) console.log("month " + mo + " at frame " + f); months.add(mo); }
  if (arcadeBack && months.size > 3) break;
}
const shown = new Set(seen);
for (const p of ['tit', 'men', 'res', 'map']) if (!shown.has(p)) fail('the ' + p + ' part never ran in ' + f + ' frames');
if (months.size < 2) fail('the war stayed at ' + [...months] + ' months');
if (!seen.some(p => ARCADE.has(p))) fail('no battle, fort or train in ' + f + ' frames');
else if (!arcadeBack) fail('the war went to ' + seen.filter(p => ARCADE.has(p)).join(', ') + ' and never came back to the map');
if (Math.abs(rt.t / NSPage.FRAME - (rt.shown + 1)) > 250) fail('the clock at frame ' + Math.round(rt.t / NSPage.FRAME) + ' with frame ' + rt.shown + ' shown');
console.log(f + ' frames: the parts in turn ' + seen.join(' ') + ', ' + months.size + ' months of war');
console.log(fails ? 'FAIL: ' + fails : 'ok');
process.exit(fails ? 1 : 0);
