// The ending (file CS, $2800-$AFFF), called by the script once the war is won: the winner's
// screen, a picture under a scrolling message with the winner's rank and the war's months in it,
// and then the loser's, or only the person's screen when one person played the computer. Its
// tune's driver ($3000) is the game's own code run on the kit's 6502 (P.run6502), as the title's.
(function (root) {
'use strict';
const G = root.NSGroups = root.NSGroups || {};
G.end = function (P) {
  const M = P.M, S = root.NSSyms.end, R = root.NSSyms.res;
  for (const n of ['end_ending_main', 'end_victory_screen', 'end_defeat_screen', 'end_ending_wait', 'end_ending_irq_on']) P.GEN.add(n);
  const TIMER = S.ending_timer, STEPS = S.ending_steps, DONE = S.message_done, FADE = S.end_music_fade;
  P.PASS.end = 0x815D;
  P.CPS.end = [0x815D];
  P.IRQS.end = { 0x8380: 'end_ending_irq_text', 0x83CF: 'end_ending_irq_picture' };
  P.IRQ_BYTES.end = [TIMER, STEPS, DONE];
  const cp = function* (a) { yield { cp: a, cycles: P.take() }; };

  // ending_main ($8000): the months into the four messages; one person against the computer sees
  // only their own screen, otherwise the victory and then the defeat
  P.end_ending_main = function* (r = {}) {
    const both = () => { const cu = M[R.cpu_union], cc = M[R.cpu_confed]; return !((cu | cc) && !(cu & cc)); };
    if (r.resume) {
      const victory = M[S.ending_screen_no] === 0;
      yield* P.end_ending_wait();
      if (victory && both()) return yield* P.end_defeat_screen();
      return {};
    }
    P.end_ending_machine();
    const t = M[R.months_tens] ? (M[R.months_tens] + 0x30) & 255 : 0x20;
    const u = (M[R.months_units] + 0x30) & 255;
    for (const a of [S.a_85DD, S.a_84C5, S.a_856D, S.a_8679]) M[a] = t;
    for (const a of [S.a_85DE, S.a_84C6, S.a_856E, S.a_867A]) M[a] = u;
    P.spend(80);
    const cu = M[R.cpu_union], cc = M[R.cpu_confed];
    if ((cu | cc) && !(cu & cc)) {
      P.spend(8);
      if (cu === M[R.winner]) return yield* P.end_victory_screen();
      return yield* P.end_defeat_screen();
    }
    yield* P.end_victory_screen();
    return yield* P.end_defeat_screen();
  };
  // the rank's ten characters through the operand of the lda $FFFF,x at op
  const rank = (op, y, dsts) => {
    const x = (M[R.level + y] << 1) & 255;
    M[op] = M[S.rank_words + x]; M[op + 1] = M[S.f_86C1 + x];
    const src = M[op] | M[op + 1] << 8;
    for (let i = 9; i >= 0; i--) for (const d of dsts) M[d + i] = M[(src + i) & 0xFFFF];
    P.spend(40 + 10 * 20);
  };
  const ptr10 = a => { M[0x10] = a & 255; M[0x11] = a >> 8; P.spend(10); };
  // victory_screen ($8050)
  P.end_victory_screen = function* () {
    for (let x = 0; x < 256; x++) {
      P.io.colourWrite(x, M[S.victory_colours + x]); P.io.colourWrite(0x100 + x, M[S.victory_colours_87e4 + x]);
      P.io.colourWrite(0x200 + x, M[S.victory_colours_88e4 + x]); P.io.colourWrite(0x300 + x, M[S.victory_colours_89e4 + x]);
    }
    P.spend(256 * 43);
    P.io.vicWrite(0x21, 0); P.io.vicWrite(0x20, 0);
    P.run6502(0x3000, { a: 0 });
    M[S.ending_screen_no] = 0; M[DONE] = 0;
    const y = M[R.winner];
    ptr10(y ? 0x850E : 0x858A);
    rank(0x80AE, y, [S.f_8594, S.f_8514]);
    yield* P.end_ending_irq_on();
    return yield* P.end_ending_wait();
  };
  // defeat_screen ($80BF): the picture's bitmap copied a page at a time through the operands
  // of the lda and sta at $80F8, which are left where the copy ends
  P.end_defeat_screen = function* () {
    for (let x = 0; x < 256; x++) {
      M[0x6000 + x] = M[0x2800 + x]; M[0x6100 + x] = M[0x2900 + x]; M[0x6200 + x] = M[0x2A00 + x]; M[0x6300 + x] = M[0x2B00 + x];
      P.io.colourWrite(x, M[0x2C00 + x]); P.io.colourWrite(0x100 + x, M[0x2D00 + x]);
      P.io.colourWrite(0x200 + x, M[0x2E00 + x]); P.io.colourWrite(0x300 + x, M[0x2F00 + x]);
    }
    P.spend(256 * 75);
    for (let n = 0; n < 0x20; n++) {
      const s = (M[0x80F9] | M[0x80FA] << 8), d = (M[0x80FC] | M[0x80FD] << 8);
      for (let x = 0; x < 256; x++) M[(d + x) & 0xFFFF] = M[(s + x) & 0xFFFF];
      M[0x80FA] = (M[0x80FA] + 1) & 255; M[0x80FD] = (M[0x80FD] + 1) & 255;
      P.spend(256 * 16 + 20);
    }
    P.io.vicWrite(0x21, 0); P.io.vicWrite(0x20, 0);
    M[DONE] = 0;
    P.run6502(0x3000, { a: 1 });
    M[S.ending_screen_no] = 1;
    const y = M[R.winner];
    ptr10(y ? 0x847B : 0x862D);
    rank(0x814F, y ^ 1, [S.f_8487, S.f_8639]);
    yield* P.end_ending_irq_on();
    return yield* P.end_ending_wait();
  };
  // ending_wait ($815D): space or fire starts the end, the music fading over three steps of 100
  // frames; once the message has scrolled out the screen ends by itself
  P.end_ending_wait = function* () {
    for (;;) {
      yield* cp(0x815D);
      const k = P.end_ending_key_scan().a;
      M[S.ending_key] = k;
      P.spend(10);
      if (k === 0x20) break;
      P.end_ending_stick();
      P.spend(10);
      if (!M[S.estick_fire]) break;
      P.spend(4);
      if (!P.irqByte(DONE)) continue;
      P.spend(4);
      if (P.irqByte(TIMER)) continue;
      M[TIMER] = 0x64;
      const s = (P.irqByte(STEPS) - 1) & 255;
      M[STEPS] = s;
      P.spend(14);
      if (!s) return P.end_ending_exit();
    }
    M[FADE] = 0x14; M[STEPS] = 3; M[TIMER] = 0x64;
    P.spend(18);
    // a polling loop: its first read is the stretch's, later turns read what the interrupts the
    // lockstep runs at each yield leave
    let v = P.irqByte(TIMER);
    for (;;) {
      while (v) { P.spend(7); yield; v = M[TIMER]; }
      M[TIMER] = 0x64;
      M[STEPS] = (M[STEPS] - 1) & 255;
      P.spend(14);
      if (!M[STEPS]) break;
      v = M[TIMER];
    }
    return P.end_ending_exit();
  };
  // ending_exit ($8183)
  P.end_ending_exit = function () {
    const io = P.io;
    io.vicWrite(0x1A, 0);
    io.vicWrite(0x19, io.vicRead(0x19));
    io.vicWrite(0x11, io.vicRead(0x11) & 0xEF);
    P.spend(26);
    return {};
  };
  // ending_machine ($81BC)
  P.end_ending_machine = function () {
    const io = P.io;
    M[1] = 0x35;
    io.ciaWrite(0x0D, 0x7F); io.cia2Write(0x0D, 0x7F);
    io.ciaWrite(0x0E, 0); io.cia2Write(0x0E, 0); io.ciaWrite(0x0F, 0); io.cia2Write(0x0F, 0);
    io.ciaRead(0x0D); io.cia2Read(0x0D);
    io.cia2Write(0x02, io.cia2Read(0x02) | 0x03);
    io.cia2Write(0x00, (io.cia2Read(0x00) & 0xFC) | 0x02);
    io.vicWrite(0x20, 0); io.vicWrite(0x21, 0); io.vicWrite(0x15, 0);
    io.vicWrite(0x18, 0x80); io.vicWrite(0x11, 0x3B); io.vicWrite(0x16, 0x10);
    io.vicWrite(0x19, io.vicRead(0x19));
    io.vicWrite(0x1A, 0);
    io.vicWrite(0x22, 6); io.vicWrite(0x23, 6); io.vicWrite(0x24, 6);
    M[0xFFFA] = 0x40; M[0xFFFC] = 0x40; M[0xFFFB] = 0x82; M[0xFFFD] = 0x82;
    for (let s = 0; s < 5; s++) io.vicWrite(0x27 + s, 6);
    P.spend(170);
    return { a: 6 };
  };
  // ending_stick ($8241): the joystick in port 2
  P.end_ending_stick = function () {
    P.io.ciaWrite(0x02, 0);
    const a = P.io.ciaRead(0x00);
    P.spend(31);
    return P.end_ending_stick_decode({ a });
  };
  // ending_stick_decode ($8268)
  P.end_ending_stick_decode = function (r) {
    let a = r.a, x = 0, y = 0;
    if (!(a & 1)) y--;
    if (!(a & 2)) y++;
    if (!(a & 4)) x--;
    if (!(a & 8)) x++;
    a = (a >> 4) & 1;
    M[S.estick_fire] = a; M[S.estick_x] = x & 255; M[S.estick_y] = y & 255;
    P.spend(40);
    return { a, x: x & 255, y: y & 255 };
  };
  // ending_key_scan ($8288): the code of a key that is alone in its row; $FF for none
  P.end_ending_key_scan = function () {
    const io = P.io;
    io.ciaWrite(0x02, 0xFF); io.ciaWrite(0x03, 0x00);
    P.spend(14);
    let y = 0;
    for (let x = 7; x >= 0; x--) {
      M[0x19] = M[S.ekey_lo + x]; M[0x1A] = M[S.ekey_hi + x];
      io.ciaWrite(0x00, M[S.ekey_rows + x]);
      y = 7;
      const a = io.ciaRead(0x01);
      P.spend(30);
      if (a !== 0xFF) {
        for (; y >= 0; y--) {
          P.spend(9);
          if (a === M[S.ekey_rows + y]) { P.spend(12); return { a: M[((M[0x19] | M[0x1A] << 8) + y) & 0xFFFF], x, y }; }
        }
        y = 0xFF;
      }
      P.spend(5);
    }
    P.spend(8);
    return { a: 0xFF, x: 0xFF, y };
  };
  // ending_irq_on ($831D): the message row cleared, the raster handler at $8380 for line $F9,
  // set while the beam is in the upper part of the frame
  P.end_ending_irq_on = function* () {
    const io = P.io;
    P.end_message_clear();
    M[0xFFFE] = 0x80; M[0xFFFF] = 0x83;
    io.vicWrite(0x1A, 1); io.vicWrite(0x19, 1);
    P.spend(24);
    while (io.vicRead(0x11) & 0x80) { P.spend(9); yield; }
    io.vicWrite(0x11, io.vicRead(0x11) & 0x7F);
    io.vicWrite(0x12, 0xF9);
    io.ciaRead(0x0D); io.cia2Read(0x0D);
    P.spend(30);
    return { a: 0xF9 };
  };
  // ending_irq_text ($8380): the message row in text mode, the tune, the wait's timer
  P.end_ending_irq_text = function () {
    const io = P.io;
    io.vicWrite(0x18, 0x8E); io.vicWrite(0x11, 0x1F); io.vicWrite(0x16, M[S.message_fine]);
    io.vicWrite(0x21, M[S.ending_screen_no] ? 0x0E : 0x07);
    io.vicWrite(0x19, io.vicRead(0x19) & 1);
    io.vicWrite(0x12, 0x50);
    M[0xFFFE] = 0xCF; M[0xFFFF] = 0x83;
    P.spend(70);
    P.run6502(0x3003, {});
    if (M[TIMER]) M[TIMER]--;
    P.spend(30);
  };
  // ending_irq_picture ($83CF): the bitmap from line $50, and the message's scroll
  P.end_ending_irq_picture = function () {
    const io = P.io;
    io.vicWrite(0x11, 0x3F); io.vicWrite(0x16, 0x10); io.vicWrite(0x18, 0x80);
    io.vicWrite(0x19, io.vicRead(0x19) & 1);
    io.vicWrite(0x12, 0x0A);
    M[0xFFFE] = 0x80; M[0xFFFF] = 0x83;
    io.vicWrite(0x21, 0);
    P.spend(64);
    P.end_message_scroll();
    P.spend(30);
  };
  // message_clear ($8408)
  P.end_message_clear = function () {
    const c = M[S.message_colours + M[S.ending_screen_no]];
    for (let x = 0x27; x >= 0; x--) { M[0x6050 + x] = 0x20; P.io.colourWrite(0x50 + x, c); }
    P.spend(40 * 21);
    return { x: 0xFF, y: M[S.ending_screen_no] };
  };
  // message_scroll ($8420): two pixels a frame
  P.end_message_scroll = function () {
    const f = M[S.message_fine] - 2;
    M[S.message_fine] = f & 7;
    P.spend(16);
    if (f >= 0) return {};
    P.end_message_shift();
    P.spend(6);
    if (M[DONE]) return {};
    P.end_message_next();
    return {};
  };
  // message_shift ($843A)
  P.end_message_shift = function () {
    for (let x = 0; x < 0x27; x++) M[0x6050 + x] = M[0x6051 + x];
    P.spend(0x27 * 16);
    return { x: 0x27 };
  };
  // message_next ($8448)
  P.end_message_next = function () {
    const p = M[0x10] | M[0x11] << 8, c = M[p];
    P.spend(10);
    if (c !== 0xFF) {
      M[0x6077] = c;
      M[0x10] = (p + 1) & 255; M[0x11] = ((p + 1) >> 8) & 255;
      P.spend(24);
      return { y: 0 };
    }
    M[0x6077] = 0x20; M[DONE] = 1; M[TIMER] = 0x64; M[STEPS] = 3; M[FADE] = 0x14;
    P.spend(30);
    return { y: 0 };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
