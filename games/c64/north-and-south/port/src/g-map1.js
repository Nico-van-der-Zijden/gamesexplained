// The strategic map (files M2, M1 and M3, $0C00-$C4FF and $E000-$FFF9), first part: the main
// loop, the calls of the arcade parts, the machine's set-up, the frame interrupt and the sprite
// multiplexer, the moving figures and the line they move along. The war's rules, the players'
// turns, the computer and the drawing are in g-map2.js to g-map4.js. Its sound driver ($F128)
// is the game's own code run on the kit's 6502 (P.run6502).
//
// The frame interrupt ($10C6) does most of the frame's work with interrupts on again: the
// figures, the cursor, the flags and the counts. The main program waits for its timers in
// polling loops. The Commodore key, when the computer plays both sides, leaves the map from
// inside the interrupt (map_exit): the port's handler sets P.mapQuit, and the main program,
// told at its next yield (P.mapGuard), unwinds to the script.
(function (root) {
'use strict';
const G = root.NSGroups = root.NSGroups || {};
G.map = function (P) {
  const M = P.M, S = root.NSSyms.map, R = root.NSSyms.res;
  for (const n of `map_map_main map_fort_sequence map_train_sequence map_battle_sequence map_reload_map map_game_won
    map_check_win map_storm_move map_move_army_figure map_mexican map_panel_anim map_train_ride map_line_move map_wait_2
    map_map_irq_on map_arcade_back`.split(/\s+/)) P.GEN.add(n);
  P.PASS.map = 0x0C42;
  P.STEP_PASSES = P.STEP_PASSES || {};
  P.STEP_PASSES.map = [0x0C42, 0x0C45, 0x0C48, 0x0C4B, 0x0C4E, 0x0C51, 0x0C54, 0x0C57, 0x0C5A, 0x0C5D, 0x0C60];
  // the main loop's calls, and the raster read the seed takes
  // and where each arcade part returns to the map ($0C95 the fort, $0CA3 the train, $0CB1 the battle)
  P.CPS.map = [0x0C15, 0x0C42, 0x0C45, 0x0C48, 0x0C4B, 0x0C4E, 0x0C51, 0x0C54, 0x0C57, 0x0C5A, 0x0C5D, 0x0C60, 0x0C95, 0x0CA3, 0x0CB1];
  P.ARCADE_BACK = { frt: 0x0C95, trn: 0x0CA3, bat: 0x0CB1 };
  P.IRQS.map = { 0x10C6: 'map_map_irq_frame', 0x1182: 'map_mux_first', 0x11E7: 'map_mux_next' };
  const T = { train_wait: S.train_wait, line_wait: S.line_wait, anim_frames: S.anim_frames, frame_wait: S.frame_wait,
    ship_wave_wait: S.ship_wave_wait, ship_wait: S.ship_wait, mexican_wait: S.mexican_wait, anim_wait: S.anim_wait, flash_wait: S.flash_wait };
  // and the random numbers' six bytes, which the frame interrupt draws from too ($10C6)
  P.IRQ_BYTES.map = (P.IRQ_BYTES.map || []).concat(Object.values(T), [S.map_rnd_seeds, S.rnd_2, S.rnd_3, S.rnd_4, S.rnd_5, S.rnd_6]);
  // the operands that keep a register: mux_next's A, X and Y (the interrupted program's), play_sound's
  // X and Y, panel_scroll's A, X and Y, reinforce's Y
  P.IGNORE.map = [0x1255, 0x1257, 0x1259, 0x3FB0, 0x3FB2, 0x20EA, 0x20EC, 0x20EE, 0x344E];
  const cp = function* (a) { yield { cp: a, cycles: P.take() }; };
  // a polling loop on a timer the interrupt counts down: its first read is the stretch's, later
  // turns read what the interrupts the lockstep runs at each yield leave
  P.mapWaitZero = function* (a, cost = 7) { for (let v = P.pollFirst(a); v; v = M[a]) { P.spend(cost); yield; } };
  // a generator that must not wait, run to its end (a march from a territory to itself)
  P.now = function (g) { const r = g.next(); if (!r.done) throw new Error('P.now: the routine waited'); return r.value; };
  const sound = a => P.map_play_sound({ a });

  // map_main ($0C00): the war, a month a pass; it leaves through map_exit, never by returning
  class MapExit { }
  P.MapExit = MapExit;
  P.mapQuit = false;
  // r.from: a checkpoint of the main loop to resume at (a moment saved there), the set-up done
  P.map_map_main = function* (r = {}) {
    P.mapQuit = false;
    try {
      yield* P.mapGuard(mainLoop(r.from));
    } catch (e) {
      if (!(e instanceof MapExit)) throw e;
    }
    return {};
  };
  // runs g, and after each of its yields looks whether the frame interrupt has left the map
  P.mapGuard = function* (g) {
    let v;
    for (;;) {
      const r = g.next(v);
      if (r.done) return r.value;
      v = yield r.value;
      if (P.mapQuit) { g.return(); throw new MapExit(); }
    }
  };
  // the main loop's steps, each at the address of its call
  const STEPS = [
    [0x0C42, () => P.map_draw_month()], [0x0C45, () => P.map_draw_year()],
    [0x0C48, () => P.map_union_turn()], [0x0C4B, () => P.map_supply()], [0x0C4E, () => P.map_storm_move()],
    [0x0C51, () => P.map_indians()], [0x0C54, () => P.map_conf_turn()], [0x0C57, () => P.map_supply()],
    [0x0C5A, () => P.map_storm_move()], [0x0C5D, () => P.map_mexican()], [0x0C60, () => P.map_reinforcements()],
  ];
  const mainLoop = function* (from) {
    if (from === undefined) {
      M[0x0CF5] = 0xFD;                     // tsx: the script's call leaves the stack pointer at $FD
      M[R.months_tens] = 0; M[R.months_units] = 0;
      P.map_map_video();
      M[S.rnd_2] = M[0xA2];
      P.spend(30);
      yield* cp(0x0C15);
      M[S.rnd_5] = P.io.vicRead(0x12);
      M[S.rnd_6] = P.io.vicRead(0x11);
      P.map_list_clear();
      P.map_list_to_mux();
      P.map_mux_sort();
      P.map_map_show();
      P.map_save_flags_bg();
      P.map_save_armies_bg();
      P.map_year_setup();
      P.map_draw_changes();
      P.map_storm_start();
      P.map_indians_reset();
      yield* P.map_map_irq_on();
    }
    let i = from === undefined ? 0 : STEPS.findIndex(s => s[0] === from);
    if (i < 0) throw new Error('map_main: no step at $' + from.toString(16));
    for (;;) {
      for (; i < STEPS.length; i++) {
        yield* cp(STEPS[i][0]);
        const g = STEPS[i][1]();
        if (g && typeof g.next === 'function') yield* g;
      }
      i = 0;
      let a = M[S.month] + 1;
      if (a === 0x0C) { a = 0; M[R.start_year] = (M[R.start_year] + 1) & 255; }
      M[S.month] = a;
      a = M[R.months_units] + 1;
      if (a >= 0x0A) { M[R.months_tens] = (M[R.months_tens] + 1) & 255; a = 0; }
      M[R.months_units] = a;
      P.spend(40);
    }
  };
  // the arcade parts: each loads over the map and is called where M2 had map_colours ($8000)
  const arcade = function* (file, part, name) {
    P.map_screen_off();
    yield* P.res_load_file({ a: file });
    P.enter(part);
    yield* P[name]();
    P.enter('map');
    yield* P.map_arcade_back(part);
    return yield* P.map_reload_map();
  };
  // the map again where the part returns; a run resumed in the part goes on from here
  P.map_arcade_back = function* (part) { yield { cp: P.ARCADE_BACK[part], cycles: P.take() }; };
  P.map_fort_sequence = function* () { return yield* arcade(5, 'frt', 'frt_fort_main'); };
  P.map_train_sequence = function* () { return yield* arcade(6, 'trn', 'trn_train_main'); };
  P.map_battle_sequence = function* () { return yield* arcade(8, 'bat', 'bat_battle_main'); };
  P.map_reload_map = function* () {
    P.map_screen_off();
    yield* P.res_load_file({ a: 3 });
    P.spend(6);
    return {};
  };
  P.map_screen_off = function () {
    const io = P.io;
    io.vicWrite(0x1A, 0);
    io.vicWrite(0x19, io.vicRead(0x19));
    io.vicWrite(0x11, io.vicRead(0x11) & 0xEF);
    P.spend(30);
    return {};
  };
  // game_won ($0CCF): a pause of 2 x 65,536 turns, the ending asked for, and out
  P.map_game_won = function* () {
    yield { cycles: P.take() + 2 * (256 * (256 * 5 - 1 + 5) - 1 + 7) };
    M[R.no_ending] = 0;
    return P.map_map_exit();
  };
  // map_exit ($0CE3): sound 17, the raster interrupt off, and back to the script
  P.map_map_exit = function () {
    sound(0x11);
    const io = P.io;
    io.vicWrite(0x1A, 0);
    io.vicWrite(0x19, io.vicRead(0x19));
    P.spend(30);
    throw new MapExit();
  };
  // map_restore ($0CF8): the map set up again after an arcade part and the reload of M2
  P.map_map_restore = function* () {
    P.map_map_video();
    P.map_list_clear();
    P.map_list_to_mux();
    P.map_mux_sort();
    P.map_map_show();
    P.map_save_flags_bg();
    P.map_save_armies_bg();
    for (let x = 0x19; x >= 0; x--) { M[S.army_drawn + x] = 0xFF; M[S.owner_drawn + x] = 0xFF; }
    P.spend(26 * 14);
    P.map_draw_changes();
    yield* P.map_map_irq_on();
    P.map_draw_month();
    P.map_draw_year();
    P.map_draw_flag({ x: 0x1A });
    return {};
  };
  P.GEN.add('map_map_restore');
  // map_rnd ($0F1F), the title's generator on the map's bytes
  // every byte read as often and in the order the game reads it: the frame interrupt draws from the
  // same bytes, and a read in the main program is the value the game's read there
  P.map_map_rnd = function (r = {}) {
    const rd = r.irq ? (a => M[a]) : P.irqByte;
    let s = 1 + rd(S.rnd_2) + rd(S.rnd_5);
    s = (s & 255) + rd(S.rnd_6) + (s > 255 ? 1 : 0);
    M[S.map_rnd_seeds] = s & 255;
    M[S.rnd_6] = rd(S.rnd_5); M[S.rnd_5] = rd(S.rnd_4); M[S.rnd_4] = rd(S.rnd_3); M[S.rnd_3] = rd(S.rnd_2);
    M[S.rnd_2] = rd(S.map_rnd_seeds);
    P.spend(50);
    return { a: M[S.rnd_2], c: s > 255 ? 1 : 0 };
  };
  // check_win ($0F51): a side with no army has lost
  P.map_check_win = function* () {
    for (let a = 1; a >= 0; a--) {
      let found = false;
      for (let y = 0x19; y >= 0; y--) { P.spend(9); if (M[S.army_side + y] === a) { found = true; break; } }
      if (!found) { M[R.winner] = a ^ 1; P.spend(10); return yield* P.map_game_won(); }
      P.spend(6);
    }
    return {};
  };
  // map_video ($0F6B)
  P.map_map_video = function () {
    const io = P.io;
    M[1] = 0x35;
    io.ciaWrite(0x0D, 0x7F); io.cia2Write(0x0D, 0x7F);
    io.ciaWrite(0x0E, 0); io.cia2Write(0x0E, 0); io.ciaWrite(0x0F, 0); io.cia2Write(0x0F, 0);
    io.ciaRead(0x0D); io.cia2Read(0x0D); io.ciaRead(0x0D); io.cia2Read(0x0D);
    io.cia2Write(0x02, io.cia2Read(0x02) | 0x03);
    io.cia2Write(0x00, (io.cia2Read(0x00) & 0xFC) | 0x02);
    io.vicWrite(0x20, 0); io.vicWrite(0x21, 0); io.vicWrite(0x15, 0);
    io.vicWrite(0x18, 0x80); io.vicWrite(0x11, 0x2B); io.vicWrite(0x16, 0x18);
    io.vicWrite(0x19, io.vicRead(0x19));
    io.vicWrite(0x1A, 0);
    for (let x = 0; x < 0x20; x++) { M[S.mux_order + x] = x; M[S.mux_y + x] = 0; M[S.mux_x + x] = 0; }
    io.vicWrite(0x25, 0x0A); io.vicWrite(0x26, 0x00);
    M[0xFFFA] = 0xF9; M[0xFFFC] = 0xF9; M[0xFFFB] = 0x0F; M[0xFFFD] = 0x0F;
    P.spend(180 + 32 * 22);
    P.run6502(0xF128, {});
    return {};
  };
  // the sticks and the keys
  P.map_read_joy2_map = function () { P.io.ciaWrite(0x02, 0); P.spend(14); return P.map_joy_decode_map({ a: P.io.ciaRead(0x00) }); };
  P.map_read_joy1_map = function () { P.io.ciaWrite(0x03, 0); P.spend(14); return P.map_joy_decode_map({ a: P.io.ciaRead(0x01) }); };
  P.map_joy_decode_map = function (r) {
    let a = r.a, x = 0, y = 0;
    if (!(a & 1)) y--;
    if (!(a & 2)) y++;
    if (!(a & 4)) x--;
    if (!(a & 8)) x++;
    a = (a >> 4) & 1;
    M[S.map_joy_fire] = a; M[S.map_joy_dx] = x & 255; M[S.map_joy_dy] = y & 255;
    P.spend(40);
    return { a, x: x & 255, y: y & 255 };
  };
  P.map_read_key_map = function () {
    const io = P.io;
    io.ciaWrite(0x02, 0xFF); io.ciaWrite(0x03, 0x00);
    P.spend(14);
    let y = 0;
    for (let x = 7; x >= 0; x--) {
      M[0x19] = M[S.map_key_row_lo + x]; M[0x1A] = M[S.map_key_row_hi + x];
      io.ciaWrite(0x00, M[S.map_key_rows + x]);
      y = 7;
      const a = io.ciaRead(0x01);
      P.spend(30);
      if (a !== 0xFF) {
        for (; y >= 0; y--) {
          P.spend(9);
          if (a === M[S.map_key_rows + y]) { P.spend(12); return { a: M[((M[0x19] | M[0x1A] << 8) + y) & 0xFFFF], x, y }; }
        }
        y = 0xFF;
      }
      P.spend(5);
    }
    P.spend(8);
    return { a: 0xFF, x: 0xFF, y };
  };
  // map_irq_frame ($10C6), at line 224: the frame's work, with interrupts on again
  P.map_map_irq_frame = function () {
    const io = P.io;
    const v = io.vicRead(0x19);
    io.vicWrite(0x19, v); io.vicWrite(0x19, ((v << 1) | 1) & 255);
    io.vicWrite(0x12, 0);
    M[0xFFFE] = 0x82; M[0xFFFF] = 0x11;
    P.spend(40);
    P.map_list_to_mux();
    P.map_mux_sort();
    P.spend(10);
    if (!M[S.frame_busy]) {
      M[S.frame_busy]++;
      P.map_cursor_sprite();
      if (!M[S.sound_busy]) P.run6502(0xF12E, {});
      P.map_map_timers();
      P.spend(20);
      if (!M[S.map_drawing]) {
        M[S.map_drawing]++;
        P.map_list_clear();
        if (!M[S.panel_busy]) {
          P.map_mexican_show(); P.map_indians_show(); P.map_ship_show(); P.map_storm_show();
          P.map_march_show(); P.map_bomb_show(); P.map_train_show(); P.map_smoke_show();
        }
        P.map_cannon_smoke_show(); P.map_intercept_show(); P.map_flag_wave(); P.map_bags_show(); P.map_bag_show();
        M[S.map_drawing]--;
        P.spend(70);
      }
      P.map_smoke_anim(); P.map_storm_step(); P.map_train_anim(); P.map_intercept_step(); P.map_indians_anim();
      P.map_bag_step(); P.map_bomb_step();
      M[S.map_key] = P.map_read_key_map().a;
      P.map_map_input(); P.map_cursor_aim(); P.map_cursor_glide(); P.map_draw_changes(); P.map_army_counts();
      M[S.frame_busy]--;
      P.spend(70);
    }
    P.spend(14);
    if (M[S.map_key] === 0x02 && (M[R.cpu_union] & M[R.cpu_confed])) {
      // the Commodore key in a game the computer plays alone: map_exit from here, the stack reset
      M[R.no_ending] = 1;
      sound(0x11);
      io.vicWrite(0x1A, 0);
      io.vicWrite(0x19, io.vicRead(0x19));
      P.spend(40);
      P.mapQuit = true;
      return;
    }
    P.map_map_rnd({ irq: true });
    P.spend(20);
  };
  // mux_first ($1182), at line 0: the first seven virtual sprites on hardware sprites 1 to 7
  P.map_mux_first = function () {
    const io = P.io;
    const v = io.vicRead(0x19);
    io.vicWrite(0x19, v); io.vicWrite(0x19, ((v << 1) | 1) & 255);
    P.spend(20);
    for (let y = 0; y < 7; y++) {
      const x = M[S.mux_order + y];
      M[0x11C1] = y;
      let a = io.vicRead(0x10) & M[0x12AD + y];
      if (M[S.mux_x_hi + x] & 1) a |= M[0x12B5 + y];
      io.vicWrite(0x10, a);
      M[0x63F9 + y] = M[S.mux_ptr + x];
      io.vicWrite(0x28 + y, M[S.mux_colour + x]);
      io.vicWrite(0x03 + 2 * y, M[S.mux_y + x]);
      io.vicWrite(0x02 + 2 * y, M[S.mux_x + x]);
      P.spend(76);
    }
    const line = (io.vicRead(0x03) + 0x15) & 255;
    io.vicWrite(0x12, line);
    P.spend(14);
    if (line >= 0xD6) {
      M[0xFFFE] = 0xC6; M[0xFFFF] = 0x10;
      io.vicWrite(0x12, 0xE0);
      M[0x11F6] = 7;
      P.spend(26);
    } else {
      M[0xFFFE] = 0xE7; M[0xFFFF] = 0x11;
      P.spend(12);
    }
  };
  // mux_next ($11E7): each next virtual sprite whose hardware sprite the beam is past, moved down;
  // its place in the order kept in the operand at $11F6. It saves the interrupted registers in the
  // operands of the loads that put them back ($1255, $1257, $1259), which the port, called without
  // them, does not keep (port/test/lockstep.js leaves the three out)
  P.map_mux_next = function () {
    const io = P.io;
    io.vicWrite(0x19, 1);
    P.spend(20);
    let y = M[0x11F6];
    for (;;) {
      const x = M[S.mux_order + y];
      M[0x122F] = y;
      const h = M[S.mux_hw + y];
      let a = io.vicRead(0x10) & M[S.mux_bit_off + h];
      if (M[S.mux_x_hi + x] & 1) a |= M[S.mux_bit_on + h];
      io.vicWrite(0x10, a);
      M[0x63F8 + h] = M[S.mux_ptr + x];
      io.vicWrite(0x27 + h, M[S.mux_colour + x]);
      io.vicWrite(0x01 + 2 * h, M[S.mux_y + x]);
      io.vicWrite(0x00 + 2 * h, M[S.mux_x + x]);
      P.spend(80);
      y = (M[0x122F] + 1) & 255;
      if (y === 0x20) break;
      // the next one's hardware sprite: done with once the beam is past its last line
      const n = (io.vicRead(0x01 + 2 * M[S.mux_hw + y]) + 0x15) & 255;
      P.spend(20);
      if (n < io.vicRead(0x12)) continue;
      const t = (n + 2) & 255;                  // adc #$01 with the compare's carry set
      P.spend(8);
      if (t >= 0xD6) break;
      io.vicWrite(0x12, t);
      M[0x11F6] = y;
      P.spend(16);
      return;
    }
    M[0xFFFE] = 0xC6; M[0xFFFF] = 0x10;
    io.vicWrite(0x12, 0xE0);
    M[0x11F6] = 7;
    P.spend(30);
  };
  // mux_sort ($13FC): the order by y, an insertion sort
  P.map_mux_sort = function () {
    const O = S.mux_order;
    for (let x = 1; x !== 0x20; x++) {
      P.spend(22);
      const y1 = M[O + x];
      const y0 = M[O + x - 1];
      // f_1426,x is mux_order - 1 + x: the entry before
      if (M[S.mux_y + y1] >= M[S.mux_y + y0]) continue;
      M[O + x] = y0; M[O + x - 1] = y1;
      P.spend(28);
      // back one, or on to the second when the first was swapped
      x -= 2;
      if (x === -1) x = 1;
    }
    return {};
  };
  // draw_picture ($1447): picture X into window A, through its copy loops' own operands; a busy
  // flag keeps two from running at once
  P.map_draw_picture = function (r) {
    P.spend(8);
    if (M[S.picture_busy]) return { a: r.a };
    M[S.picture_busy]++;
    let x = r.x;
    const W = S.picture_table_c387, H = S.picture_table_c388, B = S.picture_table_c389;
    M[W] = M[S.picture_sizes + x]; M[H] = M[S.picture_sizes_c3a0 + x];
    x = (x << 1) & 255;
    M[0x14B8] = M[S.picture_table + x]; M[0x14B9] = M[S.picture_table_c310 + x];
    M[0x14F4] = M[S.picture_table_c337 + x]; M[0x14F5] = M[S.picture_table_c338 + x];
    M[0x14FA] = M[S.picture_table_c35f + x]; M[0x14FB] = M[S.picture_table_c360 + x];
    x = (r.a << 1) & 255;
    M[0x14BB] = M[S.windows + x]; M[0x14BC] = M[S.windows_c3b7 + x];
    M[0x14F7] = M[S.windows_c3c8 + x]; M[0x14FD] = M[S.windows_c3c8 + x];
    M[0x14F8] = M[S.windows_c3c9 + x]; M[0x14FE] = (M[S.windows_c3c9 + x] + 0x78) & 255;
    M[B] = (M[W] << 3) & 255;
    P.spend(130);
    const w16 = (a, d) => { const v = (M[a] | M[a + 1] << 8) + d; M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };
    for (let y = M[H]; ; ) {
      const src = M[0x14B8] | M[0x14B9] << 8, dst = M[0x14BB] | M[0x14BC] << 8;
      for (let i = (M[B] - 1) & 255; ; i = (i - 1) & 255) {
        P.wr((dst + i) & 0xFFFF, P.rd((src + i) & 0xFFFF));
        P.spend(16);
        if (i === 0) break;
      }
      w16(0x14B8, M[B]);
      w16(0x14BB, 0x140);
      P.spend(50);
      y = (y - 1) & 255;
      if (!y) break;
    }
    for (let y = M[H]; ; ) {
      for (let i = (M[W] - 1) & 255; ; i = (i - 1) & 255) {
        const g = a => M[a] | M[a + 1] << 8;
        P.wr((g(0x14F7) + i) & 0xFFFF, P.rd((g(0x14F4) + i) & 0xFFFF));
        P.wr((g(0x14FD) + i) & 0xFFFF, P.rd((g(0x14FA) + i) & 0xFFFF));
        P.spend(25);
        if (i === 0 || i & 0x80) break;
      }
      w16(0x14F4, M[W]);
      w16(0x14FA, M[W]);
      const lo = M[0x14F7] + 0x28;
      M[0x14F7] = lo & 255; M[0x14FD] = lo & 255;
      const h = M[0x14F8] + (lo > 255 ? 1 : 0);
      M[0x14F8] = h & 255;
      M[0x14FE] = ((h & 255) + 0x78 + (h > 255 ? 1 : 0)) & 255;
      P.spend(80);
      y = (y - 1) & 255;
      if (!y) break;
    }
    M[S.picture_busy]--;
    return { a: M[0x14FE], x: 0xFF, y: 0 };
  };

  // ---- the storm
  P.map_storm_start = function () {
    P.spend(6);
    if (!M[R.opt_storm]) return {};
    let a;
    do { a = P.map_map_rnd().a & 0x1F; P.spend(10); } while (a >= 0x19);
    M[S.cloud_territory] = a;
    const p = (M[S.army_places + a] + 2) & 255;
    M[S.cloud_x] = (p << 3) & 255; M[S.cloud_x_hi] = (p >> 5) & 1;
    M[S.cloud_y] = ((M[S.army_places_c28c + a] << 3) + 0x2A) & 255;
    P.spend(60);
    return {};
  };
  P.map_storm_show = function () {
    P.spend(6);
    if (!M[R.opt_storm]) return {};
    const x = M[S.list_length];
    let p1, p2;
    if (M[S.cloud_frame] === 3) { p1 = 0xC0; p2 = 0xC1; }
    else { p1 = (M[S.cloud_frame] + 0xBA) & 255; p2 = (p1 + 3) & 255; }
    M[S.list_colour + x] = 1; M[S.f_13DD + x] = 1;
    M[S.list_ptr + x] = p1; M[S.f_13BD + x] = p2;
    M[S.list_y + x] = M[S.cloud_y]; M[S.f_135D + x] = M[S.cloud_y];
    const lx = M[S.cloud_x] + 0x18;
    M[S.list_x + x] = M[S.cloud_x]; M[S.f_137D + x] = lx & 255;
    M[S.list_x_hi + x] = M[S.cloud_x_hi]; M[S.f_139D + x] = (M[S.cloud_x_hi] + (lx > 255 ? 1 : 0)) & 255;
    M[S.list_length] = (M[S.list_length] + 2) & 255;
    P.spend(110);
    return {};
  };
  P.map_storm_step = function () {
    P.spend(6);
    if (!M[R.opt_storm]) return {};
    M[S.cloud_wait] = (M[S.cloud_wait] - 1) & 255;
    if (M[S.cloud_wait]) return {};
    M[S.cloud_wait] = 7;
    let a = M[S.cloud_frame] + 1;
    if (a >= 3) a = 0;
    M[S.cloud_frame] = a;
    P.spend(30);
    if ((P.map_map_rnd().a & 0x0F) === 0) M[S.cloud_frame] = 3;
    return {};
  };
  P.map_storm_move = function* () {
    P.spend(6);
    if (!M[R.opt_storm]) return {};
    P.map_storm_next();
    M[S.point_x] = M[S.cloud_x]; M[S.line_x_hi] = M[S.cloud_x_hi]; M[S.point_y] = M[S.cloud_y];
    M[0x1DE9] = 0x2A; M[0x1DEA] = 0x16;
    P.spend(40);
    return yield* P.map_line_move();
  };
  P.map_storm_step_place = function () {
    M[S.cloud_x] = M[S.point_x]; M[S.cloud_x_hi] = M[S.line_x_hi]; M[S.cloud_y] = M[S.point_y];
    P.spend(24);
    return {};
  };
  // storm_next ($163D): a neighbour of the cloud's territory, each passed with a chance of 15 in
  // 16 (the list read through the operand at $1651)
  P.map_storm_next = function () {
    const i = (M[S.cloud_territory] << 1) & 255;
    M[0x1651] = M[S.neighbours + i]; M[0x1652] = M[S.neighbours_c189 + i];
    const list = M[0x1651] | M[0x1652] << 8;
    P.spend(30);
    let y = 0, t;
    for (;;) {
      t = M[(list + y) & 0xFFFF];
      P.spend(8);
      if (t & 0x80) { y = 0; continue; }
      if ((P.map_map_rnd().a & 0x0F) === 0) break;
      y = (y + 1) & 255;
      P.spend(8);
    }
    M[S.cloud_territory] = t;
    const p = (M[S.army_places + t] + 2) & 255;
    M[S.line_to_x] = (p << 3) & 255; M[S.line_to_x_hi] = (p >> 5) & 1;
    M[S.line_to_y] = ((M[S.army_places_c28c + t] << 3) + 0x2A) & 255;
    P.spend(60);
    return { x: t, y };
  };
  // move_army_figure ($1686): an army's figure marched from march_from to march_to, sound 24
  P.map_move_army_figure = function* (r = {}) {
    const place = (t, xa, xh, ya) => {
      const p = M[S.army_places + t] << 3;
      const lo = (p & 255) + 0x11;
      M[xa] = lo & 255; M[xh] = ((p >> 8) & 1) + (lo > 255 ? 1 : 0);
      M[ya] = ((M[S.army_places_c28c + t] << 3) + 0x32) & 255;
    };
    place(M[S.march_from], S.point_x, S.line_x_hi, S.point_y);
    place(M[S.march_to], S.line_to_x, S.line_to_x_hi, S.line_to_y);
    P.spend(170);
    if (M[S.march_to] !== M[S.march_from]) {
      M[0x1DE9] = 0x10; M[0x1DEA] = 0x17;
      M[S.march_on] = 1;
      P.spend(20);
      yield* P.map_line_move();
      sound(0x18);
      M[S.march_on] = 0;
    }
    P.spend(20);
    return r;
  };
  P.map_march_step_place = function () {
    M[S.march_x] = M[S.point_x]; M[S.march_x_hi] = M[S.line_x_hi]; M[S.march_y] = M[S.point_y];
    P.spend(24);
    return {};
  };
  // march_show ($1723): the marching figure in the list; its colour by the side, read through the
  // operand of the lda at $1750
  P.map_march_show = function () {
    P.spend(6);
    if (!M[S.march_on]) return {};
    const x = M[S.list_length];
    M[0x1751] = M[S.figure_side];
    const a = (M[S.figure_side] ? 4 : 0) + 0x97 + M[S.figure_frame];
    M[S.list_ptr + x] = a & 255;
    M[S.list_x + x] = M[S.point_x]; M[S.list_y + x] = M[S.point_y]; M[S.list_x_hi + x] = M[S.line_x_hi];
    M[S.list_colour + x] = M[0x1751] ? 0x0B : 0x06;
    M[S.list_length] = (M[S.list_length] + 1) & 255;
    P.spend(80);
    return {};
  };
  P.map_list_to_mux = function () {
    P.spend(6);
    if (M[S.map_drawing]) return {};
    for (let x = 0x1F; x >= 0; x--) {
      M[S.mux_ptr + x] = M[S.list_ptr + x]; M[S.mux_x + x] = M[S.list_x + x]; M[S.mux_y + x] = M[S.list_y + x];
      M[S.mux_colour + x] = M[S.list_colour + x]; M[S.mux_x_hi + x] = M[S.list_x_hi + x];
    }
    P.spend(32 * 47);
    return {};
  };
  // mexican ($178B): the bomb on territory 19's army, every second pass it stands there
  P.map_mexican = function* () {
    P.spend(6);
    if (!M[R.opt_indians]) return {};
    if (M[S.a_0DF3] & 0x80) { M[S.mexican_passes] = 0; P.spend(10); return {}; }
    M[S.mexican_passes]++;
    P.spend(14);
    if (M[S.mexican_passes] !== 2) return {};
    M[S.mexican_passes] = 0; M[S.mexican_step] = 0;
    sound(0x1A);
    M[S.mexican_wait] = 0x50;
    P.spend(20);
    yield* P.mapWaitZero(S.mexican_wait);
    for (;;) {
      M[S.mexican_wait] = 7;
      P.spend(6);
      yield* P.mapWaitZero(S.mexican_wait);
      const x = M[S.mexican_step];
      M[S.mexican_frame] = M[S.mexican_frames + x];
      P.spend(20);
      if (x < 0x11) {
        M[S.mexican_x] = (M[S.mexican_x] + M[S.mexican_dx + x]) & 255;
        M[S.mexican_y] = (M[S.mexican_y] - M[S.mexican_dy + x]) & 255;
        M[S.mexican_step]++;
        P.spend(30);
        if (x === 0x10) P.map_mexican_throw();
        continue;
      }
      M[S.mexican_x] = (M[S.mexican_x] - M[S.mexican_dx + x]) & 255;
      M[S.mexican_y] = (M[S.mexican_y] + M[S.mexican_dy + x]) & 255;
      M[S.mexican_step]++;
      P.spend(30);
      if (x === 0x20) break;
    }
    return P.map_army_hit({ x: 0x13 });
  };
  // panel_anim ($1816): the waving flag and pictures 13 to 15 in the panel, 60 steps of four
  // frames; the count in the operand at $185B
  P.map_panel_anim = function* () {
    M[S.panel_busy] = 1;
    const w = P.map_save_window({ a: 1, x: 0x0D });
    P.map_draw_picture({ a: w.a, x: w.x });
    M[S.flag_wave_on] = 1;
    M[0x185B] = 0x3C;
    P.spend(30);
    do {
      M[S.anim_wait] = 4;
      P.spend(6);
      yield* P.mapWaitZero(S.anim_wait);
      let a = M[S.anim_picture] + 1;
      if (a === 3) a = 0;
      M[S.anim_picture] = a;
      const x = a + 0x0D;
      P.spend(24);
      P.map_draw_picture({ a: x === 0x0D ? 1 : 6, x });
      M[0x185B] = (M[0x185B] - 1) & 255;
      P.spend(10);
    } while (M[0x185B]);
    M[S.flag_wave_on] = 0;
    P.map_panel_restore();
    M[S.panel_busy] = 0;
    P.spend(10);
    return {};
  };
  P.map_mexican_throw = function () {
    sound(0x12);
    M[S.bomb_on] = 1; M[S.bomb_x] = M[S.mexican_x]; M[S.bomb_y] = M[S.mexican_y]; M[S.bomb_left] = 0x12;
    P.spend(30);
    return {};
  };
  P.map_smoke_start = function () {
    sound(0x08);
    M[S.after_smoke_on] = 1; M[S.after_smoke_frame] = 0; M[S.after_smoke_wait] = 5;
    P.spend(24);
    return {};
  };
  P.map_bomb_step = function () {
    P.spend(6);
    if (!M[S.bomb_on]) return {};
    M[S.bomb_x] = (M[S.bomb_x] + 4) & 255;
    if (!(M[S.mexican_wait] & 1)) M[S.bomb_y] = (M[S.bomb_y] - 1) & 255;
    M[S.bomb_left] = (M[S.bomb_left] - 1) & 255;
    P.spend(40);
    if (M[S.bomb_left]) return {};
    M[S.bomb_on] = 0;
    return P.map_smoke_start();
  };
  P.map_bomb_show = function () {
    P.spend(6);
    if (!M[S.bomb_on]) return {};
    const x = M[S.list_length];
    M[S.list_ptr + x] = 0xB9; M[S.list_colour + x] = 0; M[S.list_x_hi + x] = 0;
    M[S.list_x + x] = M[S.bomb_x]; M[S.list_y + x] = M[S.bomb_y];
    M[S.list_length] = (M[S.list_length] + 1) & 255;
    P.spend(50);
    return {};
  };
  P.map_smoke_show = function () {
    P.spend(6);
    if (!M[S.after_smoke_on]) return {};
    const x = M[S.list_length];
    M[S.list_ptr + x] = (0xF8 + M[S.after_smoke_frame]) & 255; M[S.list_colour + x] = 2; M[S.list_x_hi + x] = 0;
    M[S.list_x + x] = M[S.bomb_x]; M[S.list_y + x] = M[S.bomb_y];
    M[S.list_length] = (M[S.list_length] + 1) & 255;
    M[S.after_smoke_wait] = (M[S.after_smoke_wait] - 1) & 255;
    P.spend(60);
    if (M[S.after_smoke_wait]) return {};
    M[S.after_smoke_wait] = 5;
    M[S.after_smoke_frame]++;
    if (M[S.after_smoke_frame] === 5) M[S.after_smoke_on] = 0;
    P.spend(20);
    return {};
  };
  P.map_intercept_start = function () {
    sound(0x11); sound(0x03);
    M[S.intercept_on] = 1; M[S.intercept_wait] = 1;
    M[S.intercept_frame2] = 0; M[S.intercept_frame1] = 0;
    M[S.intercept_steps] = 0x14;
    M[S.intercept_x2] = 0x96; M[S.intercept_x1] = 0x96;
    M[S.intercept_y2] = 0x68; M[S.intercept_y1] = 0x69;
    P.spend(50);
    return { x: 0x69 };
  };
  P.map_intercept_show = function () {
    P.spend(6);
    if (!M[S.intercept_on]) return {};
    let x = M[S.list_length];
    M[S.list_ptr + x] = (M[S.intercept_frame1] + 0xEB) & 255;
    M[S.list_x + x] = M[S.intercept_x1]; M[S.list_y + x] = M[S.intercept_y1]; M[S.list_x_hi + x] = 0;
    M[S.list_colour + x] = M[S.side_to_play] ? 0x06 : 0x0F;
    x = (x + 1) & 255;
    const p = (M[S.intercept_frame2] + 0xE5) & 255;
    M[S.list_ptr + x] = p; M[S.f_13BD + x] = (p + 3) & 255;
    M[S.list_x + x] = M[S.intercept_x2]; M[S.f_137D + x] = M[S.intercept_x2];
    const y = (M[S.intercept_y2] + 2) & 255;
    M[S.list_y + x] = y; M[S.f_135D + x] = (y + 0x13 + ((M[S.intercept_y2] + 2) > 255 ? 1 : 0)) & 255;
    M[S.list_colour + x] = 8; M[S.f_13DD + x] = 8;
    M[S.list_x_hi + x] = 0; M[S.f_139D + x] = 0;
    M[S.list_length] = (M[S.list_length] + 3) & 255;
    P.spend(160);
    return {};
  };
  P.map_intercept_step = function () {
    M[S.intercept_wait] = (M[S.intercept_wait] - 1) & 255;
    P.spend(6);
    if (M[S.intercept_wait]) return {};
    M[S.intercept_wait] = 6;
    let a = M[S.intercept_frame2] + 1;
    if (a === 3) a = 0;
    M[S.intercept_frame2] = a;
    P.spend(24);
    if (M[S.intercept_frame1] < 2) {
      M[S.intercept_frame1] ^= 1;
      M[S.intercept_steps] = (M[S.intercept_steps] - 1) & 255;
      P.spend(16);
      if (M[S.intercept_steps] === 0) {
        M[S.intercept_frame1] = 2; M[S.intercept_steps] = 2;
        M[S.intercept_x1] = (M[S.intercept_x1] - 0x0E) & 255;
        P.spend(24);
        return {};
      }
      if (M[S.intercept_steps] & 1) return {};
      for (const k of [S.intercept_x1, S.intercept_x2, S.intercept_y1, S.intercept_y2]) M[k] = (M[k] - 1) & 255;
      P.spend(24);
      return {};
    }
    M[S.intercept_steps] = (M[S.intercept_steps] - 1) & 255;
    P.spend(8);
    if (M[S.intercept_steps] & 0x80) {
      M[S.intercept_x2] = (M[S.intercept_x2] + 1) & 255;
      P.spend(12);
      if (M[S.intercept_steps] & 1) return {};
      M[S.intercept_y2] = (M[S.intercept_y2] + 1) & 255;
      P.spend(12);
      return {};
    }
    if (M[S.intercept_steps]) return {};
    M[S.intercept_frame1]++;
    M[S.intercept_x1] = (M[S.intercept_x1] - 0x0A) & 255;
    M[S.intercept_y1] = (M[S.intercept_y1] + 4) & 255;
    P.spend(30);
    return {};
  };
  P.map_flag_wave = function () {
    P.spend(6);
    if (!M[S.flag_wave_on]) return {};
    const x = M[S.list_length];
    M[S.flag_wave_wait_1] = (M[S.flag_wave_wait_1] - 1) & 255;
    if (!M[S.flag_wave_wait_1]) { M[S.flag_wave_wait_1] = 0x0A; M[S.flag_wave_frame_1] = (M[S.flag_wave_frame_1] + 1) & 3; P.spend(20); }
    M[S.list_ptr + x] = (M[S.flag_wave_frame_1] + 0xEF) & 255;
    M[S.list_x + x] = 0x54; M[S.list_y + x] = 0x53; M[S.list_colour + x] = 7; M[S.list_x_hi + x] = 0;
    M[S.flag_wave_wait_2] = (M[S.flag_wave_wait_2] - 1) & 255;
    if (!M[S.flag_wave_wait_2]) {
      M[S.flag_wave_wait_2] = 7;
      let a = M[S.flag_wave_frame_2] + 1;
      if (a === 5) a = 0;
      M[S.flag_wave_frame_2] = a;
      P.spend(24);
    }
    M[S.f_13BD + x] = (M[S.flag_wave_frame_2] + 0xF3) & 255;
    M[S.f_137D + x] = 0x6B; M[S.f_135D + x] = 0x6B; M[S.f_13DD + x] = 1; M[S.f_139D + x] = 0;
    M[S.list_length] = (M[S.list_length] + 2) & 255;
    P.spend(120);
    return {};
  };
  P.map_cursor_sprite = function () {
    const io = P.io;
    let hi = M[S.cursor_x_hi];
    M[S.cursor_hi_work] = hi;
    io.vicWrite(0x01, (M[S.cursor_y] + 6) & 255);
    const x = M[S.cursor_x] + 6;
    io.vicWrite(0x00, x & 255);
    if (x > 255) { M[S.cursor_hi_work] = (M[S.cursor_hi_work] + 1) & 255; }
    io.vicWrite(0x10, (io.vicRead(0x10) & 0xFE) | M[S.cursor_hi_work]);
    io.vicWrite(0x27, 1);
    M[0x63F8] = 0xE4;
    P.spend(64);
    return { a: 0xE4 };
  };
  // territory_blink ($1B01): the next territory of the flashing list (read through the operand
  // at $1B20), marked by a march from it to itself
  P.map_territory_blink = function () {
    P.spend(6);
    if (!M[S.blink_on]) return {};
    M[0x1B20] = M[S.choose_list]; M[0x1B21] = M[S.choose_list_hi];
    P.spend(20);
    if ((M[S.march_on] ^ 1) === 0) { M[S.march_on] = 0; P.spend(8); return {}; }
    M[S.blink_pos]++;
    const list = M[0x1B20] | M[0x1B21] << 8;
    let a = M[(list + M[S.blink_pos]) & 0xFFFF];
    if (a & 0x80) {
      M[S.blink_pos] = 0; a = M[list]; P.spend(12);
      // an empty list: the game goes round $1B1F for ever (new_army never flashes one)
      if (a & 0x80) throw new Error('territory_blink: an empty list; the game loops for ever at $1B1F');
    }
    M[S.march_to] = a; M[S.march_from] = a;
    P.spend(20);
    P.now(P.map_move_army_figure());
    M[S.march_on] = 1;
    return {};
  };
  P.map_map_show = function () {
    const io = P.io;
    io.vicWrite(0x15, 0);
    io.vicWrite(0x11, io.vicRead(0x11) & 0xEF);
    io.vicWrite(0x21, 0);
    P.spend(30);
    P.map_map_colour();
    io.vicWrite(0x11, io.vicRead(0x11) | 0x10);
    P.spend(12);
    return {};
  };
  P.map_map_colour = function () {
    for (let i = 0; i < 0x400; i++) P.io.colourWrite(i, M[S.map_colours + i]);
    P.spend(256 * 43);
    return {};
  };
  // map_irq_on ($1B79): the frame interrupt at line $F9, set while the beam is in the upper part
  P.map_map_irq_on = function* () {
    const io = P.io;
    M[0xFFFE] = 0xC6; M[0xFFFF] = 0x10;
    io.vicWrite(0x1A, 1); io.vicWrite(0x19, 1);
    P.spend(24);
    while (io.vicRead(0x11) & 0x80) { P.spend(9); yield; }
    io.vicWrite(0x11, io.vicRead(0x11) & 0x7F);
    io.vicWrite(0x12, 0xF9);
    io.ciaRead(0x0D); io.cia2Read(0x0D); io.ciaRead(0x0D); io.cia2Read(0x0D);
    const a = (M[R.cpu_union] & M[R.cpu_confed]) ? 0xFE : 0xFF;
    io.vicWrite(0x15, a); io.vicWrite(0x1C, a);
    io.vicWrite(0x17, 0); io.vicWrite(0x1D, 0);
    P.spend(70);
    return { a: 0 };
  };
  P.map_list_clear = function () {
    for (let y = 0x1F; y >= 0; y--) { M[S.list_y + y] = 0xE8; M[S.list_ptr + y] = 0x9A; }
    M[S.list_length] = 0;
    P.spend(32 * 17 + 10);
    return { a: 0, y: 0xFF };
  };
  P.map_train_show = function () {
    P.spend(6);
    if (!M[S.train_on]) return {};
    const x = M[S.list_length];
    M[S.list_ptr + x] = ((M[S.train_moving] ? M[S.train_frame] : 0) + 0x90) & 255;
    M[S.list_x + x] = M[S.train_x]; M[S.list_y + x] = M[S.train_y]; M[S.list_x_hi + x] = M[S.train_x_hi];
    M[S.list_colour + x] = 1;
    M[S.list_length] = (M[S.list_length] + 1) & 255;
    P.spend(60);
    return {};
  };
  P.map_train_anim = function () {
    P.spend(6);
    if (!M[S.train_on] || !M[S.train_moving] || M[S.train_wait]) return {};
    M[S.train_wait] = 6;
    M[S.train_frame] = (M[S.train_frame] + 1) & 3;
    P.spend(24);
    return {};
  };
  P.map_map_timers = function () {
    for (const a of Object.values(T)) { P.spend(7); if (M[a]) { M[a]--; P.spend(6); } }
    return {};
  };
  P.map_mexican_show = function () {
    P.spend(6);
    if (!M[R.opt_indians]) return {};
    const x = M[S.list_length];
    M[S.list_ptr + x] = (M[S.mexican_frame] + 0xA6) & 255;
    M[S.list_x + x] = M[S.mexican_x]; M[S.list_y + x] = M[S.mexican_y]; M[S.list_x_hi + x] = 0; M[S.list_colour + x] = 1;
    M[S.list_length] = (M[S.list_length] + 1) & 255;
    P.spend(60);
    return {};
  };
  P.map_train_start = function (r) {
    const x = r.x;
    M[S.train_point] = x;
    M[S.train_x] = M[S.rail_points + x]; M[S.train_y] = M[S.rail_points_c179 + x]; M[S.train_x_hi] = M[S.rail_points_c16a + x];
    M[S.train_on] = 1; M[S.train_frame] = 0; M[S.train_moving] = 0; M[S.train_wait] = 0;
    P.spend(60);
    return { a: 0, x };
  };
  // line_setup ($1CCB): the line's lengths and directions
  P.map_line_setup = function () {
    let d = M[S.point_x] - M[S.line_to_x];
    const b = d < 0 ? 1 : 0;
    const h = (M[S.line_x_hi] - M[S.line_to_x_hi] - b) & 255;
    P.spend(20);
    if (h & 0x80) {
      M[S.line_x_dir] = 1;
      M[S.line_dx] = (M[S.line_to_x] - M[S.point_x]) & 255;
      P.spend(20);
    } else {
      M[S.line_dx] = d & 255;
      M[S.line_x_dir] = 0xFF;
      P.spend(10);
    }
    if (!M[S.line_dx]) M[S.line_x_done]++;
    P.spend(14);
    if (M[S.point_y] >= M[S.line_to_y]) {
      M[S.line_dy] = (M[S.point_y] - M[S.line_to_y]) & 255;
      P.spend(14);
      if (!M[S.line_dy]) { M[S.line_y_done]++; return {}; }
      M[S.line_y_dir] = 0xFF;
      return {};
    }
    M[S.line_dy] = (M[S.line_to_y] - M[S.point_y]) & 255;
    P.spend(14);
    if (!M[S.line_dy]) { M[S.line_y_done]++; return {}; }
    M[S.line_y_dir] = 1;
    return {};
  };
  P.map_train_ride = function* (r) {
    const x = r.x;
    M[S.point_x] = M[S.train_x]; M[S.line_x_hi] = M[S.train_x_hi]; M[S.point_y] = M[S.train_y];
    M[S.line_to_x] = M[S.rail_points + x]; M[S.line_to_x_hi] = M[S.rail_points_c16a + x]; M[S.line_to_y] = M[S.rail_points_c179 + x];
    M[S.train_moving] = 1; M[S.train_wait] = 1;
    M[0x1DE9] = 0x71; M[0x1DEA] = 0x1E;
    P.spend(80);
    yield* P.map_line_move();
    M[S.train_moving] = 0;
    M[S.train_point] = x;
    P.spend(30);
    return { x, y: r.y };
  };
  // line_move ($1D7C): a pixel at a time along the line, two frames a step, the step routine
  // (the jmp at $1DE8) at each; the ratio of the two lengths in the operands at $1DA4 and $1DCF
  P.map_line_move = function* () {
    M[S.line_y_done] = 0; M[S.line_x_done] = 0; M[0x1DA4] = 0; M[0x1DCF] = 0;
    P.spend(20);
    P.map_line_setup();
    const ratio = (op, big, small) => {
      let a = M[big];
      for (;;) {
        M[op] = (M[op] + 1) & 255;
        P.spend(12);
        if (!M[op]) break;
        const d = a - M[small];
        a = d & 255;
        if (d < 0) { M[op] = (M[op] - 1) & 255; break; }
      }
      M[S.line_count] = M[op];
    };
    if (M[S.line_dx] >= M[S.line_dy]) {
      ratio(0x1DA4, S.line_dx, S.line_dy);
      do {
        yield* P.map_wait_2();
        P.map_line_x(); P.map_line_step_y(); P.map_line_step_call();
        P.spend(14);
      } while (!(M[S.line_x_done] & M[S.line_y_done]));
      return {};
    }
    ratio(0x1DCF, S.line_dy, S.line_dx);
    do {
      yield* P.map_wait_2();
      P.map_line_y(); P.map_line_step_x(); P.map_line_step_call();
      P.spend(14);
    } while (!(M[S.line_x_done] & M[S.line_y_done]));
    return {};
  };
  // the step routines a move names in the jmp at $1DE8
  const LINE_STEPS = { 0x162A: 'map_storm_step_place', 0x1710: 'map_march_step_place', 0x1E71: 'map_train_step_place' };
  P.MAP_LINE_STEPS = LINE_STEPS;
  P.map_line_step_call = function () {
    const a = M[0x1DE9] | M[0x1DEA] << 8, f = LINE_STEPS[a];
    if (!f) throw new Error('line_step_call: no step routine at $' + a.toString(16));
    P.spend(3);
    return P[f]();
  };
  P.map_line_step_y = function () {
    M[S.line_count] = (M[S.line_count] - 1) & 255;
    P.spend(8);
    if (M[S.line_count]) return {};
    M[S.line_count] = M[0x1DA4];
    return P.map_line_y();
  };
  P.map_line_step_x = function () {
    M[S.line_count] = (M[S.line_count] - 1) & 255;
    P.spend(8);
    if (M[S.line_count]) return {};
    M[S.line_count] = M[0x1DCF];
    return P.map_line_x();
  };
  // line_x ($1E09): the point's x kept in the operand of the compare at $1E2C too
  P.map_line_x = function () {
    P.spend(6);
    if (M[S.line_x_done]) return {};
    let v = (M[S.point_x] | M[S.line_x_hi] << 8) + (M[S.line_x_dir] & 0x80 ? -1 : 1);
    M[S.point_x] = v & 255; M[0x1E2D] = v & 255; M[S.line_x_hi] = (v >> 8) & 255;
    P.spend(30);
    if (M[S.line_x_hi] !== M[S.line_to_x_hi]) return {};
    if (M[0x1E2D] !== M[S.line_to_x]) return {};
    M[S.line_x_done]++;
    return {};
  };
  P.map_line_y = function () {
    P.spend(6);
    if (M[S.line_y_done]) return {};
    M[S.point_y] = (M[S.point_y] + M[S.line_y_dir]) & 255;
    P.spend(14);
    if (M[S.point_y] === M[S.line_to_y]) M[S.line_y_done]++;
    return {};
  };
  P.map_wait_2 = function* () {
    M[S.line_wait] = 2;
    P.spend(6);
    yield* P.mapWaitZero(S.line_wait);
    return {};
  };
  P.map_train_step_place = function () {
    M[S.train_x] = M[S.point_x]; M[S.train_x_hi] = M[S.line_x_hi]; M[S.train_y] = M[S.point_y];
    P.spend(24);
    return {};
  };
  // play_sound ($3FA3): sound A, with a busy flag the interrupt looks at; X and Y kept in the
  // operands of the loads that put them back ($3FB0, $3FB2)
  P.map_play_sound = function (r) {
    M[S.sound_busy] = (M[S.sound_busy] + 1) & 255;
    M[0x3FB0] = (r.y || 0) & 255; M[0x3FB2] = (r.x || 0) & 255;
    const o = P.run6502(0xF12B, { a: r.a });
    M[S.sound_busy] = (M[S.sound_busy] - 1) & 255;
    P.spend(30);
    return { a: o.a, x: M[0x3FB2], y: M[0x3FB0] };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
