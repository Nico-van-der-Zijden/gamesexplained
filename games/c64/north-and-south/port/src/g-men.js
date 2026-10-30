// The menu (files OC and OM, $1000-$ABFF and $F632-$FFF9), called by the script before each war:
// the picture of the two sides' windows and the panels, a cursor that clicks them, and GO, which
// takes the photograph and returns. Its sound driver ($F632) is the game's own code run on the
// kit's 6502 (P.run6502); the map and the arcade parts keep it.
(function (root) {
'use strict';
const G = root.NSGroups = root.NSGroups || {};
G.men = function (P) {
  const M = P.M;
  for (const n of ['men_menu_main', 'men_menu_click', 'men_click_go']) P.GEN.add(n);
  const CX = 0x101E, CXH = 0x101F, CY = 0x1020, PBYTES = 0x1021, PW = 0x1022, PH = 0x1023;
  const CLICK_WAIT = 0x10D8, FLASH_TIME = 0x1139, FLASH_DONE = 0x113A, FRAME_WAIT = 0x139B;
  const JDX = 0x14F9, JDY = 0x14FA, JFIRE = 0x14FB, KEY = 0x1554;
  const LEVEL = 0x0380, LEVEL2 = 0x0381, CPU_U = 0x0382, CPU_C = 0x0383, IND = 0x0384, STORM = 0x0385, REINF = 0x0386;
  const ARCADE = 0x0387, KEYB = 0x0388, YEAR = 0x0389, YEAR_KEPT = 0x037E, SEEN = 0x037F;
  P.PASS.men = 0x100F;
  P.CPS.men = [0x100F];
  P.IRQ_BYTES.men = [CLICK_WAIT, KEY, JFIRE, CX, CXH, CY, FLASH_DONE, FRAME_WAIT];
  P.IRQS.men = { 0x15AA: 'men_menu_irq_heads', 0x160B: 'men_menu_irq_frame' };
  const sfx = a => P.run6502(0xF635, { a });

  // menu_main ($1000)
  P.men_menu_main = function* () {
    P.men_menu_video();
    P.men_menu_colour();
    P.men_menu_irq_on();
    P.men_draw_menu();
    P.men_draw_year();
    for (;;) {
      yield { cp: 0x100F, cycles: P.take() };
      if (yield* P.men_menu_click()) return {};
      P.men_flash_end();
      P.spend(3);
    }
  };
  // menu_click ($19B9): true when GO has left the menu
  P.men_menu_click = function* () {
    P.spend(4);
    if (P.irqByte(CLICK_WAIT)) return false;
    P.spend(6);
    if (P.irqByte(KEY) !== 0x20) {
      P.spend(6);
      if (P.irqByte(JFIRE) !== 0) return false;
    }
    for (let x = 0x0B; x >= 0; x--) {
      P.spend(24);
      // cursor_x - left, its high byte with the borrow: negative means left of the place
      let d = P.irqByte(CX) - M[0x10F1 + x];
      let b = d < 0 ? 1 : 0;
      let h = (P.irqByte(CXH) - M[0x10FD + x] - b) & 255;
      if (h & 0x80) continue;
      P.spend(20);
      d = M[0x1109 + x] - P.irqByte(CX);
      b = d < 0 ? 1 : 0;
      h = (M[0x1115 + x] - P.irqByte(CXH) - b) & 255;
      if (h & 0x80) continue;
      P.spend(10);
      const y = P.irqByte(CY);
      if (y < M[0x1121 + x]) continue;
      P.spend(4);
      if (y >= M[0x112D + x]) continue;
      M[CLICK_WAIT] = 0x14;
      const i = x << 1;
      M[0x1A11] = M[0x10D9 + i]; M[0x1A12] = M[0x10DA + i];
      P.spend(30);
      const to = M[0x1A11] | M[0x1A12] << 8;
      const f = HANDLERS[to];
      if (!f) throw new Error('menu_click: no handler at $' + to.toString(16));
      if (f === 'men_click_go') { yield* P.men_click_go(); return true; }
      P[f]();
      return false;
    }
    return false;
  };
  const HANDLERS = { 0x114D: 'men_click_union_window', 0x1193: 'men_click_union_head', 0x1204: 'men_click_indians',
    0x1223: 'men_click_storm', 0x1242: 'men_click_reinforcements', 0x11A6: 'men_click_conf_window', 0x11EE: 'men_click_conf_head',
    0x1261: 'men_click_arcade', 0x113B: 'men_click_year', 0x1280: 'men_click_joystick', 0x12A3: 'men_click_photographer',
    0x12DC: 'men_click_go' };

  P.men_click_year = function () {
    const a = (M[YEAR] + 1) & 3;
    M[YEAR] = a; M[YEAR_KEPT] = a;
    P.spend(18);
    return P.men_draw_year();
  };
  // the joystick panel for the players now chosen (b_1186, b_11E1 and the two-person case)
  const playersPanel = () => P.men_draw_panel({ a: 6, x: (M[KEYB] + 0x0A) & 255 });
  P.men_click_union_window = function () {
    M[CPU_U] ^= 1;
    P.spend(12);
    if (M[CPU_U] === 0) {
      P.men_draw_panel({ a: 0, x: 0 });
      sfx(7);
      if (M[CPU_C]) return playersPanel();
      return P.men_draw_panel({ a: 6, x: 9 });
    }
    sfx(6);
    P.men_draw_panel({ a: 0, x: 2 });
    if (M[CPU_C] === 0) return playersPanel();
    return P.men_draw_panel({ a: 6, x: 3 });
  };
  P.men_click_union_head = function () {
    let a = M[LEVEL] + 1;
    if (a >= 3) a = 0;
    M[LEVEL] = a;
    P.spend(16);
    sfx(a);
    return {};
  };
  P.men_click_conf_window = function () {
    M[CPU_C] ^= 1;
    P.spend(12);
    if (M[CPU_C] === 0) {
      sfx(9);
      P.men_draw_panel({ a: 1, x: 1 });
      if (M[CPU_U]) return playersPanel();
      return P.men_draw_panel({ a: 6, x: 9 });
    }
    sfx(8);
    P.men_draw_panel({ a: 1, x: 2 });
    if (M[CPU_U] === 0) return playersPanel();
    return P.men_draw_panel({ a: 6, x: 3 });
  };
  P.men_click_conf_head = function () {
    let a = M[LEVEL2] + 1;
    if (a >= 3) a = 0;
    M[LEVEL2] = a;
    P.spend(18);
    sfx((a + 3) & 255);
    return {};
  };
  const toggle = (addr, panel, on, sound) => {
    M[addr] ^= 1;
    P.spend(12);
    if (M[addr] === 0) return P.men_draw_panel({ a: panel, x: 3 });
    sfx(sound);
    return P.men_draw_panel({ a: panel, x: on });
  };
  P.men_click_indians = () => toggle(IND, 2, 4, 0x0D);
  P.men_click_storm = () => toggle(STORM, 3, 5, 0x0F);
  P.men_click_reinforcements = () => toggle(REINF, 4, 6, 0x0C);
  P.men_click_arcade = function () {
    M[ARCADE] ^= 1;
    P.spend(12);
    if (M[ARCADE] === 0) return P.men_draw_panel({ a: 5, x: 8 });
    sfx(0x0A);
    return P.men_draw_panel({ a: 5, x: 7 });
  };
  P.men_click_joystick = function () {
    P.spend(14);
    if (M[CPU_U] & M[CPU_C]) return {};
    if (!(M[CPU_U] | M[CPU_C])) return {};
    M[KEYB] ^= 1;
    P.spend(14);
    return P.men_draw_panel({ a: 6, x: (M[KEYB] + 0x0A) & 255 });
  };
  P.men_click_photographer = function () {
    P.spend(6);
    if (M[FLASH_TIME]) return {};
    sfx(0x0E);
    M[FLASH_TIME] = 0x0A;
    P.spend(10);
    return P.men_draw_panel({ a: 7, x: 0x0C });
  };
  P.men_flash_end = function () {
    P.spend(6);
    if (!P.irqByte(FLASH_DONE)) return {};
    M[FLASH_DONE] = 0;
    P.spend(10);
    return P.men_draw_panel({ a: 7, x: 0x0D });
  };
  P.men_flash_count = function () {
    P.spend(6);
    if (!M[FLASH_TIME]) return {};
    M[FLASH_TIME]--;
    if (M[FLASH_TIME]) return {};
    M[FLASH_DONE] = 1;
    P.spend(8);
    return {};
  };
  // click_go ($12DC): the photograph, then back to the script past the menu's loop
  P.men_click_go = function* () {
    const io = P.io;
    sfx(0x0B);
    M[FRAME_WAIT] = 2;
    io.vicWrite(0x20, 1);
    io.vicWrite(0x11, io.vicRead(0x11) & 0x6F);
    P.spend(24);
    for (let v = P.pollFirst(FRAME_WAIT); v; v = M[FRAME_WAIT]) { P.spend(7); yield; }
    io.vicWrite(0x11, 0x38); io.vicWrite(0x20, 0); io.vicWrite(0x25, 0x0F); io.vicWrite(0x26, 0x00);
    io.vicWrite(0x28, 0x0C); io.vicWrite(0x29, 0x0C); io.vicWrite(0x2A, 0x0C); io.vicWrite(0x2B, 0x0C);
    P.spend(50);
    // four pages of the screen at $6000 and of colour RAM in grey, from the top of each down,
    // through the loop's own operands (loads $1321 and $132A, stores $1327 and $1330), whose high
    // bytes step a page each time; the last page from $F7 down
    let x = 0xFF;
    for (let y = 3; ; ) {
      do {
        const w = a => M[a] | M[a + 1] << 8;
        P.wr((w(0x1327) + x) & 0xFFFF, P.men_to_grey({ a: P.rd((w(0x1321) + x) & 0xFFFF), x }).a);
        P.wr((w(0x1330) + x) & 0xFFFF, P.men_to_grey({ a: P.rd((w(0x132A) + x) & 0xFFFF), x }).a);
        x = (x - 1) & 255;
        P.spend(30);
      } while (x !== 0xFF);
      M[0x1322] = (M[0x1322] + 1) & 255; M[0x1328] = (M[0x1328] + 1) & 255;
      M[0x132B] = (M[0x132B] + 1) & 255; M[0x1331] = (M[0x1331] + 1) & 255;
      P.spend(26);
      y--;
      if (y < 0) break;
      if (y === 0) x = 0xF7;
    }
    M[FRAME_WAIT] = 0xC8;
    P.spend(6);
    for (let v = P.pollFirst(FRAME_WAIT); v; v = M[FRAME_WAIT]) { P.spend(7); yield; }
    io.vicWrite(0x1A, 0);
    io.vicWrite(0x19, io.vicRead(0x19));
    P.spend(20);
    return {};
  };
  // to_grey ($1366): each colour nibble through grey_table; X kept
  P.men_to_grey = function (r) {
    M[0x138A] = r.x;
    const hi = (M[0x138B + (r.a >> 4)] << 4) & 255;
    M[0x1389] = hi;
    const a = M[0x138B + (r.a & 15)] | hi;
    P.spend(50);
    return { a, x: r.x };
  };
  P.men_frame_count = function () { P.spend(8); if (M[FRAME_WAIT]) M[FRAME_WAIT]--; return {}; };
  // menu_video ($13A5)
  P.men_menu_video = function () {
    const io = P.io;
    M[1] = 0x35;
    io.cia2Write(0x02, io.cia2Read(0x02) | 0x03);
    io.cia2Write(0x00, (io.cia2Read(0x00) & 0xFC) | 0x02);
    io.vicWrite(0x20, 0); io.vicWrite(0x21, 0); io.vicWrite(0x15, 0);
    io.vicWrite(0x18, 0x80); io.vicWrite(0x11, 0x28); io.vicWrite(0x16, 0x1F);
    io.vicWrite(0x19, io.vicRead(0x19));
    io.vicWrite(0x1A, 0);
    io.ciaWrite(0x0D, 0x7F); io.cia2Write(0x0D, 0x7F); io.ciaWrite(0x00, 0x7F);
    io.ciaWrite(0x0E, 0x08); io.cia2Write(0x0E, 0x08); io.ciaWrite(0x0F, 0x08); io.cia2Write(0x0F, 0x08);
    io.ciaRead(0x0D); io.cia2Read(0x0D);
    io.vicWrite(0x1C, 0x1E); io.vicWrite(0x17, 0); io.vicWrite(0x1D, 0);
    io.vicWrite(0x25, 0x0A); io.vicWrite(0x26, 0x00);
    io.vicWrite(0x28, 0x06); io.vicWrite(0x29, 0x06); io.vicWrite(0x2A, 0x0C); io.vicWrite(0x2B, 0x0C);
    io.vicWrite(0x15, 0x1F);
    P.spend(170);
    P.run6502(0xF632, {});
    return {};
  };
  // menu_joy ($1497)
  P.men_menu_joy = function () {
    P.io.ciaWrite(0x02, 0);
    let a = P.io.ciaRead(0x00), x = 0, y = 0;
    if (!(a & 1)) y--;
    if (!(a & 2)) y++;
    if (!(a & 4)) x--;
    if (!(a & 8)) x++;
    a = (a >> 4) & 1;
    M[JFIRE] = a; M[JDX] = x & 255; M[JDY] = y & 255;
    P.spend(54);
    return { a, x: x & 255, y: y & 255 };
  };
  // menu_key ($14C1), the title's read_key on the menu's tables
  P.men_menu_key = function () {
    const io = P.io;
    io.ciaWrite(0x02, 0xFF); io.ciaWrite(0x03, 0x00);
    P.spend(14);
    let y = 0;
    for (let x = 7; x >= 0; x--) {
      M[0x19] = M[0x1504 + x]; M[0x1A] = M[0x150C + x];
      io.ciaWrite(0x00, M[0x14FC + x]);
      y = 7;
      const a = io.ciaRead(0x01);
      P.spend(30);
      if (a !== 0xFF) {
        for (; y >= 0; y--) {
          P.spend(9);
          if (a === M[0x14FC + y]) { P.spend(12); return { a: M[((M[0x19] | M[0x1A] << 8) + y) & 0xFFFF], x, y }; }
        }
        y = 0xFF;
      }
      P.spend(5);
    }
    P.spend(8);
    return { a: 0xFF, x: 0xFF, y };
  };
  // menu_colour ($1555)
  P.men_menu_colour = function () {
    for (let i = 0; i < 0x400; i++) P.io.colourWrite(i, M[0x9000 + i]);
    P.io.vicWrite(0x11, 0x38);
    P.spend(256 * 43 + 8);
    return { a: 0x38 };
  };
  // menu_irq_on ($1578)
  P.men_menu_irq_on = function () {
    const io = P.io;
    io.vicWrite(0x12, 0x55);
    io.vicWrite(0x11, io.vicRead(0x11) & 0x7F);
    io.vicWrite(0x1A, 1); io.vicWrite(0x19, 1);
    M[0xFFFE] = 0xAA; M[0xFFFF] = 0x15;
    M[0xFFFA] = 0xA9; M[0xFFFC] = 0xA9; M[0xFFFB] = 0x15; M[0xFFFD] = 0x15;
    P.spend(64);
    return { a: 0x15 };
  };
  // menu_irq_heads ($15AA), at line $55: the heads' lower sprites once the beam is past line $58
  P.men_menu_irq_heads = function () {
    const io = P.io;
    const s = io.vicRead(0x19) & 1;
    P.spend(20);
    if (s) {
      io.vicWrite(0x19, s);
      io.vicWrite(0x12, 0xFA);
      M[0xFFFE] = 0x0B; M[0xFFFF] = 0x16;
      P.spend(20);
      P.men_heads_low();
      while (io.vicRead(0x12) < 0x58) P.spend(9);
      P.spend(48);
      let x = (M[0x63FA] + 1) & 255; M[0x63F9] = x; x = (x + 1) & 255; M[0x63FA] = x;
      x = (M[0x63FC] + 1) & 255; M[0x63FB] = x; x = (x + 1) & 255; M[0x63FC] = x;
      P.spend(30);
    }
    io.vicWrite(0x19, 0xFF);
    P.spend(20);
  };
  // menu_irq_frame ($160B), at line $FA: the frame's work
  P.men_menu_irq_frame = function () {
    const io = P.io;
    const s = io.vicRead(0x19) & 1;
    P.spend(20);
    if (s) {
      io.vicWrite(0x19, s);
      io.vicWrite(0x12, 0x54);
      M[0xFFFE] = 0xAA; M[0xFFFF] = 0x15;
      P.spend(22);
      P.men_heads_top();
      P.men_cursor_show();
      P.men_cursor_move();
      M[KEY] = P.men_menu_key().a;
      P.men_menu_joy();
      P.men_click_count();
      P.men_flash_count();
      P.men_frame_count();
      P.run6502(0xF638, {});
      P.spend(40);
    }
    io.vicWrite(0x19, 0xFF);
    P.spend(20);
  };
  P.men_heads_top = function () {
    const io = P.io;
    let a = M[0x1018 + M[LEVEL]];
    M[0x63F9] = a; M[0x63FA] = (a + 1) & 255;
    a = M[0x101B + M[LEVEL2]];
    M[0x63FB] = a; M[0x63FC] = (a + 1) & 255;
    io.vicWrite(0x02, 0x4F); io.vicWrite(0x04, 0x67);
    io.vicWrite(0x06, 0x27); io.vicWrite(0x08, 0x3F);
    io.vicWrite(0x10, (io.vicRead(0x10) & 0x19) | 0x18);
    io.vicWrite(0x03, 0x45); io.vicWrite(0x05, 0x45); io.vicWrite(0x07, 0x45); io.vicWrite(0x09, 0x45);
    P.spend(96);
    return { a: 0x45 };
  };
  P.men_heads_low = function () {
    const io = P.io;
    io.vicWrite(0x03, 0x5A); io.vicWrite(0x05, 0x5A); io.vicWrite(0x07, 0x5A); io.vicWrite(0x09, 0x5A);
    P.spend(24);
    return { a: 0x5A };
  };
  P.men_cursor_show = function () {
    const io = P.io;
    io.vicWrite(0x00, M[CX]); io.vicWrite(0x01, M[CY]);
    io.vicWrite(0x10, (io.vicRead(0x10) & 0xFE) | M[CXH]);
    io.vicWrite(0x27, 1);
    M[0x63F8] = 0xA8;
    P.spend(40);
    return { a: 0xA8 };
  };
  P.men_cursor_move = function () { P.men_cursor_keys(); P.men_cursor_stick(); P.spend(12); return {}; };
  P.men_cursor_keys = function () {
    const k = M[KEY];
    P.spend(6);
    if (k === 0xFF) return {};
    if (k === 0x50) return P.men_cursor_up();
    if (k === 0x4C) return P.men_cursor_down();
    if (k === 0x5A) return P.men_cursor_left();
    if (k === 0x58) return P.men_cursor_right();
    P.spend(16);
    return {};
  };
  P.men_cursor_stick = function () {
    const dx = M[JDX];
    P.spend(6);
    if (dx) { if (dx & 0x80) P.men_cursor_left(); else P.men_cursor_right(); }
    const dy = M[JDY];
    P.spend(6);
    if (!dy) return {};
    return dy & 0x80 ? P.men_cursor_up() : P.men_cursor_down();
  };
  P.men_cursor_left = function () {
    P.spend(8);
    if (!M[CXH] && M[CX] < 0x1E) return {};
    const v = (M[CX] | M[CXH] << 8) - 4;
    M[CX] = v & 255; M[CXH] = (v >> 8) & 255;
    P.spend(20);
    return {};
  };
  P.men_cursor_right = function () {
    P.spend(8);
    if (M[CXH] && M[CX] >= 0x40) return {};
    const v = (M[CX] | M[CXH] << 8) + 4;
    M[CX] = v & 255; M[CXH] = (v >> 8) & 255;
    P.spend(20);
    return {};
  };
  P.men_cursor_up = function () { P.spend(6); if (M[CY] < 0x3C) return {}; M[CY] = (M[CY] - 4) & 255; P.spend(10); return {}; };
  P.men_cursor_down = function () { P.spend(6); if (M[CY] >= 0xE0) return {}; M[CY] = (M[CY] + 4) & 255; P.spend(10); return {}; };
  P.men_draw_year = function () { P.spend(10); return P.men_draw_panel({ a: 8, x: (M[YEAR] + 0x0E) & 255 }); };
  // draw_panel ($1785): panel A with picture X, through the copy loops' own operands
  P.men_draw_panel = function (r) {
    let x = r.x;
    M[PW] = M[0x1024 + x]; M[PH] = M[0x1036 + x];
    x = (x << 1) & 255;
    M[0x17EC] = M[0x1048 + x]; M[0x17ED] = M[0x1049 + x];
    M[0x1828] = M[0x106C + x]; M[0x1829] = M[0x106D + x];
    M[0x182E] = M[0x1090 + x]; M[0x182F] = M[0x1091 + x];
    x = (r.a << 1) & 255;
    M[0x17EF] = M[0x10B4 + x]; M[0x17F0] = M[0x10B5 + x];
    M[0x182B] = M[0x10C6 + x]; M[0x1831] = M[0x10C6 + x];
    M[0x182C] = M[0x10C7 + x]; M[0x1832] = (M[0x10C7 + x] + 0x78) & 255;
    M[PBYTES] = (M[PW] << 3) & 255;
    P.spend(130);
    const w16 = (a, d) => { const v = (M[a] | M[a + 1] << 8) + d; M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };
    // the bitmap, a row of cells at a time, from the row's last byte down
    for (let y = M[PH]; ; ) {
      const src = M[0x17EC] | M[0x17ED] << 8, dst = M[0x17EF] | M[0x17F0] << 8;
      for (let i = (M[PBYTES] - 1) & 255; ; i = (i - 1) & 255) {
        P.wr((dst + i) & 0xFFFF, P.rd((src + i) & 0xFFFF));
        P.spend(16);
        if (i === 0) break;
      }
      w16(0x17EC, M[PBYTES]);
      w16(0x17EF, 0x140);
      P.spend(50);
      y = (y - 1) & 255;
      if (!y) break;
    }
    // the screen and colour bytes, a row of cells at a time
    for (let y = M[PH]; ; ) {
      for (let i = (M[PW] - 1) & 255; ; i = (i - 1) & 255) {
        const s = M[0x1828] | M[0x1829] << 8, d = M[0x182B] | M[0x182C] << 8;
        const cs = M[0x182E] | M[0x182F] << 8, cd = M[0x1831] | M[0x1832] << 8;
        P.wr((d + i) & 0xFFFF, P.rd((s + i) & 0xFFFF));
        P.wr((cd + i) & 0xFFFF, P.rd((cs + i) & 0xFFFF));
        P.spend(25);
        if (i === 0 || i & 0x80) break;
      }
      w16(0x1828, M[PW]);
      w16(0x182E, M[PW]);
      const lo = M[0x182B] + 0x28;
      M[0x182B] = lo & 255; M[0x1831] = lo & 255;
      const h = M[0x182C] + (lo > 255 ? 1 : 0);
      M[0x182C] = h & 255;
      M[0x1832] = ((h & 255) + 0x78 + (h > 255 ? 1 : 0)) & 255;
      P.spend(80);
      y = (y - 1) & 255;
      if (!y) break;
    }
    return { a: M[0x1832], x: 0xFF, y: 0 };
  };
  // draw_menu ($1878)
  P.men_draw_menu = function () {
    P.spend(6);
    if (!M[SEEN]) {
      M[SEEN]++;
      for (let x = 9; x >= 0; x--) M[LEVEL + x] = 0;
      M[CPU_C] = 1; M[ARCADE] = 1; M[LEVEL] = 2;
      P.spend(80);
      P.men_draw_panel({ a: 1, x: 2 });
      P.men_draw_panel({ a: 2, x: 3 });
      P.men_draw_panel({ a: 3, x: 3 });
      P.men_draw_panel({ a: 4, x: 3 });
      return P.men_draw_panel({ a: 6, x: 0x0A });
    }
    M[YEAR] = M[YEAR_KEPT];
    P.men_draw_year();
    const both = () => P.men_draw_panel({ a: 6, x: (M[KEYB] + 0x0A) & 255 });
    if (!M[CPU_U]) {
      P.men_draw_panel({ a: 0, x: 0 });
      if (!M[CPU_C]) P.men_draw_panel({ a: 6, x: 9 }); else both();
    } else {
      P.men_draw_panel({ a: 0, x: 2 });
      if (M[CPU_C]) P.men_draw_panel({ a: 6, x: 3 }); else both();
    }
    if (!M[CPU_C]) {
      P.men_draw_panel({ a: 1, x: 1 });
      if (!M[CPU_U]) P.men_draw_panel({ a: 6, x: 9 }); else both();
    } else {
      P.men_draw_panel({ a: 1, x: 2 });
      if (M[CPU_U]) P.men_draw_panel({ a: 6, x: 3 }); else both();
    }
    P.men_draw_panel({ a: 2, x: M[IND] ? 4 : 3 });
    P.men_draw_panel({ a: 3, x: M[STORM] ? 5 : 3 });
    P.men_draw_panel({ a: 4, x: M[REINF] ? 6 : 3 });
    P.men_draw_panel({ a: 5, x: M[ARCADE] ? 7 : 8 });
    P.spend(120);
    if (M[CPU_U] & M[CPU_C]) return {};
    if (!(M[CPU_U] | M[CPU_C])) return {};
    return both();
  };
  P.men_click_count = function () { P.spend(8); if (M[CLICK_WAIT]) M[CLICK_WAIT]--; return {}; };
};
})(typeof window !== 'undefined' ? window : globalThis);
