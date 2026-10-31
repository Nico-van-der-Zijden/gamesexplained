'use strict';
// The strategic map's plain routines alone against the game's (check.js), from the map's moments:
// the drawing (flags, armies, panels, the band, the counts), the figures and the sprite list, the
// cursor and the input, the rules (joins, surrounding, the strategic battle's rounds, the railway,
// the gold) and the computer's scores, each on states made from the moments with the sides, the
// levels, the options and the armies changed at random. Routines that wait are the lockstep's.
//   node port/test/t-map.js [name filter] [cases]
const { checks } = require('./check.js');
const S = (globalThis.NSSyms || (require('../src/syms.js'), globalThis.NSSyms)).map;
const R = globalThis.NSSyms.res;
const pick = (rnd, a) => a[rnd(a.length)];
// the war in any state: sides, owners and armies changed at random
const war = (M, c, rnd) => {
  if (rnd(3) === 0) for (let t = 0; t < 26; t++) {
    const k = rnd(4);
    if (k === 0) { M[S.army_side + t] = 0xFF; M[S.territory_owner + t] = pick(rnd, [0, 1, 0xFF]); }
    else if (k === 1) { M[S.army_side + t] = rnd(2); M[S.territory_owner + t] = 0xFF;
      M[S.army_infantry + t] = rnd(19); M[S.army_cavalry + t] = rnd(10); M[S.army_cannon + t] = rnd(4); }
  }
  M[S.side_to_play] = rnd(2);
  M[R.level] = rnd(3); M[R.level + 1] = rnd(3);
  M[R.cpu_union] = rnd(2); M[R.cpu_confed] = rnd(2);
  for (const k of [R.opt_indians, R.opt_storm, R.opt_reinforcements, R.opt_arcade, R.opt_keyboard]) M[k] = rnd(2);
  M[S.cloud_territory] = rnd(26);
  M[S.ai_plan_now] = rnd(5);
  M[S.ai_army] = rnd(26);
  M[S.cursor_target] = rnd(27);
  M[S.move_from] = rnd(26); M[S.move_to] = rnd(26); M[S.march_from] = rnd(26); M[S.march_to] = rnd(26);
  for (let i = 0; i < 6; i++) if (rnd(2)) M[S.map_rnd_seeds + i] = rnd(256);
};
// a list of the side's armies that may move, as list_armies makes it
const moves = (M, rnd) => {
  let y = 0;
  for (let t = 25; t >= 0; t--) if (M[S.army_side + t] === M[S.side_to_play] && rnd(4)) M[S.may_move + y++] = t;
  for (; y < 26; y++) M[S.may_move + y] = 0xFF;
};
const figures = (M, c, rnd) => {
  for (const k of ['march_on', 'bomb_on', 'after_smoke_on', 'intercept_on', 'flag_wave_on', 'train_on', 'train_moving', 'ship_on',
    'smoke_on', 'bag_on', 'bank_on', 'indians_attack', 'indians_rider']) M[S[k]] = rnd(3) ? 0 : 1;
  for (const k of ['cloud_frame', 'after_smoke_frame', 'intercept_frame1', 'intercept_frame2', 'figure_frame', 'train_frame', 'bag_stage']) M[S[k]] = rnd(3);
  for (const k of ['bomb_left', 'after_smoke_wait', 'intercept_wait', 'intercept_steps', 'flag_wave_wait_1', 'flag_wave_wait_2', 'cloud_wait',
    'smoke_frame_wait', 'smoke_wait', 'bag_fall_wait', 'indians_wait', 'indians_delay', 'train_wait', 'count_wait']) M[S[k]] = rnd(4);
  M[S.list_length] = rnd(20);
  M[S.banks] = rnd(9); M[S.banks + 1] = rnd(9); M[S.gold_side] = rnd(2);
  M[S.intercept_steps] = rnd(4) ? rnd(22) : 0xFF - rnd(3);
};
const input = (M, c, rnd) => {
  c.game.keys = new Set();
  if (rnd(2)) c.game.keys.add(pick(rnd, [0x29, 0x2A, 0x0C, 0x17, 0x3C, 0x3D, 0x0A]));
  c.game.joy = 0x1F & ~rnd(32); c.game.joy1 = 0x1F & ~rnd(32);
  M[S.map_key] = pick(rnd, [0x50, 0x4C, 0x5A, 0x58, 0x20, 0x02, 0xFF, rnd(256)]);
  M[S.input_wait] = rnd(3) ? 0 : rnd(12);
  M[S.direction] = rnd(5); M[S.gliding] = rnd(2); M[S.glide_every] = rnd(2);
  M[S.cursor_point] = rnd(27); M[S.cursor_target] = rnd(27);
  M[S.map_joy_dx] = pick(rnd, [0, 1, 0xFF]); M[S.map_joy_dy] = pick(rnd, [0, 1, 0xFF]);
};
const all = (M, c, rnd) => { war(M, c, rnd); figures(M, c, rnd); input(M, c, rnd); moves(M, rnd); };
const T = (name, setup = all, o = {}) => Object.assign({ name, setup, outs: [] }, o);
const list = [
  T('map_map_rnd', all, { outs: ['a', 'c'] }),
  T('map_read_joy2_map', input, { outs: ['a', 'x', 'y'] }), T('map_read_joy1_map', input, { outs: ['a', 'x', 'y'] }),
  T('map_read_key_map', input, { outs: ['a', 'x', 'y'] }),
  T('map_mux_sort', (M, c, rnd) => { for (let i = 0; i < 32; i++) { M[S.mux_order + i] = i; M[S.mux_y + i] = rnd(4) ? rnd(256) : 0xE8; } }),
  T('map_draw_picture', (M, c, rnd) => ({ a: rnd(9), x: rnd(22) }), { cases: 600 }),
  T('map_storm_start'), T('map_storm_show'), T('map_storm_step'), T('map_storm_step_place'), T('map_storm_next', all, { outs: ['x', 'y'] }),
  T('map_march_step_place'), T('map_march_show'), T('map_list_to_mux', (M, c, rnd) => { M[S.map_drawing] = rnd(4) ? 0 : 1; }),
  T('map_mexican_throw'), T('map_smoke_start'), T('map_bomb_step'), T('map_bomb_show'), T('map_smoke_show'),
  T('map_intercept_start', all, { outs: ['x'] }), T('map_intercept_show'), T('map_intercept_step'), T('map_flag_wave'),
  T('map_cursor_sprite', all, { outs: ['a'] }),
  // battle_round is checked inside auto_battle: when a side falls back its two pla leave its caller
  T('map_territory_blink', (M, c, rnd) => { all(M, c, rnd); M[S.blink_on] = rnd(2); M[S.march_on] = rnd(2); M[S.blink_pos] = rnd(4);
    M[S.choose_list] = 0x6A; M[S.choose_list_hi] = 0x0E;
    // a list new_army flashes is never empty
    if (M[S.may_move] & 0x80) M[S.may_move] = rnd(26); }),
  T('map_map_show', all, { cases: 60 }), T('map_map_colour', all, { cases: 60 }), T('map_list_clear', all, { outs: ['a', 'y'] }),
  T('map_train_show'), T('map_train_anim'), T('map_map_timers'), T('map_mexican_show'),
  T('map_train_start', (M, c, rnd) => { all(M, c, rnd); return { x: rnd(15) }; }, { outs: ['x'] }),
  T('map_line_setup', (M, c, rnd) => { for (const k of ['point_x', 'line_x_hi', 'point_y', 'line_to_x', 'line_to_x_hi', 'line_to_y']) M[S[k]] = k.endsWith('hi') ? rnd(2) : rnd(256);
    M[S.line_x_done] = 0; M[S.line_y_done] = 0; }),
  T('map_line_x', (M, c, rnd) => { M[S.line_x_done] = rnd(4) ? 0 : 1; M[S.line_x_dir] = pick(rnd, [1, 0xFF]); M[S.point_x] = rnd(256); M[S.line_x_hi] = rnd(2);
    M[S.line_to_x] = (M[S.point_x] + pick(rnd, [1, 0xFF, 2, 0])) & 255; M[S.line_to_x_hi] = rnd(2); }),
  T('map_line_y', (M, c, rnd) => { M[S.line_y_done] = rnd(4) ? 0 : 1; M[S.line_y_dir] = pick(rnd, [1, 0xFF]); M[S.point_y] = rnd(256);
    M[S.line_to_y] = (M[S.point_y] + pick(rnd, [1, 0xFF, 2])) & 255; }),
  T('map_line_step_x', (M, c, rnd) => { M[S.line_count] = rnd(3); M[0x1DCF] = rnd(5); M[S.line_x_done] = rnd(2); }),
  T('map_line_step_y', (M, c, rnd) => { M[S.line_count] = rnd(3); M[0x1DA4] = rnd(5); M[S.line_y_done] = rnd(2); }),
  T('map_train_step_place'),
  T('map_draw_flag', (M, c, rnd) => { all(M, c, rnd); return { x: rnd(27) }; }, { outs: ['x'] }),
  T('map_flag_place', (M, c, rnd) => ({ x: rnd(27) }), { outs: ['x'] }),
  T('map_draw_army', (M, c, rnd) => { all(M, c, rnd); return { x: rnd(26) }; }, { outs: ['x'] }),
  T('map_army_place', (M, c, rnd) => ({ x: rnd(26) }), { outs: ['x'] }),
  T('map_row_address', (M, c, rnd) => ({ y: rnd(25) }), { outs: ['y'] }),
  T('map_column_address', (M, c, rnd) => { const a = rnd(40); return { a, y: rnd(8) ? a : 0 }; }, { outs: ['y'] }),
  T('map_draw_changes', (M, c, rnd) => { all(M, c, rnd); M[S.drawing_changes] = rnd(5) ? 0 : 1;
    for (let t = 0; t < 26; t++) { if (rnd(3) === 0) M[S.army_drawn + t] = pick(rnd, [0, 1, 0xFF]); if (rnd(3) === 0) M[S.owner_drawn + t] = pick(rnd, [0, 1, 0xFF]); } }),
  T('map_save_flag_bg', (M, c, rnd) => ({ a: rnd(26) }), { outs: ['a'] }), T('map_save_army_bg', (M, c, rnd) => ({ a: rnd(26) }), { outs: ['a'] }),
  T('map_save_flags_bg', all, { cases: 40 }), T('map_save_armies_bg', all, { cases: 40 }),
  T('map_save_window', (M, c, rnd) => ({ a: rnd(8), x: rnd(22) }), { outs: ['a', 'x'] }),
  T('map_panel_restore', (M, c, rnd) => { M[0x340F] = rnd(8); }),
  T('map_panel_fort'), T('map_panel_intercept'), T('map_panel_fort_step', (M, c, rnd) => ({ a: rnd(4) })),
  T('map_panel_intercept_step', (M, c, rnd) => ({ a: rnd(3) })), T('map_panel_bank', (M, c, rnd) => ({ x: rnd(2) })),
  T('map_panel_bank_save', (M, c, rnd) => ({ x: rnd(2) }), { outs: ['a', 'x'] }),
  T('map_panel_scroll', all, { outs: ['a', 'x', 'y'] }),
  T('map_panel_column', (M, c, rnd) => { M[S.battle_scroll_column] = rnd(10); const s = pick(rnd, [0xA454, 0xA0D0, 0xAB5C]) + 8 * rnd(10);
    M[0x20FF] = s & 255; M[0x2100] = s >> 8; M[S.scenery_lo] = s & 255; M[S.scenery_hi] = s >> 8;
    M[0x215C] = 0x24; M[0x215D] = 0xA7; M[0x2162] = 0x7E; M[0x2163] = 0xA7; }, { outs: ['x', 'y'] }),
  T('map_smoke_sprite'), T('map_smoke_anim'), T('map_cannon_smoke_show'),
  T('map_ship_start'), T('map_ship_show'),
  T('map_map_input'), T('map_map_keys'), T('map_cursor_aim'), T('map_cursor_glide'),
  T('map_flash_list', (M, c, rnd) => { all(M, c, rnd); M[0x285B] = 0x6A; M[0x285C] = 0x0E; }, { cases: 150 }),
  T('map_swap_grey', (M, c, rnd) => ({ a: rnd(256) }), { outs: ['a'] }),
  T('map_army_counts', (M, c, rnd) => { all(M, c, rnd); M[S.count_hold] = rnd(5) ? 0 : 1; M[S.count_wait] = rnd(3);
    M[S.count_side] = pick(rnd, [0, 1, 0xFF]); M[S.choosing] = rnd(2); M[S.flashing] = rnd(2); M[S.flash_phase] = rnd(2); }),
  T('map_draw_counts'), T('map_draw_number', (M, c, rnd) => { M[0x3AFA] = 8; M[0x3AFB] = 0x58; M[0x3B00] = 0x48; M[0x3B01] = 0x59; return { a: rnd(20) }; }),
  T('map_draw_month', (M, c, rnd) => { M[S.month] = rnd(12); }), T('map_draw_year', (M, c, rnd) => { M[R.start_year] = rnd(8); }),
  T('map_indians_reset'), T('map_indians_show'), T('map_indians_anim'), T('map_indian_to_army', (M, c, rnd) => { M[S.indians_target] = rnd(2); }, { outs: ['y'] }),
  T('map_setup_1861'), T('map_setup_1862'), T('map_setup_1863'), T('map_setup_1864'),
  T('map_year_setup', (M, c, rnd) => { M[R.start_year] = rnd(4); }),
  T('map_too_big', (M, c, rnd) => { all(M, c, rnd); return { a: rnd(26) }; }, { outs: ['a', 'x', 'y', 'c'] }),
  T('map_list_armies', (M, c, rnd) => { all(M, c, rnd); return { a: rnd(2) }; }, { outs: ['a', 'x', 'y'] }),
  T('map_list_clear_moves', all, { outs: ['a', 'y'] }),
  T('map_in_list', (M, c, rnd) => { all(M, c, rnd); M[S.choose_list] = pick(rnd, [0x6A, 0x87]); M[S.choose_list_hi] = 0x0E; }, { outs: ['z'] }),
  T('map_auto_battle', (M, c, rnd) => { all(M, c, rnd); for (let s = 0; s < 2; s++) { M[R.units_inf + s] = rnd(19); M[R.units_cav + s] = rnd(10); M[R.units_cannon + s] = rnd(4);
    M[R.fell_back + s] = 0; M[R.side_out + s] = 0; } }),
  T('map_hit_chance', (M, c, rnd) => { all(M, c, rnd); return { y: rnd(2) }; }, { outs: ['a', 'x', 'y', 'c'] }),
  T('map_surround'),
  T('map_bag_start'), T('map_bag_show'), T('map_bag_fall', (M, c, rnd) => { M[S.bag_x] = pick(rnd, [0x2E, 0x55, 0x45, 0x46]); }), T('map_bag_step'), T('map_bags_show'),
  T('map_find_rail', all, { outs: ['x', 'c'] }),
  T('map_ai_plan'), T('map_ai_base'), T('map_ai_moved_clear'),
  T('map_ai_plan_scores', (M, c, rnd) => { all(M, c, rnd); for (let t = 0; t < 26; t++) M[S.ai_score + t] = rnd(4) ? rnd(16) : rnd(256); }),
  T('map_army_steps', (M, c, rnd) => { all(M, c, rnd); return { y: rnd(26) }; }, { outs: ['x', 'y'] }),
  T('map_ai_occupied', (M, c, rnd) => { all(M, c, rnd); for (let t = 0; t < 26; t++) { M[S.ai_score + t] = rnd(30); M[S.ai_sent + t] = pick(rnd, [0, 0xFF]); } }),
  T('map_ai_distance', (M, c, rnd) => { all(M, c, rnd); for (let t = 0; t < 26; t++) M[S.ai_score + t] = rnd(60); }),
  T('map_distance_ring', (M, c, rnd) => { for (let t = 0; t < 26; t++) M[S.ai_dist + t] = rnd(2) ? 0xFF : rnd(3); return { a: rnd(3) }; }),
  T('map_ai_noise', (M, c, rnd) => { all(M, c, rnd); for (let t = 0; t < 26; t++) M[S.ai_score + t] = rnd(40); }),
  T('map_noise', (M, c, rnd) => ({ a: rnd(4) ? rnd(30) : rnd(256), x: rnd(3) }), { outs: ['a', 'x'] }),
  T('map_ai_best', (M, c, rnd) => { for (let t = 0; t < 26; t++) M[S.ai_score + t] = rnd(30); }),
  T('map_ai_step', (M, c, rnd) => { all(M, c, rnd);
    // distances as ai_distance leaves them, from a random army
    for (let t = 0; t < 26; t++) M[S.ai_dist + t] = 0xFF;
    const a = rnd(26); M[S.ai_dist + a] = 0;
    for (let ring = 0; ring < 3; ring++) for (let t = 0; t < 26; t++) if (M[S.ai_dist + t] === ring) {
      const l = M[S.neighbours + 2 * t] | M[S.neighbours_c189 + 2 * t] << 8;
      for (let x = 0; !(M[l + x] & 0x80); x++) if (M[S.ai_dist + M[l + x]] === 0xFF) M[S.ai_dist + M[l + x]] = ring + 1;
    }
    const near = []; for (let t = 0; t < 26; t++) if (M[S.ai_dist + t] >= 1 && M[S.ai_dist + t] <= 3) near.push(t);
    if (!near.length) return { skip: true };
    M[S.move_to] = pick(rnd, near); }, { outs: ['a', 'y'] }),
  T('map_map_video', all, { cases: 60 }), T('map_screen_off', all, { cases: 60 }),
  T('map_play_sound', (M, c, rnd) => ({ a: rnd(31) }), { outs: ['x', 'y'] }),
];
const filter = process.argv[2] || '', cases = +(process.argv[3] || 800);
const f = checks(list.filter(o => o.name.includes(filter)), { part: 'map', cases });
process.exitCode = f ? 1 : 0;
