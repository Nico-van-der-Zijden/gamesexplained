'use strict';
// The fort's plain routines alone against the game's (check.js), from the fort's moments: the
// fighters' poses and orders, a person's and the computer's, the floors, walls and ladders, the
// knives, the dog and the barrel, the scroll, the sprites and the clock, on states made from the
// moments with the fighters' states, places and timers, the dog's, the barrel's and the knives'
// changed at random.
//   node port/test/t-frt.js [name filter] [cases]
const { checks } = require('./check.js');
require('../src/syms.js');
const S = globalThis.NSSyms.frt, R = globalThis.NSSyms.res;
const pick = (rnd, a) => a[rnd(a.length)];
const fight = (M, c, rnd) => {
  M[R.attacker] = rnd(2);
  M[R.level] = rnd(3); M[R.level + 1] = rnd(3);
  M[R.cpu_union] = rnd(2); M[R.cpu_confed] = rnd(2);
  M[S.fstick_x] = pick(rnd, [0, 1, 0xFF]); M[S.fstick_y] = pick(rnd, [0, 1, 0xFF]); M[S.fstick_fire] = rnd(2);
  for (let y = 0; y < 2; y++) {
    if (rnd(2)) M[S.fighter_state + y] = rnd(10);
    if (rnd(2)) M[S.fighter_frame + y] = rnd(6);
    if (rnd(2)) M[S.fighter_timer + y] = pick(rnd, [0, 0, 1, 2, 5]);
    if (rnd(3) === 0) M[S.fighter_facing + y] = pick(rnd, [1, 0xFF]);
    if (rnd(3) === 0) M[S.fighter_moving + y] = pick(rnd, [0, 1, 0xFF]);
    if (rnd(3) === 0) M[S.arc_step + y] = rnd(0x18);
    if (rnd(3) === 0) M[S.knife_on + y] = rnd(2);
    if (rnd(3) === 0) M[S.knives_left + y] = rnd(5);
    if (rnd(4) === 0) M[S.attacker_on + y] = rnd(2);
  }
  if (rnd(3) === 0) M[S.guard_on] = rnd(2);
  if (rnd(3) === 0) { M[S.a_8BE8] = rnd(256); M[S.a_8BEA] = rnd(2); }
  if (rnd(3) === 0) M[S.guards_left] = rnd(8);
  if (rnd(3) === 0) M[S.guard_timer] = pick(rnd, [0, 1, 2]);
  if (rnd(3) === 0) M[S.guard_delay] = rnd(3);
  if (rnd(3) === 0) { M[S.dog_on] = rnd(2); M[S.dog_x] = rnd(256); M[S.dog_x_hi] = pick(rnd, [0, 1, 0xFF]); M[S.dog_dir] = pick(rnd, [1, 0xFF]); M[S.dog_frame] = rnd(3); }
  if (rnd(3) === 0) { M[S.barrel_on] = rnd(2); M[S.barrel_x] = rnd(256); M[S.barrel_x_hi] = pick(rnd, [0, 1, 0xFF]); M[S.barrel_frame] = rnd(10); }
  if (rnd(4) === 0) M[S.barrel_count] = pick(rnd, [0x3B, 0x13, 0x14, 0, rnd(60)]);
  if (rnd(4) === 0) M[S.scroll_moved] = pick(rnd, [0, 1, 0xFF]);
  if (rnd(4) === 0) M[S.time_over] = rnd(2);
  if (rnd(4) === 0) M[S.at_top] = rnd(2);
  if (rnd(4) === 0) M[S.to_ladder] = pick(rnd, [0, 1, 0xFF]);
  if (rnd(4) === 0) M[S.attacker_bounced] = rnd(2);
  if (rnd(4) === 0) M[S.on_ground] = rnd(2);
  if (rnd(4) === 0) M[S.cpu_delay] = rnd(3);
  if (rnd(4) === 0) M[S.scroll_steps] = rnd(3);
};
const T = (name, setup = fight, o = {}) => Object.assign({ name, setup, outs: [] }, o);
const plain = ['frt_fort_machine', 'frt_fort_keys_one', 'frt_attacker_stick', 'frt_defender_stick', 'frt_fort_key_scan',
  'frt_fort_sort', 'frt_fort_sprite_copy', 'frt_fort_clear', 'frt_scroll_right_step', 'frt_scroll_left_step', 'frt_show_buffer',
  'frt_fort_colours', 'frt_fort_scroll', 'frt_fort_timers', 'frt_fort_clock', 'frt_fort_progress',
  'frt_sprite_list_clear', 'frt_fort_random', 'frt_fort_flag_wave', 'frt_flag_sprite', 'frt_flag_change', 'frt_guards_colour',
  'frt_fighters_to_sprites', 'frt_fighter_pictures', 'frt_attacker_orders', 'frt_attacker_duck', 'frt_attacker_strike',
  'frt_wall_right', 'frt_wall_left', 'frt_guard_wall', 'frt_dog_start', 'frt_attacker_floor', 'frt_guard_floor',
  'frt_ladder_up', 'frt_climb_up', 'frt_climb_down', 'frt_ladder_down', 'frt_attacker_ground', 'frt_attacker_lands',
  'frt_guard_ground', 'frt_guard_ledge', 'frt_attacker_ledge', 'frt_guard_lands', 'frt_knives_draw', 'frt_guards_draw',
  'frt_knives_to_sprites', 'frt_barrel_hits', 'frt_dog_bites', 'frt_barrel_sprite', 'frt_dog_sprite', 'frt_dog_run',
  'frt_dog_scroll', 'frt_barrel_scroll', 'frt_guard_scroll', 'frt_dog_gone', 'frt_barrel_gone', 'frt_barrel_start',
  'frt_guard_gone', 'frt_knives_fly', 'frt_at_start', 'frt_time_up', 'frt_knife_hits', 'frt_defender_orders',
  'frt_guard_fight', 'frt_guard_move', 'frt_guard_start', 'frt_computer_attacker'];
const list = [
  ...plain.map(n => T(n, fight, { cases: /orders|computer|pictures/.test(n) ? 1500 : undefined })),
  T('frt_fighter_strike', (M, c, rnd) => { fight(M, c, rnd); return { y: rnd(2) }; }, { outs: ['y'] }),
  T('frt_fighter_throw', (M, c, rnd) => { fight(M, c, rnd); return { y: rnd(2) }; }, { outs: ['y'] }),
  T('frt_fort_sound', (M, c, rnd) => ({ a: rnd(0x20) })),
  T('frt_draw_tile_column', fight, { cases: 200 }), T('frt_draw_all_columns', fight, { cases: 20 }),
  T('frt_fort_setup', fight, { cases: 30 }),
];
module.exports = { fight, list };
if (require.main === module) {
  const filter = process.argv[2] || '', cases = +(process.argv[3] || 800);
  const f = checks(list.filter(o => o.name.includes(filter)), { part: 'frt', cases });
  process.exitCode = f ? 1 : 0;
}
