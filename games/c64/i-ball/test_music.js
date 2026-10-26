#!/usr/bin/env node
// Hold the page's two sound players against the game's own code. index.html's ib-music block
// (createDriver) runs the game's music driver and effects player on the kit's 6502 with only the
// bytes of IB_MUSIC_RANGES, and a sound chip that answers a read with the last value written. The
// same calls on the kit's simulator over the whole listing, with the sound chip's data bus
// answering reads as VICE's does (C64Sid.engine().createBus), must write the same values to the
// same registers in the same order, frame by frame, for 3,000 frames a button:
// - the tune: music_on ($E51F), as the title screen calls it at $6D29, then music_play ($E009) once
//   a frame, as title_irq calls it at $6DE5 and irq_panel_end at $455D.
// - an effect: the game's own instructions at the button's address, run until they have stored the
//   requests into effect_req ($ED50-$ED52); the page's requests must be the values they store, and
//   $FF (no request) for a voice they leave alone. Then effects_play ($ED56) once a frame, as
//   irq_panel_end calls it at $4563, and the page's button must stop 25 frames after every voice
//   is idle again. An unused effect is started with its request in voice 1, as the game would.
// The calls themselves are checked in the listing: JSR $E51F at $6D29, JSR $E009 at $6DE5 and
// $455D, JSR $ED56 at $4563. It exits 1 on any difference.
//   node games/c64/i-ball/test_music.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname), page = process.argv[2] || 'index.html';
const { createDriver, IB_TUNES, IB_EFFECTS, IB_MUSIC_RANGES, IB_STEP } =
  g.run(page, 'ib-music', 'createDriver', 'IB_TUNES', 'IB_EFFECTS', 'IB_MUSIC_RANGES', 'IB_STEP');
g.lib('sid');
const L = g.listing();
const FRAMES = 3000, TAIL = 25;
let bad = 0, frames = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
for (const [at, to] of [[0x6D29, 0xE51F], [0x6DE5, 0xE009], [0x455D, 0xE009], [0x4563, 0xED56]])
  if (L.ram[at] !== 0x20 || (L.ram[at + 1] | L.ram[at + 2] << 8) !== to) fail(`no JSR $${to.toString(16)} at $${at.toString(16)}`);
const mem = IB_MUSIC_RANGES.map(([a, b]) => [a, L.ram.slice(a, b + 1)]);
for (const [list, set] of [[IB_TUNES, 'music'], [IB_EFFECTS, 'effects']]) list.forEach((c, t) => {
  const m = L.ram.slice(), frame = { w: [] };
  const bus = C64Sid.engine().createBus('6581');
  const io = {
    read(a, cpu) { if (a >= 0xD400 && a <= 0xD7FF) return bus.read(a & 31, cpu.cycles, 0); throw new Error('read $' + a.toString(16)); },
    write(a, v, cpu) { if (a >= 0xD400 && a <= 0xD7FF) { if ((a & 31) < 25) frame.w.push(a & 31, v); bus.write(v, cpu.cycles); } else throw new Error('write $' + a.toString(16)); },
  };
  const cpu = new CPU(m, { port: 0x35, io });
  const drv = createDriver({ mem, tunes: list, step: IB_STEP }, kit);
  if (set === 'music') { cpu.cycles = 0; cpu.call(0xE51F, { a: 0, x: 0, y: 0 }); }
  else if (c.at) {
    // the game's own stores: LDA #n / STA $ED5x runs (LDA once, then up to three STAs)
    let a = parseInt(c.at.slice(1), 16), got = [0xFF, 0xFF, 0xFF], v = null;
    for (;;) {
      if (m[a] === 0xA9) { v = m[a + 1]; a += 2; continue; }
      if (m[a] === 0x8D && m[a + 2] === 0xED && m[a + 1] >= 0x50 && m[a + 1] <= 0x52) { got[m[a + 1] - 0x50] = v; a += 3; continue; }
      break;
    }
    if (got.join() !== c.req.join()) fail(set, c.name, 'requests', 'game', got.join(), 'page', c.req.join());
    for (let k = 0; k < 3; k++) m[0xED50 + k] = got[k];
  } else for (let k = 0; k < 3; k++) m[0xED50 + k] = c.req[k];
  frame.w = [];
  drv.init(t);
  let idleFor = 0;
  for (let f = 0; f < FRAMES; f++) {
    frame.w = [];
    const live = set === 'music' || idleFor < TAIL;
    if (live) { cpu.cycles = 0; cpu.call(set === 'music' ? 0xE009 : 0xED56, { a: 0, x: 0, y: 0 }, { maxSteps: 200000 }); }
    drv.play();
    if (live && frame.w.join() !== drv.writes.join()) fail(set, c.name, 'frame ' + f, frame.w.join(), '|', drv.writes.join());
    if (set === 'effects') {
      if (m[0xED50] === 0xFF && m[0xED51] === 0xFF && m[0xED52] === 0xFF) idleFor++;
      if ((idleFor >= TAIL) === drv.playing()) { fail(set, c.name, 'frame ' + f, 'page', drv.playing() ? 'still playing' : 'stopped early'); break; }
    }
    frames++;
  }
  if (set === 'effects' && idleFor < TAIL) fail(set, c.name, 'never ends in ' + FRAMES + ' frames');
});
console.log(`${IB_TUNES.length + IB_EFFECTS.length} buttons, ${frames} frames: ` + (bad ? bad + ' differences' : 'every write matches the game\'s code'));
process.exit(bad ? 1 : 0);
