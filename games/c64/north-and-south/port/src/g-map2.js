// The strategic map, second part: the flags and armies drawn on the map and the bytes kept under
// them, the panel's pictures and animations (the fort, the interception, the bank, the battle
// picture's scroll and its cannon smoke), the European reinforcements' ship, the Indians, the
// cursor and the player's choice of a territory, and the start years' armies.
(function (root) {
'use strict';
const G = root.NSGroups = root.NSGroups || {};
G.map2 = function (P) {
  const M = P.M, S = root.NSSyms.map, R = root.NSSyms.res;
  for (const n of `map_intercept_anim map_battle_panel map_wait_frames map_smoke_drift map_smoke_build map_reinforcements
    map_ship_in map_ship_sails_down map_ship_sails_up map_ship_out map_indians map_smoke_signals map_indian_rises
    map_choose_place map_union_turn map_conf_turn`.split(/\s+/)) P.GEN.add(n);
  // the raster waits of the battle picture's scroll: the loop's head is a checkpoint, its exit a wait
  P.CPS.map.push(0x1FBD, 0x2017);
  P.WAITS = (P.WAITS || []).concat([0x1FC4, 0x201E]);
  const T = [S.indians_wait, S.indians_go, S.smoke_wait, S.ship_wave_wait, S.map_joy_fire, S.flash_wait, S.anim_frames];
  P.IRQ_BYTES.map = (P.IRQ_BYTES.map || []).concat(T);
  const sound = a => P.map_play_sound({ a });
  const w16 = (a, d) => { const v = (M[a] | M[a + 1] << 8) + d; M[a] = v & 255; M[a + 1] = (v >> 8) & 255; return v; };
  const ptr = a => M[a] | M[a + 1] << 8;

  // ---- flags and armies
  // draw_flag ($1E84): territory X's flag place, the owner's flag or the map's own bytes; A, X, Y kept
  P.map_draw_flag = function (r) {
    const x = r.x;
    P.map_flag_place({ x });
    const o = M[S.territory_owner + x];
    P.spend(20);
    if (o & 0x80) { M[0x1C] = M[0x1A]; M[0x1D] = M[0x1B]; }
    else { const v = 0x83E8 + (o ? 0x14 : 0); M[0x1C] = v & 255; M[0x1D] = v >> 8; }
    const src = ptr(0x1C), bm = ptr(0x1E), sc = ptr(0x20), co = ptr(0x22);
    for (let y = 0x0F; y >= 0; y--) P.wr((bm + y) & 0xFFFF, M[(src + y) & 0xFFFF]);
    P.wr(sc, M[(src + 16) & 0xFFFF]); P.wr((sc + 1) & 0xFFFF, M[(src + 17) & 0xFFFF]);
    P.wr(co, M[(src + 18) & 0xFFFF]); P.wr((co + 1) & 0xFFFF, M[(src + 19) & 0xFFFF]);
    P.spend(16 * 16 + 80);
    return r;
  };
  // flag_place ($1EDA): the store under territory X's flag and its place's addresses; X kept in the
  // operand of the ldx at $1EEA
  P.map_flag_place = function (r) {
    M[0x1EEB] = r.x;
    const i = (r.x << 1) & 255;
    M[0x1A] = M[S.bg_stores + i]; M[0x1B] = M[S.bg_stores_c2a8 + i];
    const x = M[0x1EEB];
    P.spend(30);
    P.map_row_address({ y: M[S.flag_places_c256 + x] });
    return P.map_column_address({ a: M[S.flag_places + x], x, y: M[S.flag_places + x] });
  };
  // row_address ($244F): $1E/$1F the bitmap and $20/$21 the screen at row Y
  P.map_row_address = function (r) {
    let b = 0x4000 + 320 * r.y, s = 0x6000 + 40 * r.y;
    M[0x1E] = b & 255; M[0x1F] = (b >> 8) & 255; M[0x20] = s & 255; M[0x21] = (s >> 8) & 255;
    P.spend(20 + 34 * r.y);
    return { y: 0 };
  };
  // column_address ($247F): column A on the screen and colour RAM, and 8 A on the bitmap (Y times;
  // a column of 0 goes round 256 times)
  P.map_column_address = function (r) {
    const s = M[0x20] + r.a;
    M[0x20] = s & 255; M[0x22] = s & 255;
    const h = M[0x21] + (s > 255 ? 1 : 0);
    M[0x21] = h & 255;
    M[0x23] = ((h & 255) + 0x78 + (h > 255 ? 1 : 0)) & 255;
    let y = r.y;
    do { w16(0x1E, 8); y = (y - 1) & 255; P.spend(23); } while (y);
    P.spend(30);
    return { x: r.x, y: 0 };
  };
  // draw_army ($3BE7): territory X's army place, the side's soldier or the map's own bytes
  P.map_draw_army = function (r) {
    P.map_army_place({ x: r.x });
    const sd = M[S.army_side + r.x];
    P.spend(20);
    if (sd & 0x80) { M[0x1C] = M[0x1A]; M[0x1D] = M[0x1B]; }
    else { const v = 0x8410 + (sd ? 0x3C : 0); M[0x1C] = v & 255; M[0x1D] = v >> 8; }
    for (let x = 3; x > 0; x--) {
      const src = ptr(0x1C), bm = ptr(0x1E);
      for (let y = 0x0F; y >= 0; y--) P.wr((bm + y) & 0xFFFF, M[(src + y) & 0xFFFF]);
      w16(0x1C, 0x10); w16(0x1E, 0x140);
      P.spend(16 * 16 + 40);
    }
    let src = ptr(0x1C);
    for (let x = 5; x >= 0; x--) P.wr((ptr(0x20) + M[S.army_cells + x]) & 0xFFFF, M[(src + x) & 0xFFFF]);
    w16(0x1C, 6);
    src = ptr(0x1C);
    for (let x = 5; x >= 0; x--) P.wr((ptr(0x22) + M[S.army_cells + x]) & 0xFFFF, M[(src + x) & 0xFFFF]);
    P.spend(12 * 30 + 30);
    return r;
  };
  // army_place ($242F): the store under territory X's army and its place's addresses
  P.map_army_place = function (r) {
    M[0x2440] = r.x;
    const i = (r.x << 1) & 255;
    M[0x1A] = M[S.bg_stores_c2db + i]; M[0x1B] = M[S.bg_stores_c2dc + i];
    const x = M[0x2440];
    P.spend(30);
    P.map_row_address({ y: M[S.army_places_c28c + x] });
    return P.map_column_address({ a: M[S.army_places + x], x, y: M[S.army_places + x] });
  };
  // draw_changes ($3B97): each territory whose army or owner changed since it was drawn, drawn
  P.map_draw_changes = function () {
    P.spend(6);
    if (M[S.drawing_changes]) return {};
    M[S.drawing_changes]++;
    for (let x = 0x19; x >= 0; x--) {
      let a = M[S.army_side + x];
      P.spend(14);
      if (a !== M[S.army_drawn + x] && (a === 0xFF || (M[S.owner_drawn + x] & 0x80))) {
        M[S.army_drawn + x] = M[S.army_side + x];
        P.map_draw_army({ x });
      }
      a = M[S.territory_owner + x];
      P.spend(14);
      if (a !== M[S.owner_drawn + x] && (a === 0xFF || (M[S.army_drawn + x] & 0x80))) {
        M[S.owner_drawn + x] = M[S.territory_owner + x];
        P.map_draw_flag({ x });
      }
    }
    M[S.drawing_changes]--;
    return {};
  };
  // save_flag_bg ($239F), save_army_bg ($23F2): the map's bytes under a place into its store, at
  // picture 20's or 21's size (X, which save_bytes reads), from window 8, set to the place; A kept
  // in the operand of the lda at $23D9 or $242C
  const saveBg = (a, op, place, pic) => {
    M[op] = a;
    place({ x: M[op] });
    M[0x2E] = M[0x1A]; M[0x2F] = M[0x1B];
    M[S.windows_c3c6] = M[0x1E]; M[S.windows_c3c7] = M[0x1F];
    M[S.windows_c3d8] = M[0x20]; M[S.windows_c3d9] = M[0x21];
    M[0x3408] = 8; M[0x340A] = 8;
    P.spend(60);
    P.map_save_bytes({ x: pic });
    return { a: M[op] };
  };
  P.map_save_flag_bg = r => saveBg(r.a, 0x23DA, P.map_flag_place, 0x14);
  P.map_save_army_bg = r => saveBg(r.a, 0x242D, P.map_army_place, 0x15);
  P.map_save_flags_bg = function () { for (let a = 0x19; a >= 0; a--) { P.map_save_flag_bg({ a }); P.spend(9); } return { a: 0xFF }; };
  P.map_save_armies_bg = function () { for (let a = 0x19; a >= 0; a--) { P.map_save_army_bg({ a }); P.spend(9); } return { a: 0xFF }; };

  // ---- the panel
  // save_window ($331A): window A at picture X's size into the buffer at $B8D0 (picture 16); the
  // window kept in the operand of the lda at $340E for panel_restore
  P.map_save_window = function (r) {
    M[0x3408] = r.a; M[0x340F] = r.a; M[0x340A] = r.x;
    M[0x2E] = 0xD0; M[0x2F] = 0xB8;
    P.spend(30);
    return P.map_save_bytes({ x: r.x });
  };
  // save_bytes ($332B): a picture's size of the window's bitmap, screen and colour bytes to ($2E)
  P.map_save_bytes = function (r) {
    const x = r.x;
    M[S.picture_busy] = 1;
    const w = M[S.picture_sizes + x], h = M[S.picture_sizes_c3a0 + x];
    M[S.picture_table_c387] = w; M[S.picture_sizes_c39a] = w; M[S.picture_table_c389] = (w << 3) & 255;
    M[S.picture_table_c388] = h; M[S.picture_sizes_c3b0] = h;
    const i = (M[0x3408] << 1) & 255;
    M[0x28] = M[S.windows + i]; M[0x29] = M[S.windows_c3b7 + i];
    M[0x2A] = M[S.windows_c3c8 + i]; M[0x2C] = M[S.windows_c3c8 + i];
    M[0x2B] = M[S.windows_c3c9 + i]; M[0x2D] = (M[S.windows_c3c9 + i] + 0x78) & 255;
    P.spend(120);
    const bw = M[S.picture_table_c389];
    for (let n = M[S.picture_table_c388]; ; ) {
      const s = ptr(0x28), d = ptr(0x2E);
      for (let y = (bw - 1) & 255; ; y = (y - 1) & 255) { M[(d + y) & 0xFFFF] = P.rd((s + y) & 0xFFFF); P.spend(16); if (y === 0) break; }
      w16(0x28, 0x140); w16(0x2E, bw);
      P.spend(40);
      n = (n - 1) & 255;
      if (!n) break;
    }
    M[S.picture_table_c357] = M[0x2E]; M[S.picture_table_c358] = M[0x2F];
    const copy = (src) => {
      for (let n = M[S.picture_table_c388]; ; ) {
        const s = ptr(src), d = ptr(0x2E), ww = M[S.picture_table_c387];
        for (let y = (ww - 1) & 255; ; y = (y - 1) & 255) { M[(d + y) & 0xFFFF] = P.rd((s + y) & 0xFFFF); P.spend(16); if (y === 0 || y & 0x80) break; }
        w16(src, 0x28); w16(0x2E, ww);
        P.spend(40);
        n = (n - 1) & 255;
        if (!n) break;
      }
    };
    copy(0x2A);
    M[S.picture_table_c37f] = M[0x2E]; M[S.picture_table_c380] = M[0x2F];
    copy(0x2C);
    M[S.picture_busy] = 0;
    P.spend(20);
    // the window and the picture back from the operands of the loads at $3407 and $3409
    return { a: M[0x3408], x: M[0x340A] };
  };
  // panel_restore ($340C): picture 16 back into the window save_window saved
  P.map_panel_restore = function () { P.spend(6); return P.map_draw_picture({ a: M[0x340F], x: 0x10 }); };
  P.map_panel_fort = function () { const w = P.map_save_window({ a: 0, x: 0 }); return P.map_draw_picture({ a: w.a, x: w.x }); };
  P.map_panel_intercept = function () {
    M[S.panel_busy] = 1;
    const w = P.map_save_window({ a: 1, x: 5 });
    return P.map_draw_picture({ a: w.a, x: w.x });
  };
  P.map_panel_fort_step = function (r) { P.spend(6); return P.map_draw_picture({ a: 2, x: (r.a + 1) & 255 }); };
  P.map_panel_intercept_step = function (r) { P.spend(8); return P.map_draw_picture({ a: 3, x: (r.a + 6) & 255 }); };
  // intercept_anim ($1F27): 50 steps of five frames, pictures 6 to 8
  P.map_intercept_anim = function* () {
    M[S.intercept_anim_left] = 0x32;
    do {
      yield* P.mapWaitZero(S.anim_frames);
      M[S.anim_frames] = 5;
      let a = M[S.intercept_anim_picture] + 1;
      if (a >= 3) a = 0;
      M[S.intercept_anim_picture] = a;
      P.spend(30);
      P.map_panel_intercept_step({ a });
      M[S.intercept_anim_left] = (M[S.intercept_anim_left] - 1) & 255;
    } while (M[S.intercept_anim_left]);
    sound(0x11);
    M[S.intercept_on] = 0;
    P.map_panel_restore();
    M[S.panel_busy] = 0;
    return {};
  };
  P.map_panel_bank = function (r) { P.spend(10); return P.map_draw_picture({ a: 4, x: (r.x + 9) & 255 }); };
  P.map_panel_bank_save = function (r) { P.spend(10); return P.map_save_window({ a: 4, x: (r.x + 9) & 255 }); };
  // the raster wait before each step of the scroll ($1FBD, $2017): until line $64 (the low byte
  // of the line)
  const rasterAtLeast = function* (head, line) {
    yield { cp: head, cycles: P.take() };
    const io = P.io, full = ((io.vicRead(0x11) & 0x80) << 1) | io.vicRead(0x12);
    yield { wait: (full & 255) >= line ? full : line };
  };
  // battle_panel ($1F76): side A's battle picture, the cannon's smoke and the scroll through the
  // scenery
  P.map_battle_panel = function* (r) {
    M[S.panel_busy] = 1;
    M[S.battle_panel_side] = r.a;
    let w = P.map_save_window({ a: 5, x: (r.a + 0x0B) & 255 });
    P.map_draw_picture({ a: w.a, x: w.x });
    yield* P.map_wait_frames({ a: 0x32 });
    sound(0x01);
    P.map_smoke_sprite();
    yield* P.map_smoke_build();
    yield* P.map_smoke_drift();
    M[S.battle_scroll_left] = 0x1E;
    P.spend(30);
    let fresh = true;
    for (;;) {
      if (fresh) {
        M[S.battle_scroll_column] = 0;
        M[S.scenery_lo] = 0x54; M[0x20FF] = 0x54; M[S.scenery_hi] = 0xA4; M[0x2100] = 0xA4;
        P.spend(30);
      }
      yield* rasterAtLeast(0x1FBD, 0x64);
      P.map_panel_scroll({ a: 0, x: 0, y: 0 });
      M[0x215C] = 0x24; M[0x215D] = 0xA7; M[0x2162] = 0x7E; M[0x2163] = 0xA7;
      P.spend(24);
      P.map_panel_column();
      M[S.battle_scroll_left] = (M[S.battle_scroll_left] - 1) & 255;
      if (!M[S.battle_scroll_left]) break;
      yield* P.map_wait_frames({ a: 1 });
      const x = (M[S.battle_scroll_column] + 1) & 255;
      M[S.battle_scroll_column] = x;
      P.spend(14);
      fresh = x >= 0x0A;
    }
    M[S.battle_scroll_column] = 0;
    let i = (M[S.battle_panel_side] << 1) & 255;
    M[S.scenery_lo] = M[S.scene_pointers + i]; M[0x20FF] = M[S.scene_pointers + i];
    M[S.scenery_hi] = M[S.scene_pointers_bf11 + i]; M[0x2100] = M[S.scene_pointers_bf11 + i];
    P.spend(40);
    do {
      yield* P.map_wait_frames({ a: 1 });
      yield* rasterAtLeast(0x2017, 0x64);
      P.map_panel_scroll({ a: 0, x: 0, y: 0 });
      i = (M[S.battle_panel_side] << 1) & 255;
      M[0x215C] = M[S.scene_pointers_bf14 + i]; M[0x215D] = M[S.scene_pointers_bf15 + i];
      M[0x2162] = M[S.scene_pointers_bf18 + i]; M[0x2163] = M[S.scene_pointers_bf19 + i];
      P.spend(40);
      P.map_panel_column();
      M[S.battle_scroll_column] = (M[S.battle_scroll_column] + 1) & 255;
      P.spend(14);
    } while (M[S.battle_scroll_column] < 0x0A);
    yield* P.map_smoke_drift();
    M[S.smoke_on] = 0;
    yield* P.map_wait_frames({ a: 0x32 });
    P.map_panel_restore();
    M[S.panel_busy] = 0;
    return {};
  };
  // panel_scroll ($2062): nine rows of the picture a cell left; A, X and Y kept in its operands
  P.map_panel_scroll = function (r) {
    M[0x20EA] = r.a & 255; M[0x20EC] = r.x & 255; M[0x20EE] = r.y & 255;
    M[0x2097] = 0x38; M[0x2094] = 0x40; M[0x2098] = 0x48; M[0x2095] = 0x48;
    M[0x24] = 0x07; M[0x26] = 0x07; M[0x25] = 0x61; M[0x27] = 0xD9;
    P.spend(50);
    for (let x = 9; x > 0; x--) {
      const ld = ptr(0x2094), st = ptr(0x2097);
      for (let y = 0; y < 0x48; y++) P.wr((st + y) & 0xFFFF, P.rd((ld + y) & 0xFFFF));
      const s = ptr(0x24), c = ptr(0x26);
      for (let y = 1; y < 0x0A; y++) {
        P.wr((s + y - 1) & 0xFFFF, P.rd((s + y) & 0xFFFF));
        P.wr((c + y - 1) & 0xFFFF, P.rd((c + y) & 0xFFFF));
      }
      const lo = M[0x24] + 0x28;
      M[0x24] = lo & 255; M[0x26] = lo & 255;
      const h = M[0x25] + (lo > 255 ? 1 : 0);
      M[0x25] = h & 255; M[0x27] = ((h & 255) + 0x78 + (h > 255 ? 1 : 0)) & 255;
      w16(0x2094, 0x140); w16(0x2097, 0x140);
      P.spend(0x48 * 16 + 9 * 40 + 80);
    }
    return { a: M[0x20EA], x: M[0x20EC], y: M[0x20EE] };
  };
  // panel_column ($20F0): the scroll's next column, from ($20FF) and the screen and colour tables in
  // the operands at $215C and $2162
  P.map_panel_column = function () {
    M[0x2102] = 0x80; M[0x2103] = 0x48;
    for (let x = 9; x > 0; x--) {
      const ld = ptr(0x20FF), st = ptr(0x2102);
      for (let y = 7; y >= 0; y--) P.wr((st + y) & 0xFFFF, P.rd((ld + y) & 0xFFFF));
      w16(0x20FF, 0x50); w16(0x2102, 0x140);
      P.spend(8 * 16 + 50);
    }
    let v = (M[S.scenery_lo] | M[S.scenery_hi] << 8) + 8;
    M[S.scenery_lo] = v & 255; M[0x20FF] = v & 255; M[S.scenery_hi] = (v >> 8) & 255; M[0x2100] = (v >> 8) & 255;
    M[0x215F] = 0x10; M[0x2165] = 0x10; M[0x2160] = 0x61; M[0x2166] = 0xD9;
    P.spend(60);
    let x = M[S.battle_scroll_column];
    for (let y = 9; y > 0; y--) {
      P.wr(ptr(0x215F), P.rd((ptr(0x215C) + x) & 0xFFFF));
      P.wr(ptr(0x2165), P.rd((ptr(0x2162) + x) & 0xFFFF));
      x = (x + 0x0A) & 255;
      const lo = M[0x215F] + 0x28;
      M[0x215F] = lo & 255; M[0x2165] = lo & 255;
      const h = M[0x2160] + (lo > 255 ? 1 : 0);
      M[0x2160] = h & 255; M[0x2166] = ((h & 255) + 0x78 + (h > 255 ? 1 : 0)) & 255;
      P.spend(80);
    }
    return { x, y: 0 };
  };
  P.map_wait_frames = function* (r) {
    M[S.frame_wait] = r.a;
    P.spend(6);
    yield* P.mapWaitZero(S.frame_wait);
    return { a: 0 };
  };
  P.map_smoke_sprite = function () {
    for (let x = 0x3F; x >= 0; x--) M[S.smoke_built + x] = 0;
    M[S.smoke_on] = 1; M[S.smoke_x] = 0xD0; M[S.smoke_x_hi] = 0; M[S.smoke_y] = 0x60;
    M[S.smoke_frame] = 2; M[S.smoke_frame_wait] = 0x0C;
    P.spend(64 * 9 + 40);
    return {};
  };
  P.map_smoke_drift = function* () {
    M[S.smoke_drift_left] = 7;
    do {
      const v = (M[S.smoke_x] | M[S.smoke_x_hi] << 8) + 4;
      M[S.smoke_x] = v & 255; M[S.smoke_x_hi] = (v >> 8) & 255;
      M[S.smoke_wait] = 1;
      P.spend(30);
      yield* P.mapWaitZero(S.smoke_wait);
      M[S.smoke_drift_left] = (M[S.smoke_drift_left] - 1) & 255;
    } while (M[S.smoke_drift_left]);
    return {};
  };
  P.map_smoke_anim = function () {
    M[S.smoke_frame_wait] = (M[S.smoke_frame_wait] - 1) & 255;
    P.spend(8);
    if (M[S.smoke_frame_wait] & 0x80) {
      M[S.smoke_frame] = (M[S.smoke_frame] & 1) ^ 1;
      M[S.smoke_frame_wait] = 4;
      P.spend(16);
    }
    P.spend(6);
    if (M[S.smoke_wait]) M[S.smoke_wait]--;
    return {};
  };
  P.map_cannon_smoke_show = function () {
    P.spend(6);
    if (!M[S.smoke_on]) return {};
    const x = M[S.list_length];
    M[S.list_ptr + x] = (M[S.smoke_frame] + 0x94) & 255;
    M[S.list_x + x] = M[S.smoke_x]; M[S.list_x_hi + x] = M[S.smoke_x_hi]; M[S.list_y + x] = M[S.smoke_y];
    M[S.list_colour + x] = 1;
    M[S.list_length] = (M[S.list_length] + 1) & 255;
    P.spend(60);
    return {};
  };
  // smoke_build ($222A): the smoke's frame at $6580 built from $6500 in three steps, three bytes
  // a row from the step's offsets, round the sprite's 63 bytes
  P.map_smoke_build = function* () {
    M[S.smoke_build_left] = 3; M[S.smoke_build_step] = 0;
    do {
      M[S.smoke_wait] = 2;
      P.spend(6);
      yield* P.mapWaitZero(S.smoke_wait);
      let x = M[S.smoke_build_step];
      let y = 0x3E;
      x = M[S.smoke_build_to + x];
      P.spend(20);
      for (;;) {
        M[S.smoke_built + x] = M[S.smoke_source + y];
        P.spend(12);
        if (x === 0) break;
        x = (x - 3) & 255; if (x & 0x80) x = (x + 0x3E) & 255;
        y = (y - 3) & 255; if (y & 0x80) y = (y + 0x3E) & 255;
        P.spend(24);
      }
      M[S.smoke_build_step]++;
      M[S.smoke_build_left] = (M[S.smoke_build_left] - 1) & 255;
    } while (M[S.smoke_build_left]);
    M[S.smoke_wait] = 2;
    return {};
  };

  // ---- the European reinforcements' ship
  P.map_reinforcements = function* () {
    P.spend(6);
    if (!M[R.opt_reinforcements]) return {};
    M[S.reinforcements_wait] = (M[S.reinforcements_wait] - 1) & 255;
    if (M[S.reinforcements_wait]) return {};
    M[S.reinforcements_wait] = 4;
    sound(0x16);
    P.map_ship_start();
    yield* P.map_ship_in();
    sound(0x11);
    yield* P.map_ship_sails_down();
    P.spend(10);
    if (!(M[S.a_0DF2] & 0x80) || !(M[S.a_0DBD] & 0x80)) yield* P.map_reinforce({ x: 0x12 });
    yield* P.map_ship_sails_up();
    sound(0x16);
    yield* P.map_ship_out();
    sound(0x11);
    M[S.ship_on] = 0;
    return {};
  };
  P.map_ship_start = function () {
    M[S.ship_on] = 1; M[S.ship_started] = 1; M[S.ship_sails] = 0; M[S.ship_x] = 0x58; M[S.ship_y] = 0xB4;
    P.spend(30);
    return {};
  };
  // a ship's step waits on ship_wait with the wave turning meanwhile
  const shipWait = function* (n) {
    M[S.ship_wait] = n;
    P.spend(6);
    for (;;) {
      P.map_ship_wave();
      const v = P.pollFirst(S.ship_wait);
      P.spend(8);
      if (!v) return;
      yield;
    }
  };
  P.map_ship_in = function* () {
    do {
      yield* shipWait(4);
      M[S.ship_half] ^= 1;
      if (!M[S.ship_half]) M[S.ship_x] = (M[S.ship_x] - 1) & 255;
      M[S.ship_y] = (M[S.ship_y] - 1) & 255;
      P.spend(30);
    } while (M[S.ship_y] !== 0x85);
    return {};
  };
  P.map_ship_wave = function () {
    const v = P.pollFirst(S.ship_wave_wait);
    P.spend(6);
    if (v) return {};
    M[S.ship_wave_wait] = 6;
    M[S.ship_wave_frame] ^= 1;
    P.spend(16);
    return {};
  };
  P.map_ship_sails_down = function* () {
    do { yield* shipWait(0x10); M[S.ship_sails]++; P.spend(14); } while (M[S.ship_sails] !== 3);
    return {};
  };
  P.map_ship_sails_up = function* () {
    do { yield* shipWait(0x10); M[S.ship_sails] = (M[S.ship_sails] - 1) & 255; P.spend(8); } while (M[S.ship_sails]);
    return {};
  };
  P.map_ship_out = function* () {
    do {
      yield* shipWait(4);
      M[S.ship_x] = (M[S.ship_x] + 1) & 255;
      M[S.ship_y] = (M[S.ship_y] - 1) & 255;
      P.spend(20);
    } while (M[S.ship_y] !== 0x64);
    return {};
  };
  P.map_ship_show = function () {
    P.spend(6);
    if (!M[S.ship_on]) return {};
    const x = M[S.list_length];
    M[S.list_ptr + x] = (M[S.ship_sails] + 0xD5) & 255;
    M[S.f_13BD + x] = (M[S.ship_wave_frame] + 0xD3) & 255;
    M[S.list_x + x] = M[S.ship_x]; M[S.f_137D + x] = M[S.ship_x];
    M[S.list_x_hi + x] = 1; M[S.f_139D + x] = 1;
    M[S.list_y + x] = M[S.ship_y]; M[S.f_135D + x] = (M[S.ship_y] + 0x15) & 255;
    M[S.list_colour + x] = 1; M[S.f_13DD + x] = 1;
    M[S.list_length] = (M[S.list_length] + 2) & 255;
    P.spend(110);
    return {};
  };

  // ---- the cursor and the player's input (from the frame interrupt)
  P.map_map_input = function () {
    M[S.direction] = 0;
    P.spend(10);
    if (M[S.input_wait]) { M[S.input_wait]--; return {}; }
    P.spend(10);
    if (M[R.cpu_union] & M[R.cpu_confed]) return {};
    if (!(M[R.cpu_union] | M[R.cpu_confed])) {
      if (M[S.side_to_play]) P.map_read_joy1_map(); else P.map_read_joy2_map();
    } else if (M[R.opt_keyboard]) P.map_map_keys(); else P.map_read_joy2_map();
    let a = 0;
    const dx = M[S.map_joy_dx], dy = M[S.map_joy_dy];
    P.spend(14);
    if (dx) a = dx & 0x80 ? 1 : 2;
    else if (dy) a = dy & 0x80 ? 3 : 4;
    else return {};
    M[S.direction] = a; M[S.input_wait] = 0x0C;
    P.spend(10);
    return {};
  };
  P.map_map_keys = function () {
    M[S.map_joy_dx] = 0; M[S.map_joy_dy] = 0; M[S.map_joy_fire] = 1;
    const k = M[S.map_key];
    P.spend(24);
    if (k === 0x50) M[S.map_joy_dy] = 0xFF;
    else if (k === 0x4C) M[S.map_joy_dy] = 1;
    else if (k === 0x5A) M[S.map_joy_dx] = 0xFF;
    else if (k === 0x58) M[S.map_joy_dx] = 1;
    else if (k === 0x20) M[S.map_joy_fire] = 0;
    return {};
  };
  P.map_cursor_aim = function () {
    const d = M[S.direction];
    P.spend(6);
    if (!d) return {};
    const off = d === 1 ? 0 : d === 2 ? 1 : d === 3 ? 2 : 3;
    const v = M[S.cursor_grid + ((M[S.cursor_point] << 2) & 255) + off];
    P.spend(30);
    if (v & 0x80 || v === M[S.cursor_target]) return {};
    M[S.cursor_target] = v; M[S.gliding] = 1;
    return {};
  };
  P.map_cursor_glide = function () {
    P.spend(6);
    if (!M[S.gliding]) return {};
    M[S.glide_every]++;
    P.spend(10);
    if (M[S.glide_every] !== 2) return {};
    M[S.glide_every] = 0;
    const x = M[S.cursor_target];
    const d = M[S.cursor_x] - M[S.cursor_points + x];
    M[S.glide_dx] = d & 255;
    const h = (M[S.cursor_x_hi] - M[S.cursor_points_c038 + x] - (d < 0 ? 1 : 0)) & 255;
    if (h & 0x80) {
      const a = ((M[S.cursor_points + x] - M[S.cursor_x]) & 255) >> 1;
      M[S.glide_dx] = a;
      const v = M[S.cursor_x] + a;
      M[S.cursor_x] = v & 255; M[S.cursor_x_hi] = (M[S.cursor_x_hi] + (v > 255 ? 1 : 0)) & 255;
    } else {
      M[S.glide_dx] >>= 1;
      const v = (M[S.cursor_x] | M[S.cursor_x_hi] << 8) - M[S.glide_dx];
      M[S.cursor_x] = v & 255; M[S.cursor_x_hi] = (v >> 8) & 255;
    }
    const py = M[S.cursor_points_c01d + x];
    if (M[S.cursor_y] < py) {
      const a = ((py - M[S.cursor_y]) & 255) >> 1;
      M[S.glide_dy] = a; M[S.cursor_y] = (M[S.cursor_y] + a) & 255;
    } else {
      const a = ((M[S.cursor_y] - py) & 255) >> 1;
      M[S.glide_dy] = a; M[S.cursor_y] = (M[S.cursor_y] - a) & 255;
    }
    M[S.cursor_point] = M[S.cursor_target];
    if (!(M[S.glide_dx] | M[S.glide_dy])) M[S.gliding] = 0;
    P.spend(110);
    return {};
  };
  // choose_place ($280B): the list's territories flash until fire is pressed and let go
  P.map_choose_place = function* () {
    M[S.choosing]++;
    M[0x285B] = M[S.choose_list]; M[0x285C] = M[S.choose_list_hi];
    P.spend(30);
    for (;;) {
      M[S.flash_wait] = 0x14;
      P.map_territory_blink();
      P.map_flash_list();
      P.spend(10);
      let pressed = false;
      for (;;) {
        const f = P.pollFirst(S.map_joy_fire);
        P.spend(8);
        if (!f) { pressed = true; break; }
        const w = P.pollFirst(S.flash_wait);
        P.spend(8);
        if (!w) break;
        yield;
      }
      if (pressed) break;
    }
    P.spend(6);
    if (M[S.flash_phase]) { P.map_territory_blink(); P.map_flash_list(); }
    for (let f = P.pollFirst(S.map_joy_fire); !f; f = M[S.map_joy_fire]) { P.spend(8); yield; }
    M[S.choosing] = (M[S.choosing] - 1) & 255;
    return {};
  };
  // flash_list ($2846): every cell of the map whose territory is in the list (through the operand at
  // $285B) has its yellow and light grey swapped, from the last cell up
  P.map_flash_list = function () {
    M[S.flashing]++;
    M[0x30] = 0x47; M[0x31] = 0xE3;
    const list = ptr(0x285B);
    P.spend(20);
    for (;;) {
      const t = M[ptr(0x30)];
      M[S.flash_find] = t;
      let x = 0, hit = false;
      for (;;) {
        const a = M[(list + x) & 0xFFFF];
        P.spend(14);
        if (a & 0x80) break;
        if (a === t) { hit = true; break; }
        x = (x + 1) & 255;
      }
      if (hit) {
        const keep = M[0x31];
        M[0x31] = (keep - 8) & 255;
        let a = ptr(0x30);
        P.wr(a, P.map_swap_grey({ a: P.rd(a) }).a);
        M[0x31] = (M[0x31] - 0x78) & 255;
        a = ptr(0x30);
        M[a] = P.map_swap_grey({ a: M[a] }).a;
        M[0x31] = keep;
        P.spend(60);
      }
      const v = ptr(0x30) - 1;
      M[0x30] = v & 255; M[0x31] = (v >> 8) & 255;
      P.spend(20);
      if (M[0x31] < 0xE0) break;
    }
    M[S.flash_phase] ^= 1;
    M[S.flashing] = (M[S.flashing] - 1) & 255;
    return {};
  };
  // swap_grey ($28A8): colours 7 and 15 swapped in each nibble
  P.map_swap_grey = function (r) {
    let h = r.a & 0xF0;
    if (h === 0x70) h = 0xF0; else if (h === 0xF0) h = 0x70;
    M[S.swap_high] = h;
    let l = r.a & 0x0F;
    if (l === 0x07) l = 0x0F; else if (l === 0x0F) l = 0x07;
    P.spend(40);
    return { a: l | h };
  };
  P.map_army_counts = function () {
    P.spend(8);
    if (M[R.cpu_union] & M[R.cpu_confed]) return {};
    let empty = !!M[S.count_hold];
    if (!empty) {
      M[S.count_wait] = (M[S.count_wait] - 1) & 255;
      if (M[S.count_wait]) return {};
      M[S.count_wait] = 0x32;
      const x = M[S.cursor_target];
      P.spend(20);
      if (x === 0x1A || (M[S.army_side + x] & 0x80) ||
          !((M[S.army_cannon + x] + M[S.army_cavalry + x] + M[S.army_infantry + x]) & 255)) empty = true;
      else {
        const sd = M[S.army_side + x];
        if (sd !== M[S.count_side]) { M[S.count_side] = sd; P.map_draw_picture({ a: 7, x: (sd + 0x11) & 255 }); }
        return P.map_draw_counts();
      }
    }
    P.spend(10);
    if (M[S.count_side] & 0x80) return {};
    if (M[S.choosing] && (M[S.flashing] || M[S.flash_phase])) { M[S.count_wait] = 1; return {}; }
    M[S.count_side] = 0xFF;
    return P.map_draw_picture({ a: 7, x: 0x13 });
  };
  // draw_counts ($3A7C): the army's infantry, cavalry and cannon as two digits each, through the
  // operands of draw_digit's stores ($3AFA, $3B00)
  P.map_draw_counts = function () {
    const x = M[S.cursor_target];
    const n = [M[S.army_infantry + x], M[S.army_cavalry + x], M[S.army_cannon + x]];
    M[0x3AFA] = 0x08; M[0x3B00] = 0x48; M[0x3AFB] = 0x58; M[0x3B01] = 0x59;
    P.spend(50);
    for (const a of n) P.map_draw_number({ a });
    return {};
  };
  P.map_draw_number = function (r) {
    let a = r.a;
    if (a < 0x0A) P.map_draw_digit({ x: 7, y: 7 });
    else { P.map_draw_digit({ x: 0x27, y: 7 }); a = (a - 0x0A) & 255; }
    P.map_draw_digit({ x: ((a << 4) + 0x17) & 255, y: 0x0F });
    w16(0x3AFA, 0x280); w16(0x3B00, 0x280);
    P.spend(70);
    return {};
  };
  P.map_draw_digit = function (r) {
    let x = r.x, y = r.y;
    do {
      P.wr((ptr(0x3AFA) + y) & 0xFFFF, M[(S.count_font + x) & 0xFFFF]);
      P.wr((ptr(0x3B00) + y) & 0xFFFF, M[(S.count_font_e4f4 + x) & 0xFFFF]);
      x = (x - 1) & 255; y = (y - 1) & 255;
      P.spend(30);
    } while ((y & 7) !== 7);
    return { x, y };
  };
  // draw_month ($39B3): the month's nine letters on the band, through its own operands
  P.map_draw_month = function () {
    const i = (M[S.month] << 1) & 255;
    M[0x39D4] = M[S.month_names + i]; M[0x39D5] = M[S.month_names_bf7f + i];
    M[0x39EF] = 0x38; M[0x39F0] = 0x5C;
    P.spend(40);
    for (let y = 0; y < 9; y++) {
      M[0x3A07] = y;
      let a = M[(ptr(0x39D4) + y) & 0xFFFF];
      a = a === 0x20 ? 0 : (a - 0x40) & 255;
      let x = ((a << 3) + 7) & 255;
      for (let k = 7; k >= 0; k--) { P.wr((ptr(0x39EF) + k) & 0xFFFF, M[S.month_font + x]); x = (x - 1) & 255; }
      w16(0x39EF, 8);
      P.spend(8 * 18 + 50);
    }
    return {};
  };
  // draw_year ($3B0D): 1, 8, 6 and the year's digit on the band
  P.map_draw_year = function () {
    M[0x3B3D] = 0x88; M[0x3B3E] = 0x5C;
    for (const a of [1, 8, 6, (M[R.start_year] + 1) & 255]) P.map_draw_band_digit({ a });
    P.spend(30);
    return {};
  };
  P.map_draw_band_digit = function (r) {
    let x = ((r.a << 3) + 7) & 255;
    for (let y = 7; y >= 0; y--) { P.wr((ptr(0x3B3D) + y) & 0xFFFF, M[S.year_font + x]); x = (x - 1) & 255; }
    w16(0x3B3D, 8);
    P.spend(8 * 18 + 40);
    return {};
  };

  // ---- the Indians
  P.map_indians = function* () {
    P.spend(6);
    if (!M[R.opt_indians]) return {};
    let y = 0;
    let go = false;
    if (M[S.a_0DE3] & 0x80) M[S.indians_passes_3] = 0;
    else { M[S.indians_passes_3]++; if (M[S.indians_passes_3] >= 2) { M[S.indians_passes_3] = 0; go = true; } }
    P.spend(20);
    if (!go) {
      y = 1;
      if (M[S.a_0DE8] & 0x80) { M[S.indians_passes_8] = 0; return {}; }
      M[S.indians_passes_8]++;
      if (M[S.indians_passes_8] < 2) return {};
      M[S.indians_passes_8] = 0;
    }
    M[S.indians_target] = y;
    yield* P.map_smoke_signals();
    yield* P.map_indian_rises();
    M[S.indians_attack] = 1; M[S.indians_go] = 0;
    const r = P.map_map_rnd();
    M[S.indians_delay] = ((r.a & 0x0F) + 0x0A + r.c) & 255;
    M[S.indians_wait] = 0x0A;
    P.spend(30);
    for (let v = P.pollFirst(S.indians_go); !v; v = M[S.indians_go]) { P.spend(7); yield; }
    yield* P.map_indian_ride_in();
    P.map_indian_to_army();
    yield* P.map_indian_ride_away();
    return P.map_indians_reset();
  };
  P.GEN.add('map_indian_ride_in'); P.GEN.add('map_indian_ride_away');
  P.map_indians_reset = function () {
    P.spend(6);
    if (!M[R.opt_indians]) return {};
    M[S.indians_attack] = 0; M[S.indians_frame] = 0; M[S.indians_x] = 0x24; M[S.indians_y] = 0x6E;
    P.spend(20);
    return {};
  };
  P.map_indians_show = function () {
    P.spend(6);
    if (!M[R.opt_indians]) return {};
    const x = M[S.list_length];
    if (!M[S.indians_attack]) {
      M[S.list_ptr + x] = (M[S.indians_frame] + 0xC2) & 255; M[S.list_colour + x] = 7;
      M[S.list_x + x] = M[S.indians_x]; M[S.list_y + x] = M[S.indians_y]; M[S.list_x_hi + x] = 0;
    } else if (!M[S.indians_rider]) {
      M[S.list_ptr + x] = (M[S.indians_waiting_frame] + 0xCE) & 255; M[S.list_colour + x] = 0x0F;
      M[S.list_x_hi + x] = 0; M[S.list_x + x] = 0x3C; M[S.list_y + x] = 0x32;
    } else {
      M[S.list_ptr + x] = (M[S.indians_frame] + 0x9E) & 255;
      M[S.list_x + x] = M[S.indians_x]; M[S.list_y + x] = M[S.indians_y]; M[S.list_colour + x] = 1;
      M[S.list_x_hi + x] = M[S.indians_x_hi];
    }
    M[S.list_length] = (M[S.list_length] + 1) & 255;
    P.spend(60);
    return {};
  };
  P.map_indians_anim = function () {
    P.spend(6);
    if (!M[R.opt_indians]) return {};
    if (!M[S.indians_attack] || M[S.indians_rider]) {
      if (M[S.indians_wait]) M[S.indians_wait]--;
      P.spend(10);
      return {};
    }
    M[S.indians_wait] = (M[S.indians_wait] - 1) & 255;
    P.spend(10);
    if (M[S.indians_wait]) return {};
    M[S.indians_wait] = 0x0A;
    let a = M[S.indians_waiting_frame] + 1;
    if (a === 5) a = 0;
    M[S.indians_waiting_frame] = a;
    P.spend(24);
    if (!M[S.indians_delay]) return {};
    M[S.indians_delay]--;
    if (!M[S.indians_delay]) M[S.indians_go]++;
    return {};
  };
  P.map_smoke_signals = function* () {
    M[S.smoke_signals_left] = 0x0A;
    for (;;) {
      M[S.indians_wait] = 0x0A;
      P.spend(6);
      yield* P.mapWaitZero(S.indians_wait);
      P.spend(8);
      if (M[S.indians_frame] === 2) { M[S.indians_frame] = 1; sound(0x0D); continue; }
      M[S.indians_frame] = 2;
      M[S.smoke_signals_left] = (M[S.smoke_signals_left] - 1) & 255;
      if (!M[S.smoke_signals_left]) return {};
    }
  };
  P.map_indian_rises = function* () {
    do {
      M[S.indians_wait] = 0x0A;
      P.spend(6);
      yield* P.mapWaitZero(S.indians_wait);
      M[S.indians_y] = (M[S.indians_y] - 2) & 255;
      M[S.indians_frame]++;
      P.spend(20);
    } while (M[S.indians_frame] !== 0x0C);
    return {};
  };
  // the rider moves a step each time the interrupt counts indians_wait down, six to a frame step
  const waitChange = function* (a) {
    for (;;) {
      const v = P.pollFirst(S.indians_wait);
      P.spend(8);
      if (v !== a) return;
      yield;
    }
  };
  P.map_indian_ride_in = function* () {
    M[S.indians_rider] = 1;
    sound(0x19);
    M[S.indians_frame] = 0; M[S.indians_x] = 0x0A; M[S.indians_y] = 0x0A; M[S.indians_x_hi] = 0;
    P.spend(30);
    for (;;) {
      M[S.indians_wait] = 6;
      let a = P.irqByte(S.indians_wait);
      P.spend(10);
      for (;;) {
        yield* waitChange(a);
        const v = (M[S.indians_x] | M[S.indians_x_hi] << 8) + 4;
        M[S.indians_x] = v & 255; M[S.indians_x_hi] = (v >> 8) & 255;
        M[S.indians_y] = (M[S.indians_y] + 2) & 255;
        P.spend(36);
        if (M[S.indians_y] >= 0xC8) return {};
        a = M[S.indians_wait];
        if (!a) break;
      }
      M[S.indians_frame] = (M[S.indians_frame] + 1) & 7;
      P.spend(14);
    }
  };
  P.map_indian_to_army = function () {
    const y = M[S.indians_target];
    M[S.indians_x] = (M[S.indians_place_x + y] + 0xF0) & 255; M[S.indians_x_hi] = 1;
    M[S.indians_y] = (M[S.indians_place_y + y] + 0x78) & 255;
    P.spend(30);
    return { y };
  };
  P.map_indian_ride_away = function* () {
    M[S.ride_away_left] = 0x0A;
    do {
      M[S.indians_wait] = 6;
      let a = P.irqByte(S.indians_wait);
      P.spend(10);
      for (;;) {
        yield* waitChange(a);
        const v = (M[S.indians_x] | M[S.indians_x_hi] << 8) - 4;
        M[S.indians_x] = v & 255; M[S.indians_x_hi] = (v >> 8) & 255;
        M[S.indians_y] = (M[S.indians_y] - 2) & 255;
        a = M[S.indians_wait];
        P.spend(36);
        if (!a) break;
      }
      M[S.indians_frame] = (M[S.indians_frame] + 1) & 7;
      M[S.ride_away_left] = (M[S.ride_away_left] - 1) & 255;
      P.spend(20);
    } while (M[S.ride_away_left]);
    sound(0x11); sound(0x1D);
    yield* P.map_wait_25();
    P.map_army_hit({ x: M[S.indians_targets + M[S.indians_target]] });
    M[S.indians_rider] = 0;
    return {};
  };

  // ---- the start years
  const SETUP = {
    1861: [[0, ['a_0DB0', 'a_0DB6', 'a_0DB2', 'a_0DE6', 'a_0DEC']], [6, ['a_0E34', 'a_0E3A']], [3, ['a_0E1A', 'a_0E20']], [1, ['a_0E4E', 'a_0E54']],
      [1, ['a_0DC1', 'a_0DC3', 'a_0DC4', 'a_0DF5', 'a_0DF7']], [6, ['a_0E43', 'a_0E45']], [3, ['a_0E29', 'a_0E2B']], [1, ['a_0E5D', 'a_0E5F']]],
    1862: [[0, ['a_0DAC', 'a_0DB0', 'a_0DB2', 'a_0DB6', 'a_0DB7', 'a_0DE4', 'a_0DED', 'a_0DEA']], [6, ['a_0E32', 'a_0E3B', 'a_0E38']],
      [3, ['a_0E18', 'a_0E21', 'a_0E1E']], [1, ['a_0E4C', 'a_0E55', 'a_0E52']],
      [1, ['a_0DBA', 'a_0DBE', 'a_0DBF', 'a_0DC0', 'a_0DC1', 'a_0DC2', 'a_0DC4', 'a_0DE8', 'a_0DF0', 'a_0DF1']],
      [9, ['a_0E36', 'a_0E3E', 'a_0E3F']], [5, ['a_0E24', 'a_0E25']], [3, ['a_0E1C']], [2, ['a_0E58', 'a_0E59']], [1, ['a_0E50']]],
    1863: [[0, ['a_0DB1', 'a_0DB0', 'a_0DB2', 'a_0DB7', 'a_0DB8', 'a_0DE3', 'a_0DE4', 'a_0DEB', 'a_0DEE']], [6, ['a_0E31', 'a_0E32', 'a_0E39', 'a_0E3C']],
      [3, ['a_0E17', 'a_0E18', 'a_0E1F', 'a_0E22']], [1, ['a_0E4B', 'a_0E4C', 'a_0E53', 'a_0E56']],
      [1, ['a_0DBF', 'a_0DC0', 'a_0DC1', 'a_0DC2', 'a_0DC3', 'a_0DC4', 'a_0DF3', 'a_0DF0', 'a_0DF1', 'a_0DF2']],
      [6, ['a_0E41', 'a_0E3E', 'a_0E40']], [9, ['a_0E3F']], [3, ['a_0E27', 'a_0E24', 'a_0E26', 'a_0E25']], [1, ['a_0E58', 'a_0E59', 'a_0E5A', 'a_0E5B']]],
    1864: [[0, ['a_0DB3', 'a_0DAC', 'a_0DB0', 'a_0DB1', 'a_0DB2', 'a_0DB6', 'a_0DB7', 'a_0DB8', 'a_0DE3', 'a_0DE4', 'a_0DEA', 'a_0DEE']],
      [6, ['a_0E31', 'a_0E32', 'a_0E38', 'a_0E3C']], [3, ['a_0E17', 'a_0E18', 'a_0E1E', 'a_0E22']], [1, ['a_0E4B', 'a_0E4C', 'a_0E52', 'a_0E56']],
      [1, ['a_0DBB', 'a_0DBF', 'a_0DC1', 'a_0DC3', 'a_0DC4', 'a_0DF3', 'a_0DF5', 'a_0DF7']], [9, ['a_0E41', 'a_0E43']], [6, ['a_0E45']],
      [5, ['a_0E27', 'a_0E29']], [3, ['a_0E2B']], [2, ['a_0E5B', 'a_0E5D']], [1, ['a_0E5F']]],
  };
  const setup = y => { for (const [v, names] of SETUP[y]) for (const n of names) { M[S[n]] = v; P.spend(4); } P.spend(10); return {}; };
  P.map_setup_1861 = () => setup(1861);
  P.map_setup_1862 = () => setup(1862);
  P.map_setup_1863 = () => setup(1863);
  P.map_setup_1864 = () => setup(1864);
  P.map_year_setup = function () {
    const y = M[R.start_year];
    P.spend(14);
    return y === 0 ? P.map_setup_1861() : y === 1 ? P.map_setup_1862() : y === 2 ? P.map_setup_1863() : P.map_setup_1864();
  };

  // ---- the turns
  const turn = function* (side, cpuFlag) {
    P.map_list_clear_moves();
    M[S.side_to_play] = side; M[S.figure_side] = side;
    P.map_draw_flag({ x: 0x1A });
    const r = P.map_list_armies({ a: side });
    P.spend(12);
    if (!r.y) return {};
    if (!M[cpuFlag]) return yield* P.map_player_move();
    return yield* P.map_ai_turn();
  };
  P.map_conf_turn = function* () { return yield* turn(1, R.cpu_confed); };
  P.map_union_turn = function* () { return yield* turn(0, R.cpu_union); };
};
})(typeof window !== 'undefined' ? window : globalThis);
