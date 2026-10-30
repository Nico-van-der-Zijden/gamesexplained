'use strict';
// The train's plain routines alone against the game's (check.js), from the train's moments: the
// fighters' poses and orders, a person's and the computer's, the roofs, the ground and the
// ladders, the knives, the scroll and the scenery, the wheels, the rods and the driver, the sprites
// and the clock, on states made from the moments with the fighters' states, places and timers
// changed at random.
//   node port/test/t-trn.js [name filter] [cases]
const { checks } = require('./check.js');
require('../src/syms.js');
const S = globalThis.NSSyms.trn, R = globalThis.NSSyms.res;
const pick = (rnd, a) => a[rnd(a.length)];
const fight = (M, c, rnd) => {
  M[R.attacker] = rnd(2);
  M[R.level] = rnd(3); M[R.level + 1] = rnd(3);
  M[R.cpu_union] = rnd(2); M[R.cpu_confed] = rnd(2);
  M[S.fstick_x] = pick(rnd, [0, 1, 0xFF]); M[S.fstick_y] = pick(rnd, [0, 1, 0xFF]); M[S.fstick_fire] = rnd(2);
  for (let y = 0; y < 2; y++) {
    if (rnd(2)) M[S.fighter_state + y] = rnd(10);
    if (rnd(2)) M[S.fighter_frame + y] = rnd(6);
    if (rnd(2)) M[S.tfighter_timer + y] = pick(rnd, [0, 0, 1, 2, 5]);
    if (rnd(3) === 0) M[S.fighter_facing + y] = pick(rnd, [1, 0xFF]);
    if (rnd(3) === 0) M[S.fighter_moving + y] = pick(rnd, [0, 1, 0xFF]);
    if (rnd(3) === 0) M[S.arc_step + y] = rnd(0x18);
    if (rnd(3) === 0) M[S.knife_on + y] = rnd(2);
    if (rnd(3) === 0) M[S.knives_left + y] = rnd(5);
  }
  if (rnd(3) === 0) M[S.guard_on] = rnd(2);
  if (rnd(3) === 0) { M[S.a_8D76] = rnd(256); M[S.a_8D78] = pick(rnd, [0, 1, 0xFF]); }
  if (rnd(3) === 0) M[S.a_8D72] = pick(rnd, [0x52, 0xAA, rnd(256)]);
  if (rnd(3) === 0) M[S.guards_left] = rnd(8);
  if (rnd(3) === 0) M[S.tguard_timer] = pick(rnd, [0, 1, 2]);
  if (rnd(3) === 0) M[S.guard_delay] = rnd(3);
  if (rnd(3) === 0) M[S.on_ground] = rnd(2);
  if (rnd(4) === 0) M[S.time_over] = rnd(2);
  if (rnd(4) === 0) M[S.at_top] = rnd(2);
  if (rnd(4) === 0) M[S.to_ladder] = pick(rnd, [0, 1, 0xFF]);
  if (rnd(4) === 0) M[S.tcpu_delay] = rnd(3);
  if (rnd(4) === 0) M[S.scroll_steps] = rnd(3);
  if (rnd(4) === 0) M[S.rear_columns] = pick(rnd, [0, 0x1D, 0x1E, rnd(40)]);
  if (rnd(4) === 0) M[S.left_behind_flag] = rnd(2);
  if (rnd(4) === 0) M[S.train_done] = rnd(2);
  if (rnd(3) === 0) for (const k of ['wheel_timer', 'rods_timer', 'driver_timer', 'tclock_timer']) M[S[k]] = rnd(3);
  if (rnd(3) === 0) { M[S.loco_shown] = rnd(2); M[S.driver_shown] = rnd(2); M[S.rods_frame] = rnd(4); M[S.driver_frame] = rnd(3); }
  if (rnd(3) === 0) { const p = 0x2610 + rnd(0xE0); M[0x04] = p & 255; M[0x05] = p >> 8; }
  if (rnd(4) === 0) { M[S.fine_scroll] = rnd(8); M[S.view_col] = 1 + rnd(2); }
};
const T = (name, setup = fight, o = {}) => Object.assign({ name, setup, outs: [] }, o);
const plain = ['trn_train_machine', 'trn_train_keys_one', 'trn_attacker_stick', 'trn_defender_stick', 'trn_train_key_scan',
  'trn_train_sort', 'trn_train_sprite_copy', 'trn_train_clear', 'trn_train_right_step', 'trn_train_left_step', 'trn_train_rear',
  'trn_train_view_draw', 'trn_train_colours', 'trn_train_scroll', 'trn_train_timers', 'trn_train_wheels', 'trn_train_rods_frame',
  'trn_train_driver_frame', 'trn_train_rods', 'trn_train_driver', 'trn_train_clock', 'trn_boot_run', 'trn_train_setup',
  'trn_train_progress', 'trn_sprite_list_clear', 'trn_train_random', 'trn_track_step', 'trn_track_draw', 'trn_bands_scroll',
  'trn_far_band_draw', 'trn_near_band_draw', 'trn_driver_stop', 'trn_left_behind', 'trn_guards_colour',
  'trn_fighters_to_sprites', 'trn_fighter_pictures', 'trn_attacker_orders', 'trn_attacker_duck', 'trn_attacker_strike',
  'trn_attacker_floor', 'trn_guard_floor', 'trn_ladder_up', 'trn_climb_up', 'trn_climb_down', 'trn_attacker_ground',
  'trn_attacker_lands', 'trn_guard_ground', 'trn_guard_ledge', 'trn_attacker_ledge', 'trn_guard_lands', 'trn_knives_draw',
  'trn_guards_draw', 'trn_knives_to_sprites', 'trn_guard_with_view', 'trn_guard_gone', 'trn_knives_fly', 'trn_at_start',
  'trn_time_up', 'trn_knife_hits', 'trn_defender_orders', 'trn_guard_fight', 'trn_guard_move', 'trn_guard_start',
  'trn_computer_attacker'];
const list = [
  ...plain.map(n => T(n, fight, { cases: /orders|computer|pictures/.test(n) ? 1500 : undefined })),
  T('trn_fighter_strike', (M, c, rnd) => { fight(M, c, rnd); return { y: rnd(2) }; }, { outs: ['y'] }),
  T('trn_fighter_throw', (M, c, rnd) => { fight(M, c, rnd); return { y: rnd(2) }; }, { outs: ['y'] }),
  T('trn_train_sound', (M, c, rnd) => ({ a: rnd(0x20) })),
  T('trn_train_tile_column', (M, c, rnd) => { fight(M, c, rnd); return { a: rnd(0x16) }; }, { cases: 200 }),
  T('trn_train_all_columns', fight, { cases: 20 }),
];
module.exports = { fight, list };
if (require.main === module) {
  const filter = process.argv[2] || '', cases = +(process.argv[3] || 800);
  const f = checks(list.filter(o => o.name.includes(filter)), { part: 'trn', cases });
  process.exitCode = f ? 1 : 0;
}
