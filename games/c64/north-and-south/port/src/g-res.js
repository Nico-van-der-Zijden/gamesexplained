// The resident ($0800-$0BFF), what every part keeps: the script that loads each part and calls it,
// the loader's front end and its prompts. The script is the port's main program: it runs the
// title once, then for ever the menu, the year's text, the map and, when the war was fought to
// its end, the ending.
//
// The tape is not modelled: fast_load ($0A63) reads a file's pulses on a timer interrupt, and the
// port takes the file from P.io.file instead and leaves the loader's bytes as a good load leaves
// them (port/test/lib.js, loadEffect, holds the machine to the same). A load cannot fail, so the
// retry after a bad load ($0892) never runs.
(function (root) {
'use strict';
const G = root.NSGroups = root.NSGroups || {};
G.res = function (P) {
  const M = P.M;
  for (const n of ['res_script', 'res_load_file', 'res_load_by_number', 'res_rewind_prompt', 'res_wait_fire', 'res_year_text'])
    P.GEN.add(n);
  // the script's calls, where the game's program counter stands as each is made
  const CP = { title_load: 0x0808, title: 0x080B, menu_oc: 0x0818, menu_om: 0x081D, menu: 0x0820, clear1: 0x0823,
    year: 0x082C, m2: 0x0831, m1: 0x0836, m3: 0x083B, year_text: 0x083E, clear2: 0x0841, map: 0x0844, clear3: 0x0847,
    cs: 0x0851, ending: 0x0854, clear4: 0x0857, prompt: 0x085F };
  P.RES_CP = CP;
  P.CPS.res = Object.values(CP);
  const cp = function* (a) { yield { cp: a, cycles: P.take() }; };
  const FILE_ASKED = 0x08CB, NAMES = 0x08CC, SIDE = 0x08E8, TAPE = 0x08F6, STARTS = 0x0904;

  // The script ($0806), as a list of steps from the menu on, each at the address of its call.
  // o.from names the step to start at (a moment saved in the middle of the game), and o.resume
  // the port's generator that stands for the rest of that step (a part's main loop resumed).
  // P.enter(part) is called as each part is called, and again with the script's own name as it
  // returns: the tests follow which part's code is in memory with it.
  const load = n => function* () { yield* P.res_load_file({ a: typeof n === 'function' ? n() : n }); };
  const call = (part, f) => function* () { P.enter(part); yield* P[f](); P.enter('res'); };
  const clear = function* () { P.res_clear_screen(); };
  const STEPS = [
    ['menu_oc', load(0)], ['menu_om', load(1)], ['menu', call('men', 'men_menu_main')], ['clear1', clear],
    ['year', load(() => (M[0x0389] + 9) & 255)], ['m2', load(3)], ['m1', load(2)], ['m3', load(4)],
    ['year_text', function* () { yield* P.res_year_text(); }], ['clear2', clear], ['map', call('map', 'map_map_main')],
    ['clear3', clear],
  ];
  const ENDING = [['cs', load(13)], ['ending', call('end', 'end_ending_main')], ['clear4', clear]];
  P.res_script = function* (o = {}) {
    let from = o.from || null, resume = o.resume || null;
    if (!from) {
      yield* cp(CP.title_load);
      yield* P.res_load_file({ a: 7 });
      yield* cp(CP.title);
      yield* call('tit', 'tit_title_main')();
      from = 'after_title';
    }
    if (from === 'after_title') { M[0x037F] = 0; P.spend(14); from = 'menu_oc'; }
    const step = function* (name, f) {
      if (from && from !== name) return;
      if (from && resume) { from = null; const g = resume; resume = null; yield* g; return; }
      from = null;
      yield* cp(CP[name]);
      yield* f();
    };
    for (;;) {
      P.spend(4);
      for (const [name, f] of STEPS) yield* step(name, f);
      P.spend(6);
      if (from ? ENDING.some(([n]) => n === from) : M[0x039B] === 0) for (const [name, f] of ENDING) yield* step(name, f);
      if (from && from !== 'prompt') throw new Error('res_script: no step ' + from);
      if (!from) M[FILE_ASKED] = 0;
      P.spend(8);
      yield* step('prompt', function* () { yield* P.res_rewind_prompt(); });
      P.spend(5);
    }
  };
  P.enter = (part) => { const prev = P.part; P.part = part; if (P.onEnter) P.onEnter(part, prev); return prev; };
  P.part = 'res';

  // load_file ($0803), a jmp to load_by_number: A the file's number
  P.res_load_file = function* (r) { P.spend(3); return yield* P.res_load_by_number(r); };
  // load_by_number ($0865): the file's number in $08CB, the machine quietened, the rewind prompt
  // first when the file is the first its side gives, the name pointed at, and the load
  P.res_load_by_number = function* (r) {
    M[FILE_ASKED] = r.a;
    P.spend(4);
    for (;;) {
      P.res_quiet_machine();
      // Y is the file's number, or the side the prompt showed
      let y = M[FILE_ASKED];
      P.spend(12);
      if (M[STARTS + y]) { yield* P.res_rewind_prompt(); y = M[SIDE + M[FILE_ASKED]]; }
      const x = (M[FILE_ASKED] << 1) & 255;
      M[0xBB] = M[NAMES + x]; M[0xBC] = M[NAMES + 1 + x]; M[0xB7] = 2;
      P.spend(28);
      const p = M[0xBB] | M[0xBC] << 8;
      if (!P.io.file(String.fromCharCode(M[p], M[p + 1]))) {
        // no file on the tapes has the name: the loader waits at $0AA4 for ever (Discoveries)
        M[0x93] = 0x41; M[0x0B8E] = x; M[0x0B90] = y; M[0x0AEC] = 0; M[0xFFFE] = 0xCB; M[0xFFFF] = 0x0A; M[0x90] = 0;
        M[1] = ((M[1] & 0xDC) | 1) & 255;
        P.spend(60);
        for (;;) { P.spend(8); yield; }
      }
      const out = P.res_fast_load({ a: 0x41, x, y });
      if (!out.c) { P.spend(6); return out; }
      yield* P.res_rewind_prompt();
    }
  };
  // quiet_machine ($0898): interrupts off, the KERNAL in, both CIAs' interrupts and timers stopped
  // and acknowledged, border and background black, sprites off, the raster interrupt off and
  // acknowledged; interrupts on again
  P.res_quiet_machine = function () {
    const io = P.io;
    M[1] = 0x37;
    io.ciaWrite(0x0D, 0x7F); io.cia2Write(0x0D, 0x7F);
    io.ciaWrite(0x0E, 0x00); io.cia2Write(0x0E, 0x00);
    io.cia2Read(0x0D); io.ciaRead(0x0D);
    io.vicWrite(0x20, 0); io.vicWrite(0x21, 0); io.vicWrite(0x15, 0);
    io.vicWrite(0x1A, 0);
    io.vicWrite(0x19, io.vicRead(0x19));
    P.spend(66);
    return {};
  };
  // fast_load ($0A63), with the tape stood in for: the file named at ($BB) put where its header
  // says, the loader's bytes as a good load leaves them (port/test/lib.js, loadEffect)
  P.res_fast_load = function (r) {
    const p = M[0xBB] | M[0xBC] << 8;
    const name = String.fromCharCode(M[p], M[p + 1]);
    const f = P.io.file(name);
    if (!f) throw new Error('fast_load: no file ' + JSON.stringify(name));
    const port = (((M[1] & 0xDC) | 1) | 0x20) & 255;
    M[0xC0] = port;
    const end = (f.addr + f.bytes.length) & 0xFFFF;
    M.set(f.bytes, f.addr);
    M[0x93] = r.a; M[0x0B8E] = r.x & 255; M[0x0B90] = r.y & 255;
    M[0x0AEC] = 0x16; M[0x0B1A] = 0x1B;
    M[0x90] = 0xFD; M[0x95] = 0x01; M[0x9B] = 0x00; M[0x9C] = 0x00;
    M[0xAC] = end & 255; M[0xAD] = end >> 8; M[0xAE] = 0; M[0xAF] = 0; M[0xB0] = 0x54; M[0xB1] = 0x01;
    M[0xFFFE] = 0xCB; M[0xFFFF] = 0x0A;
    M[1] = port;
    P.spend(20000);
    if (P.onLoad) P.onLoad(name, f);
    return { a: 0xFD, x: end & 255, y: end >> 8, c: 0, z: 0, n: 1 };
  };
  // rewind_prompt ($092E): "REWIND TAPE t SIDE s, HIT FIRE THEN PLAY" on the bottom row in white,
  // the cassette's motor on, fire waited for, the screen blanked for the load
  P.res_rewind_prompt = function* () {
    P.res_quiet_machine();
    P.res_text_mode();
    const x = M[FILE_ASKED];
    M[0x0994] = (M[SIDE + x] + 0x30) & 255;
    M[0x098D] = (M[TAPE + x] + 0x30) & 255;
    for (let i = 0x27; i >= 0; i--) { M[0x07C0 + i] = M[0x0981 + i]; P.io.colourWrite(0x3C0 + i, 1); }
    M[1] = M[1] & 0xDF;
    P.spend(40 + 40 * 21);
    yield* P.res_wait_fire();
    P.io.vicWrite(0x11, P.io.vicRead(0x11) & 0xEF);
    P.spend(16);
    return {};
  };
  // wait_fire ($096C): fire on either stick (or a key on the same line) waited for, with port A
  // an output
  P.res_wait_fire = function* () {
    const io = P.io;
    io.ciaWrite(0x03, 0x00); io.ciaWrite(0x02, 0xFF);
    P.spend(12);
    for (;;) {
      const a = io.ciaRead(0x00) & io.ciaRead(0x01) & 0x10;
      P.spend(14);
      if (!a) break;
      yield;
    }
    P.spend(6);
    return { a: 0, z: 1 };
  };
  // clear_screen ($09A9): spaces at $0400-$07FF and black colour RAM, then text_mode
  P.res_clear_screen = function () {
    for (let i = 0; i < 0x400; i++) { P.io.colourWrite(i, 0); M[0x0400 + i] = 0x20; }
    P.spend(256 * 47);
    return P.res_text_mode();
  };
  // text_mode ($09CA): video bank 0, the screen at $0400 and the ROM's upper-case characters,
  // screen on, 25 rows, 40 columns, no scroll
  P.res_text_mode = function () {
    const io = P.io;
    io.cia2Write(0x02, io.cia2Read(0x02) | 0x03);
    io.cia2Write(0x00, (io.cia2Read(0x00) & 0xFC) | 0x03);
    io.vicWrite(0x18, 0x14); io.vicWrite(0x11, 0x98); io.vicWrite(0x16, 0x08);
    P.spend(40);
    return { a: 0x08 };
  };
  // year_text ($09EC): the year file's text at $0400 shown in the ROM's lower- and upper-case
  // characters, red but for the last page, until fire
  P.res_year_text = function* () {
    for (let x = 0; x < 256; x++) {
      P.io.colourWrite(x, 2); P.io.colourWrite(0x100 + x, 2); P.io.colourWrite(0x200 + x, 2); P.io.colourWrite(0x300 + x, 0);
    }
    const io = P.io;
    io.vicWrite(0x20, 0); io.vicWrite(0x21, 0); io.vicWrite(0x11, 0x98); io.vicWrite(0x18, 0x16);
    P.spend(256 * 27 + 24);
    yield* P.res_wait_fire();
    return {};
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
