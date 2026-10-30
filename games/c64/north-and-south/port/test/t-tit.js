'use strict';
// The title's routines alone against the game's (check.js), from the title's moments: the
// credits and the animations in every state, the generator, the joystick and keyboard reads with
// keys and sticks held at random, and the screens' set-up.
const { checks } = require('./check.js');
const KEYS = ['SPACE', 'A', 'Z', 'RETURN', 'STOP', 'CBM', '1', 'LSHIFT'];
const anyState = (M, c, rnd) => {
  // a page of the credits at any column, phase and wait
  if (rnd(2)) {
    M[0x83C2] = rnd(2); M[0x83C3] = rnd(2); M[0x83C4] = rnd(40); M[0x83C5] = rnd(3);
    M[0x83C6] = 1 + rnd(3); M[0x83C7] = 1 + rnd(2); M[0x83C8] = rnd(5); M[0x83C9] = rnd(4) ? 0 : 1;
    const x = M[0x83C8] * 2; M[0x10] = M[0x857A + x]; M[0x11] = M[0x857B + x];
  }
  // an animation at any step
  if (rnd(2)) {
    M[0x8A34] = rnd(4); M[0x8A35] = rnd(5); M[0x8A37] = 1 + rnd(2); M[0x8A4D] = 1 + rnd(3); M[0x8A4E] = rnd(19); M[0x8A4F] = 1 + rnd(3);
  }
  for (let i = 0; i < 6; i++) if (rnd(3) === 0) M[0x82E8 + i] = rnd(256);
};
const input = (M, c, rnd) => {
  c.game.keys = new Set();
  if (rnd(2)) c.game.keys.add(['$', 0x3C, 0x0A, 0x01, 0x3F, 0x3D, 0x38, 0x0F][1 + rnd(7)]);
  c.game.joy = 0x1F & ~rnd(32);
};
const f = checks([
  { name: 'tit_credits_step', setup: anyState, outs: [] },
  { name: 'tit_credits_left', outs: [] },
  { name: 'tit_credits_right', outs: [] },
  { name: 'tit_credits_clear_left', outs: ['a'] },
  { name: 'tit_credits_clear_right', outs: ['a'] },
  { name: 'tit_anim_spin_step', setup: anyState, outs: [] },
  { name: 'tit_anim_arc_step', setup: anyState, outs: [] },
  { name: 'tit_anim_step_next', setup: anyState, outs: [] },
  { name: 'tit_anim_pick', setup: anyState, outs: [] },
  { name: 'tit_anim_show', setup: anyState, outs: [] },
  { name: 'tit_title_rnd', setup: anyState, outs: ['a'] },
  { name: 'tit_read_key', setup: input, outs: ['a', 'x', 'y'] },
  { name: 'tit_read_joy2', setup: input, outs: ['a', 'x', 'y'] },
  { name: 'tit_title_colour', cases: 50, outs: [] },
  { name: 'tit_title_video', cases: 50, outs: ['a'] },
  { name: 'tit_b_80B9', cases: 50, outs: [] },
  { name: 'tit_title_text_rows', cases: 50, setup: M => { M[0x837C] = 0; M[0x837D] = 0x60; M[0x8382] = 0; M[0x8383] = 0xD8; }, outs: [] },
], { part: 'tit', cases: 2000 });
process.exitCode = f ? 1 : 0;
