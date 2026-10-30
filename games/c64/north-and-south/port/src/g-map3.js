// The strategic map, third part: the moves of a turn and what they lead to (joining armies,
// taking territories and towns, battles and forts, in arcade or strategic mode), the territories
// surrounded, the supply train and its interception, the gold and the new armies, the
// reinforcements and the losses. The 6502's chains of jumps from one move to the next (move_done
// to player_move or ai_move) are tail calls here.
(function (root) {
'use strict';
const G = root.NSGroups = root.NSGroups || {};
G.map3 = function (P) {
  const M = P.M, S = root.NSSyms.map, R = root.NSSyms.res;
  for (const n of `map_player_move map_resolve_move map_take_empty map_move_done map_take_owned map_take_town map_join_armies
    map_battle_move map_fort_attack map_fort_anim map_wait_25 map_army_lost map_battle_setup map_battle map_auto_battle
    map_reinforce map_army_hit map_supply map_supply_end map_supply_again map_intercept_check map_count_gold map_new_army
    map_ai_new_army`.split(/\s+/)) P.GEN.add(n);
  const sound = a => P.map_play_sound({ a });
  const side = () => M[S.side_to_play];
  const units = (x, y) => {                         // territory x's army takes territory y's units
    M[S.army_infantry + x] = M[S.army_infantry + y]; M[S.army_cavalry + x] = M[S.army_cavalry + y]; M[S.army_cannon + x] = M[S.army_cannon + y];
  };
  const zero = x => { M[S.army_infantry + x] = 0; M[S.army_cavalry + x] = 0; M[S.army_cannon + x] = 0; };
  const fromSide = (x, y) => {                      // territory x's army takes the battle's units of side y
    M[S.army_infantry + x] = M[R.units_inf + y]; M[S.army_cavalry + x] = M[R.units_cav + y]; M[S.army_cannon + x] = M[R.units_cannon + y];
  };
  const TOWN = new Set([0x03, 0x08, 0x0C, 0x13, 0x17]);
  const ptr = a => M[a] | M[a + 1] << 8;
  // a list's entry y taken out, the ones after it moved up (to entry n)
  const dropFrom = (list, i, n) => { for (; i !== n; i++) M[list + i] = M[list + i + 1]; P.spend(16 * (n - i)); };

  // player_move ($2B26): a person's move
  P.map_player_move = function* () {
    for (;;) {
      M[S.figure_side] = side();
      M[S.choose_list] = 0x6A; M[S.choose_list_hi] = 0x0E;
      P.spend(20);
      for (;;) {
        yield* P.map_choose_place();
        if (M[S.cursor_target] === 0x1A) { sound(0x18); return {}; }
        P.spend(8);
        if (P.map_in_list().z) break;
      }
      const t = M[S.cursor_target];
      M[S.move_from] = t; M[S.march_from] = t;
      const i = (t << 1) & 255;
      M[0x2B67] = M[S.neighbours + i]; M[0x2B68] = M[S.neighbours_c189 + i];
      const list = ptr(0x2B67);
      let x = 0, y = 0, a;
      P.spend(40);
      for (;;) {
        a = M[(list + x) & 0xFFFF];
        if (a & 0x80) break;
        if (!P.map_too_big({ a, x, y }).c) { M[S.may_enter + y] = a; y = (y + 1) & 255; }
        x = (x + 1) & 255;
        P.spend(20);
      }
      M[S.may_enter + y] = a;
      M[S.choose_list] = 0x87; M[S.choose_list_hi] = 0x0E;
      P.spend(20);
      yield* P.map_choose_place();
      if (M[S.cursor_target] === 0x1A) { sound(0x18); return {}; }
      P.spend(8);
      if (!P.map_in_list().z) continue;
      M[S.move_to] = M[S.cursor_target]; M[S.march_to] = M[S.cursor_target];
      P.spend(14);
      return yield* P.map_resolve_move({ a: M[S.cursor_target] });
    }
  };
  // resolve_move ($2BA3): the army from move_from into territory A
  P.map_resolve_move = function* (r) {
    const x = r.a;
    P.spend(14);
    if (!(M[S.army_side + x] & 0x80)) return yield* P.map_join_armies({ a: M[S.army_side + x] });
    if (M[S.territory_owner + x] & 0x80) return yield* P.map_take_empty();
    return yield* P.map_take_owned({ a: M[S.territory_owner + x] });
  };
  P.map_take_empty = function* () {
    const x = M[S.move_from];
    M[S.army_side + x] = 0xFF;
    yield* P.map_move_army_figure();
    const y = M[S.move_to];
    M[S.army_side + y] = side(); M[S.territory_owner + x] = side();
    units(y, x); zero(x);
    P.spend(80);
    return yield* P.map_move_done();
  };
  // move_done ($2BE8): the army that moved off the list; the next move
  P.map_move_done = function* () {
    let x = 0;
    for (;;) {
      const a = M[S.may_move + x];
      P.spend(14);
      if (a & 0x80) return {};
      if (a === M[S.move_from]) break;
      x++;
    }
    dropFrom(S.may_move, x, 0x18);
    P.spend(6);
    if (M[S.may_move] & 0x80) return {};
    return yield* nextMove();
  };
  // j_2C08: the surrounded territories, then the next move by the computer or the person
  const nextMove = function* () {
    P.map_surround();
    P.spend(14);
    if (M[R.cpu_union + side()]) return yield* P.map_ai_move();
    return yield* P.map_player_move();
  };
  P.map_take_owned = function* (r) {
    P.spend(8);
    if (r.a === side() || !TOWN.has(M[S.move_to])) {
      const x = M[S.move_from];
      M[S.army_side + x] = 0xFF;
      yield* P.map_move_army_figure();
      const y = M[S.move_to];
      M[S.army_side + y] = side(); M[S.territory_owner + y] = 0xFF;
      return yield* tookOver(x, y);
    }
    return yield* P.map_take_town();
  };
  // j_2C38: the old territory left to the side, the army's units moved over
  const tookOver = function* (x, y) {
    M[S.territory_owner + x] = side();
    units(y, x); zero(x);
    P.spend(70);
    return yield* P.map_move_done();
  };
  P.map_take_town = function* () {
    let x = M[S.move_from];
    M[S.army_side + x] = 0xFF;
    yield* P.map_move_army_figure();
    const y = M[S.move_to];
    M[S.army_side + y] = side(); M[S.territory_owner + y] = 0xFF;
    P.spend(30);
    if (!(yield* P.map_fort_attack()).c) return yield* tookOver(M[S.move_from], M[S.move_to]);
    return yield* fortLost();
  };
  // b_2C9C: the fort lost: the army marches back, the town the enemy's again
  const fortLost = function* () {
    M[S.figure_side] = side();
    const a = M[S.march_to], x0 = M[S.march_from];
    M[S.march_from] = a; M[S.march_to] = x0;
    const y = M[S.move_to];
    M[S.army_side + y] = 0xFF;
    P.spend(40);
    yield* P.map_move_army_figure();
    const x = M[S.move_from];
    M[S.army_side + x] = side();
    M[S.territory_owner + y] = side() ^ 1;
    M[S.territory_owner + x] = 0xFF;
    P.spend(30);
    return yield* P.map_move_done();
  };
  P.map_join_armies = function* (r) {
    P.spend(8);
    if (r.a !== side()) return yield* P.map_battle_move();
    const y = M[S.move_to], x = M[S.move_from];
    const ji = M[S.army_infantry + x] + M[S.army_infantry + y];
    M[S.join_infantry] = ji & 255;
    let big = (ji & 255) >= 0x13;
    if (!big) {
      const jc = M[S.army_cavalry + x] + M[S.army_cavalry + y];
      M[S.join_cavalry] = jc & 255;
      big = (jc & 255) >= 0x0A;
      if (!big) {
        const jn = M[S.army_cannon + x] + M[S.army_cannon + y];
        M[S.join_cannon] = jn & 255;
        big = (jn & 255) >= 0x04;
      }
    }
    P.spend(50);
    if (big) {
      P.spend(10);
      if (M[R.cpu_union + side()]) return yield* P.map_move_done();
      return yield* nextMove();
    }
    M[S.army_side + x] = 0xFF;
    yield* P.map_move_army_figure();
    M[S.army_infantry + y] = M[S.join_infantry]; M[S.army_cavalry + y] = M[S.join_cavalry]; M[S.army_cannon + y] = M[S.join_cannon];
    zero(x);
    M[S.territory_owner + x] = side();
    P.spend(60);
    for (let i = 0; ; i++) {
      const a = M[S.may_move + i];
      P.spend(14);
      if (a & 0x80) break;
      if (a === M[S.move_to]) { dropFrom(S.may_move, i, 0x19); break; }
    }
    return yield* P.map_move_done();
  };
  // too_big ($2D5B): carry set when the moving army and side's army in territory A would be too
  // big together; A, X and Y kept in the operands of the loads at $2D9F
  P.map_too_big = function (r) {
    M[0x2DA0] = r.x & 255; M[0x2DA2] = r.y & 255; M[0x2DA4] = r.a & 255;
    const x = M[S.march_from], y = r.a;
    let c = 0;
    P.spend(30);
    if (M[S.army_side + y] === side()) {
      if (((M[S.army_infantry + x] + M[S.army_infantry + y]) & 255) >= 0x13) c = 1;
      else if (((M[S.army_cavalry + x] + M[S.army_cavalry + y]) & 255) >= 0x0A) c = 1;
      else if (((M[S.army_cannon + x] + M[S.army_cannon + y]) & 255) >= 0x04) c = 1;
      P.spend(40);
    }
    return { a: M[0x2DA4], x: M[0x2DA0], y: M[0x2DA2], c };
  };
  P.map_battle_move = function* () {
    yield* P.map_battle_setup();
    yield* P.map_wait_25();
    yield* P.map_battle_panel({ a: side() });
    yield* P.map_wait_25();
    yield* P.map_battle();
    return yield* P.map_move_done();
  };
  // fort_attack ($2DBB): carry clear when the attacker has won
  P.map_fort_attack = function* () {
    yield* P.map_wait_25();
    M[S.panel_busy] = 1;
    P.map_panel_fort();
    sound(0x10);
    yield* P.map_fort_anim();
    P.map_panel_restore();
    M[S.panel_busy] = 0;
    yield* P.map_wait_25();
    P.spend(10);
    if (M[R.opt_arcade]) {
      M[R.attacker] = side();
      yield* P.map_fort_sequence();
      yield* P.map_map_restore();
      return { c: M[R.arcade_result] ? 0 : 1 };
    }
    return { c: odds(M[R.level + (side() ^ 1)]) ? 0 : 1 };
  };
  // the strategic odds: true with a random number from $7F up against level 0, $55 against 1,
  // $3F against 2
  const odds = level => {
    const t = level === 0 ? 0x7F : level === 1 ? 0x55 : 0x3F;
    P.spend(20);
    return P.map_map_rnd().a >= t;
  };
  // list_armies ($2E20): side A's armies that may move, but the one under the storm cloud; the
  // side kept in the operand of the lda at $2E36
  P.map_list_armies = function (r) {
    M[0x2E37] = r.a;
    let y = 0;
    for (let x = 0x19; x >= 0; x--) {
      P.spend(10);
      if (M[0x2E37] !== M[S.army_side + x]) continue;
      if (x !== M[S.cloud_territory]) { M[S.may_move + y] = x; y = (y + 1) & 255; }
      P.spend(14);
    }
    return { a: M[0x2E37], x: 0xFF, y };
  };
  P.map_list_clear_moves = function () { for (let y = 0x19; y >= 0; y--) M[S.may_move + y] = 0xFF; P.spend(26 * 9); return { a: 0xFF, y: 0xFF }; };
  // in_list ($2E47): Z set when the cursor's point is in the list (through the operand at $2E56)
  P.map_in_list = function () {
    M[0x2E56] = M[S.choose_list]; M[0x2E57] = M[S.choose_list_hi];
    const list = ptr(0x2E56);
    P.spend(20);
    for (let x = 0; ; x = (x + 1) & 255) {
      const a = M[(list + x) & 0xFFFF];
      P.spend(14);
      if (a & 0x80) return { a, x, z: 0 };
      if (a === M[S.cursor_target]) return { a, x, z: 1 };
    }
  };
  P.map_fort_anim = function* () {
    M[S.fort_anim_left] = 0x23;
    do {
      M[S.anim_frames] = 0x0A;
      P.spend(6);
      yield* P.mapWaitZero(S.anim_frames);
      const a = ((((M[S.army_side + M[S.move_to]] ^ 1) << 1) & 255) + M[S.fort_anim_phase]) & 255;
      P.spend(24);
      P.map_panel_fort_step({ a });
      M[S.fort_anim_phase] ^= 1;
      M[S.fort_anim_left] = (M[S.fort_anim_left] - 1) & 255;
    } while (M[S.fort_anim_left]);
    return {};
  };
  P.map_wait_25 = function* () {
    M[S.frame_wait] = 0x19;
    P.spend(6);
    yield* P.mapWaitZero(S.frame_wait);
    return {};
  };
  P.map_army_lost = function* () {
    sound(0x13);
    do { yield* P.map_wait_25(); M[S.figure_frame]++; P.spend(12); } while (M[S.figure_frame] !== 3);
    M[S.figure_frame] = 0; M[S.march_on] = 0;
    return yield* P.map_check_win();
  };
  // battle_setup ($2EBF): the battle's sides, and the attacker's allies next to it; its working
  // values in the operands at $2F09 (the defender), $2FB3 (the count of totals too big) and $300C
  // (the place in the list of neighbours)
  P.map_battle_setup = function* () {
    let x = M[S.move_to];
    const d = side() ^ 1;
    M[0x2F09] = d;
    M[R.units_inf + d] = M[S.army_infantry + x]; M[R.units_cav + d] = M[S.army_cavalry + x]; M[R.units_cannon + d] = M[S.army_cannon + x];
    let i = (M[S.move_to] << 1) & 255;
    M[0x2EF1] = M[S.neighbours + i]; M[0x2EF2] = M[S.neighbours_c189 + i];
    let list = ptr(0x2EF1), a;
    P.spend(60);
    for (x = 0; ; x = (x + 1) & 255) {
      a = M[(list + x) & 0xFFFF];
      P.spend(16);
      if (a & 0x80) { a = 0xFF; break; }
      if (M[S.territory_owner + a] === M[0x2F09]) break;
    }
    M[R.retreat_to + M[0x2F09]] = a;
    let y = side();
    M[R.retreat_to + y] = M[S.move_from];
    x = M[S.move_from];
    M[R.units_inf + y] = M[S.army_infantry + x]; M[R.units_cav + y] = M[S.army_cavalry + x]; M[R.units_cannon + y] = M[S.army_cannon + x];
    M[S.army_side + x] = 0xFF;
    P.spend(60);
    yield* P.map_move_army_figure();
    y = M[S.move_to];
    M[S.army_side + y] = side(); M[S.territory_owner + y] = 0xFF; M[S.territory_owner + x] = side();
    i = (y << 1) & 255;
    M[0x32] = M[S.neighbours + i]; M[0x33] = M[S.neighbours_c189 + i];
    P.spend(40);
    for (let k = 0; ; k = (M[0x300C] + 1) & 255) {
      M[0x300C] = k;
      a = M[(ptr(0x32) + k) & 0xFFFF];
      P.spend(16);
      if (a & 0x80) return {};
      M[S.ally_territory] = a;
      x = a;
      const sd = M[S.army_side + x];
      if ((sd & 0x80) || sd !== side()) continue;
      M[0x2FB3] = 0;
      let found = false;
      for (let j = 0; ; j++) {
        const v = M[S.may_move + j];
        P.spend(14);
        if (v & 0x80) break;
        if (v === M[S.ally_territory]) { found = true; break; }
      }
      if (!found) continue;
      y = side();
      if (((M[S.army_infantry + x] + M[R.units_inf + y]) & 255) >= 0x13) M[0x2FB3]++;
      if (((M[S.army_cavalry + x] + M[R.units_cav + y]) & 255) >= 0x0A) M[0x2FB3]++;
      if (((M[S.army_cannon + x] + M[R.units_cannon + y]) & 255) >= 0x04) M[0x2FB3]++;
      P.spend(60);
      if (M[0x2FB3]) continue;
      M[R.units_inf + y] = (M[S.army_infantry + x] + M[R.units_inf + y]) & 255;
      M[R.units_cav + y] = (M[S.army_cavalry + x] + M[R.units_cav + y]) & 255;
      M[R.units_cannon + y] = (M[S.army_cannon + x] + M[R.units_cannon + y]) & 255;
      zero(x);
      M[S.army_side + x] = 0xFF;
      M[S.march_from] = x;
      P.spend(80);
      yield* P.map_move_army_figure();
      M[S.territory_owner + x] = side();
      for (let j = 0; ; j++) {
        const v = M[S.may_move + j];
        P.spend(14);
        if (v & 0x80) break;
        if (v === M[S.march_from]) { dropFrom(S.may_move, j, 0x19); break; }
      }
    }
  };
  // battle ($3011): the battle fought, in arcade or strategic mode, and its outcome
  P.map_battle = function* () {
    M[R.fell_back] = 0; M[R.fell_back + 1] = 0; M[R.side_out] = 0; M[R.side_out + 1] = 0;
    P.spend(20);
    let over;
    if (M[R.opt_arcade]) {
      yield* P.map_battle_sequence();
      yield* P.map_map_restore();
      const s0 = (M[R.units_inf] + M[R.units_cav] + M[R.units_cannon]) & 255;
      const s1 = (M[R.units_inf + 1] + M[R.units_cav + 1] + M[R.units_cannon + 1]) & 255;
      over = !s0 || !s1;
      P.spend(40);
    } else {
      P.map_auto_battle();
      over = !!M[S.battle_over];
    }
    P.spend(10);
    if (over) {
      if (M[R.side_out + side()]) return yield* attackerLost();
      return yield* defenderLost();
    }
    if (M[R.fell_back + side()]) return yield* attackerFellBack();
    return yield* defenderFellBack();
  };
  P.GEN.delete('map_auto_battle');
  // b_3066: the attacker falls back to its own territory, the defender stays
  const attackerFellBack = function* () {
    let x = M[S.move_from], y = side();
    fromSide(x, y);
    M[S.figure_side] = y;
    M[S.march_to] = x;
    x = M[S.move_to]; y = side() ^ 1;
    fromSide(x, y);
    M[S.army_side + x] = y; M[S.territory_owner + x] = 0xFF;
    M[S.march_from] = x;
    P.spend(90);
    yield* P.map_move_army_figure();
    x = M[S.move_from];
    M[S.army_side + x] = side(); M[S.territory_owner + x] = 0xFF;
    P.spend(20);
    return yield* P.map_move_done();
  };
  // j_30C0: the defender falls back to its territory ($0390), the attacker holds the battle's
  // (and fights the fort of a town)
  const defenderFellBack = function* () {
    const d = side() ^ 1;
    M[S.figure_side] = d;
    let x = M[R.retreat_to + d];
    fromSide(x, d);
    M[S.march_to] = x;
    x = M[S.move_to];
    M[S.march_from] = x;
    fromSide(x, side());
    M[S.army_side + x] = side(); M[S.territory_owner + x] = 0xFF;
    P.spend(90);
    yield* P.map_move_army_figure();
    x = M[S.march_to];
    M[S.army_side + x] = M[S.figure_side]; M[S.territory_owner + x] = 0xFF;
    P.spend(30);
    if (TOWN.has(M[S.move_to]) && (yield* P.map_fort_attack()).c) return yield* fortRetreat();
    return yield* P.map_move_done();
  };
  // b_3136: the fort after a battle lost: the attacker back where it came from
  const fortRetreat = function* () {
    M[S.figure_side] = side();
    M[S.march_from] = M[S.move_to];
    M[S.march_to] = M[S.move_from];
    const y = M[S.move_to];
    M[S.army_side + y] = 0xFF;
    P.spend(30);
    yield* P.map_move_army_figure();
    const x = M[S.move_from];
    M[S.army_side + x] = side(); M[S.territory_owner + x] = 0xFF;
    M[S.territory_owner + y] = side() ^ 1;
    units(x, y);
    P.spend(70);
    return yield* P.map_move_done();
  };
  // j_317E: the defender wiped out; the attacker holds the territory
  const defenderLost = function* () {
    zero(M[S.move_from]);
    const x = M[S.move_to], y = side();
    fromSide(x, y);
    M[S.army_side + x] = y; M[S.territory_owner + x] = 0xFF;
    M[S.figure_side] = y ^ 1;
    M[S.march_on]++;
    P.spend(80);
    yield* P.map_army_lost();
    if (TOWN.has(M[S.move_to]) && (yield* P.map_fort_attack()).c) return yield* fortRetreat();
    return yield* P.map_move_done();
  };
  // j_31DB: the attacker wiped out
  const attackerLost = function* () {
    zero(M[S.move_from]);
    const x = M[S.move_to], y = side() ^ 1;
    fromSide(x, y);
    M[S.army_side + x] = y; M[S.territory_owner + x] = 0xFF;
    M[S.figure_side] = y ^ 1;
    M[S.march_on]++;
    P.spend(80);
    yield* P.map_army_lost();
    return yield* P.map_move_done();
  };
  // auto_battle ($321C): rounds until a side has nothing left or falls back
  P.map_auto_battle = function () {
    M[S.battle_over] = 0;
    for (;;) {
      if (P.map_battle_round({ a: side() }).up) return {};
      if (M[S.battle_over]) { M[R.side_out + side()] = 0xFF; return {}; }
      if (P.map_battle_round({ a: side() ^ 1 }).up) return {};
      if (M[S.battle_over]) { M[R.side_out + (side() ^ 1)] = 0xFF; return {}; }
      P.spend(30);
    }
  };
  // battle_round ($3251): side A's units under fire; up when the side falls back (its two pla
  // leave auto_battle at once)
  P.map_battle_round = function (r) {
    const y = r.a;
    for (const k of [R.units_inf, R.units_cav, R.units_cannon]) {
      P.spend(8);
      if (M[k + y] && P.map_hit_chance({ y }).c) M[k + y] = (M[k + y] - 1) & 255;
    }
    const t = (M[R.units_inf + y] + M[R.units_cav + y] + M[R.units_cannon + y]) & 255;
    P.spend(20);
    if (!t) { M[S.battle_over]++; return { y }; }
    if (t >= 3) return { y };
    if (P.map_map_rnd().a < 0xC8) return { y };
    M[R.fell_back + y] = 1;
    return { y, up: true };
  };
  P.map_hit_chance = function (r) {
    const x = r.y ^ 1, l = M[R.level + x];
    const t = l === 0 ? 0x3F : l === 1 ? 0x55 : 0x7F;
    P.spend(20);
    const a = P.map_map_rnd().a;
    return { a, x, y: r.y, c: a >= t ? 1 : 0 };
  };
  // surround ($32CF): an enemy's territory with no army and no town, all of whose neighbours hold
  // the side's armies, becomes the side's; the territory kept in the operand of the ldx at $3314
  P.map_surround = function () {
    for (let x = 0x19; x >= 0; x--) {
      P.spend(18);
      if (M[S.towns + x] || !(M[S.army_side + x] & 0x80)) continue;
      const o = M[S.territory_owner + x];
      if ((o & 0x80) || o === side()) continue;
      const i = (x << 1) & 255;
      M[0x32FA] = M[S.neighbours + i]; M[0x32FB] = M[S.neighbours_c189 + i];
      M[0x3315] = x;
      const list = ptr(0x32FA);
      P.spend(40);
      for (let y = 0; ; y = (y + 1) & 255) {
        const a = M[(list + y) & 0xFFFF];
        P.spend(16);
        if (a & 0x80) { M[S.territory_owner + M[0x3315]] = side(); break; }
        if (M[S.army_side + a] !== side()) break;
      }
      x = M[0x3315];
    }
    return {};
  };
  // reinforce ($3413): territory X's army, or a new one for its owner, gets 6, 3 and 1; X and Y
  // kept in the operands of the loads at $344B
  P.map_reinforce = function* (r) {
    const x = r.x;
    M[S.march_from] = x; M[S.march_to] = x;
    let a;
    if (!(M[S.territory_owner + x] & 0x80)) { zero(x); a = M[S.territory_owner + x]; }
    else a = M[S.army_side + x];
    M[S.figure_side] = a;
    P.spend(40);
    yield* P.map_move_army_figure();
    M[S.figure_frame] = 2; M[S.march_on] = 2;
    M[0x344C] = x; M[0x344E] = (r.y || 0) & 255;
    sound(0x1B);
    do { yield* P.map_wait_25(); M[S.figure_frame] = (M[S.figure_frame] - 1) & 255; P.spend(12); } while (M[S.figure_frame]);
    const xx = M[0x344C];
    M[S.march_on] = 0;
    M[S.army_side + xx] = M[S.figure_side]; M[S.territory_owner + xx] = 0xFF;
    let v = M[S.army_infantry + xx] + 6; M[S.army_infantry + xx] = (v & 255) < 0x12 ? v & 255 : 0x12;
    v = M[S.army_cavalry + xx] + 3; M[S.army_cavalry + xx] = (v & 255) < 0x09 ? v & 255 : 0x09;
    v = M[S.army_cannon + xx] + 1; M[S.army_cannon + xx] = (v & 255) < 0x03 ? v & 255 : 0x03;
    P.spend(70);
    return { x: xx, y: M[0x344E] };
  };
  // army_hit ($349B): 6 infantry, 3 cavalry and a cannon lost; nothing left, the army is lost
  P.map_army_hit = function* (r) {
    const x = r.x;
    const sub = (k, n) => { const v = (M[k + x] - n) & 255; M[k + x] = v & 0x80 ? 0 : v; };
    sub(S.army_infantry, 6); sub(S.army_cavalry, 3); sub(S.army_cannon, 1);
    P.spend(60);
    if ((M[S.army_cannon + x] + M[S.army_cavalry + x] + M[S.army_infantry + x]) & 255) return { x };
    M[S.figure_side] = M[S.army_side + x]; M[S.territory_owner + x] = M[S.army_side + x];
    M[S.army_side + x] = 0xFF;
    M[S.march_from] = x; M[S.march_to] = x;
    P.spend(40);
    yield* P.map_move_army_figure();
    M[S.march_on] = 1;
    return yield* P.map_army_lost();
  };

  // ---- the supply train
  P.map_supply = function* () {
    yield* P.map_wait_25(); yield* P.map_wait_25(); yield* P.map_wait_25();
    const f = P.map_find_rail();
    if (f.c) return yield* P.map_supply_again();
    const y = side();
    M[S.rail_to + y] = f.x; M[S.rail_from + y] = M[S.rail_first]; M[S.train_ran + y] = 1;
    P.spend(30);
    return yield* ride();
  };
  // j_35E6: the train's ride, from one town to the other, the direction changed each time
  const ride = function* () {
    sound(0x0A);
    yield* P.map_panel_anim();
    sound(0x17);
    const y = side();
    M[S.rail_dir + y] ^= 1;
    const back = !!M[S.rail_dir + y];
    let x = back ? M[S.rail_to + y] : M[S.rail_from + y];
    P.spend(30);
    P.map_train_start({ x });
    yield* P.map_wait_25();
    for (;;) {
      x = back ? (x - 1) & 255 : (x + 1) & 255;
      yield* P.map_train_ride({ x });
      const r = yield* P.map_intercept_check({ x });
      if (r.up) return yield* arrived(side() ^ 1);
      x = r.x;
      P.spend(10);
      if (M[S.railway_c133 + x]) break;
    }
    return yield* arrived(side());
  };
  // j_3635: the gold to side X's bank
  const arrived = function* (x) {
    sound(0x11); sound(0x0C);
    yield* P.map_wait_25();
    M[S.train_on] = 0; M[S.gold_side] = x;
    P.map_panel_bank_save({ x: 0 });
    M[S.panel_busy] = 1;
    P.map_panel_bank({ x: 0 });
    P.map_bag_start();
    sound(0x09);
    yield* P.map_wait_25();
    P.map_panel_bank({ x: 1 });
    P.map_bag_fall();
    M[S.bank_on] = 1;
    yield* P.map_count_gold();
    return yield* P.map_new_army();
  };
  P.map_supply_end = function* () {
    yield* P.map_wait_25();
    sound(0x0D);
    M[S.bank_on] = 0;
    P.map_panel_bank({ x: 0 });
    yield* P.map_wait_25();
    P.map_panel_restore();
    M[S.bag_on] = 0; M[S.panel_busy] = 0;
    return {};
  };
  P.map_supply_again = function* () {
    const y = side();
    P.spend(10);
    if (!M[S.train_ran + y]) return {};
    const ok = end => { const a = M[S.army_side + M[S.railway + end]]; return (a & 0x80) || a === side(); };
    P.spend(40);
    if (ok(M[S.rail_from + y]) && ok(M[S.rail_to + y])) { M[S.train_ran + y] = 0; return yield* ride(); }
    M[S.train_ran + y] = 0;
    return {};
  };
  // intercept_check ($36D7): at rail point X, a territory not the side's intercepts the train; up
  // when the interception is won (its two pla leave supply's loop for the bank at once)
  P.map_intercept_check = function* (r) {
    M[S.intercept_point] = r.x;
    const y = M[S.railway + r.x];
    let a = M[S.territory_owner + y];
    if (a & 0x80) a = M[S.army_side + y];
    P.spend(30);
    if (a === side()) return { x: M[S.intercept_point], y };
    P.map_panel_intercept();
    P.map_intercept_start();
    yield* P.map_intercept_anim();
    let won;
    if (M[R.opt_arcade]) {
      M[R.attacker] = side() ^ 1;
      yield* P.map_train_sequence();
      yield* P.map_map_restore();
      won = !!M[R.arcade_result];
    } else won = odds(M[R.level + side()]);
    if (won) return { up: true };
    sound(0x17);
    return { x: M[S.intercept_point] };
  };
  P.map_bag_start = function () {
    M[S.bag_on] = 1;
    let x = 0x2E;
    if (P.map_map_rnd().a < 0x1F) { sound(0x04); x = 0x55; }
    M[S.bag_x] = x; M[S.bag_y] = 0x5C; M[S.bag_stage] = 0;
    P.spend(40);
    return {};
  };
  P.map_bag_show = function () {
    P.spend(6);
    if (!M[S.bag_on]) return {};
    const x = M[S.list_length], g = M[S.gold_side], st = M[S.bag_stage];
    const colour = g ? 0x0C : 0x06;
    if (st === 1) {
      M[S.list_x + x] = M[S.bag_x]; M[S.list_y + x] = M[S.bag_y]; M[S.list_x_hi + x] = 0;
      M[S.list_ptr + x] = ((g ? 5 : 0) + 0xDC) & 255; M[S.list_colour + x] = colour;
      M[S.list_length] = (M[S.list_length] + 1) & 255;
      P.spend(60);
      return {};
    }
    const p = ((g ? 5 : 0) + (st === 0 ? 0xDA : 0xDD)) & 255;
    M[S.list_ptr + x] = p; M[S.f_13BD + x] = (p + 1) & 255;
    M[S.list_x + x] = M[S.bag_x]; M[S.f_137D + x] = M[S.bag_x];
    M[S.list_y + x] = M[S.bag_y]; M[S.f_135D + x] = (M[S.bag_y] + 0x15) & 255;
    M[S.list_x_hi + x] = 0; M[S.f_139D + x] = 0;
    M[S.list_colour + x] = colour; M[S.f_13DD + x] = colour;
    M[S.list_length] = (M[S.list_length] + 2) & 255;
    P.spend(110);
    return {};
  };
  P.map_bag_fall = function () {
    P.spend(8);
    if (M[S.bag_x] < 0x46) return {};
    M[S.bag_stage] = 1; M[S.bag_fall_wait] = 6; M[S.bag_y] = (M[S.bag_y] + 0x15) & 255;
    P.spend(24);
    return {};
  };
  P.map_bag_step = function () {
    P.spend(6);
    if (!M[S.bag_on] || !M[S.bag_stage]) return {};
    if (M[S.bag_fall_wait]) { M[S.bag_fall_wait]--; if (!M[S.bag_fall_wait]) M[S.bag_stage] = 2; }
    M[S.bag_y] = (M[S.bag_y] + 3) & 255;
    if (M[S.bag_y] >= 0xE6) M[S.bag_on] = 0;
    P.spend(30);
    return {};
  };
  P.map_bags_show = function () {
    P.spend(6);
    if (!M[S.bank_on]) return {};
    let y = M[S.banks + M[S.gold_side]];
    if (!y) return {};
    if (y >= 6) y = 6;
    for (; y; y--) {
      const x = M[S.list_length];
      M[S.list_x + x] = M[S.scene_pointers_bf1b + y]; M[S.list_y + x] = M[S.bag_places_bf21 + y];
      M[S.list_x_hi + x] = 0; M[S.list_ptr + x] = 0xD9; M[S.list_colour + x] = 7;
      M[S.list_length] = (M[S.list_length] + 1) & 255;
      P.spend(50);
    }
    return {};
  };
  P.map_count_gold = function* () {
    let y = 0;
    for (let x = 0x19; x >= 0; x--) {
      let a = M[S.army_side + x];
      P.spend(14);
      if (a & 0x80) { a = M[S.territory_owner + x]; if (a & 0x80) continue; }
      if (a === side()) y++;
    }
    let x = 0;
    for (let a = y; ; x++) { a -= 5; P.spend(10); if (a < 0) break; }
    for (; x >= 0; x--) {
      yield* P.map_wait_25();
      sound(0x0B);
      M[S.banks + M[S.gold_side]] = (M[S.banks + M[S.gold_side]] + 1) & 255;
      P.spend(30);
    }
    return {};
  };
  // new_army ($38D5): five bags buy an army on a rail territory of the side's own railway
  P.map_new_army = function* () {
    const g = M[S.gold_side];
    P.spend(14);
    if (g !== side() || M[S.banks + g] < 5) return yield* P.map_supply_end();
    P.map_list_clear_moves();
    const held = y => { let a = M[S.army_side + y]; if (a & 0x80) a = M[S.territory_owner + y]; return a === M[S.gold_side]; };
    let x = 1;
    for (;;) {
      let a = M[S.railway + x];
      P.spend(16);
      if (a & 0x80) break;
      if (!M[S.railway_c133 + x] || !held(a)) { x++; continue; }
      M[S.new_army_from] = x;
      let run = false;
      for (;;) {
        x++;
        a = M[S.railway + x];
        P.spend(20);
        if (!held(a)) { x++; break; }
        if (M[S.railway_c133 + x]) { run = true; break; }
      }
      if (!run) continue;
      const keep = x;
      do {
        M[S.new_army_territory] = M[S.railway + x];
        const t = M[S.new_army_territory];
        P.spend(20);
        if (!(M[S.territory_owner + t] & 0x80)) {
          let y = 0;
          for (;;) {
            const v = M[S.may_move + y];
            P.spend(14);
            if (v & 0x80) { M[S.may_move + y] = t; break; }
            if (v === t) break;
            y++;
          }
        }
        x = (x - 1) & 255;
      } while (x >= M[S.new_army_from]);
      x = keep;
    }
    P.spend(6);
    if (M[S.may_move] & 0x80) return yield* P.map_supply_end();
    M[S.choose_list] = 0x6A; M[S.choose_list_hi] = 0x0E;
    yield* P.map_wait_25();
    for (let y = 5; y; y--) {
      M[S.banks + M[S.gold_side]] = (M[S.banks + M[S.gold_side]] - 1) & 255;
      yield* P.map_wait_25();
    }
    yield* P.map_supply_end();
    P.spend(10);
    if (M[R.cpu_union + M[S.gold_side]]) return yield* P.map_ai_new_army();
    for (;;) {
      M[S.blink_on] = 1; M[S.blink_pos] = 0; M[S.figure_side] = M[S.gold_side];
      P.spend(20);
      yield* P.map_choose_place();
      if (P.map_in_list().z) break;
    }
    M[S.blink_on] = 0; M[S.march_on] = 0;
    return yield* P.map_reinforce({ x: M[S.cursor_target] });
  };
  // find_rail ($3B55): carry clear with two of the side's towns joined by its own territories
  P.map_find_rail = function () {
    const mine = y => { let a = M[S.territory_owner + y]; if (a & 0x80) a = M[S.army_side + y]; return a === side(); };
    let x = 1;
    for (;;) {
      let a = M[S.railway + x];
      P.spend(20);
      if (a & 0x80) return { x, c: 1 };
      if (!mine(a) || M[S.railway_c133 + x] !== 1) { x++; continue; }
      M[S.rail_first] = x;
      for (;;) {
        x++;
        a = M[S.railway + x];
        P.spend(20);
        if (a & 0x80) return { x, c: 1 };
        if (!mine(a)) { x++; break; }
        if (M[S.railway_c133 + x] === 1) return { x, c: 0 };
      }
    }
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
