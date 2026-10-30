// The fort (file S1, $2000-$9FFF), first part: the main loop and its pause, the machine, the
// raster interrupts (the bottom of the fort and its scroll, the bar with the boot and the clock,
// the frame's work at the top, and the sprites reused down the fort), the scroll and the tiles
// drawn into the buffer, the fort's length by level, the clock, the progress bar and the flag.
// The fighters, the guards, the dog, the barrel and the knives are in g-frt2.js.
//
// The frame interrupt at the top does the frame's work (the sprite list, the guard's walk, the
// timers) and the bottom one scrolls the fort; the main loop reads their timers, the scroll's
// bytes and the guard's place in the middle of its routines, through P.irqByte (IR below).
// fort_mux keeps the interrupted registers in its own operands ($84F3-$84F7).
(function (root) {
'use strict';
const G = root.NSGroups = root.NSGroups || {};
G.frt = function (P) {
  const M = P.M, S = root.NSSyms.frt, R = root.NSSyms.res;
  for (const n of ['frt_fort_main', 'frt_fort_irq_on']) P.GEN.add(n);
  const LOOP = [0x803C, 0x806F, 0x8072, 0x8075, 0x8078, 0x807B, 0x807E, 0x8081, 0x8084, 0x8087, 0x808A, 0x808D, 0x8090,
    0x8093, 0x8096, 0x8099, 0x809C, 0x809F, 0x80A2, 0x80A5];
  P.PASS.frt = 0x803C;
  P.CPS.frt = [0x8024, ...LOOP, 0x80BA, 0x8050, 0x8057, 0x805E];
  P.IRQS.frt = { 0x8310: 'frt_fort_irq_bottom', 0x833D: 'frt_fort_irq_bar', 0x83A8: 'frt_fort_irq_top', 0x844C: 'frt_fort_irq_field',
    0x8485: 'frt_fort_mux' };
  const range = (a, n) => Array.from({ length: n }, (_, i) => a + i);
  P.IRQ_BYTES.frt = [...range(S.flag_timer, 13), S.fine_scroll, S.view_col, S.scroll_moved, S.scroll_steps, S.tiles_drawn,
    0x04, 0x05, ...range(S.fighter_x, 4), S.a_8BF2, S.dog_x, S.dog_x_hi, S.barrel_x, S.barrel_x_hi,
    // the fort's rows on the screen, which the bottom interrupt redraws as the view scrolls and the
    // fighters' floors, walls and ladders are read from
    ...range(0x4878, 18 * 40)];
  P.IGNORE.frt = [0x84F3, 0x84F5, 0x84F7, 0x9EAA, 0x9EAC];
  const IRSET = new Set(P.IRQ_BYTES.frt);
  const IR = a => (IRSET.has(a) ? P.irqByte(a) : M[a]);
  P.frtIR = IR;
  const cp = function* (a) { yield { cp: a, cycles: P.take() }; };
  const sound = a => P.frt_fort_sound({ a });
  const ptr = a => M[a] | M[a + 1] << 8;
  const w16 = (a, v) => { M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };

  // fort_main ($8000); fort_end_count's two pla take its caller's return and go back to the map
  class FortExit { }
  P.FortExit = FortExit;
  P.frt_fort_main = function* (r = {}) {
    try {
      if (!r.resume) {
        P.frt_fort_machine();
        P.run6502(0xF128, {});
        P.frt_fort_clear(); P.frt_fort_setup(); P.frt_fort_colours(); P.frt_draw_all_columns(); P.frt_show_buffer();
        P.frt_guards_colour(); P.frt_knives_draw(); P.frt_guards_draw();
        M[S.frnd_seed] = M[0xA2];
        P.spend(10);
        yield* cp(0x8024);
        M[S.a_8B0E] = P.io.vicRead(0x12);
        M[S.a_8B0F] = P.io.vicRead(0x11);
        P.frt_sprite_list_clear(); P.frt_fort_sprite_copy(); P.frt_fort_sort();
        yield* P.frt_fort_irq_on();
      }
      let from = r.resume || 0x803C;
      if (from !== 0x80BA) {
        for (;;) {
          if (from === 0x803C) {
            yield* cp(0x803C);
            const k = P.frt_fort_key_scan().a;
            M[S.fort_key] = k;
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
          if (M[S.fort_done]) break;
        }
        sound(0x00);
        M[S.end_count] = 8;
      }
      for (;;) {
        yield* cp(0x80BA);
        M[S.fighter_state] = 0; M[R.arcade_result] = 1;
        P.frt_fighter_pictures(); P.frt_fort_flag_wave(); P.frt_flag_change(); P.frt_boot_run(); P.frt_fort_end_count();
        P.spend(20);
      }
    } catch (e) {
      if (!(e instanceof FortExit)) throw e;
    }
    return {};
  };
  // H: the pause, H let go, any key, let go
  const pause = function* () {
    M[S.fort_paused] = 1;
    sound(0x11);
    const scan = function* (a, want) { for (;;) { yield* cp(a); const k = P.frt_fort_key_scan().a; P.spend(8); if ((k === 0xFF) === want) return; } };
    yield* scan(0x8050, true);
    yield* scan(0x8057, false);
    yield* scan(0x805E, true);
    M[S.fort_paused] = 0; M[S.fort_key] = 0xFF;
    P.spend(14);
  };
  const STEPS = [
    [0x806F, () => P.frt_attacker_floor()], [0x8072, () => P.frt_guard_floor()], [0x8075, () => P.frt_attacker_orders()],
    [0x8078, () => P.frt_defender_orders()], [0x807B, () => P.frt_fighter_pictures()], [0x807E, () => P.frt_knives_fly()],
    [0x8081, () => P.frt_knife_hits()], [0x8084, () => P.frt_guard_start()], [0x8087, () => P.frt_guard_gone()],
    [0x808A, () => P.frt_barrel_start()], [0x808D, () => P.frt_dog_start()], [0x8090, () => P.frt_fort_flag_wave()],
    [0x8093, () => P.frt_dog_run()], [0x8096, () => P.frt_dog_bites()], [0x8099, () => P.frt_barrel_hits()],
    [0x809C, () => P.frt_dog_gone()], [0x809F, () => P.frt_barrel_gone()], [0x80A2, () => P.frt_fort_clock()],
    [0x80A5, () => P.frt_fort_progress()],
  ];
  P.frt_fort_machine = function () {
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
    M[0xFFFA] = 0xBB; M[0xFFFC] = 0xBB; M[0xFFFB] = 0x81; M[0xFFFD] = 0x81;
    P.spend(180 + 16 * 22);
    return {};
  };
  // fort_keys_one ($81BC): up when the keys stand for the stick (its two pla end the stick reading)
  P.frt_fort_keys_one = function () {
    P.spend(10);
    if (!(M[R.cpu_union] | M[R.cpu_confed]) || !M[R.opt_keyboard]) return {};
    M[S.fstick_x] = 0; M[S.fstick_y] = 0; M[S.fstick_fire] = 1;
    const k = M[S.fort_key];
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
    if (P.frt_fort_keys_one().up) return {};
    P.io.ciaWrite(0x02, 0);
    P.spend(30);
    return P.frt_fort_stick_decode({ a: P.io.ciaRead(0x00) });
  };
  P.frt_attacker_stick = function () {
    P.spend(6);
    if (!M[R.attacker]) return port2();
    return port1();
  };
  // b_823B: port 1, unless one person plays
  const port1 = () => {
    P.spend(14);
    if (((M[R.cpu_union] + M[R.cpu_confed]) & 255) === 1) return port2();
    if (P.frt_fort_keys_one().up) return {};
    P.io.ciaWrite(0x03, 0);
    P.spend(30);
    return P.frt_fort_stick_decode({ a: P.io.ciaRead(0x01) });
  };
  P.frt_defender_stick = function () {
    P.spend(6);
    if (M[R.attacker]) return port2();
    return port1();
  };
  P.frt_fort_stick_decode = function (r) {
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
  P.frt_fort_key_scan = function () {
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
  // fort_irq_bottom ($8310), at line $C8
  P.frt_fort_irq_bottom = function () {
    const io = P.io;
    rol19(io);
    io.vicWrite(0x12, 0xD8);
    M[0xFFFE] = 0x3D; M[0xFFFF] = 0x83;
    P.spend(40);
    P.frt_fort_sprite_copy(); P.frt_fort_sort();
    P.spend(8);
    if (!M[S.fort_paused]) P.frt_fort_scroll();
    P.spend(20);
  };
  // fort_irq_bar ($833D), at line $D8
  P.frt_fort_irq_bar = function () {
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
    M[0xFFFE] = 0xA8; M[0xFFFF] = 0x83;
    io.vicWrite(0x16, io.vicRead(0x16) & 0xF8);
    P.spend(130);
  };
  // fort_irq_top ($83A8), at line 0: the frame's work
  P.frt_fort_irq_top = function () {
    const io = P.io;
    rol19(io);
    io.vicWrite(0x26, 0); io.vicWrite(0x25, 7); io.vicWrite(0x15, 0xFF); io.vicWrite(0x23, 0x0B);
    P.spend(50);
    if (!M[S.fort_paused]) {
      if (!M[S.fort_frame_busy]) {
        M[S.fort_frame_busy]++;
        P.frt_sprite_list_clear(); P.frt_dog_scroll(); P.frt_barrel_scroll(); P.frt_guard_move(); P.frt_guard_scroll();
        P.frt_fighters_to_sprites(); P.frt_knives_to_sprites(); P.frt_dog_sprite(); P.frt_barrel_sprite(); P.frt_flag_sprite();
        M[S.fort_frame_busy]--;
        P.spend(60);
      }
      P.frt_fort_timers();
      if (!M[S.fsound_busy]) P.run6502(0xF12E, {});
    }
    for (let y = 0; y < 8; y++) {
      const x = M[S.fsort_order + y];
      M[0x8434] = y;
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
    M[0xFFFE] = 0x4C; M[0xFFFF] = 0x84;
    P.spend(30);
  };
  // fort_irq_field ($844C), at line $44
  P.frt_fort_irq_field = function () {
    const io = P.io;
    rol19(io);
    io.vicWrite(0x16, (io.vicRead(0x16) & 0xF8) | M[S.fine_scroll]);
    io.vicWrite(0x23, 9);
    const line = (io.vicRead(0x01) + 0x15) & 255;
    io.vicWrite(0x12, line);
    P.spend(50);
    if (line >= 0xC0) return P.frt_fort_mux_end();
    M[0xFFFE] = 0x85; M[0xFFFF] = 0x84;
  };
  // fort_mux ($8485): the slots from 8 on down the fort; its place in the operand at $8494
  P.frt_fort_mux = function () {
    const io = P.io;
    io.vicWrite(0x19, 1);
    P.spend(30);
    let y = M[S.a_8494];
    for (;;) {
      const x = M[S.fsort_order + y];
      M[0x84CD] = y;
      const h = y & 7;
      let a = io.vicRead(0x10) & M[S.fmux_and + h];
      if (M[S.flive_xhi + x] & 1) a |= M[S.fmux_or + h];
      io.vicWrite(0x10, a);
      M[0x4BF8 + h] = M[S.flive_ptr + x];
      io.vicWrite(0x27 + h, M[S.flive_col + x]);
      io.vicWrite(0x01 + 2 * h, M[S.flive_y + x]);
      io.vicWrite(0x00 + 2 * h, M[S.flive_x + x]);
      P.spend(80);
      y = (M[0x84CD] + 1) & 255;
      if (y === 0x10) break;
      const n = (io.vicRead(0x01 + 2 * (y & 7)) + 0x15) & 255;
      P.spend(20);
      if (n < io.vicRead(0x12)) continue;
      const t = (n + 2) & 255;
      if (t >= 0xC0) break;
      io.vicWrite(0x12, t);
      M[S.a_8494] = y;
      P.spend(16);
      return;
    }
    M[0xFFFE] = 0x10; M[0xFFFF] = 0x83;
    io.vicWrite(0x12, 0xC8);
    M[S.a_8494] = 8;
    P.spend(30);
  };
  P.frt_fort_mux_end = function () {
    M[0xFFFE] = 0x10; M[0xFFFF] = 0x83;
    P.io.vicWrite(0x12, 0xC8);
    M[S.a_8494] = 8;
    P.spend(26);
  };
  P.frt_fort_sort = function () {
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
  P.frt_fort_sprite_copy = function () {
    P.spend(6);
    if (M[S.fort_frame_busy]) return {};
    for (let x = 0x0F; x >= 0; x--) {
      M[S.flive_ptr + x] = M[S.flist_ptr + x]; M[S.flive_x + x] = M[S.flist_x + x]; M[S.flive_y + x] = M[S.flist_y + x];
      M[S.flive_col + x] = M[S.flist_col + x]; M[S.flive_xhi + x] = M[S.flist_xhi + x];
    }
    P.spend(16 * 47);
    return { x: 0xFF };
  };
  P.frt_fort_clear = function () {
    for (let x = 0; x < 256; x++) {
      M[0x4800 + x] = 0; M[0x4900 + x] = 0; M[0x4A00 + x] = 0; M[0x4B00 + x] = 0;
      P.io.colourWrite(x, 0); P.io.colourWrite(0x100 + x, 0); P.io.colourWrite(0x200 + x, 0); P.io.colourWrite(0x300 + x, 0);
    }
    P.spend(256 * 43);
    return { a: 0, x: 0 };
  };
  // the buffer at $2000: 18 rows of 44 characters
  const BUF_ROWS = Array.from({ length: 18 }, (_, i) => 0x2000 + 0x2C * i);
  P.frt_scroll_right_step = function () {
    M[S.scroll_steps] = (M[S.scroll_steps] + 1) & 255;
    const v = M[S.fine_scroll] - M[S.scroll_speed];
    M[S.fine_scroll] = v & 255;
    P.spend(20);
    if (v >= 0) return {};
    M[S.fine_scroll] = v & 7;
    M[S.view_col] = (M[S.view_col] + 1) & 255;
    P.spend(14);
    P.frt_show_buffer();
    if (M[S.view_col] < 3) return {};
    M[S.view_col] = 1; M[S.scroll_moved] = 1;
    w16(0x04, ptr(0x04) + 1);
    for (let y = 0; y < 0x2A; y++) for (const r of BUF_ROWS) M[r + y] = M[r + y + 2];
    P.spend(0x2A * 18 * 8 + 40);
    return P.frt_draw_tile_column({ a: 0x15 });
  };
  // draw_tile_column ($870D): tile column A of the view, nine tiles down, through its own operands
  P.frt_draw_tile_column = function (r) {
    M[S.tiles_drawn]++;
    const a = r.a;
    M[0x874E] = (a << 1) & 255; M[0x874F] = 0x20;
    let v = a + M[0x04];
    M[0x8731] = v & 255; M[0x8732] = (M[0x05] + (v > 255 ? 1 : 0)) & 255;
    M[0x2A] = 9;
    P.spend(50);
    let x = 0;
    do {
      M[0x29] = x;
      let t = M[ptr(0x8731)];
      let c = t >> 7; t = (t << 1) & 255;
      M[0x29] = ((M[0x29] << 1) | c) & 255;
      c = t >> 7; t = (t << 1) & 255;
      M[0x29] = ((M[0x29] << 1) | c) & 255;
      const lo = t + 0x18;
      M[0x874B] = lo & 255;
      M[0x874C] = (0x23 + M[0x29] + (lo > 255 ? 1 : 0)) & 255;
      for (let y = 3; y >= 0; y--) M[(ptr(0x874E) + M[S.tile_cells + y]) & 0xFFFF] = M[(ptr(0x874B) + y) & 0xFFFF];
      v = M[0x874E] + 0x58;
      M[0x874E] = v & 255;
      if (v > 255) M[0x874F] = (M[0x874F] + 1) & 255;
      w16(0x8731, ptr(0x8731) + 0x190);
      M[0x2A] = (M[0x2A] - 1) & 255;
      P.spend(150);
    } while (M[0x2A]);
    return { x: M[S.tile_cells] };
  };
  P.frt_scroll_left_step = function () {
    M[S.scroll_steps] = (M[S.scroll_steps] + 1) & 255;
    const v = M[S.fine_scroll] + M[S.scroll_speed];
    M[S.fine_scroll] = v & 255;
    P.spend(20);
    if ((v & 255) < 8) return {};
    M[S.fine_scroll] = v & 7;
    M[S.view_col] = (M[S.view_col] - 1) & 255;
    P.spend(14);
    P.frt_show_buffer();
    if (M[S.view_col]) return {};
    M[S.view_col] = 2; M[S.scroll_moved] = 0xFF;
    w16(0x04, ptr(0x04) - 1);
    for (let x = 0x29, y = 0x2B; x >= 0; x--, y--) for (const r of BUF_ROWS) M[r + y] = M[r + x];
    P.spend(0x2A * 18 * 8 + 40);
    return P.frt_draw_tile_column({ a: 0 });
  };
  P.frt_show_buffer = function () {
    const vc = M[S.view_col];
    for (let y = 0x27; y >= 0; y--) for (let row = 0; row < 18; row++) M[0x4878 + 0x28 * row + y] = M[BUF_ROWS[row] + ((y + vc) & 255)];
    P.spend(40 * 18 * 8 + 20);
    return { y: 0xFF };
  };
  P.frt_draw_all_columns = function () {
    for (let a = 0x15; a >= 0; a--) { P.frt_draw_tile_column({ a }); P.spend(12); }
    return { a: 0xFF };
  };
  P.frt_fort_colours = function () {
    M[0x8905] = 0x00; M[0x8906] = 0xD8;
    for (let y = 0; y < 0x15; y++) {
      const a = M[S.row_colours + y], base = ptr(0x8905);
      for (let x = 0x27; x >= 0; x--) P.wr((base + x) & 0xFFFF, a);
      w16(0x8905, base + 0x28);
      P.spend(40 * 10 + 40);
    }
    P.io.vicWrite(0x22, 0x08);
    return { a: 0x08 };
  };
  // fort_scroll ($8926), from the bottom interrupt
  P.frt_fort_scroll = function () {
    const m = M[S.fighter_moving];
    P.spend(6);
    if (!m) return {};
    return m & 0x80 ? P.frt_scroll_left_step() : P.frt_scroll_right_step();
  };
  P.frt_fort_timers = function () {
    for (let x = 0x0C; x >= 0; x--) { P.spend(9); if (M[S.flag_timer + x]) { M[S.flag_timer + x]--; P.spend(7); } }
    return { x: 0xFF };
  };
  P.frt_fort_clock = function () {
    P.spend(6);
    if (!M[S.time_over]) {
      if (IR(S.clock_timer)) return {};
      M[S.clock_timer] = 0x0E;
      w16(S.clock_x, (M[S.clock_x] | M[S.clock_x_hi] << 8) + 1);
      P.spend(30);
      if (!M[S.clock_x_hi] || M[S.clock_x] < 0x32) return {};
      M[S.time_over] = 1; M[S.clock_timer] = 5; M[R.arcade_result] = 0;
      sound(0x1A);
      return {};
    }
    if (IR(S.clock_timer)) return {};
    M[S.clock_timer] = 5;
    let a = M[S.clock_frame] + 1;
    if (a === 3) a = 0;
    M[S.clock_frame] = a;
    P.spend(24);
    return {};
  };
  P.frt_boot_run = function () {
    P.spend(6);
    if (IR(S.clock_timer)) return {};
    M[S.clock_timer] = 5;
    let a = M[S.boot_frame] + 1;
    if (a === 4) a = 0;
    M[S.boot_frame] = a;
    P.spend(24);
    return {};
  };
  // fort_setup ($89B7): the fort's length and guards by the defender's level
  P.frt_fort_setup = function () {
    M[S.fort_map_2d1b] = 0x17;
    const x = M[R.attacker];
    M[S.fighter_colour] = M[S.uniform_colours + x];
    const y = x ^ 1;
    M[S.flag_colour] = M[S.uniform_colours + y]; M[S.a_8BE6] = M[S.uniform_colours + y];
    const l = M[R.level + y];
    const [g, lo, step] = l === 0 ? [8, 0xE0, 6] : l === 1 ? [0x0A, 0x68, 9] : [0x0C, 0x1C, 0x0C];
    M[S.guards_left] = g;
    M[0x04] = lo; M[S.start_lo] = lo; M[0x05] = 0x27; M[S.start_hi] = 0x27;
    M[S.progress_step] = step;
    P.spend(70);
    return {};
  };
  // fort_progress ($8A26)
  P.frt_fort_progress = function () {
    P.spend(6);
    if (!IR(S.tiles_drawn)) return {};
    M[S.tiles_drawn] = 0;
    let left = 0x2893 - (IR(0x04) | IR(0x05) << 8);
    M[S.progress_left] = left & 255; M[S.a_8113] = (left >> 8) & 255;
    P.spend(30);
    if (left < 0) { M[S.scroll_speed] = 0; M[S.fort_done] = 1; return {}; }
    let x = 0;
    for (;;) {
      left = (M[S.progress_left] | M[S.a_8113] << 8) - M[S.progress_step];
      M[S.progress_left] = left & 255; M[S.a_8113] = (left >> 8) & 255;
      P.spend(30);
      if (left < 0) break;
      x++;
    }
    let a = x & 255;
    if (a >= 0x22) a = 0x21;
    const b = a << 3;
    M[S.progress_left] = b & 255; M[S.a_8113] = b >> 8;
    const v = 0x12C - b;
    M[S.boot_x] = v & 255; M[S.boot_x_hi] = (v >> 8) & 255;
    P.spend(50);
    return {};
  };
  P.frt_fort_irq_on = function* () {
    const io = P.io;
    M[0xFFFE] = 0x10; M[0xFFFF] = 0x83;
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
  P.frt_sprite_list_clear = function () {
    M[S.flist_count] = 0;
    for (let y = 0x0F; y >= 0; y--) { M[S.flist_y + y] = 0xE8; M[S.flist_ptr + y] = 0xDF; }
    P.spend(16 * 17 + 10);
    return { a: 0xDF, y: 0xFF };
  };
  P.frt_fort_random = function () {
    let s = 1 + M[S.frnd_seed] + M[S.a_8B0E];
    s = (s & 255) + M[S.a_8B0F] + (s > 255 ? 1 : 0);
    const a = s & 255;
    M[S.frnd_sum] = a;
    M[S.a_8B0F] = M[S.a_8B0E]; M[S.a_8B0E] = M[S.a_8B0D]; M[S.a_8B0D] = M[S.a_8B0C]; M[S.a_8B0C] = M[S.frnd_seed]; M[S.frnd_seed] = a;
    P.spend(56);
    return { a, c: s > 255 ? 1 : 0 };
  };
  P.frt_fort_flag_wave = function () {
    P.spend(6);
    if (IR(S.flag_timer)) return {};
    M[S.flag_timer] = 8;
    M[S.flag_frame] ^= 1;
    const p = IR(0x04) | IR(0x05) << 8;
    M[S.flag_shown] = p >= 0x288C ? 1 : 0;
    P.spend(40);
    return {};
  };
  P.frt_flag_sprite = function () {
    P.spend(6);
    if (!M[S.flag_shown]) return {};
    const x = M[S.flist_count];
    M[S.flist_ptr + x] = (0xC3 + M[S.flag_frame]) & 255;
    M[S.flist_col + x] = M[S.flag_colour];
    const d = 0x28A3 - ptr(0x04);
    M[S.flag_col] = d & 255;
    P.spend(40);
    if ((d >> 8) & 255) return {};
    M[S.flag_col] = (M[S.flag_col] << 1) & 255;
    const c = (M[S.flag_col] - M[S.view_col]) & 255;
    if (c >= 0x2B) return {};
    const b = c << 3;
    M[S.flag_col] = b & 255;
    M[S.flag_x_hi] = b > 255 ? 1 : 0;
    const v = M[S.fine_scroll] + 0x19 + M[S.flag_col];
    M[S.flist_x + x] = v & 255;
    M[S.flist_xhi + x] = (M[S.flag_x_hi] + (v > 255 ? 1 : 0)) & 255;
    M[S.flist_y + x] = M[S.flag_y];
    M[S.flist_count]++;
    P.spend(60);
    return {};
  };
  P.frt_flag_change = function () {
    P.spend(6);
    if (IR(S.flag_move_timer)) return {};
    M[S.flag_move_timer] = 2;
    const st = M[S.flag_stage];
    P.spend(14);
    if (st === 0) {
      M[S.flag_y] = (M[S.flag_y] + 1) & 255;
      if (M[S.flag_y] < 0xAA) return {};
      M[S.flag_stage]++;
      M[S.flag_colour] = M[S.uniform_colours + M[R.attacker]];
      return {};
    }
    if (st !== 1) return {};
    M[S.flag_y] = (M[S.flag_y] - 1) & 255;
    if (M[S.flag_y] >= 0x5A) return {};
    M[S.flag_stage]++;
    return {};
  };
  // fort_end_count ($91C7): every 100 frames; at 0 the fort ends (its two pla go back to the map)
  P.frt_fort_end_count = function () {
    P.spend(6);
    if (IR(S.fort_end_timer)) return {};
    M[S.fort_end_timer] = 0x64;
    M[S.end_count] = (M[S.end_count] - 1) & 255;
    P.spend(14);
    if (!M[S.end_count]) {
      const io = P.io;
      io.vicWrite(0x1A, 0x64);    // A is still the timer's $64: the raster interrupt off, bit 2 on
      io.vicWrite(0x19, io.vicRead(0x19));
      io.vicWrite(0x11, io.vicRead(0x11) & 0xEF);
      P.spend(30);
      throw new FortExit();
    }
    if (M[S.end_count] === 3) M[0xF134] = 0x13;    // mapsfx_fade, the map's
    return {};
  };
  P.frt_guards_colour = function () {
    const a = M[S.uniform_colours + (M[R.attacker] ^ 1)];
    for (let x = 0x27; x > 7; x--) { P.io.colourWrite(x, a); P.io.colourWrite(0x28 + x, a); }
    P.spend(32 * 14 + 20);
    return { a, x: 7 };
  };
  // fort_sound ($9E9D): X and Y kept in its operands
  P.frt_fort_sound = function (r) {
    M[S.fsound_busy] = (M[S.fsound_busy] + 1) & 255;
    M[0x9EAA] = (r.x || 0) & 255; M[0x9EAC] = (r.y || 0) & 255;
    P.run6502(0xF12B, { a: r.a });
    M[S.fsound_busy] = (M[S.fsound_busy] - 1) & 255;
    P.spend(30);
    return { x: M[0x9EAA], y: M[0x9EAC] };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
