// The train (file S2, $2000-$9FFF), first part: the main loop and its pause, the machine, the
// raster interrupts (below the train, the bar with the boot and the clock, the frame's work at the
// top, the two bands of scenery and the train's rows, and the sprites reused down the train), the
// scroll, the carriages drawn into the buffer from the map, the wheels, the rods and the driver,
// the track and the scenery, the clock and the progress. It is the fort's code (g-frt1.js) with a
// moving train in place of the fort. The fighters and the knives are in g-trn2.js.
//
// The bottom interrupt scrolls the view and the scenery and the top one does the frame's work;
// the main loop reads their timers, the scroll's bytes and the guard's place in the middle of its
// routines, through P.irqByte (IR below). train_mux keeps the interrupted registers in its own
// operands ($854C-$8550).
(function (root) {
'use strict';
const G = root.NSGroups = root.NSGroups || {};
G.trn = function (P) {
  const M = P.M, S = root.NSSyms.trn, R = root.NSSyms.res;
  for (const n of ['trn_train_main', 'trn_train_irq_on']) P.GEN.add(n);
  const STEP_AT = [0x806F, 0x8072, 0x8075, 0x8078, 0x807B, 0x807E, 0x8081, 0x8084, 0x8087, 0x808A, 0x808D, 0x8090, 0x8093,
    0x8096, 0x8099];
  P.PASS.trn = 0x803C;
  P.CPS.trn = [0x8024, 0x803C, ...STEP_AT, 0x80AE, 0x8050, 0x8057, 0x805E];
  P.IRQS.trn = { 0x830D: 'trn_train_irq_bottom', 0x8347: 'trn_train_irq_bar', 0x83AA: 'trn_train_irq_top', 0x8445: 'trn_train_irq_sky',
    0x8475: 'trn_train_irq_far', 0x849B: 'trn_train_irq_train', 0x84DE: 'trn_train_mux' };
  const range = (a, n) => Array.from({ length: n }, (_, i) => a + i);
  P.IRQ_BYTES.trn = [...range(S.wheel_timer, 13), S.fine_scroll, S.view_col, S.scroll_moved, S.scroll_steps, S.tiles_drawn,
    S.rear_columns, S.scroll_speed, 0x04, 0x05, ...range(S.fighter_x, 4),
    // the screen's rows 4 to 20, which the bottom interrupt redraws as the view and the scenery move
    // (the bands, the train, the track) and the fighters' roofs, ground and ladders are read from
    ...range(0x48A0, 17 * 40)];
  P.IGNORE.trn = [0x854C, 0x854E, 0x8550, 0x9C22, 0x9C24];
  const IRSET = new Set(P.IRQ_BYTES.trn);
  const IR = a => (IRSET.has(a) ? P.irqByte(a) : M[a]);
  P.trnIR = IR;
  const cp = function* (a) { yield { cp: a, cycles: P.take() }; };
  const sound = a => P.trn_train_sound({ a });
  const ptr = a => M[a] | M[a + 1] << 8;
  const w16 = (a, v) => { M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };

  // train_main ($8000); train_end_count's two pla take its caller's return and go back to the map
  class TrainExit { }
  P.TrainExit = TrainExit;
  P.trn_train_main = function* (r = {}) {
    try {
      if (!r.resume) {
        P.trn_train_machine();
        P.run6502(0xF128, {});
        P.trn_train_clear(); P.trn_train_setup(); P.trn_train_colours(); P.trn_train_all_columns(); P.trn_train_view_draw();
        P.trn_guards_colour(); P.trn_knives_draw(); P.trn_guards_draw();
        M[S.frnd_seed] = M[0xA2];
        P.spend(10);
        yield* cp(0x8024);
        M[S.a_8C9F] = P.io.vicRead(0x12);
        M[S.a_8CA0] = P.io.vicRead(0x11);
        P.trn_sprite_list_clear(); P.trn_train_sprite_copy(); P.trn_train_sort();
        yield* P.trn_train_irq_on();
      }
      let from = r.resume || 0x803C;
      if (from !== 0x80AE) {
        for (;;) {
          if (from === 0x803C) {
            yield* cp(0x803C);
            const k = P.trn_train_key_scan().a;
            M[S.train_key] = k;
            P.spend(8);
            if (k === 0x48) yield* pause();
          }
          for (const [a, f] of STEPS) {
            if (from !== 0x803C && from !== a) continue;
            from = 0x803C;
            yield* cp(a);
            f();
          }
          P.spend(8);
          if (M[S.train_done]) break;
        }
        sound(0x00);
        M[S.end_count] = 8;
      }
      for (;;) {
        yield* cp(0x80AE);
        M[S.fighter_state] = 0; M[R.arcade_result] = 1;
        P.trn_fighter_pictures(); P.trn_train_wheels(); P.trn_train_rods_frame(); P.trn_driver_stop(); P.trn_boot_run();
        P.trn_train_end_count();
        P.spend(20);
      }
    } catch (e) {
      if (!(e instanceof TrainExit)) throw e;
    }
    return {};
  };
  // H: the pause, H let go, any key, let go
  const pause = function* () {
    M[S.train_paused] = 1;
    sound(0x11);
    const scan = function* (a, want) { for (;;) { yield* cp(a); const k = P.trn_train_key_scan().a; P.spend(8); if ((k === 0xFF) === want) return; } };
    yield* scan(0x8050, true);
    yield* scan(0x8057, false);
    yield* scan(0x805E, true);
    M[S.train_paused] = 0; M[S.train_key] = 0xFF;
    P.spend(14);
  };
  const STEPS = [
    [0x806F, () => P.trn_attacker_floor()], [0x8072, () => P.trn_guard_floor()], [0x8075, () => P.trn_attacker_orders()],
    [0x8078, () => P.trn_defender_orders()], [0x807B, () => P.trn_fighter_pictures()], [0x807E, () => P.trn_knives_fly()],
    [0x8081, () => P.trn_knife_hits()], [0x8084, () => P.trn_guard_start()], [0x8087, () => P.trn_guard_gone()],
    [0x808A, () => P.trn_train_wheels()], [0x808D, () => P.trn_train_rods_frame()], [0x8090, () => P.trn_train_driver_frame()],
    [0x8093, () => P.trn_left_behind()], [0x8096, () => P.trn_train_clock()], [0x8099, () => P.trn_train_progress()],
  ];
  P.trn_train_machine = function () {
    const io = P.io;
    M[1] = 0x35;
    io.ciaWrite(0x0D, 0x7F); io.cia2Write(0x0D, 0x7F);
    io.ciaWrite(0x0E, 0); io.cia2Write(0x0E, 0); io.ciaWrite(0x0F, 0); io.cia2Write(0x0F, 0);
    io.ciaRead(0x0D); io.cia2Read(0x0D);
    io.cia2Write(0x02, io.cia2Read(0x02) | 0x03);
    io.cia2Write(0x00, (io.cia2Read(0x00) & 0xFC) | 0x02);
    io.vicWrite(0x20, 0); io.vicWrite(0x21, 0); io.vicWrite(0x15, 0);
    io.vicWrite(0x18, 0x20); io.vicWrite(0x11, 0x18); io.vicWrite(0x16, 0x10);
    io.vicWrite(0x19, io.vicRead(0x19));
    io.vicWrite(0x1A, 0);
    for (let x = 0; x < 0x10; x++) { M[S.fsort_order + x] = x; M[S.flive_y + x] = 0; M[S.flive_x + x] = 0; }
    io.vicWrite(0x25, 0x07);
    M[0xFFFA] = 0xB8; M[0xFFFC] = 0xB8; M[0xFFFB] = 0x81; M[0xFFFD] = 0x81;
    P.spend(180 + 16 * 22);
    return {};
  };
  // train_keys_one ($81B9): up when the keys stand for the stick (its two pla end the stick reading)
  P.trn_train_keys_one = function () {
    P.spend(10);
    if (!(M[R.cpu_union] | M[R.cpu_confed]) || !M[R.opt_keyboard]) return {};
    M[S.fstick_x] = 0; M[S.fstick_y] = 0; M[S.fstick_fire] = 1;
    const k = M[S.train_key];
    P.spend(20);
    if (k & 0x80) return { up: true, x: 0, y: 0 };
    if (k === 0x5A) { M[S.fstick_x] = 0xFF; return { up: true, x: 0xFF, y: 0 }; }
    if (k === 0x58) { M[S.fstick_x] = 1; return { up: true, x: 1, y: 0 }; }
    if (k === 0x50) { M[S.fstick_y] = 0xFF; return { up: true, x: 0, y: 0xFF }; }
    if (k === 0x4C) { M[S.fstick_y] = 1; return { up: true, x: 0, y: 1 }; }
    if (k === 0x20) M[S.fstick_fire] = 0;
    return { up: true, x: 0, y: 0 };
  };
  const port2 = () => {
    if (P.trn_train_keys_one().up) return {};
    P.io.ciaWrite(0x02, 0);
    P.spend(30);
    return P.trn_train_stick_decode({ a: P.io.ciaRead(0x00) });
  };
  P.trn_attacker_stick = function () {
    P.spend(6);
    if (!M[R.attacker]) return port2();
    return port1();
  };
  // b_8238: port 1, unless one person plays
  const port1 = () => {
    P.spend(14);
    if (((M[R.cpu_union] + M[R.cpu_confed]) & 255) === 1) return port2();
    if (P.trn_train_keys_one().up) return {};
    P.io.ciaWrite(0x03, 0);
    P.spend(30);
    return P.trn_train_stick_decode({ a: P.io.ciaRead(0x01) });
  };
  P.trn_defender_stick = function () {
    P.spend(6);
    if (M[R.attacker]) return port2();
    return port1();
  };
  P.trn_train_stick_decode = function (r) {
    let a = r.a, x = 0, y = 0;
    if (!(a & 1)) y--;
    if (!(a & 2)) y++;
    if (!(a & 4)) x--;
    if (!(a & 8)) x++;
    a = (a >> 4) & 1;
    M[S.fstick_fire] = a; M[S.fstick_x] = x & 255; M[S.fstick_y] = y & 255;
    P.spend(40);
    return { a, x: x & 255, y: y & 255 };
  };
  P.trn_train_key_scan = function () {
    const io = P.io;
    io.ciaWrite(0x02, 0xFF); io.ciaWrite(0x03, 0x00);
    P.spend(14);
    let y = 0;
    for (let x = 7; x >= 0; x--) {
      M[0x19] = M[S.fkey_lo + x]; M[0x1A] = M[S.fkey_hi + x];
      io.ciaWrite(0x00, M[S.fkey_rows + x]);
      y = 7;
      const a = io.ciaRead(0x01);
      P.spend(30);
      if (a !== 0xFF) {
        for (; y >= 0; y--) {
          P.spend(9);
          if (a === M[S.fkey_rows + y]) { P.spend(12); return { a: M[((M[0x19] | M[0x1A] << 8) + y) & 0xFFFF], x, y }; }
        }
        y = 0xFF;
      }
      P.spend(5);
    }
    return { a: 0xFF, x: 0xFF, y };
  };
  const rol19 = io => { const v = io.vicRead(0x19); io.vicWrite(0x19, v); io.vicWrite(0x19, ((v << 1) | 1) & 255); };
  // train_irq_bottom ($830D), at line $C0
  P.trn_train_irq_bottom = function () {
    const io = P.io;
    rol19(io);
    io.vicWrite(0x12, 0xD8);
    M[0xFFFE] = 0x47; M[0xFFFF] = 0x83;
    io.vicWrite(0x21, 0);
    io.vicWrite(0x16, io.vicRead(0x16) & 0xF8);
    P.spend(50);
    P.trn_train_sprite_copy(); P.trn_train_sort();
    P.spend(8);
    if (!M[S.train_paused]) P.trn_train_scroll();
    P.spend(20);
  };
  // train_irq_bar ($8347), at line $D8
  P.trn_train_irq_bar = function () {
    const io = P.io;
    rol19(io);
    M[0x4BF8] = (M[S.boot_frame] + 0xD7) & 255;
    io.vicWrite(0x00, M[S.boot_x]); io.vicWrite(0x10, M[S.boot_x_hi]);
    io.vicWrite(0x27, 1); io.vicWrite(0x28, 1);
    io.vicWrite(0x25, 0x0A); io.vicWrite(0x26, 0x09);
    io.vicWrite(0x01, 0xE0); io.vicWrite(0x03, 0xE0);
    M[0x4BF9] = (M[S.clock_frame] + 0xD4) & 255;
    io.vicWrite(0x02, M[S.clock_x]);
    io.vicWrite(0x10, ((M[S.clock_x_hi] << 1) & 255) | io.vicRead(0x10));
    io.vicWrite(0x15, 3);
    io.vicWrite(0x12, 0);
    M[0xFFFE] = 0xAA; M[0xFFFF] = 0x83;
    P.spend(120);
  };
  // train_irq_top ($83AA), at line 0: the frame's work
  P.trn_train_irq_top = function () {
    const io = P.io;
    rol19(io);
    io.vicWrite(0x26, 0); io.vicWrite(0x25, 7); io.vicWrite(0x15, 0xFF); io.vicWrite(0x23, 0x0B);
    P.spend(50);
    if (!M[S.train_paused]) {
      if (!M[S.tframe_busy]) {
        M[S.tframe_busy]++;
        P.trn_sprite_list_clear(); P.trn_guard_move(); P.trn_guard_with_view();
        P.trn_fighters_to_sprites(); P.trn_knives_to_sprites(); P.trn_train_rods(); P.trn_train_driver();
        M[S.tframe_busy]--;
        P.spend(60);
      }
      P.trn_train_timers();
      if (!M[S.tsound_busy]) P.run6502(0xF12E, {});
    }
    for (let y = 0; y < 8; y++) {
      const x = M[S.fsort_order + y];
      M[0x842D] = y;
      let a = io.vicRead(0x10) & M[S.fmux_and + y];
      if (M[S.flive_xhi + x] & 1) a |= M[S.fmux_or + y];
      io.vicWrite(0x10, a);
      M[0x4BF8 + y] = M[S.flive_ptr + x];
      io.vicWrite(0x27 + y, M[S.flive_col + x]);
      io.vicWrite(0x01 + 2 * y, M[S.flive_y + x]);
      io.vicWrite(0x00 + 2 * y, M[S.flive_x + x]);
      P.spend(76);
    }
    io.vicWrite(0x12, 0x44);
    M[0xFFFE] = 0x45; M[0xFFFF] = 0x84;
    P.spend(30);
  };
  // train_irq_sky ($8445), at line $44: the far band's fine scroll, the sky below light blue
  P.trn_train_irq_sky = function () {
    const io = P.io;
    rol19(io);
    io.vicWrite(0x16, (io.vicRead(0x16) & 0xF8) | M[S.far_fine]);
    io.vicWrite(0x23, 9);
    io.vicWrite(0x12, 0x5A);
    io.vicWrite(0x21, 0x0E);
    M[0xFFFE] = 0x75; M[0xFFFF] = 0x84;
    P.spend(60);
  };
  // train_irq_far ($8475), at line $5A: the near band's fine scroll
  P.trn_train_irq_far = function () {
    const io = P.io;
    rol19(io);
    io.vicWrite(0x16, (io.vicRead(0x16) & 0xF8) | M[S.near_fine]);
    io.vicWrite(0x12, 0x6A);
    M[0xFFFE] = 0x9B; M[0xFFFF] = 0x84;
    P.spend(50);
  };
  // train_irq_train ($849B), at line $6A: the train's rows; the sprites below, at once when sprite
  // 0's image has ended above the beam
  P.trn_train_irq_train = function () {
    const io = P.io;
    rol19(io);
    io.vicWrite(0x16, (io.vicRead(0x16) & 0xF8) | M[S.fine_scroll]);
    const a = (io.vicRead(0x01) + 0x15) & 255;
    P.spend(40);
    if (a < io.vicRead(0x12)) { P.spend(20); return P.trn_train_mux(); }
    const t = (a + 2) & 255;
    io.vicWrite(0x12, t);
    if (t >= 0xB8) return P.trn_train_mux_end();
    M[0xFFFE] = 0xDE; M[0xFFFF] = 0x84;
    P.spend(20);
  };
  // train_mux ($84DE): the slots from 8 on down the train; its place in the operand at $84ED
  P.trn_train_mux = function () {
    const io = P.io;
    io.vicWrite(0x19, 1);
    P.spend(30);
    let y = M[S.a_84ED];
    for (;;) {
      const x = M[S.fsort_order + y];
      M[0x8526] = y;
      const h = y & 7;
      let a = io.vicRead(0x10) & M[S.fmux_and + h];
      if (M[S.flive_xhi + x] & 1) a |= M[S.fmux_or + h];
      io.vicWrite(0x10, a);
      M[0x4BF8 + h] = M[S.flive_ptr + x];
      io.vicWrite(0x27 + h, M[S.flive_col + x]);
      io.vicWrite(0x01 + 2 * h, M[S.flive_y + x]);
      io.vicWrite(0x00 + 2 * h, M[S.flive_x + x]);
      P.spend(80);
      y = (M[0x8526] + 1) & 255;
      if (y === 0x10) break;
      const n = (io.vicRead(0x01 + 2 * (y & 7)) + 0x15) & 255;
      P.spend(20);
      if (n < io.vicRead(0x12)) continue;
      const t = (n + 2) & 255;
      if (t >= 0xB8) break;
      io.vicWrite(0x12, t);
      M[S.a_84ED] = y;
      P.spend(16);
      return;
    }
    M[0xFFFE] = 0x0D; M[0xFFFF] = 0x83;
    io.vicWrite(0x12, 0xC0);
    M[S.a_84ED] = 8;
    P.spend(30);
  };
  P.trn_train_mux_end = function () {
    M[0xFFFE] = 0x0D; M[0xFFFF] = 0x83;
    P.io.vicWrite(0x12, 0xC0);
    M[S.a_84ED] = 8;
    P.spend(26);
  };
  P.trn_train_sort = function () {
    const O = S.fsort_order;
    for (let x = 1; x !== 0x10; x++) {
      P.spend(22);
      const y1 = M[O + x], y0 = M[O + x - 1];
      if (M[S.flive_y + y1] >= M[S.flive_y + y0]) continue;
      M[O + x] = y0; M[O + x - 1] = y1;
      P.spend(28);
      x -= 2;
      if (x === -1) x = 1;
    }
    return {};
  };
  P.trn_train_sprite_copy = function () {
    P.spend(6);
    if (M[S.tframe_busy]) return {};
    for (let x = 0x0F; x >= 0; x--) {
      M[S.flive_ptr + x] = M[S.flist_ptr + x]; M[S.flive_x + x] = M[S.flist_x + x]; M[S.flive_y + x] = M[S.flist_y + x];
      M[S.flive_col + x] = M[S.flist_col + x]; M[S.flive_xhi + x] = M[S.flist_xhi + x];
    }
    P.spend(16 * 47);
    return { x: 0xFF };
  };
  P.trn_train_clear = function () {
    for (let x = 0; x < 256; x++) {
      M[0x4800 + x] = 0; M[0x4900 + x] = 0; M[0x4A00 + x] = 0; M[0x4B00 + x] = 0;
      P.io.colourWrite(x, 0); P.io.colourWrite(0x100 + x, 0); P.io.colourWrite(0x200 + x, 0); P.io.colourWrite(0x300 + x, 0);
    }
    P.spend(256 * 43);
    return { a: 0, x: 0 };
  };
  // the buffer at $2000: 12 rows of 44 characters
  const BUF_ROWS = Array.from({ length: 12 }, (_, i) => 0x2000 + 0x2C * i);
  P.trn_train_right_step = function () {
    M[S.scroll_steps] = (M[S.scroll_steps] + 1) & 255;
    const v = M[S.fine_scroll] - M[S.scroll_speed];
    M[S.fine_scroll] = v & 255;
    P.spend(20);
    if (v >= 0) return {};
    M[S.fine_scroll] = v & 7;
    M[S.view_col] = (M[S.view_col] + 1) & 255;
    P.spend(14);
    P.trn_train_view_draw();
    if (M[S.view_col] < 3) return {};
    M[S.view_col] = 1; M[S.scroll_moved] = 1;
    w16(0x04, ptr(0x04) + 1);
    for (let y = 0; y < 0x2A; y++) for (const r of BUF_ROWS) M[r + y] = M[r + y + 2];
    P.spend(0x2A * 12 * 8 + 40);
    return P.trn_train_tile_column({ a: 0x15 });
  };
  // train_tile_column ($8742): tile column A of the view, six tiles down (a row of the map every
  // 240 bytes), through its own operands
  P.trn_train_tile_column = function (r) {
    M[S.tiles_drawn]++;
    const a = r.a;
    M[0x8783] = (a << 1) & 255; M[0x8784] = 0x20;
    let v = a + M[0x04];
    M[0x8766] = v & 255; M[0x8767] = (M[0x05] + (v > 255 ? 1 : 0)) & 255;
    M[0x2A] = 6;
    P.spend(50);
    let x = 0;
    do {
      M[0x29] = x;
      let t = M[ptr(0x8766)];
      let c = t >> 7; t = (t << 1) & 255;
      M[0x29] = ((M[0x29] << 1) | c) & 255;
      c = t >> 7; t = (t << 1) & 255;
      M[0x29] = ((M[0x29] << 1) | c) & 255;
      const lo = t + 0x10;
      M[0x8780] = lo & 255;
      M[0x8781] = (0x22 + M[0x29] + (lo > 255 ? 1 : 0)) & 255;
      for (let y = 3; y >= 0; y--) M[(ptr(0x8783) + M[S.tile_cells + y]) & 0xFFFF] = M[(ptr(0x8780) + y) & 0xFFFF];
      x = M[S.tile_cells];
      v = M[0x8783] + 0x58;
      M[0x8783] = v & 255;
      if (v > 255) M[0x8784] = (M[0x8784] + 1) & 255;
      w16(0x8766, ptr(0x8766) + 0xF0);
      M[0x2A] = (M[0x2A] - 1) & 255;
      P.spend(150);
    } while (M[0x2A]);
    return { x };
  };
  // train_left_step ($87AC): behind the train's last carriage (the map before $2610) the new
  // column is cleared instead
  P.trn_train_left_step = function () {
    M[S.scroll_steps] = (M[S.scroll_steps] + 1) & 255;
    const v = M[S.fine_scroll] + M[S.scroll_speed];
    M[S.fine_scroll] = v & 255;
    P.spend(20);
    if ((v & 255) < 8) return {};
    M[S.fine_scroll] = v & 7;
    M[S.view_col] = (M[S.view_col] - 1) & 255;
    P.spend(14);
    P.trn_train_view_draw();
    if (M[S.view_col]) return {};
    M[S.view_col] = 2; M[S.scroll_moved] = 0xFF;
    w16(0x04, ptr(0x04) - 1);
    for (let x = 0x29, y = 0x2B; x >= 0; x--, y--) for (const r of BUF_ROWS) M[r + y] = M[r + x];
    P.spend(0x2A * 12 * 8 + 40);
    if (ptr(0x04) < 0x2610) return P.trn_train_rear();
    return P.trn_train_tile_column({ a: 0 });
  };
  // train_rear ($884C): the buffer's left two columns of rows 6 to 9 cleared, through the operand
  // of the sta at $885C
  P.trn_train_rear = function () {
    M[0x885D] = 0x08; M[0x885E] = 0x21;
    for (let y = 4; y; y--) {
      const a = ptr(0x885D);
      M[(a + 1) & 0xFFFF] = 0; M[a] = 0;
      w16(0x885D, a + 0x2C);
      P.spend(40);
    }
    M[S.tiles_drawn]++; M[S.rear_columns]++;
    P.spend(12);
    return { a: 0, x: 0xFF, y: 0 };
  };
  P.trn_train_view_draw = function () {
    const vc = M[S.view_col];
    for (let y = 0x27; y >= 0; y--) for (let row = 0; row < 12; row++) M[0x4918 + 0x28 * row + y] = M[BUF_ROWS[row] + ((y + vc) & 255)];
    P.spend(40 * 12 * 8 + 20);
    return { y: 0xFF };
  };
  P.trn_train_all_columns = function () {
    for (let a = 0x15; a >= 0; a--) { P.trn_train_tile_column({ a }); P.spend(12); }
    return { a: 0xFF };
  };
  P.trn_train_colours = function () {
    M[0x8934] = 0x00; M[0x8935] = 0xD8;
    for (let y = 0; y < 0x15; y++) {
      const a = M[S.train_row_colours + y], base = ptr(0x8934);
      for (let x = 0x27; x >= 0; x--) P.wr((base + x) & 0xFFFF, a);
      w16(0x8934, base + 0x28);
      P.spend(40 * 10 + 40);
    }
    P.io.vicWrite(0x22, 0x0A);
    return { a: 0x0A };
  };
  // train_scroll ($8955), from the bottom interrupt: on the train the scenery passes and the view
  // follows the attacker's walk; on the ground the train pulls away from him
  P.trn_train_scroll = function () {
    P.spend(6);
    if (M[S.on_ground]) {
      P.trn_far_band_draw(); P.trn_near_band_draw(); P.trn_track_draw();
      P.spend(6);
      if (M[S.left_behind_flag]) return {};
      M[S.scroll_speed] = 4;
      return P.trn_train_left_step();
    }
    P.spend(6);
    if (!M[S.train_done]) M[S.scroll_speed] = 3;
    P.trn_bands_scroll(); P.trn_track_step();
    const m = M[S.fighter_moving];
    P.spend(8);
    if (!m) return {};
    return m & 0x80 ? P.trn_train_left_step() : P.trn_train_right_step();
  };
  P.trn_train_timers = function () {
    for (let x = 0x0C; x >= 0; x--) { P.spend(9); if (M[S.wheel_timer + x]) { M[S.wheel_timer + x]--; P.spend(7); } }
    return { x: 0xFF };
  };
  // train_wheels ($899F): the wheels' next frame copied over characters $8A-$95, through the
  // operand of the lda at $89C7
  P.trn_train_wheels = function () {
    P.spend(6);
    if (IR(S.wheel_timer)) return {};
    M[S.wheel_timer] = 2;
    let a = M[S.wheel_frame] + 1;
    if (a >= 3) a = 0;
    M[S.wheel_frame] = a;
    M[0x89C8] = M[S.wheel_lo + a]; M[0x89C9] = M[S.wheel_hi + a];
    const src = ptr(0x89C8);
    for (let x = 0x5F; x >= 0; x--) M[0x4450 + x] = M[(src + x) & 0xFFFF];
    P.spend(40 + 96 * 14);
    return { a: M[(src) & 0xFFFF], x: 0xFF };
  };
  P.trn_train_rods_frame = function () {
    P.spend(6);
    if (IR(S.rods_timer)) return {};
    M[S.rods_timer] = 3;
    M[S.rods_frame] = (M[S.rods_frame] + 1) & 3;
    M[S.loco_shown] = (IR(0x04) | IR(0x05) << 8) >= 0x26E0 ? 1 : 0;
    P.spend(40);
    return {};
  };
  P.trn_train_driver_frame = function () {
    P.spend(6);
    if (IR(S.driver_timer)) return {};
    M[S.driver_timer] = 5;
    P.spend(10);
    if (M[S.driver_frame] === 2) return {};
    M[S.driver_frame] ^= 1;
    return {};
  };
  // train_rods ($8A14), from the frame interrupt: the rods over tile column 228 while it is in view
  P.trn_train_rods = function () {
    P.spend(6);
    if (!M[S.loco_shown]) return {};
    const x = M[S.tlist_count];
    M[S.flist_ptr + x] = 0xDD; M[S.f_8611 + x] = 0xDE;
    M[S.flist_col + x] = 1; M[S.f_8621 + x] = 1;
    const d = 0x26F4 - ptr(0x04);
    M[S.loco_col] = d & 255;
    P.spend(40);
    if ((d >> 8) & 255) return {};
    M[S.loco_col] = (M[S.loco_col] << 1) & 255;
    const c = (M[S.loco_col] - M[S.view_col]) & 255;
    P.spend(20);
    if (c >= 0x2B) return {};
    const b = c << 3;
    M[S.loco_col] = b & 255;
    M[S.loco_x_hi] = b > 255 ? 1 : 0;
    let v = M[S.fine_scroll] + 0x12 + M[S.loco_col];
    M[S.loco_col] = v & 255;
    M[S.loco_x_hi] = (M[S.loco_x_hi] + (v > 255 ? 1 : 0)) & 255;
    const y = M[S.rods_frame];
    v = M[S.rods_dx + y] + M[S.loco_col];
    M[S.flist_x + x] = v & 255;
    M[S.flist_xhi + x] = (M[S.loco_x_hi] + (v > 255 ? 1 : 0)) & 255;
    v = M[S.flist_x + x] + 0x18;
    M[S.f_85F1 + x] = v & 255;
    M[S.f_8601 + x] = (M[S.flist_xhi + x] + (v > 255 ? 1 : 0)) & 255;
    M[S.flist_y + x] = (M[S.rods_dy + y] + 0xA6) & 255; M[S.f_85E1 + x] = M[S.flist_y + x];
    M[S.tlist_count] = (x + 2) & 255;
    M[S.driver_shown] = 1;
    P.spend(120);
    return {};
  };
  P.trn_train_driver = function () {
    P.spend(6);
    if (!M[S.driver_shown]) return {};
    const x = M[S.tlist_count];
    const v = M[S.loco_col] + 0x1D;
    M[S.flist_x + x] = v & 255;
    M[S.flist_xhi + x] = (M[S.loco_x_hi] + (v > 255 ? 1 : 0)) & 255;
    M[S.flist_y + x] = 0x7F; M[S.flist_col + x] = 5;
    M[S.flist_ptr + x] = (M[S.driver_frame] + 0xC5) & 255;
    M[S.tlist_count]++;
    P.spend(60);
    return {};
  };
  P.trn_train_clock = function () {
    P.spend(6);
    if (!M[S.time_over]) {
      if (IR(S.tclock_timer)) return {};
      M[S.tclock_timer] = 8;
      w16(S.clock_x, (M[S.clock_x] | M[S.clock_x_hi] << 8) + 1);
      P.spend(30);
      if (!M[S.clock_x_hi] || M[S.clock_x] < 0x32) return {};
      M[S.time_over] = 1; M[S.tclock_timer] = 5; M[R.arcade_result] = 0;
      sound(0x1A);
      return {};
    }
    if (IR(S.tclock_timer)) return {};
    M[S.tclock_timer] = 5;
    let a = M[S.clock_frame] + 1;
    if (a === 3) a = 0;
    M[S.clock_frame] = a;
    P.spend(24);
    return {};
  };
  P.trn_boot_run = function () {
    P.spend(6);
    if (IR(S.tclock_timer)) return {};
    M[S.tclock_timer] = 5;
    let a = M[S.boot_frame] + 1;
    if (a === 4) a = 0;
    M[S.boot_frame] = a;
    P.spend(24);
    return {};
  };
  // train_setup ($8B50): the uniforms, and the train's length and guards by the defender's level
  P.trn_train_setup = function () {
    const x = M[R.attacker];
    M[S.fighter_colour] = M[S.uniform_colours + x];
    const y = x ^ 1;
    M[S.a_8D74] = M[S.uniform_colours + y];
    const l = M[R.level + y];
    const [g, lo, step] = l === 0 ? [8, 0x60, 5] : l === 1 ? [0x0A, 0x4C, 6] : [0x0C, 0x38, 7];
    M[S.guards_left] = g;
    M[0x04] = lo; M[S.start_lo] = lo; M[0x05] = 0x26; M[S.start_hi] = 0x26;
    M[S.progress_step] = step;
    P.spend(70);
    return {};
  };
  // train_progress ($8BB7)
  P.trn_train_progress = function () {
    P.spend(6);
    if (!IR(S.tiles_drawn)) return {};
    M[S.tiles_drawn] = 0;
    let left = 0x26EB - (IR(0x04) | IR(0x05) << 8);
    M[S.progress_left] = left & 255; M[S.a_8110] = (left >> 8) & 255;
    P.spend(30);
    if (left < 0) { M[S.scroll_speed] = 0; M[S.train_done] = 1; return {}; }
    let x = 0;
    for (;;) {
      left = (M[S.progress_left] | M[S.a_8110] << 8) - M[S.progress_step];
      M[S.progress_left] = left & 255; M[S.a_8110] = (left >> 8) & 255;
      P.spend(30);
      if (left < 0) break;
      x++;
    }
    let a = x & 255;
    if (a >= 0x22) a = 0x21;
    const b = a << 3;
    M[S.progress_left] = b & 255; M[S.a_8110] = b >> 8;
    const v = 0x12C - b;
    M[S.boot_x] = v & 255; M[S.boot_x_hi] = (v >> 8) & 255;
    P.spend(50);
    return {};
  };
  P.trn_train_irq_on = function* () {
    const io = P.io;
    M[0xFFFE] = 0x0D; M[0xFFFF] = 0x83;
    io.vicWrite(0x1A, 1); io.vicWrite(0x19, 1);
    P.spend(24);
    while (io.vicRead(0x11) & 0x80) { P.spend(9); yield; }
    io.vicWrite(0x11, io.vicRead(0x11) & 0x7F);
    io.vicWrite(0x12, 0xF9);
    io.ciaRead(0x0D); io.cia2Read(0x0D);
    io.vicWrite(0x15, 0xFF); io.vicWrite(0x1C, 0xFF); io.vicWrite(0x17, 0); io.vicWrite(0x1D, 0);
    P.spend(60);
    return { a: 0 };
  };
  P.trn_sprite_list_clear = function () {
    M[S.tlist_count] = 0;
    for (let y = 0x0F; y >= 0; y--) { M[S.flist_y + y] = 0xE8; M[S.flist_ptr + y] = 0xDF; }
    P.spend(16 * 17 + 10);
    return { a: 0xDF, y: 0xFF };
  };
  // train_random ($8C6F): five bytes, 1 + the first, the fourth and the fifth with the carry
  P.trn_train_random = function () {
    let s = 1 + M[S.frnd_seed] + M[S.a_8C9F];
    s = (s & 255) + M[S.a_8CA0] + (s > 255 ? 1 : 0);
    const a = s & 255;
    M[S.frnd_sum] = a;
    M[S.a_8CA0] = M[S.a_8C9F]; M[S.a_8C9F] = M[S.a_8C9E]; M[S.a_8C9E] = M[S.a_8C9D]; M[S.a_8C9D] = M[S.frnd_seed]; M[S.frnd_seed] = a;
    P.spend(56);
    return { a, c: s > 255 ? 1 : 0 };
  };
  P.trn_track_step = function () {
    let a = M[S.track_offset] + 1;
    if (a >= 0x28) a = 0;
    M[S.track_offset] = a;
    P.spend(16);
    return P.trn_track_draw();
  };
  // track_draw ($8CB0): screen rows 19 and 20 from the two strips, from the offset round
  P.trn_track_draw = function () {
    let x = M[S.track_offset];
    for (let y = 0; y < 0x28; y++) {
      M[0x4AF8 + y] = M[S.track_strips + x]; M[0x4B20 + y] = M[S.track_strips_2cf8 + x];
      x++;
      if (x >= 0x28) x = 0;
    }
    P.spend(40 * 26);
    return { x, y: 0x28 };
  };
  const band = (off, strip, row) => {
    let x = M[off];
    for (let y = 0; y < 0x28; y++) { M[row + y] = M[strip + x]; x++; if (x >= 0x78) x = 0; }
    P.spend(40 * 20);
    return { x, y: 0x28 };
  };
  P.trn_far_band_draw = function () { return band(S.far_offset, S.far_strip, 0x48A0); };
  P.trn_near_band_draw = function () { return band(S.near_offset, S.near_strip, 0x48F0); };
  // bands_scroll ($8CCE): the far band 4 pixels a frame, the near one 6
  P.trn_bands_scroll = function () {
    const step = (fine, off, d, draw) => {
      const v = M[fine] - d;
      P.spend(10);
      if (v >= 0) { M[fine] = v; return false; }
      M[fine] = v & 7;
      let a = M[off] + 1;
      if (a >= 0x78) a = 0;
      M[off] = a;
      P.spend(20);
      draw();
      return true;
    };
    step(S.far_fine, S.far_offset, 4, P.trn_far_band_draw);
    step(S.near_fine, S.near_offset, 6, P.trn_near_band_draw);
    return {};
  };
  P.trn_driver_stop = function () { M[S.driver_frame] = 2; P.spend(8); return { a: 2 }; };
  // left_behind ($8D4D): standing or walking with the train gone 30 columns past him
  P.trn_left_behind = function () {
    P.spend(8);
    if (M[S.fighter_state] >= 2 || IR(S.rear_columns) < 0x1E) return {};
    M[S.left_behind_flag]++;
    M[S.fighter_moving] = 0; M[S.fighter_state] = 7;
    P.spend(20);
    return {};
  };
  // train_end_count ($9338): every 100 frames; at 0 the train ends (its two pla go back to the map)
  P.trn_train_end_count = function () {
    P.spend(6);
    if (IR(S.tend_timer)) return {};
    M[S.tend_timer] = 0x64;
    M[S.end_count] = (M[S.end_count] - 1) & 255;
    P.spend(14);
    if (!M[S.end_count]) {
      const io = P.io;
      io.vicWrite(0x1A, 0x64);    // A is still the timer's $64: the raster interrupt off, bit 2 on
      io.vicWrite(0x19, io.vicRead(0x19));
      io.vicWrite(0x11, io.vicRead(0x11) & 0xEF);
      P.spend(30);
      throw new TrainExit();
    }
    if (M[S.end_count] === 3) M[0xF134] = 0x13;    // mapsfx_fade, the map's
    return {};
  };
  P.trn_guards_colour = function () {
    const a = M[S.uniform_colours + (M[R.attacker] ^ 1)];
    for (let x = 0x27; x > 7; x--) { P.io.colourWrite(x, a); P.io.colourWrite(0x28 + x, a); }
    P.spend(32 * 14 + 20);
    return { a, x: 7 };
  };
  // train_sound ($9C15): X and Y kept in its operands
  P.trn_train_sound = function (r) {
    M[S.tsound_busy] = (M[S.tsound_busy] + 1) & 255;
    M[0x9C22] = (r.x || 0) & 255; M[0x9C24] = (r.y || 0) & 255;
    P.run6502(0xF12B, { a: r.a });
    M[S.tsound_busy] = (M[S.tsound_busy] - 1) & 255;
    P.spend(30);
    return { x: M[0x9C22], y: M[0x9C24] };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
