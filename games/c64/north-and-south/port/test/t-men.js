'use strict';
// The menu's routines alone against the game's (check.js), from the menu's moments: every panel
// with every picture, every click's routine in every setting, the cursor at its edges, the keys
// and the stick, and the interrupts' work.
const { checks } = require('./check.js');
const KEYS = [0x29, 0x2A, 0x0C, 0x17, 0x3C, 0x0A, 0x3F, 0x38];          // P L Z X space A STOP 1
const settings = (M, c, rnd) => {
  for (let i = 0; i < 9; i++) M[0x0380 + i] = rnd(2);
  M[0x0380] = rnd(3); M[0x0381] = rnd(3); M[0x0389] = rnd(4); M[0x037E] = rnd(4);
  M[0x037F] = rnd(4) ? 1 : 0;
  M[0x1139] = rnd(3) ? 0 : rnd(11); M[0x113A] = rnd(2); M[0x10D8] = rnd(3) ? 0 : rnd(21);
  M[0x139B] = rnd(3);
};
const cursor = (M, c, rnd) => {
  const x = rnd(4) ? 20 + rnd(310) : [26, 30, 31, 316, 320, 321, 0x13F, 0x140][rnd(8)];
  M[0x101E] = x & 255; M[0x101F] = x >> 8;
  M[0x1020] = rnd(4) ? 50 + rnd(185) : [56, 59, 60, 223, 224, 225][rnd(6)];
};
const input = (M, c, rnd) => {
  c.game.keys = new Set();
  if (rnd(2)) c.game.keys.add(KEYS[rnd(KEYS.length)]);
  c.game.joy = 0x1F & ~rnd(32);
  M[0x1554] = rnd(3) ? [0x50, 0x4C, 0x5A, 0x58, 0x20, 0xFF][rnd(6)] : rnd(256);
  M[0x14F9] = [0, 1, 0xFF][rnd(3)]; M[0x14FA] = [0, 1, 0xFF][rnd(3)]; M[0x14FB] = rnd(2);
};
const all = (M, c, rnd) => { settings(M, c, rnd); cursor(M, c, rnd); input(M, c, rnd); };
// the sound driver's state is left as the moment has it; a click starts a sound on both sides
const panel = (M, c, rnd) => ({ a: rnd(9), x: rnd(18) });
const f = checks([
  { name: 'men_draw_panel', setup: panel, outs: [], cases: 1500 },
  { name: 'men_draw_year', setup: settings, outs: [], cases: 300 },
  { name: 'men_draw_menu', setup: settings, outs: [], cases: 400 },
  { name: 'men_click_year', setup: settings, outs: [] },
  { name: 'men_click_union_window', setup: settings, outs: [] },
  { name: 'men_click_conf_window', setup: settings, outs: [] },
  { name: 'men_click_union_head', setup: settings, outs: [] },
  { name: 'men_click_conf_head', setup: settings, outs: [] },
  { name: 'men_click_indians', setup: settings, outs: [] },
  { name: 'men_click_storm', setup: settings, outs: [] },
  { name: 'men_click_reinforcements', setup: settings, outs: [] },
  { name: 'men_click_arcade', setup: settings, outs: [] },
  { name: 'men_click_joystick', setup: settings, outs: [] },
  { name: 'men_click_photographer', setup: settings, outs: [] },
  { name: 'men_flash_end', setup: settings, outs: [] },
  { name: 'men_flash_count', setup: settings, outs: [] },
  { name: 'men_frame_count', setup: settings, outs: [] },
  { name: 'men_click_count', setup: settings, outs: [] },
  { name: 'men_to_grey', outs: ['a', 'x'] },
  { name: 'men_menu_joy', setup: input, outs: ['a', 'x', 'y'] },
  { name: 'men_menu_key', setup: input, outs: ['a', 'x', 'y'] },
  { name: 'men_cursor_move', setup: all, outs: [] },
  { name: 'men_cursor_keys', setup: all, outs: [] },
  { name: 'men_cursor_stick', setup: all, outs: [] },
  { name: 'men_cursor_show', setup: all, outs: ['a'] },
  { name: 'men_heads_top', setup: settings, outs: ['a'] },
  { name: 'men_heads_low', outs: ['a'] },
  { name: 'men_menu_video', outs: [], cases: 100 },
  { name: 'men_menu_colour', outs: ['a'], cases: 100 },
  { name: 'men_menu_irq_on', outs: ['a'], cases: 100 },
  { name: 'men_menu_click', setup: (M, c, rnd) => { all(M, c, rnd); M[0x10D8] = rnd(4) ? 0 : 5; M[0x1020] = rnd(2) ? 0xC0 : M[0x1020];
    // GO waits for the frame count, which nothing moves here: left out
    const x = M[0x101E] | M[0x101F] << 8, y = M[0x1020]; if (x >= 0xD8 && x <= 0xEC && y >= 0xC8) return { skip: true }; }, outs: [] },
], { part: 'men', cases: 1000 });
process.exitCode = f ? 1 : 0;
