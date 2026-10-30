'use strict';
// The battle's plain routines alone against the game's (check.js), from the battle's moments: the
// objects drawn and their pictures, the units' orders, moves and edges, the computer, the shots
// and hits, the gauges, the fields' unpacking and the end, on states made from the moments with
// the side, the levels, the players, the sticks and the units changed at random.
//   node port/test/t-bat.js [name filter] [cases]
const { checks } = require('./check.js');
require('../src/syms.js');
const S = globalThis.NSSyms.bat, R = globalThis.NSSyms.res;
const pick = (rnd, a) => a[rnd(a.length)];
const war = (M, c, rnd) => {
  M[S.side] = rnd(2);
  M[R.level] = rnd(3); M[R.level + 1] = rnd(3);
  M[R.cpu_union] = rnd(2); M[R.cpu_confed] = rnd(2); M[R.opt_keyboard] = rnd(2);
  M[S.battle_key] = pick(rnd, [0xFF, 0xFF, 4, 5, 6, 7]);
  M[S.stick_x] = pick(rnd, [0, 1, 0xFF]); M[S.stick_y] = pick(rnd, [0, 1, 0xFF]); M[S.stick_fire] = rnd(2);
  M[S.unit_choice] = rnd(3); M[S.a_8296] = rnd(3);
  for (let i = 0; i < 6; i++) if (rnd(2)) M[S.rnd_sum + i] = rnd(256);
  for (let y = 0; y < 2; y++) {
    if (rnd(3) === 0) { M[R.units_inf + y] = rnd(19); M[R.units_cav + y] = rnd(10); M[R.units_cannon + y] = rnd(4); }
    for (const k of ['inf_state', 'cav_state', 'can_state']) if (rnd(3) === 0) M[S[k] + y] = rnd(k === 'cav_state' ? 4 : 3);
    for (const k of ['inf_dir', 'cav_dir', 'can_dir']) if (rnd(3) === 0) M[S[k] + y] = rnd(4);
    for (const k of ['inf_formation', 'cav_formation', 'inf_reforming', 'cav_turning', 'inf_arriving', 'cav_arriving', 'can_arriving',
      'inf_fallback', 'cav_fallback', 'can_leaving', 'can_fired', 'inf_at_top', 'inf_at_bottom', 'inf_at_left', 'inf_at_right',
      'cav_at_top', 'cav_at_bottom', 'can_at_top', 'can_at_bottom']) if (rnd(4) === 0) M[S[k] + y] = rnd(2);
    if (rnd(3) === 0) M[S.ai_cav_plan + y] = rnd(7);
    if (rnd(3) === 0) M[S.cannon_shots + y] = rnd(10);
    if (rnd(3) === 0) M[S.cannon_range + y] = rnd(32);
    if (rnd(4) === 0) M[S.cannon_reserve + y] = rnd(3);
    if (rnd(4) === 0) M[R.retreat_to + y] = pick(rnd, [0xFF, rnd(26)]);
    if (rnd(4) === 0) M[R.fell_back + y] = rnd(2);
  }
  for (let t = 0; t < 15; t++) if (rnd(3) === 0) M[S.choose_wait + t] = rnd(3);
  for (let x = 0; x < 20; x++) if (rnd(5) === 0) M[S.obj_fall + x] = pick(rnd, [0, 0, 1, 2, 3, 8, 9, 0x0B]);
  for (let x = 0; x < 8; x++) if (rnd(4) === 0) { M[S.shot_live + x] = pick(rnd, [0, 0xFF]); M[S.shot_landed + x] = rnd(2); }
  M[S.field_type] = rnd(4) ? M[S.field_type] : rnd(3);
  const t = M[S.field_type] === 1 ? S.canyon_hazard : S.river_hazard;
  M[0x50] = t & 255; M[0x51] = t >> 8;
  // the routines of a side are entered with Y the side, as their callers have it
  return { y: M[S.side] };
};
const T = (name, setup = war, o = {}) => Object.assign({ name, setup, outs: [] }, o);
const list = [
  T('bat_battle_timers', war, { outs: ['x'] }), T('bat_battle_machine', war, { cases: 60 }),
  T('bat_stick_port2', war, { outs: ['a', 'x', 'y'] }), T('bat_stick_port1', war, { outs: ['a', 'x', 'y'] }),
  T('bat_key_scan', (M, c, rnd) => { c.game.keys = new Set(rnd(2) ? [pick(rnd, [0x0C, 0x17, 0x29, 0x2A, 0x3C, 0x0E])] : []); }, { outs: ['a', 'x', 'y'] }),
  T('bat_sprite_sort', (M, c, rnd) => { for (let i = 0; i < 32; i++) { M[S.sort_order + i] = i; M[S.live_y + i] = rnd(256); } }),
  T('bat_bat_picture', (M, c, rnd) => ({ a: rnd(13), x: pick(rnd, [0, 3, 4, 7, 8, 9, 10, 11, 12, 13, 14, 21, 22, 23, 24, 25, 26]) }), { cases: 400 }),
  T('bat_sprite_copy', war, { outs: ['x'] }), T('bat_sprite_clear', war, { outs: ['a'] }),
  T('bat_gauge_places', war, { outs: ['x'] }), T('bat_gauge_save'), T('bat_gauge_clear'), T('bat_gauge_draw'),
  T('bat_gauge_restore_side', war, { outs: ['x'] }),
  T('bat_bat_random', war, { outs: ['a'] }), T('bat_field_unpack', war, { cases: 30 }), T('bat_field_scenery', war, { cases: 100 }),
  T('bat_unit_icons'),
  T('bat_draw_objects', (M, c, rnd) => { war(M, c, rnd); for (let x = 0; x < 20; x++) if (rnd(3) === 0) M[S.obj_redraw + x] = 1; }, { cases: 400 }),
  // an object off the field's right edge leaves through its caller's code (pla, pla, jmp $91F7),
  // which draw_objects' check holds
  T('bat_place_object', (M, c, rnd) => { const y = rnd(20); return M[S.obj_x + y] >= 0x94 ? { skip: true } : { y }; }, { outs: ['y'] }),
  T('bat_build_mask', (M, c, rnd) => { M[S.draw_pic_no] = rnd(78); return { y: rnd(20) }; }, { outs: ['y'] }),
  T('bat_cover_sprite', (M, c, rnd) => ({ y: rnd(20) }), { outs: ['y'] }), T('bat_cover_off'),
  T('bat_pick_lane', (M, c, rnd) => { war(M, c, rnd); for (let x = 0; x < 8; x++) M[S.lanes_taken + x] = rnd(4) ? 0 : 1;
    for (let x = 0; x < 4; x++) M[S.lanes_taken + 4 * M[S.side] + x] = x === rnd(4) ? 0 : M[S.lanes_taken + 4 * M[S.side] + x]; }, { outs: ['x'] }),
  T('bat_lanes_clear', war, { outs: ['a', 'x'] }), T('bat_bat_sound', (M, c, rnd) => ({ a: rnd(31) }), { outs: ['x', 'y'] }),
  T('bat_bring_infantry'), T('bat_bring_cavalry'), T('bat_bring_cannon_first'), T('bat_bring_cannon'),
  T('bat_infantry_pictures', war, { cases: 400 }), T('bat_cavalry_pictures', war, { cases: 400 }), T('bat_cannon_pictures', war, { cases: 400 }),
  T('bat_choose_unit'), T('bat_unit_skip', war, { outs: ['x'] }), T('bat_unit_check'), T('bat_person_input'),
  T('bat_battle_orders', war, { cases: 1500 }), T('bat_cavalry_orders'), T('bat_cannon_orders'),
  T('bat_computer_orders', war, { cases: 1500 }), T('bat_computer_fallback'), T('bat_computer_infantry'), T('bat_computer_cavalry'),
  T('bat_computer_cannon'), T('bat_own_soldier', war, { outs: ['x'] }), T('bat_own_rider', war, { outs: ['x'] }),
  T('bat_nearest_by_y', (M, c, rnd) => { return Object.assign(war(M, c, rnd), { a: rnd(256) }); }, { outs: ['a', 'x'] }),
  T('bat_nearest_by_x', (M, c, rnd) => { return Object.assign(war(M, c, rnd), { a: rnd(256) }); }, { outs: ['a', 'x'] }),
  T('bat_cannon_anim'), T('bat_infantry_tick', war, { cases: 400 }), T('bat_cannon_move_tick'), T('bat_cannon_move'),
  T('bat_infantry_move'), T('bat_infantry_reform'), T('bat_cavalry_move'), T('bat_cavalry_turn'), T('bat_hazards'),
  T('bat_bullet_hits', (M, c, rnd) => { return Object.assign(war(M, c, rnd), { x: rnd(8) }); }, { outs: ['x'] }),
  T('bat_cannon_left_field'), T('bat_cannon_arrived'), T('bat_infantry_arrived'), T('bat_infantry_gone'),
  T('bat_infantry_reform_start', war, { outs: ['a'] }), T('bat_infantry_fire'),
  T('bat_bullet_start', (M, c, rnd) => ({ x: rnd(12), y: rnd(6) }), { outs: ['x', 'y'] }),
  T('bat_infantry_go', (M, c, rnd) => { return Object.assign(war(M, c, rnd), { a: rnd(4) }); }),
  T('bat_cavalry_charge'), T('bat_cavalry_rear'), T('bat_cavalry_go', (M, c, rnd) => { return Object.assign(war(M, c, rnd), { a: rnd(4) }); }),
  T('bat_cannon_aim'), T('bat_cannon_go', (M, c, rnd) => { return Object.assign(war(M, c, rnd), { a: rnd(4) }); }),
  T('bat_shots_to_sprites'), T('bat_cannon_fire'), T('bat_shots_move'), T('bat_balls_land', war, { outs: ['x'] }),
  T('bat_cannon_hit_gauge', (M, c, rnd) => { war(M, c, rnd); M[S.cannon_hit] = rnd(2); M[S.cannon_hit_slot] = pick(rnd, [0x12, 0x13, rnd(20)]); }),
  T('bat_charge_hits', (M, c, rnd) => { return Object.assign(war(M, c, rnd), { x: rnd(6) }); }, { outs: ['x', 'y'] }),
  T('bat_ball_crater', (M, c, rnd) => { war(M, c, rnd); M[S.bridge_hits] = rnd(5); return { x: 6 + rnd(2) }; }, { outs: ['x'] }),
  T('bat_bridge_break'), T('bat_fall_back'), T('bat_bring_reserves'),
  T('bat_fallback_done'), T('bat_wiped_out'),
];
const filter = process.argv[2] || '', cases = +(process.argv[3] || 800);
// the processor port as the main loop has it: a few moments were saved inside a drawing routine with
// the chips switched out ($01 = $34), which those routines set for themselves
const f = checks(list.filter(o => o.name.includes(filter)), { part: 'bat', cases, port: 0x35 });
process.exitCode = f ? 1 : 0;
