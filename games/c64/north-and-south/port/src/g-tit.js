// The title (file TP, $1800-$9FFF), called by the script once: the Infogrames picture for about
// four seconds, then the title scene with its tune, the figure's animations and the credits, until
// space or fire, or until the credits and the tune have both ended. Its tune's driver ($9000) is
// the game's own code run on the kit's 6502 (P.run6502).
(function (root) {
'use strict';
const G = root.NSGroups = root.NSGroups || {};
G.tit = function (P) {
  const M = P.M;
  for (const n of ['tit_title_main', 'tit_title_irq_on']) P.GEN.add(n);
  const DELAY = 0x80CE, KEY = 0x825F, JDX = 0x8203, JDY = 0x8204, JFIRE = 0x8205;
  const MUSIC_FADE = 0x9006, MUSIC_ON = 0x9016, CREDITS_DONE = 0x83C9;
  P.TIT_PASS = P.PASS.tit = 0x808B;
  P.IRQ_BYTES.tit = [DELAY, CREDITS_DONE, MUSIC_ON];
  P.CPS.tit = [P.TIT_PASS, 0x807C];
  P.IRQS.tit = { 0x82EE: 'tit_title_irq_top', 0x833B: 'tit_title_irq_bitmap' };

  // title_main ($8000)
  P.tit_title_main = function* () {
    P.tit_title_video();
    for (let x = 0; x < 256; x++) {
      M[0x0400 + x] = M[0x1800 + x]; M[0x0500 + x] = M[0x1900 + x]; M[0x0600 + x] = M[0x1A00 + x]; M[0x0700 + x] = M[0x1B00 + x];
      P.io.colourWrite(x, M[0x1C00 + x]); P.io.colourWrite(0x100 + x, M[0x1D00 + x]);
      P.io.colourWrite(0x200 + x, M[0x1E00 + x]); P.io.colourWrite(0x300 + x, M[0x1F00 + x]);
    }
    const io = P.io;
    io.cia2Write(0x02, io.cia2Read(0x02) | 0x03);
    io.cia2Write(0x00, (io.cia2Read(0x00) & 0xFC) | 0x03);
    io.vicWrite(0x18, 0x18); io.vicWrite(0x21, 1); io.vicWrite(0x20, 1);
    P.spend(256 * 75 + 40);
    // the delay at $805E: 12 times 256 x 256 turns, nothing else running
    yield { cycles: P.take() + 12 * (256 * 1284 - 1 + 7) - 1 };
    P.tit_title_video();
    P.run6502(0x9000, { a: 0 });
    P.tit_title_colour();
    P.tit_title_text_rows();
    M[0x82E9] = M[0xA2];
    P.spend(6);
    // the seed takes the raster line where the game has got to
    yield { cp: 0x807C, cycles: P.take() };
    M[0x82EC] = io.vicRead(0x12);
    M[0x82ED] = io.vicRead(0x11);
    P.spend(30);
    yield* P.tit_title_irq_on();
    for (;;) {
      yield { cp: P.TIT_PASS, cycles: P.take() };
      const k = P.tit_read_key().a;
      M[KEY] = k;
      P.spend(10);
      if (k === 0x20) break;
      P.tit_read_joy2();
      P.spend(10);
      if (M[JFIRE] === 0) break;
      P.spend(6);
      if (P.irqByte(CREDITS_DONE) === 0) continue;
      P.spend(6);
      if (P.irqByte(MUSIC_ON) === 0) return P.tit_b_80B9();
      P.spend(3);
    }
    M[MUSIC_FADE] = 5;
    M[DELAY] = 0x78;
    P.spend(12);
    // a polling loop: its first read is the stretch's, later turns read what the interrupts the
    // lockstep runs at each yield leave (kit/c64/lockstep.js, standInGen)
    for (let v = P.irqByte(DELAY); v !== 0; v = M[DELAY]) { P.spend(7); yield; }
    return P.tit_b_80B9();
  };
  // $80B9: the raster interrupt off and acknowledged, the screen blanked
  P.tit_b_80B9 = function () {
    const io = P.io;
    io.vicWrite(0x1A, 0);
    io.vicWrite(0x19, io.vicRead(0x19));
    io.vicWrite(0x11, io.vicRead(0x11) & 0xEF);
    P.spend(26);
    return {};
  };
  // title_video ($80D3)
  P.tit_title_video = function () {
    const io = P.io;
    M[1] = 0x35;
    io.ciaWrite(0x0D, 0x7F); io.cia2Write(0x0D, 0x7F);
    io.ciaWrite(0x0E, 0); io.cia2Write(0x0E, 0); io.ciaWrite(0x0F, 0); io.cia2Write(0x0F, 0);
    io.ciaRead(0x0D); io.cia2Read(0x0D);
    io.cia2Write(0x02, io.cia2Read(0x02) | 0x03);
    io.cia2Write(0x00, (io.cia2Read(0x00) & 0xFC) | 0x02);
    io.vicWrite(0x20, 0); io.vicWrite(0x21, 0); io.vicWrite(0x15, 0);
    io.vicWrite(0x18, 0x80); io.vicWrite(0x11, 0x3B); io.vicWrite(0x16, 0x18);
    io.vicWrite(0x19, io.vicRead(0x19));
    io.vicWrite(0x1A, 0);
    io.vicWrite(0x22, 6); io.vicWrite(0x23, 6); io.vicWrite(0x24, 6);
    M[0xFFFA] = 0x83; M[0xFFFC] = 0x83; M[0xFFFB] = 0x81; M[0xFFFD] = 0x81;
    for (let s = 0; s < 5; s++) io.vicWrite(0x27 + s, 6);
    io.vicWrite(0x25, 0x0E); io.vicWrite(0x26, 0x00);
    io.vicWrite(0x00, 0xA9); io.vicWrite(0x04, 0xA9);
    io.vicWrite(0x02, 0xC1); io.vicWrite(0x06, 0xC1);
    io.vicWrite(0x01, 0xA1); io.vicWrite(0x03, 0xA1);
    io.vicWrite(0x05, 0xB6); io.vicWrite(0x07, 0xB6);
    P.spend(206);
    return { a: 0xB6 };
  };
  // read_joy2 ($8184): joystick 2 into joy_dx, joy_dy and joy_fire
  P.tit_read_joy2 = function () {
    P.io.ciaWrite(0x02, 0);
    const a = P.io.ciaRead(0x00);
    P.spend(31);
    return P.tit_joy_decode({ a });
  };
  // joy_decode ($81AB)
  P.tit_joy_decode = function (r) {
    let a = r.a, x = 0, y = 0;
    if (!(a & 1)) y--;
    if (!(a & 2)) y++;
    if (!(a & 4)) x--;
    if (!(a & 8)) x++;
    a = (a >> 4) & 1;
    M[JFIRE] = a; M[JDX] = x & 255; M[JDY] = y & 255;
    P.spend(40);
    return { a, x: x & 255, y: y & 255 };
  };
  // read_key ($81CB): the code of a key that is alone in its row, from row 0 up; $FF for none
  P.tit_read_key = function () {
    const io = P.io;
    io.ciaWrite(0x02, 0xFF); io.ciaWrite(0x03, 0x00);
    P.spend(14);
    let y = 0;
    for (let x = 7; x >= 0; x--) {
      M[0x19] = M[0x820F + x]; M[0x1A] = M[0x8217 + x];
      io.ciaWrite(0x00, M[0x8207 + x]);
      y = 7;
      const a = io.ciaRead(0x01);
      P.spend(30);
      if (a !== 0xFF) {
        for (; y >= 0; y--) {
          P.spend(9);
          if (a === M[0x8207 + y]) { P.spend(12); return { a: M[((M[0x19] | M[0x1A] << 8) + y) & 0xFFFF], x, y }; }
        }
        y = 0xFF;
      }
      P.spend(5);
    }
    P.spend(8);
    return { a: 0xFF, x: 0xFF, y };
  };
  // title_colour ($8260)
  P.tit_title_colour = function () {
    for (let i = 0; i < 0x400; i++) P.io.colourWrite(i, M[0x8BAC + i]);
    P.spend(256 * 43);
    return {};
  };
  // title_irq_on ($827E): the raster handler at $82EE for line $F9, set while the beam is in the
  // upper part of the frame
  P.tit_title_irq_on = function* () {
    const io = P.io;
    M[0xFFFE] = 0xEE; M[0xFFFF] = 0x82;
    io.vicWrite(0x1A, 1); io.vicWrite(0x19, 1);
    P.spend(24);
    while (io.vicRead(0x11) & 0x80) { P.spend(9); yield; }
    io.vicWrite(0x11, io.vicRead(0x11) & 0x7F);
    io.vicWrite(0x12, 0xF9);
    io.ciaRead(0x0D); io.cia2Read(0x0D);
    io.vicWrite(0x15, 0xFF); io.vicWrite(0x1C, 0xFF); io.vicWrite(0x17, 0); io.vicWrite(0x1D, 0);
    P.spend(46);
    return { a: 0 };
  };
  // title_rnd ($82BC): 1 + the second and fifth bytes and the sixth with the carry, shifted in
  P.tit_title_rnd = function () {
    let s = 1 + M[0x82E9] + M[0x82EC];
    s = (s & 255) + M[0x82ED] + (s > 255 ? 1 : 0);
    const a = s & 255;
    M[0x82E8] = a;
    M[0x82ED] = M[0x82EC]; M[0x82EC] = M[0x82EB]; M[0x82EB] = M[0x82EA]; M[0x82EA] = M[0x82E9]; M[0x82E9] = a;
    P.spend(50);
    return { a };
  };
  // title_irq_top ($82EE): the text band from line $0A; the animations, the tune and the count-down
  P.tit_title_irq_top = function () {
    const io = P.io;
    io.vicWrite(0x18, 0x8E); io.vicWrite(0x11, 0x1F); io.vicWrite(0x16, 0x08); io.vicWrite(0x21, 0x06);
    io.vicWrite(0x19, io.vicRead(0x19) & 1);
    io.vicWrite(0x12, 0xA3);
    M[0xFFFE] = 0x3B; M[0xFFFF] = 0x83;
    P.spend(60);
    P.tit_anim_show();
    P.tit_anim_step_next();
    P.tit_anim_spin_step();
    P.tit_anim_arc_step();
    P.run6502(0x9003, {});
    if (M[DELAY]) M[DELAY]--;
    P.spend(30);
  };
  // title_irq_bitmap ($833B): the bitmap again from line $A3, and the credits
  P.tit_title_irq_bitmap = function () {
    const io = P.io;
    io.vicWrite(0x11, 0x3F); io.vicWrite(0x16, 0x18); io.vicWrite(0x18, 0x80);
    io.vicWrite(0x19, io.vicRead(0x19) & 1);
    io.vicWrite(0x12, 0x0A);
    M[0xFFFE] = 0xEE; M[0xFFFF] = 0x82;
    io.vicWrite(0x21, 0);
    P.spend(60);
    P.tit_credits_step();
    P.spend(20);
  };
  // title_text_rows ($8374): rows 0 to 13 of the screen at $6000 filled with each row's character
  // and colour, by stepping its own stores' operands ($837C, $8382) 40 bytes on
  P.tit_title_text_rows = function () {
    for (let y = 0; y < 14; y++) {
      const s = M[0x837C] | M[0x837D] << 8, c = M[0x8382] | M[0x8383] << 8;
      for (let x = 0x27; x >= 0; x--) {
        P.wr((s + x) & 0xFFFF, M[0x83A6 + y]);
        P.wr((c + x) & 0xFFFF, M[0x83B4 + y]);
      }
      const lo = M[0x837C] + 0x28;
      M[0x837C] = lo & 255; M[0x8382] = lo & 255;
      const h = M[0x837D] + (lo > 255 ? 1 : 0);
      M[0x837D] = h & 255;
      M[0x8383] = ((h & 255) + 0x78 + (h > 255 ? 1 : 0)) & 255;
      P.spend(40 * 23 + 50);
    }
    return {};
  };

  // the credits ($83CA), once a frame
  P.tit_credits_step = function () {
    P.spend(10);
    if (M[0x83C9]) return {};
    if (!M[0x83C2]) {
      M[0x83C6] = (M[0x83C6] - 1) & 255;
      if (M[0x83C6]) return {};
      M[0x83C6] = 0x64; M[0x83C2] = 1; M[0x83C5] = 0; M[0x83C4] = 0;
      M[0x83C3] ^= 1;
      const x = (M[0x83C8] << 1) & 255;
      M[0x10] = M[0x857A + x]; M[0x11] = M[0x857B + x];
      P.spend(60);
      return {};
    }
    const phase = M[0x83C5];
    if (phase === 0) {
      if (!M[0x83C3]) { P.tit_credits_left(); P.tit_credits_col_right(); } else { P.tit_credits_right(); P.tit_credits_col_left(); }
      let a = M[0x83C4] + 1;
      if (a >= 0x28) { M[0x83C4] = 0; M[0x83C5] = 1; M[0x83C7] = 0x0A; M[0x83C6] = 0x0A; a = 0; }
      M[0x83C4] = a;
      P.spend(30);
      return {};
    }
    if (phase === 1) {
      M[0x83C6] = (M[0x83C6] - 1) & 255;
      P.spend(10);
      if (M[0x83C6]) return {};
      M[0x83C6] = 0x23;
      M[0x83C7] = (M[0x83C7] - 1) & 255;
      if (M[0x83C7]) return {};
      M[0x83C5] = 2;
      M[0x83C8] = (M[0x83C8] + 1) & 255;
      if (M[0x83C8] === 5) M[0x83C9] = 1;
      P.spend(30);
      return {};
    }
    if (!M[0x83C3]) { P.tit_credits_left(); P.tit_credits_clear_right(); } else { P.tit_credits_right(); P.tit_credits_clear_left(); }
    const a = M[0x83C4] + 1;
    P.spend(20);
    if (a < 0x28) { M[0x83C4] = a; return {}; }
    M[0x83C4] = 0; M[0x83C5] = 0; M[0x83C2] = 0; M[0x83C6] = 0x14; M[0x83C4] = 0;
    P.spend(20);
    return {};
  };
  const ROWS = [0x6028, 0x6078, 0x60C8, 0x6118, 0x6168, 0x61B8];
  P.tit_credits_left = function () {
    for (let x = 0; x < 0x27; x++) for (const r of ROWS) M[r + x] = M[r + x + 1];
    P.spend(0x27 * 55);
    return {};
  };
  P.tit_credits_right = function () {
    for (let x = 0x26; x >= 0; x--) for (const r of ROWS) M[r + x + 1] = M[r + x];
    P.spend(0x27 * 55);
    return {};
  };
  P.tit_credits_clear_left = function () { for (const r of ROWS) M[r] = 0; P.spend(30); return { a: 0 }; };
  P.tit_credits_clear_right = function () { for (const r of ROWS) M[r + 0x27] = 0; P.spend(30); return { a: 0 }; };
  // the column copy ($8539): six rows of the page ($12/$13, 40 a row) at column y into the screen
  // through its own store's operand ($853E), 80 bytes a row
  const column = (y) => {
    for (let x = 6; x > 0; x--) {
      const v = M[((M[0x12] | M[0x13] << 8) + y) & 0xFFFF];
      P.wr(M[0x853E] | M[0x853F] << 8, v);
      let s = M[0x12] + 0x28; M[0x12] = s & 255; M[0x13] = (M[0x13] + (s > 255 ? 1 : 0)) & 255;
      s = M[0x853E] + 0x50; M[0x853E] = s & 255; M[0x853F] = (M[0x853F] + (s > 255 ? 1 : 0)) & 255;
      P.spend(50);
    }
    return { x: 0 };
  };
  P.tit_credits_col_left = function () {
    M[0x12] = M[0x10]; M[0x13] = M[0x11];
    const y = (0x27 - M[0x83C4]) & 255;
    M[0x853E] = 0x28; M[0x853F] = 0x60;
    P.spend(30);
    return column(y);
  };
  P.tit_credits_col_right = function () {
    M[0x12] = M[0x10]; M[0x13] = M[0x11];
    const y = M[0x83C4];
    M[0x853E] = 0x4F; M[0x853F] = 0x60;
    P.spend(30);
    return column(y);
  };

  // the figure's animations, once a frame
  P.tit_anim_spin_step = function () {
    P.spend(8);
    if (M[0x8A34] !== 2) return {};
    M[0x8A4D] = (M[0x8A4D] - 1) & 255;
    if (M[0x8A4D]) return {};
    M[0x8A4D] = 3;
    M[0x8A3C] = (M[0x8A3C] - 1) & 7;
    P.spend(20);
    return {};
  };
  P.tit_anim_arc_step = function () {
    P.spend(8);
    if (M[0x8A34] !== 2) return {};
    M[0x8A3E] = (M[0x8A3E] + M[0x8A50 + M[0x8A4E]]) & 255;
    M[0x8A4F] = (M[0x8A4F] - 1) & 255;
    P.spend(20);
    if (M[0x8A4F]) return {};
    M[0x8A4F] = 3;
    M[0x8A4E] = (M[0x8A4E] + 1) & 255;
    P.spend(16);
    if (M[0x8A4E] < 0x13) return {};
    return P.tit_anim_pick();
  };
  P.tit_anim_step_next = function () {
    M[0x8A37] = (M[0x8A37] - 1) & 255;
    P.spend(8);
    if (M[0x8A37]) return {};
    M[0x8A37] = 5;
    const k = M[0x8A34];
    P.spend(14);
    if (k === 2) { M[0x8A36] = 0; return {}; }
    const [n, frames] = k === 0 ? [5, 0x8A44] : k === 1 ? [4, 0x8A49] : [5, 0x8A3F];
    const x = (M[0x8A35] + 1) & 255;
    P.spend(14);
    if (x === n) return P.tit_anim_pick();
    M[0x8A35] = x;
    M[0x8A36] = M[frames + x];
    return {};
  };
  P.tit_anim_pick = function () {
    for (;;) {
      M[0x8A37] = 8;
      const a = P.tit_title_rnd().a;
      P.spend(16);
      if (a < 0x40) { M[0x8A34] = 0; M[0x8A35] = 0; M[0x8A36] = 0; return {}; }
      const k = a < 0x80 ? 1 : a < 0xC0 ? 2 : 3;
      if (M[0x8A34] === k) continue;
      M[0x8A34] = k; M[0x8A35] = 0; M[0x8A36] = 0;
      if (k === 2) { M[0x8A3C] = 0; M[0x8A4E] = 0; M[0x8A3E] = 0x96; M[0x8A4D] = 4; }
      P.spend(20);
      return {};
    }
  };
  P.tit_anim_show = function () {
    const x = M[0x8A34], io = P.io;
    let a = (M[0x8A38 + x] + M[0x8A36]) & 255;
    M[0x63F8] = a; M[0x63F9] = (a + 1) & 255; M[0x63FA] = (a + 2) & 255; M[0x63FB] = (a + 3) & 255;
    P.spend(40);
    if (x === 2) {
      M[0x63FC] = (M[0x8A3C] + 0xCD) & 255;
      io.vicWrite(0x15, 0x1F); io.vicWrite(0x08, M[0x8A3D]); io.vicWrite(0x09, M[0x8A3E]);
      P.spend(30);
      return {};
    }
    io.vicWrite(0x15, 0x0F);
    return {};
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
