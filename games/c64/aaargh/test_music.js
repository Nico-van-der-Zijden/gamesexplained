#!/usr/bin/env node
// Hold the How it works page's music and effects players against the game's own code. index.html's
// ag-music block (createDriver) runs Wally Beben's driver on the site's 6502 over AG_DRIVER_RANGES,
// for each button of the music player (AG_TUNES) and of the effects player (AG_EFFECTS). Here the
// game's own path runs on the kit's simulator over the whole listing: for a tune, the title's and
// the cave's store of its number in $68F7 (lda #1 at $B072, lda #2 at $AC61), then $68F8 once a
// frame, as their interrupts call it ($B20C, $8884); for an effect, sfx_clear ($754E), which the
// title calls as a game starts ($B1A3), the effect asked for on the third voice ($753E, as $8D89
// and the others do), then $753F once a frame, as the play interrupt calls it ($888A). Both must
// write the same values to the same registers of the sound chip in the same order, frame by frame,
// for 3,000 frames a button, and the page's button must stop on the frame the game's state says
// the sound is done: the tune's playing flag ($74B2) clear, or no effect on the third voice
// ($7753) and none asked for ($753E = $FF). Each tune must play, and so must every effect.
// It exits 1 on any difference.
//   node games/c64/aaargh/test_music.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname);
const { createDriver, AG_TUNES, AG_EFFECTS, AG_DRIVER_RANGES } = g.run('index.html', 'ag-music', 'createDriver', 'AG_TUNES', 'AG_EFFECTS', 'AG_DRIVER_RANGES');
const L = g.listing();
const FRAMES = 3000;
let bad = 0, frames = 0;
const ends = [];
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const mem = AG_DRIVER_RANGES.map(([a, b]) => [a, Array.from(L.ram.subarray(a, b + 1))]);
[['tunes', AG_TUNES], ['effects', AG_EFFECTS]].forEach(([set, list]) => list.forEach((c, t) => {
  const m = L.ram.slice(), frame = { w: [] };
  const io = {
    read(a) { throw new Error('read $' + a.toString(16)); },
    write(a, v) { if (a >= 0xD400 && a <= 0xD418) frame.w.push(a - 0xD400, v); else throw new Error('write $' + a.toString(16)); },
  };
  const cpu = new CPU(m, { port: 0x35, io });
  const drv = createDriver({ mem, list }, kit);
  if (c.tune) { cpu.pc = c.tune === 1 ? 0xB072 : 0xAC61; cpu.run({ until: cpu.pc + 5, maxSteps: 10 }); }
  else { cpu.call(0x754E, {}); m[0x753E] = c.sfx; }
  drv.init(t);
  if (frame.w.join() !== drv.writes.join()) fail(set, c.name, 'start', frame.w.join(), '|', drv.writes.join());
  if (c.tune && m[0x68F7] !== c.tune) fail(set, c.name, 'the game stored', m[0x68F7], 'as the tune');
  let done = -1, sounded = false;
  for (let f = 0; f < FRAMES && done < 0; f++) {
    frame.w = [];
    cpu.call(c.tune ? 0x68F8 : 0x753F, {}, { maxSteps: 100000 });
    drv.play();
    if (frame.w.join() !== drv.writes.join()) fail(set, c.name, 'frame ' + f, frame.w.join(), '|', drv.writes.join());
    if (frame.w.length) sounded = true;
    if (c.tune ? !m[0x74B2] : !m[0x7753] && m[0x753E] === 0xFF) done = f;
    if ((done >= 0) === drv.playing()) fail(set, c.name, 'frame ' + f, 'game', done >= 0 ? 'done' : 'playing', 'page', drv.playing() ? 'playing' : 'stopped');
    frames++;
  }
  if (!sounded) fail(set, c.name, 'wrote nothing to the sound chip');
  ends.push(c.name + ' ' + (done < 0 ? 'plays on' : done + 1 + ' frames'));
}));
console.log(`${AG_TUNES.length + AG_EFFECTS.length} buttons, ${frames} frames: ` + (bad ? bad + ' differences' : 'every write matches the game\'s code; ' + ends.join(', ')));
process.exit(bad ? 1 : 0);
