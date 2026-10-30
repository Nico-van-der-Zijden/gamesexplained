// The battle (file BS, $3000-$CFFE), first part: the main loop, the machine, the frame interrupt
// and the sprite multiplexer, the keys and the pause, the pictures, the packed fields and their
// scenery, the range gauges, and the objects (soldiers, horses, cannons) drawn as black masks
// into the bitmap with the background kept under each. The units, the orders, the computer and the
// shots are in g-bat2.js. The map's sound player at $F128 plays its sounds.
//
// The frame interrupt moves the shots, hits soldiers with them, counts the fifteen timers down and
// steps the random numbers, all of which the main loop reads in the middle of its routines; those
// reads go through P.irqByte (IR below), so that in the lockstep they are what the game's code
// read. bmux_next keeps the interrupted registers and $01 in its own operands ($8B11-$8B19),
// which the port, called without them, does not keep.
//
// Unreached code: devlink_check ($8110) and devlink ($CE00), a monitor driven over the user port
// that nothing calls, are not ported; nor is the cavalry's walk after the jmp at $9C4B.
(function (root) {
'use strict';
const G = root.NSGroups = root.NSGroups || {};
G.bat = function (P) {
  const M = P.M, S = root.NSSyms.bat, R = root.NSSyms.res;
  for (const n of ['bat_battle_main', 'bat_battle_keys', 'bat_battle_pause', 'bat_battle_irq_on']) P.GEN.add(n);
  const LOOP = [0x8064, 0x8067, 0x806D, 0x8070, 0x8073, 0x8076, 0x8079, 0x807C, 0x807F, 0x8082, 0x8085, 0x8088, 0x808B, 0x808E, 0x8091, 0x8094];
  P.PASS.bat = 0x805C;
  P.CPS.bat = [0x8007, 0x805C, ...LOOP, 0x80F9];
  P.IRQS.bat = { 0x89D5: 'bat_battle_irq', 0x8A2B: 'bat_bmux_first', 0x8A9A: 'bat_bmux_next' };
  const range = (a, n) => Array.from({ length: n }, (_, i) => a + i);
  P.IRQ_BYTES.bat = [...range(S.choose_wait, 15), ...range(S.shot_x, 8), ...range(S.shot_y, 8), ...range(S.shot_live, 8),
    ...range(S.shot_life, 8), ...range(S.shot_landed, 8), ...range(S.obj_fall, 20), S.hit_sound, S.cannon_hit, S.cannon_hit_slot,
    S.side_frames, S.side_frames + 1, S.pause_wait, ...range(S.rnd_sum, 6)];
  P.IGNORE.bat = [0x8B11, 0x8B15, 0x8B17, 0x8B19, 0xA902, 0xA904];
  // a read of a byte the interrupt writes; any other byte (an index gone wild) is read as it is
  const IRSET = new Set(P.IRQ_BYTES.bat);
  const IR = a => (IRSET.has(a) ? P.irqByte(a) : M[a]);
  P.batIR = IR;
  const cp = function* (a) { yield { cp: a, cycles: P.take() }; };
  const sound = a => P.bat_bat_sound({ a });

  // battle_main ($8000); the battle's end leaves through battle_exit, whose two pla take the
  // return of battle_end's caller, so that its rts goes back to the map
  class BattleExit { }
  P.BattleExit = BattleExit;
  P.bat_battle_main = function* (r = {}) {
    try {
      if (!r.resume) {
        P.bat_battle_machine();
        P.run6502(0xF128, {});
        P.spend(20);
        yield* cp(0x8007);
        M[S.a_90A3] = P.io.vicRead(0x12);
        M[S.a_90A4] = P.io.vicRead(0x11);
        let x = P.bat_bat_random().a;
        do { P.bat_bat_random(); x = (x - 1) & 255; P.spend(8); } while (x);
        P.bat_sprite_clear(); P.bat_sprite_copy(); P.bat_sprite_sort();
        P.bat_field_unpack(); P.bat_field_scenery();
        P.io.vicWrite(0x11, 0x3B);
        yield* P.bat_battle_irq_on();
        P.bat_unit_icons();
        for (const sd of [0, 1]) {
          M[S.side] = sd;
          P.bat_bring_infantry(); P.bat_bring_cavalry(); P.bat_bring_cannon_first(); P.bat_gauge_save();
        }
        P.bat_lanes_clear();
      }
      let from = r.resume || 0x805C;
      for (;;) {
        if (from === 0x805C) {
          yield* cp(0x805C);
          M[S.side] ^= 1;
          P.spend(10);
        }
        for (const [a, f] of STEPS) {
          if (from !== 0x805C && from !== a) continue;
          from = 0x805C;
          yield* cp(a);
          const g = f();
          if (g && typeof g.next === 'function') yield* g;
        }
        P.bat_loop_sounds();
      }
    } catch (e) {
      if (!(e instanceof BattleExit)) throw e;
      yield* cp(0x80F9);
      P.bat_battle_exit();
    }
    return {};
  };
  const STEPS = [
    [0x8064, () => P.bat_unit_check()], [0x8067, () => keys()], [0x806D, () => P.bat_person_input()],
    [0x8070, () => P.bat_choose_unit()], [0x8073, () => P.bat_fall_back()], [0x8076, () => P.bat_battle_orders()],
    [0x8079, () => P.bat_cannon_anim()], [0x807C, () => P.bat_cannon_move_tick()], [0x807F, () => P.bat_infantry_tick()],
    [0x8082, () => P.bat_cannon_pictures()], [0x8085, () => P.bat_cavalry_pictures()], [0x8088, () => P.bat_hazards()],
    [0x808B, () => P.bat_balls_land()], [0x808E, () => P.bat_bring_reserves()], [0x8091, () => P.bat_battle_end()],
    [0x8094, () => P.bat_cannon_hit_gauge()],
  ];
  const keys = function* () { const r = yield* P.bat_battle_keys(); M[S.battle_key] = r.a; P.spend(4); return r; };
  // $8097: sound 13 for a hit, and the charge's sound
  P.bat_loop_sounds = function () {
    P.spend(6);
    if (IR(S.hit_sound)) { sound(0x0D); M[S.hit_sound] = 0; }
    const cav = (M[R.units_cav] + M[R.units_cav + 1]) & 255, moving = (M[S.cav_state] + M[S.a_8615]) & 255;
    P.spend(30);
    if (M[S.charge_sound]) {
      if (!cav || !moving) { sound(0x11); M[S.charge_sound] = 0; }
      return {};
    }
    if (!cav || !moving) return {};
    for (let x = 5; x >= 0; x--) {
      P.spend(9);
      if (!(M[S.f_833F + x] & 0x80)) { sound(0x03); M[S.charge_sound] = 1; return {}; }
    }
    return {};
  };
  // battle_exit ($80F9)
  P.bat_battle_exit = function () {
    const io = P.io;
    io.vicWrite(0x1A, 0);
    io.vicWrite(0x19, io.vicRead(0x19));
    io.vicWrite(0x11, io.vicRead(0x11) & 0xEF);
    P.spend(30);
    return {};
  };
  P.bat_battle_timers = function () {
    for (let x = 0x0E; x >= 0; x--) { P.spend(9); if (M[S.choose_wait + x]) { M[S.choose_wait + x]--; P.spend(7); } }
    return { x: 0xFF };
  };
  P.bat_battle_machine = function () {
    const io = P.io;
    M[1] = 0x35;
    io.ciaWrite(0x0D, 0x7F); io.cia2Write(0x0D, 0x7F);
    io.ciaWrite(0x0E, 0); io.cia2Write(0x0E, 0); io.ciaWrite(0x0F, 0); io.cia2Write(0x0F, 0);
    M[R.fell_back] = 0; M[R.fell_back + 1] = 0; M[R.side_out] = 0; M[R.side_out + 1] = 0;
    io.ciaRead(0x0D); io.cia2Read(0x0D); io.ciaRead(0x0D); io.cia2Read(0x0D);
    io.cia2Write(0x02, io.cia2Read(0x02) | 0x03);
    io.cia2Write(0x00, (io.cia2Read(0x00) & 0xFC) | 0x02);
    io.vicWrite(0x20, 0); io.vicWrite(0x21, 0); io.vicWrite(0x15, 0);
    io.vicWrite(0x18, 0x80); io.vicWrite(0x11, 0x2F); io.vicWrite(0x16, 0x18);
    io.vicWrite(0x19, io.vicRead(0x19));
    io.vicWrite(0x1A, 0);
    for (let x = 0; x < 0x20; x++) { M[S.sort_order + x] = x; M[S.live_y + x] = 0; M[S.live_x + x] = 0; }
    io.vicWrite(0x25, 0x0A); io.vicWrite(0x26, 0x00);
    M[0xFFFA] = 0x4C; M[0xFFFC] = 0x4C; M[0xFFFB] = 0x88; M[0xFFFD] = 0x88;
    P.spend(200 + 32 * 22);
    return {};
  };
  P.bat_stick_port2 = function () { P.io.ciaWrite(0x02, 0); P.spend(12); return P.bat_stick_decode({ a: P.io.ciaRead(0x00) }); };
  P.bat_stick_port1 = function () {
    const io = P.io;
    io.ciaWrite(0x02, 0xFF); io.ciaWrite(0x03, 0); io.ciaWrite(0x00, 0xFF);
    P.spend(22);
    return P.bat_stick_decode({ a: io.ciaRead(0x01) });
  };
  P.bat_stick_decode = function (r) {
    let a = r.a, x = 0, y = 0;
    if (!(a & 1)) y--;
    if (!(a & 2)) y++;
    if (!(a & 4)) x--;
    if (!(a & 8)) x++;
    a = (a >> 4) & 1;
    M[S.stick_fire] = a; M[S.stick_x] = x & 255; M[S.stick_y] = y & 255;
    P.spend(40);
    return { a, x: x & 255, y: y & 255 };
  };
  // battle_keys ($888C): the side's keys as a code; H pauses
  P.bat_battle_keys = function* () {
    const io = P.io;
    const row = (sel, mask) => { io.ciaWrite(0x00, sel); return (io.ciaRead(0x01) | mask) === mask; };
    io.ciaWrite(0x02, 0xFF); io.ciaWrite(0x03, 0);
    P.spend(20);
    if (M[S.side]) {
      if (row(0xFE, 0xBF)) return { a: 0x05 };
      io.ciaWrite(0x00, 0xBF);
      P.spend(14);
      if (io.ciaRead(0x00) !== 0xBF) return { a: 0xFF };
      if ((io.ciaRead(0x01) | 0xBF) === 0xBF) return { a: 0x07 };
    } else {
      io.ciaWrite(0x00, 0xFD);
      P.spend(14);
      if (io.ciaRead(0x00) !== 0xFD) return { a: 0xFF };
      if ((io.ciaRead(0x01) | 0xBF) === 0xBF) return { a: 0x06 };
      if (row(0x7F, 0x7F)) return { a: 0x04 };
    }
    P.spend(14);
    if (row(0xF7, 0xDF)) return yield* P.bat_battle_pause();
    return { a: 0xFF };
  };
  // battle_pause ($8907): H, 50 frames, H again
  P.bat_battle_pause = function* () {
    const io = P.io;
    P.spend(6);
    if (IR(S.pause_wait)) return { a: 0xFF };
    sound(0x11);
    M[S.paused] = 1; M[S.pause_wait] = 0x32;
    P.spend(12);
    yield* P.batWaitZero(S.pause_wait);
    for (;;) {
      io.ciaWrite(0x00, 0xF7);
      P.spend(14);
      if ((io.ciaRead(0x01) | 0xDF) === 0xDF) break;
      yield;
    }
    M[S.pause_wait] = 0x32; M[S.paused] = 0; M[S.charge_sound] = 0;
    P.spend(20);
    return { a: 0xFF };
  };
  P.batWaitZero = function* (a, cost = 7) { for (let v = P.pollFirst(a); v; v = M[a]) { P.spend(cost); yield; } };
  // key_scan ($8940)
  P.bat_key_scan = function () {
    const io = P.io;
    let y = 0;
    for (let x = 7; x >= 0; x--) {
      M[0x19] = M[S.key_lo + x]; M[0x1A] = M[S.key_hi + x];
      io.ciaWrite(0x02, 0xFF); io.ciaWrite(0x03, 0x00);
      io.ciaWrite(0x00, M[S.bkey_rows + x]);
      y = 7;
      const a = io.ciaRead(0x01);
      P.spend(40);
      if (a !== 0xFF) {
        for (; y >= 0; y--) {
          P.spend(9);
          if (a === M[S.bkey_rows + y]) { P.spend(12); return { a: M[((M[0x19] | M[0x1A] << 8) + y) & 0xFFFF], x, y }; }
        }
        y = 0xFF;
      }
      P.spend(5);
    }
    return { a: 0xFF, x: 0xFF, y };
  };
  // battle_irq ($89D5), at line $E0
  P.bat_battle_irq = function () {
    const io = P.io, keep = M[1];
    M[1] = 0x35;
    const v = io.vicRead(0x19);
    io.vicWrite(0x19, v); io.vicWrite(0x19, ((v << 1) | 1) & 255);
    io.vicWrite(0x12, 0);
    M[0xFFFE] = 0x2B; M[0xFFFF] = 0x8A;
    P.spend(40);
    P.bat_sprite_copy(); P.bat_sprite_sort();
    P.spend(8);
    if (!M[S.paused]) {
      P.bat_shots_to_sprites(); P.bat_battle_timers(); P.bat_bat_random({ irq: true }); P.bat_shots_move();
      M[S.side_frames] = (M[S.side_frames] + 1) & 255; M[S.a_87A1] = (M[S.a_87A1] + 1) & 255;
      P.spend(20);
    }
    if (!M[S.bsound_busy]) P.run6502(0xF12E, {});
    if (M[S.pause_wait]) M[S.pause_wait]--;
    P.spend(30);
    M[1] = keep;
  };
  // bmux_first ($8A2B), at line 0
  P.bat_bmux_first = function () {
    const io = P.io, keep = M[1];
    M[1] = 0x35;
    const v = io.vicRead(0x19);
    io.vicWrite(0x19, v); io.vicWrite(0x19, ((v << 1) | 1) & 255);
    P.spend(30);
    for (let y = 0; y < 7; y++) {
      const x = M[S.sort_order + y];
      M[0x8A71] = y;
      let a = io.vicRead(0x10) & M[S.f_8B6D + y];
      if (M[S.live_xhi + x] & 1) a |= M[S.f_8B75 + y];
      io.vicWrite(0x10, a);
      M[0x63F9 + y] = M[S.live_ptr + x];
      io.vicWrite(0x28 + y, M[S.live_col + x]);
      io.vicWrite(0x03 + 2 * y, M[S.live_y + x]);
      io.vicWrite(0x02 + 2 * y, M[S.live_x + x]);
      P.spend(76);
    }
    const line = (io.vicRead(0x03) + 0x15) & 255;
    io.vicWrite(0x12, line);
    if (line >= 0xD6) P.bat_bmux_last_frame();
    else { M[0xFFFE] = 0x9A; M[0xFFFF] = 0x8A; P.spend(12); }
    M[1] = keep;
  };
  // bmux_last ($8B32), as bmux_first ends it
  P.bat_bmux_last_frame = function () {
    M[0xFFFE] = 0xD5; M[0xFFFF] = 0x89;
    P.io.vicWrite(0x12, 0xE0);
    M[S.a_8AB2] = 7;
    P.spend(26);
  };
  // bmux_next ($8A9A); its place in the order in the operand at $8AB2
  P.bat_bmux_next = function () {
    const io = P.io, keep = M[1];
    M[1] = 0x35;
    io.vicWrite(0x19, 1);
    P.spend(30);
    let y = M[S.a_8AB2];
    for (;;) {
      const x = M[S.sort_order + y];
      M[0x8AEB] = y;
      const h = M[S.mux_sprite + y];
      let a = io.vicRead(0x10) & M[S.mux_and + h];
      if (M[S.live_xhi + x] & 1) a |= M[S.mux_or + h];
      io.vicWrite(0x10, a);
      M[0x63F8 + h] = M[S.live_ptr + x];
      io.vicWrite(0x27 + h, M[S.live_col + x]);
      io.vicWrite(0x01 + 2 * h, M[S.live_y + x]);
      io.vicWrite(0x00 + 2 * h, M[S.live_x + x]);
      P.spend(80);
      y = (M[0x8AEB] + 1) & 255;
      if (y === 0x20) break;
      const n = (io.vicRead(0x01 + 2 * M[S.mux_sprite + y]) + 0x15) & 255;
      P.spend(20);
      if (n < io.vicRead(0x12)) continue;
      const t = (n + 2) & 255;
      if (t >= 0xD6) break;
      io.vicWrite(0x12, t);
      M[S.a_8AB2] = y;
      P.spend(16);
      M[1] = keep;
      return;
    }
    M[0xFFFE] = 0xD5; M[0xFFFF] = 0x89;
    io.vicWrite(0x12, 0xE0);
    M[S.a_8AB2] = 7;
    P.spend(30);
    M[1] = keep;
  };
  P.bat_sprite_sort = function () {
    const O = S.sort_order;
    for (let x = 1; x !== 0x20; x++) {
      P.spend(22);
      const y1 = M[O + x], y0 = M[O + x - 1];
      if (M[S.live_y + y1] >= M[S.live_y + y0]) continue;
      M[O + x] = y0; M[O + x - 1] = y1;
      P.spend(28);
      x -= 2;
      if (x === -1) x = 1;
    }
    return {};
  };
  // bat_picture ($8D07): picture X at place A, through its copy loops' own operands
  P.bat_bat_picture = function (r) {
    let x = r.x;
    M[S.pic_width] = M[S.pic_widths + x]; M[S.pic_height] = M[S.pic_heights + x];
    x = (x << 1) & 255;
    M[0x8D6E] = M[S.pic_bitmaps + x]; M[0x8D6F] = M[S.f_8179 + x];
    M[0x8DAA] = M[S.pic_screens + x]; M[0x8DAB] = M[S.f_81AF + x];
    M[0x8DB0] = M[S.pic_colours + x]; M[0x8DB1] = M[S.f_81E5 + x];
    x = (r.a << 1) & 255;
    M[0x8D71] = M[S.place_bitmaps + x]; M[0x8D72] = M[S.f_821B + x];
    M[0x8DAD] = M[S.place_screens + x]; M[0x8DB3] = M[S.place_screens + x];
    M[0x8DAE] = M[S.f_8235 + x]; M[0x8DB4] = (M[S.f_8235 + x] + 0x78) & 255;
    M[S.pic_row_bytes] = (M[S.pic_width] << 3) & 255;
    P.spend(130);
    const ptr = a => M[a] | M[a + 1] << 8;
    const w16 = (a, d) => { const v = ptr(a) + d; M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };
    const rb = M[S.pic_row_bytes];
    for (let y = M[S.pic_height]; ; ) {
      const s = ptr(0x8D6E), d = ptr(0x8D71);
      for (let i = (rb - 1) & 255; ; i = (i - 1) & 255) { P.wr((d + i) & 0xFFFF, P.rd((s + i) & 0xFFFF)); P.spend(16); if (i === 0) break; }
      w16(0x8D6E, rb); w16(0x8D71, 0x140);
      P.spend(50);
      y = (y - 1) & 255;
      if (!y) break;
    }
    for (let y = M[S.pic_height]; ; ) {
      const w = M[S.pic_width];
      for (let i = (w - 1) & 255; ; i = (i - 1) & 255) {
        P.wr((ptr(0x8DAD) + i) & 0xFFFF, P.rd((ptr(0x8DAA) + i) & 0xFFFF));
        P.wr((ptr(0x8DB3) + i) & 0xFFFF, P.rd((ptr(0x8DB0) + i) & 0xFFFF));
        P.spend(25);
        if (i === 0 || i & 0x80) break;
      }
      w16(0x8DAA, w); w16(0x8DB0, w);
      const lo = M[0x8DAD] + 0x28;
      M[0x8DAD] = lo & 255; M[0x8DB3] = lo & 255;
      const h = M[0x8DAE] + (lo > 255 ? 1 : 0);
      M[0x8DAE] = h & 255; M[0x8DB4] = ((h & 255) + 0x78 + (h > 255 ? 1 : 0)) & 255;
      P.spend(80);
      y = (y - 1) & 255;
      if (!y) break;
    }
    return { a: M[0x8DB4], x: 0xFF, y: 0 };
  };
  P.bat_sprite_copy = function () {
    for (let x = 0x1F; x >= 0; x--) {
      M[S.live_ptr + x] = M[S.slist_ptr + x]; M[S.live_x + x] = M[S.slist_x + x]; M[S.live_y + x] = M[S.slist_y + x];
      M[S.live_col + x] = M[S.slist_col + x]; M[S.live_xhi + x] = M[S.slist_xhi + x];
    }
    P.spend(32 * 47);
    return { x: 0xFF };
  };
  // unpack ($8E1E): from ($10) to ($12), one byte more than the count at $14/$15
  // the flags are shifted out with rol: the carry goes in at the bottom, 0 at the start (the asl of the
  // field type before each call) and then 1, what the count's subtraction leaves while it goes on
  P.bat_unpack = function (r = {}) {
    let carry = r.c ? 1 : 0;
    const ptr = a => M[a] | M[a + 1] << 8;
    const inc = a => { const v = ptr(a) + 1; M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };
    const add = (a, d) => { const v = ptr(a) + d; M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };
    const cnt = d => { const v = ptr(0x14) - d; M[0x14] = v & 255; M[0x15] = (v >> 8) & 255; return (M[0x15] & 0x80) !== 0; };
    for (;;) {
      M[0x16] = P.rd(ptr(0x10));
      inc(0x10);
      P.spend(20);
      for (let x = 8; x > 0; x--) {
        const c = M[0x16] & 0x80;
        M[0x16] = ((M[0x16] << 1) | carry) & 255;
        carry = 1;
        if (c) {
          const v = P.rd(ptr(0x10));
          P.wr(ptr(0x12), v); M[0x18] = v;
          inc(0x12);
          P.spend(40);
          if (cnt(1)) return { y: 0 };
        } else {
          // a run of n of the last byte copied (0 is 256)
          const n = P.rd(ptr(0x10));
          M[0x17] = n;
          const d = ptr(0x12);
          for (let y = (n - 1) & 255; y !== 0; y = (y - 1) & 255) P.wr((d + y) & 0xFFFF, M[0x18]);
          P.wr(d, M[0x18]);
          add(0x12, n);
          P.spend(30 + 11 * n);
          if (cnt(n)) return { y: 0 };
        }
        inc(0x10);
        P.spend(12);
      }
    }
  };
  // the range gauges
  P.bat_gauge_places = function () {
    const x = (M[S.side] << 1) & 255;
    M[0x40] = M[S.gauge_bitmaps + x]; M[0x41] = M[S.f_824F + x];
    M[0x42] = M[S.gauge_stores + x]; M[0x43] = M[S.f_8257 + x];
    M[0x48] = M[S.gauge_screens + x]; M[0x44] = M[S.gauge_screens + x];
    M[0x49] = M[S.f_8253 + x]; M[0x45] = (M[S.f_8253 + x] + 0x78) & 255;
    P.spend(70);
    return { x };
  };
  const ptr = a => M[a] | M[a + 1] << 8;
  P.bat_gauge_save = function () {
    P.bat_gauge_places();
    for (let y = 0x3F; y >= 0; y--) M[(ptr(0x42) + y) & 0xFFFF] = M[(ptr(0x40) + y) & 0xFFFF];
    let v = ptr(0x42) + 0x40; M[0x42] = v & 255; M[0x43] = (v >> 8) & 255;
    v = ptr(0x42) + 8; M[0x46] = v & 255; M[0x47] = (v >> 8) & 255;
    for (let y = 7; y >= 0; y--) { M[(ptr(0x42) + y) & 0xFFFF] = M[(ptr(0x48) + y) & 0xFFFF]; M[(ptr(0x46) + y) & 0xFFFF] = P.rd((ptr(0x44) + y) & 0xFFFF); }
    P.spend(64 * 14 + 8 * 25 + 40);
    return {};
  };
  P.bat_gauge_clear = function () {
    P.bat_gauge_places();
    for (let y = 0x3F; y >= 0; y--) M[(ptr(0x40) + y) & 0xFFFF] = 0;
    for (let y = 7; y >= 0; y--) { M[(ptr(0x48) + y) & 0xFFFF] = 0xBC; P.wr((ptr(0x44) + y) & 0xFFFF, 1); }
    P.spend(64 * 9 + 8 * 20);
    return {};
  };
  P.bat_gauge_draw = function () {
    const y0 = M[S.side], x = (y0 << 1) & 255;
    M[0x40] = M[S.gauge_bitmaps + x]; M[0x41] = M[S.f_824F + x];
    M[S.gauge_left] = M[S.cannon_range + y0];
    M[S.gauge_cells] = 8;
    P.spend(40);
    const right = !!M[S.side];
    if (right) { const v = ptr(0x40) + 0x38; M[0x40] = v & 255; M[0x41] = (v >> 8) & 255; }
    do {
      for (let y = 7; y >= 0; y--) {
        const l = M[S.gauge_left];
        let a;
        if (l >= 4) a = M[S.gauge_pattern + y];
        else if (l === 0) a = 0;
        else {
          a = M[S.gauge_pattern + y];
          for (let k = M[S.gauge_shift + l]; k > 0; k--) a = right ? a >> 2 : (a << 2) & 255;
        }
        M[(ptr(0x40) + y) & 0xFFFF] = a;
        P.spend(24);
      }
      const l = M[S.gauge_left] - 4;
      M[S.gauge_left] = l < 0 ? 0 : l;
      const v = ptr(0x40) + (right ? -8 : 8);
      M[0x40] = v & 255; M[0x41] = (v >> 8) & 255;
      M[S.gauge_cells] = (M[S.gauge_cells] - 1) & 255;
      P.spend(40);
    } while (M[S.gauge_cells]);
    return {};
  };
  P.bat_gauge_restore_side = function () { P.spend(8); return P.bat_gauge_restore({ x: (M[S.side] << 1) & 255 }); };
  P.bat_gauge_restore = function (r) {
    const x = r.x;
    M[0x40] = M[S.gauge_bitmaps + x]; M[0x41] = M[S.f_824F + x];
    M[0x42] = M[S.gauge_stores + x]; M[0x43] = M[S.f_8257 + x];
    for (let y = 0x3F; y >= 0; y--) M[(ptr(0x40) + y) & 0xFFFF] = M[(ptr(0x42) + y) & 0xFFFF];
    let v = ptr(0x42) + 0x40; M[0x42] = v & 255; M[0x43] = (v >> 8) & 255;
    v = ptr(0x42) + 8; M[0x46] = v & 255; M[0x47] = (v >> 8) & 255;
    M[0x48] = M[S.gauge_screens + x]; M[0x44] = M[S.gauge_screens + x];
    M[0x49] = M[S.f_8253 + x]; M[0x45] = (M[S.f_8253 + x] + 0x78) & 255;
    for (let y = 7; y >= 0; y--) { M[(ptr(0x48) + y) & 0xFFFF] = M[(ptr(0x42) + y) & 0xFFFF]; P.wr((ptr(0x44) + y) & 0xFFFF, M[(ptr(0x46) + y) & 0xFFFF]); }
    P.spend(64 * 14 + 8 * 25 + 80);
    return { x };
  };
  P.bat_battle_irq_on = function* () {
    const io = P.io;
    M[0xFFFE] = 0xD5; M[0xFFFF] = 0x89;
    io.vicWrite(0x1A, 1); io.vicWrite(0x19, 1);
    P.spend(24);
    while (io.vicRead(0x11) & 0x80) { P.spend(9); yield; }
    io.vicWrite(0x11, io.vicRead(0x11) & 0x7F);
    io.vicWrite(0x12, 0xF9);
    io.ciaRead(0x0D); io.cia2Read(0x0D); io.ciaRead(0x0D); io.cia2Read(0x0D);
    io.vicWrite(0x15, 0xFF); io.vicWrite(0x1C, 0x01); io.vicWrite(0x17, 0); io.vicWrite(0x1D, 0);
    P.spend(70);
    return { a: 0 };
  };
  P.bat_sprite_clear = function () {
    for (let y = 0x1F; y >= 0; y--) { M[S.slist_y + y] = 0xE8; M[S.slist_ptr + y] = 0xE0; }
    M[S.sprite_spare] = 0;
    P.spend(32 * 17);
    return { a: 0 };
  };
  // bat_random ($9073): from the main program, its bytes are read as the game's code read them
  // (the frame interrupt steps them too)
  P.bat_bat_random = function (r = {}) {
    // every byte read as often and in the order the game reads it: the frame interrupt draws from the
    // same bytes, and a read in the main program is the value the game's read there
    const rd = r.irq ? (a => M[a]) : IR;
    let s = 1 + rd(S.rnd_seed) + rd(S.a_90A3);
    s = (s & 255) + rd(S.a_90A4) + (s > 255 ? 1 : 0);
    const a = s & 255;
    M[S.rnd_sum] = a;
    M[S.a_90A4] = rd(S.a_90A3); M[S.a_90A3] = rd(S.a_90A2); M[S.a_90A2] = rd(S.a_90A1); M[S.a_90A1] = rd(S.rnd_seed);
    M[S.rnd_seed] = rd(S.rnd_sum);
    const out = M[S.rnd_seed];
    P.spend(56);
    return { a: out, c: s > 255 ? 1 : 0 };
  };
  // field_unpack ($90A5): one of the three fields at random
  P.bat_field_unpack = function () {
    const a = P.bat_bat_random().a;
    const f = a < 0x55 ? 1 : a < 0xAA ? 2 : 0;
    M[S.field_type] = f;
    const set = (dst, len, src) => {
      M[0x12] = dst & 255; M[0x13] = dst >> 8; M[0x14] = len & 255; M[0x15] = len >> 8;
      M[0x10] = M[src + 2 * f]; M[0x11] = M[src + 2 * f + 1];
      P.spend(40);
      P.bat_unpack();
    };
    set(0x4000, 0x1F40, S.field_bitmaps);
    set(0x6000, 0x03E8, S.field_screens);
    if (f) { set(0xD800, 0x03E8, S.field_colours); return {}; }
    // through the processor port as the game's sta does: colour RAM with the chips in, RAM under them otherwise
    for (let i = 0; i < 0x400; i++) P.wr(0xD800 + i, 5);
    P.spend(256 * 22);
    return { a: 5, x: 0 };
  };
  P.bat_field_scenery = function () {
    P.spend(8);
    if (M[S.field_type] === 1) return {};
    M[S.scenery_base] = (M[S.field_type] << 2) & 255;
    for (let x = 7; x >= 0; x--) {
      P.spend(14);
      if (P.bat_bat_random().a >= 0x7F) continue;
      const y = ((P.bat_bat_random().a & 3) + M[S.scenery_base]) & 255;
      const p = M[S.scenery_choices + y];
      P.spend(20);
      if (p & 0x80) continue;
      M[S.scenery_placed + x] = p;
      M[0x9171] = x;
      P.bat_bat_picture({ a: x, x: p });
      x = M[0x9171];
    }
    return {};
  };
  P.bat_unit_icons = function () {
    P.spend(8);
    if (!M[R.cpu_union]) P.bat_bat_picture({ a: 8, x: (M[S.unit_choice] + 0x15) & 255 });
    P.spend(8);
    if (!M[R.cpu_confed]) P.bat_bat_picture({ a: 9, x: (M[S.a_8296] + 0x18) & 255 });
    return {};
  };

  // ---- the objects: 40 slots drawn as masks into the bitmap
  // draw_objects ($91B1): every slot whose redraw flag is set, from 39 down; the slot kept in the
  // operand of the ldy at $91B6
  P.bat_draw_objects = function () {
    M[0x91B7] = 0x27;
    for (;;) {
      const y = M[0x91B7];
      P.spend(14);
      const pic = M[S.obj_picture + y];
      if (!(pic & 0x80)) {
        M[S.draw_pic_no] = pic;
        if (M[S.obj_redraw + y]) {
          M[S.obj_redraw + y] = 0;
          P.bat_build_mask({ y });
          if (!(M[S.drawn_line + y] & 0x80)) { P.bat_cover_sprite({ y }); P.bat_restore_under({ y }); }
          if (!(M[S.obj_keep + y] & 0x80)) {
            M[S.obj_keep + y] = 0xFF; M[S.obj_picture + y] = 0xFF; M[S.drawn_line + y] = 0xFF;
            P.bat_cover_off();
          } else if (P.bat_place_object({ y }).off) {
            // off the field: place_object's two pla skip the drawing (and cover_off)
          } else {
            P.bat_save_under({ y }); P.bat_draw_mask();
            P.bat_cover_off();
          }
          P.spend(30);
        }
      }
      M[0x91B7] = (M[0x91B7] - 1) & 255;
      if (M[0x91B7] & 0x80) return {};
    }
  };
  // place_object ($91FD): slot Y's bitmap address; off the field (x from $94) the slot is undrawn
  P.bat_place_object = function (r) {
    const y = r.y, oy = M[S.obj_y + y];
    let x = oy >> 3;
    M[0x20] = M[S.row_lo + x]; M[0x21] = M[S.row_hi + x];
    M[S.draw_line_now] = oy & 7; M[S.drawn_line + y] = oy & 7;
    const ox = M[S.obj_x + y];
    P.spend(40);
    if (ox >= 0x94) { M[S.drawn_line + y] = 0xFF; P.bat_cover_off(); return { y, off: true }; }
    x = ox >> 2;
    const lo = M[S.col_lo + x] + M[0x20];
    M[0x20] = lo & 255; M[S.drawn_lo + y] = lo & 255;
    const h = M[S.col_hi + x] + M[0x21] + (lo > 255 ? 1 : 0);
    const h2 = (h & 255) + 0x40 + (h > 255 ? 1 : 0);
    M[0x21] = h2 & 255; M[S.drawn_hi + y] = h2 & 255;
    P.spend(40);
    return { y };
  };
  // save_under ($9247): the bitmap under the picture into the slot's store under the I/O chips
  // ($01 = $34 while it writes); its own operands step the columns
  P.bat_save_under = function (r) {
    M[0x92B9] = r.y;
    M[0x9279] = M[S.store_lo + r.y]; M[0x927A] = M[S.store_hi + r.y];
    M[0x22] = M[0x20]; M[0x23] = M[0x21];
    M[0x9299] = 8; M[0x9292] = 0x15;
    M[1] = 0x34;
    P.spend(50);
    let x = 0;
    for (;;) {
      let y = M[S.draw_line_now];
      for (; x < M[0x9292]; x++) {
        const v = (~M[S.obj_mask + x] & 255) & M[(ptr(0x22) + y) & 0xFFFF];
        M[(ptr(0x9279) + x) & 0xFFFF] = v;
        y = (y + 1) & 255;
        if (!(y & 7)) { const w = ptr(0x22) + 0x140; M[0x22] = w & 255; M[0x23] = (w >> 8) & 255; y = 0; P.spend(16); }
        P.spend(30);
      }
      const w = ptr(0x20) + M[0x9299]; M[0x22] = w & 255; M[0x23] = (w >> 8) & 255;
      M[0x9292] = (M[0x9292] + 0x15) & 255;
      M[0x9299] = (M[0x9299] + 8) & 255;
      P.spend(40);
      if (M[0x9299] >= 0x28) break;
    }
    M[1] = 0x35;
    return { y: M[0x92B9] };
  };
  // restore_under ($92BF): the store ORed back into the bitmap at the slot's old place
  P.bat_restore_under = function (r) {
    M[0x933B] = r.y;
    M[0x92F4] = M[S.store_lo + r.y]; M[0x92F5] = M[S.store_hi + r.y];
    M[0x30] = M[S.drawn_lo + r.y]; M[0x32] = M[S.drawn_lo + r.y];
    M[0x31] = M[S.drawn_hi + r.y]; M[0x33] = M[S.drawn_hi + r.y];
    M[S.restore_line] = M[S.drawn_line + r.y];
    let y = M[S.restore_line];
    M[0x9311] = 0x15; M[0x9318] = 8;
    M[1] = 0x34;
    P.spend(60);
    let x = 0;
    for (;;) {
      for (; x < M[0x9311]; x++) {
        const a = (ptr(0x32) + y) & 0xFFFF;
        M[a] = M[(ptr(0x92F4) + x) & 0xFFFF] | M[a];
        y = (y + 1) & 255;
        if (!(y & 7)) { const w = ptr(0x32) + 0x140; M[0x32] = w & 255; M[0x33] = (w >> 8) & 255; y = 0; P.spend(16); }
        P.spend(30);
      }
      const w = ptr(0x30) + M[0x9318]; M[0x32] = w & 255; M[0x33] = (w >> 8) & 255;
      y = M[S.restore_line];
      M[0x9311] = (M[0x9311] + 0x15) & 255;
      M[0x9318] = (M[0x9318] + 8) & 255;
      P.spend(40);
      if (M[0x9318] >= 0x28) break;
    }
    M[1] = 0x35;
    return { y: M[0x933B] };
  };
  // build_mask ($9341): the picture's 63 bytes inverted into the mask, shifted by x and 3
  P.bat_build_mask = function (r) {
    M[0x93A2] = r.y;
    const p = M[S.draw_pic_no];
    M[0x9364] = M[S.shape_lo + p]; M[0x9365] = M[S.shape_hi + p];
    for (let x = 0x53; x >= 0; x--) M[S.obj_mask + x] = 0xFF;
    const src = ptr(0x9364);
    for (let x = 0x3E; x >= 0; x--) M[S.obj_mask + M[S.mask_order + x]] = ~M[(src + x) & 0xFFFF] & 255;
    P.spend(84 * 9 + 63 * 22 + 30);
    const sh = M[S.obj_x + M[0x93A2]] & 3;
    if (sh) {
      M[S.draw_shift] = sh;
      for (let x = 0x14; x >= 0; x--) {
        for (let k = sh; k > 0; k--) {
          for (let b = 0; b < 2; b++) {
            let c = 1;
            for (const col of [S.obj_mask, S.f_83E8, S.f_83FD, S.f_8412]) {
              const v = M[col + x];
              M[col + x] = (v >> 1) | (c << 7);
              c = v & 1;
            }
          }
          P.spend(60);
        }
      }
    }
    // the sty at the start wrote Y into the operand of the closing ldy ($93A1): Y comes back as it came in
    return { y: M[0x93A2] };
  };
  P.bat_draw_mask = function () {
    M[0x22] = M[0x20]; M[0x23] = M[0x21];
    M[0x93D9] = 0x15; M[0x93E0] = 8;
    P.spend(30);
    let x = 0;
    for (;;) {
      let y = M[S.draw_line_now];
      for (; x < M[0x93D9]; x++) {
        const a = (ptr(0x22) + y) & 0xFFFF;
        M[a] = M[S.obj_mask + x] & M[a];
        y = (y + 1) & 255;
        if (!(y & 7)) { const w = ptr(0x22) + 0x140; M[0x22] = w & 255; M[0x23] = (w >> 8) & 255; y = 0; P.spend(16); }
        P.spend(28);
      }
      const w = ptr(0x20) + M[0x93E0]; M[0x22] = w & 255; M[0x23] = (w >> 8) & 255;
      M[0x93D9] = (M[0x93D9] + 0x15) & 255;
      M[0x93E0] = (M[0x93E0] + 8) & 255;
      P.spend(40);
      if (M[0x93E0] >= 0x28) break;
    }
    return {};
  };
  // cover_sprite ($A317): sprite 0 over slot Y while its bitmap is redrawn
  P.bat_cover_sprite = function (r) {
    const io = P.io, ox = M[S.obj_x + r.y];
    P.spend(10);
    if (ox >= 0x94) return Object.assign({ y: r.y }, P.bat_cover_off());
    M[S.cover_x] = (ox << 1) & 255; M[S.cover_x_hi] = ox >> 7;
    const v = M[S.cover_x] + 0x18;
    io.vicWrite(0x00, v & 255);
    if (((M[S.cover_x_hi] + (v > 255 ? 1 : 0)) & 1) === 0) io.vicWrite(0x10, io.vicRead(0x10) & 0xFE);
    else io.vicWrite(0x10, io.vicRead(0x10) | 0x01);
    io.vicWrite(0x01, (M[S.obj_y + r.y] + 0x32) & 255);
    io.vicWrite(0x15, io.vicRead(0x15) | 1);
    M[0x63F8] = (M[S.draw_pic_no] + 0x90) & 255;
    io.vicWrite(0x27, 0);
    P.spend(90);
    return { a: 0, y: r.y };
  };
  P.bat_cover_off = function () {
    P.io.vicWrite(0x15, P.io.vicRead(0x15) & 0xFE);
    P.spend(14);
    return {};
  };
  // pick_lane ($9400)
  P.bat_pick_lane = function () {
    M[S.lane_base] = (M[S.side] << 2) & 255;
    let x;
    do { x = ((P.bat_bat_random().a & 3) + M[S.lane_base]) & 255; P.spend(20); } while (M[S.lanes_taken + x]);
    M[S.lanes_taken + x] = 1;
    M[S.lane_y] = M[S.lane_heights + x];
    P.spend(20);
    return { x };
  };
  P.bat_lanes_clear = function () { for (let x = 7; x >= 0; x--) M[S.lanes_taken + x] = 0; P.spend(8 * 9); return { a: 0, x: 0xFF }; };
  // bat_sound ($A8EE): sound A while the battle goes on; X and Y kept in its operands
  P.bat_bat_sound = function (r) {
    M[S.bsound_busy] = (M[S.bsound_busy] + 1) & 255;
    M[0xA902] = (r.y || 0) & 255; M[0xA904] = (r.x || 0) & 255;
    P.spend(20);
    if (M[S.end_steps] === 3) P.run6502(0xF12B, { a: r.a });
    M[S.bsound_busy] = (M[S.bsound_busy] - 1) & 255;
    return { x: M[0xA904], y: M[0xA902] };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
