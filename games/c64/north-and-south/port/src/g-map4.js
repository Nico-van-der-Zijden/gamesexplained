// The strategic map, fourth part: the computer's turn. A plan for the turn, then for each army
// that may move a score for every territory (the base scores, the plan's changes, the armies on
// the map, the distance, and noise below level 2), the best taken and a step towards it.
(function (root) {
'use strict';
const G = root.NSGroups = root.NSGroups || {};
G.map4 = function (P) {
  const M = P.M, S = root.NSSyms.map, R = root.NSSyms.res;
  for (const n of ['map_ai_turn', 'map_ai_move']) P.GEN.add(n);
  const side = () => M[S.side_to_play];
  const ptr = a => M[a] | M[a + 1] << 8;

  P.map_ai_turn = function* () {
    P.map_ai_plan();
    P.map_ai_moved_clear();
    return yield* P.map_ai_move();
  };
  P.map_ai_move = function* () {
    M[S.figure_side] = side();
    const a = M[S.may_move];
    M[S.ai_army] = a; M[S.move_from] = a; M[S.march_from] = a;
    P.spend(30);
    P.map_ai_base();
    P.map_ai_plan_scores();
    P.map_ai_occupied();
    P.map_ai_distance();
    P.map_ai_noise();
    P.map_ai_best();
    P.spend(10);
    if (!M[S.ai_best_score]) return yield* P.map_move_done();
    const r = P.map_ai_step();
    return yield* P.map_resolve_move({ a: r.a });
  };
  // ai_plan ($3C98)
  P.map_ai_plan = function () {
    P.spend(10);
    if (P.map_find_rail().c) { M[S.ai_plan_now] = 0; return {}; }
    P.spend(14);
    if (M[S.train_ran + (side() ^ 1)]) { M[S.ai_plan_now] = 1; return {}; }
    P.spend(10);
    if (M[R.opt_reinforcements]) {
      let a = M[S.a_0DF2];
      if (a & 0x80) a = M[S.a_0DBD];
      P.spend(14);
      if ((a & 0x80) || a !== side()) { M[S.ai_plan_now] = 2; return {}; }
    }
    // the side's armies less the other side's: at least as many, plan 3
    let x = 0;
    for (let y = 0x19; y >= 0; y--) {
      const s = M[S.army_side + y];
      P.spend(14);
      if (s & 0x80) continue;
      x += s === side() ? 1 : -1;
    }
    M[S.ai_plan_now] = (x & 0x80 || x < 0) ? 4 : 3;
    return { x: x & 255 };
  };
  P.map_ai_base = function () { for (let y = 0x19; y >= 0; y--) M[S.ai_score + y] = M[S.ai_base_scores + y]; P.spend(26 * 14); return {}; };
  P.map_ai_moved_clear = function () { for (let y = 0x19; y >= 0; y--) M[S.ai_sent + y] = 0xFF; P.spend(26 * 9); return {}; };
  // ai_plan_scores ($3D09)
  P.map_ai_plan_scores = function () {
    const plan = M[S.ai_plan_now];
    P.spend(14);
    if (plan === 0) {
      const i = (M[S.ai_target_list + M[S.ai_army]] << 1) & 255;
      M[0x34] = M[S.ai_targets + i]; M[0x35] = M[S.ai_targets_bf5d + i];
      const list = ptr(0x34);
      P.spend(30);
      for (let y = 0; ; y = (y + 1) & 255) {
        const t = M[(list + y) & 0xFFFF];
        P.spend(20);
        if (t & 0x80) return {};
        M[S.ai_score + t] = (M[S.ai_score + t] << 2) & 255;
      }
    }
    if (plan === 1) {
      for (let y = 1; ; y++) {
        const t = M[S.railway + y];
        P.spend(20);
        if (t & 0x80) return {};
        let a = M[S.territory_owner + t];
        if (a & 0x80) { a = M[S.army_side + t]; if (a & 0x80) continue; }
        if (a === side()) continue;
        // three times the score, and the bit the asl shifted out, which the adc takes as its carry
        const v = M[S.ai_score + t];
        M[S.ai_work] = v;
        M[S.ai_score + t] = (((v << 1) & 255) + v + (v >> 7)) & 255;
        P.spend(20);
      }
    }
    if (plan !== 3) return {};
    for (let y = 0x19; y >= 0; y--) {
      const s = M[S.army_side + y];
      P.spend(14);
      if ((s & 0x80) || s === side()) continue;
      const st = P.map_army_steps({ y }).x;
      M[S.ai_work] = st;
      let n = 3 - st;
      M[S.ai_count] = n < 0 ? 0 : n;
      let a = M[S.ai_score + y];
      M[S.ai_work] = a;
      // the score added count times, a count of 0 going round 256 times
      do { a = (a + M[S.ai_work]) & 255; M[S.ai_count] = (M[S.ai_count] - 1) & 255; P.spend(14); } while (M[S.ai_count]);
      M[S.ai_score + y] = a;
    }
    return {};
  };
  // army_steps ($3D9B): X, the losses of 6, 3 and 1 territory Y's army takes before nothing is left
  P.map_army_steps = function (r) {
    const y = r.y;
    M[S.steps_infantry] = M[S.army_infantry + y]; M[S.steps_cavalry] = M[S.army_cavalry + y]; M[S.steps_cannon] = M[S.army_cannon + y];
    let x = 0;
    P.spend(30);
    for (;;) {
      const sub = (k, n) => { const v = M[k] - n; M[k] = v < 0 ? 0 : v; };
      sub(S.steps_infantry, 6); sub(S.steps_cavalry, 3); sub(S.steps_cannon, 1);
      P.spend(50);
      if (!((M[S.steps_cannon] + M[S.steps_infantry] + M[S.steps_cavalry]) & 255)) return { x, y };
      x++;
    }
  };
  P.map_ai_occupied = function () {
    for (let y = 0x19; y >= 0; y--) {
      const s = M[S.army_side + y];
      P.spend(14);
      if (s & 0x80) {
        if (M[S.territory_owner + y] !== side()) M[S.ai_score + y] = (M[S.ai_score + y] + 5) & 255;
        P.spend(14);
        continue;
      }
      if (s === side()) { if (!(M[S.ai_sent + y] & 0x80)) M[S.ai_score + y] = 0; P.spend(10); continue; }
      if (M[S.ai_plan_now] === 3) continue;
      const st = P.map_army_steps({ y }).x;
      const w = (((st + 1) & 255) << 1) & 255;
      M[S.ai_work] = w;
      const v = M[S.ai_score + y] - w;
      M[S.ai_score + y] = v < 0 ? 0 : v;
      P.spend(30);
    }
    return {};
  };
  P.map_ai_distance = function () {
    for (let y = 0x19; y >= 0; y--) M[S.ai_dist + y] = 0xFF;
    M[S.ai_dist + M[S.ai_army]] = 0;
    P.spend(26 * 9 + 20);
    P.map_distance_ring({ a: 0 });
    P.map_distance_ring({ a: 1 });
    P.map_distance_ring({ a: 2 });
    for (let y = 0x19; y >= 0; y--) {
      const d = M[S.ai_dist + y];
      P.spend(16);
      if ((d & 0x80) || d === 0) M[S.ai_score + y] = 0;
      else if (d === 2) { const q = M[S.ai_score + y] >> 2; M[S.ai_work] = q; M[S.ai_score + y] = (M[S.ai_score + y] - q) & 255; }
      else if (d !== 1) M[S.ai_score + y] = M[S.ai_score + y] >> 1;
    }
    return {};
  };
  // distance_ring ($3E8B): distance A + 1 to the unmarked neighbours of those at A; Y kept in the
  // operand of the ldy at $3EC4, the list read through the operand at $3EAD
  P.map_distance_ring = function (r) {
    M[S.ai_ring] = r.a;
    for (let y = 0x19; y >= 0; y = (M[0x3EC5] - 1)) {
      M[0x3EC5] = y;
      P.spend(14);
      if (M[S.ai_dist + y] === M[S.ai_ring]) {
        const i = (y << 1) & 255;
        M[0x3EAD] = M[S.neighbours + i]; M[0x3EAE] = M[S.neighbours_c189 + i];
        const list = ptr(0x3EAD);
        P.spend(30);
        for (let x = 0; ; x = (x + 1) & 255) {
          const t = M[(list + x) & 0xFFFF];
          P.spend(16);
          if (t & 0x80) break;
          if (M[S.ai_dist + t] & 0x80) M[S.ai_dist + t] = (M[S.ai_ring] + 1) & 255;
        }
      }
      if (M[0x3EC5] === 0) break;
    }
    return {};
  };
  P.map_ai_noise = function () {
    const l = M[R.level + side()];
    P.spend(12);
    if (l === 2) return {};
    for (let y = 0x19; y >= 0; y--) { M[S.ai_score + y] = P.map_noise({ a: M[S.ai_score + y], x: l }).a; P.spend(14); }
    return {};
  };
  // noise ($3EE4): A moved at random by up to half (level 1) or an eighth (level 0) of a number
  // below it
  P.map_noise = function (r) {
    M[S.ai_work] = r.a;
    P.spend(8);
    if (r.a < 4) return { a: r.a, x: r.x };
    let a;
    do { a = P.map_map_rnd().a & 0x0F; P.spend(10); } while (a >= M[S.ai_work]);
    if (r.x !== 1) a >>= 2;
    a >>= 1;
    M[S.ai_ring] = a;
    P.spend(14);
    if (!a) return { a, x: r.x };
    if (P.map_map_rnd().a & 1) return { a: (M[S.ai_work] - M[S.ai_ring]) & 255, x: r.x };
    return { a: (M[S.ai_work] + M[S.ai_ring]) & 255, x: r.x };
  };
  P.map_ai_best = function () {
    M[S.move_to] = 0; M[S.ai_best_score] = 0;
    for (let y = 0x19; y >= 0; y--) {
      const a = M[S.ai_score + y];
      P.spend(14);
      if (a >= M[S.ai_best_score]) { M[S.move_to] = y; M[S.ai_best_score] = a; }
    }
    return {};
  };
  // ai_step ($3F34): from the target back through the distances to the neighbour at distance 1;
  // the list read through the operand at $3F5B
  P.map_ai_step = function () {
    let y = M[S.move_to];
    M[S.ai_sent + y] = 0;
    let d = M[S.ai_dist + y];
    P.spend(20);
    while (d !== 1) {
      M[S.ai_back] = (d - 1) & 255;
      const i = (y << 1) & 255;
      M[0x3F5B] = M[S.neighbours + i]; M[0x3F5C] = M[S.neighbours_c189 + i];
      const list = ptr(0x3F5B);
      P.spend(30);
      for (let x = 0; ; x = (x + 1) & 255) {
        y = M[(list + x) & 0xFFFF];
        d = M[S.ai_dist + y];
        P.spend(18);
        if (d === M[S.ai_back]) break;
      }
    }
    M[S.move_to] = y; M[S.march_to] = y;
    M[S.ai_sent + y] = 0;
    return { a: y, y };
  };
  // ai_new_army ($3F7D): the flashing territory with the highest base score, kept in the operand
  // of the ldx at $3F9A
  P.map_ai_new_army = function* () {
    M[S.ai_best_score] = 0;
    for (let y = 0; ; y++) {
      const t = M[S.may_move + y];
      P.spend(14);
      if (t & 0x80) break;
      const a = M[S.ai_base_scores + t];
      if (a >= M[S.ai_best_score]) { M[S.ai_best_score] = a; M[0x3F9B] = t; }
    }
    return yield* P.map_reinforce({ x: M[0x3F9B] });
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
