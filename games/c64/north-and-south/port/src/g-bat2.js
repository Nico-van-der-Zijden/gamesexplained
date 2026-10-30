// The battle, second part: the units brought on and their pictures, a person's choice of unit and
// orders, the computer's orders, the moves of the infantry, cavalry and cannon, the edges, the
// ravine and the river, the shots and their hits, the reserves and the end of the battle.
//
// The 6502's two pla that end a caller's pass at once (level_chance, cavalry_turn_start,
// cavalry_gone, horse_gone) are an up: true the callers return on.
(function (root) {
'use strict';
const G = root.NSGroups = root.NSGroups || {};
G.bat2 = function (P) {
  const M = P.M, S = root.NSSyms.bat, R = root.NSSyms.res;
  const IR = P.batIR;
  const side = () => M[S.side];
  const sound = a => P.bat_bat_sound({ a });
  const first = (y, n) => (y ? n : 0) + (n === 6 ? 5 : 2);   // the side's last slot of six soldiers or three riders

  // ---- the units come on
  P.bat_bring_infantry = function () {
    P.bat_pick_lane();
    const y = side();
    let a = M[R.units_inf + y];
    P.spend(14);
    if (!a) return {};
    if (a >= 6) a = 6;
    let x = a, s = (y ? 6 : 0) + 5;
    for (; x; x--, s--) {
      M[S.obj_x + s] = M[S.inf_start_x + s];
      M[S.obj_y + s] = (M[S.inf_start_y + s] + M[S.lane_y]) & 255;
      M[S.obj_picture + s] = 0; M[S.obj_fall + s] = 0;
      P.spend(40);
    }
    M[S.inf_state + y] = 1; M[S.inf_arriving + y] = 1;
    M[S.inf_dir + y] = M[S.enter_dir + y];
    M[S.cav_spare + y] = 0; M[S.inf_reforming + y] = 0; M[S.inf_formation + y] = 0;
    P.spend(50);
    return {};
  };
  P.bat_bring_cavalry = function () {
    P.bat_pick_lane();
    const y = side();
    let a = M[R.units_cav + y];
    P.spend(14);
    if (!a) return {};
    if (a >= 3) a = 3;
    let s = (y ? 3 : 0) + 2;
    for (let x = a; x; x--, s--) {
      M[S.f_8367 + s] = M[S.cav_start_x + s];
      M[S.f_838F + s] = (M[S.cav_start_y + s] + M[S.lane_y]) & 255;
      M[S.f_833F + s] = 0; M[S.f_8624 + s] = 0;
      P.spend(40);
    }
    M[S.cav_arriving + y] = 1; M[S.cav_state + y] = 1;
    M[S.cav_dir + y] = M[S.enter_dir + y];
    M[S.cav_formation + y] = 0; M[S.cav_arrived + y] = 0; M[S.cav_turning + y] = 0; M[S.ai_cav_plan + y] = 0;
    P.spend(60);
    return {};
  };
  P.bat_bring_cannon_first = function () {
    M[S.cannon_reserve + side()] = M[R.units_cannon + side()];
    P.spend(14);
    return P.bat_bring_cannon();
  };
  P.bat_bring_cannon = function () {
    P.bat_pick_lane();
    const y = side();
    P.spend(10);
    if (!M[S.cannon_reserve + y]) return {};
    M[S.cannon_reserve + y] = (M[S.cannon_reserve + y] - 1) & 255;
    M[S.f_836D + y] = M[S.can_start_x + y];
    M[S.f_8395 + y] = (M[S.can_start_y + y] + M[S.lane_y]) & 255;
    M[S.f_8345 + y] = 0; M[S.f_862A + y] = 0;
    M[S.cannon_shots + y] = 9;
    M[S.can_arriving + y] = 1; M[S.can_state + y] = 1;
    M[S.can_dir + y] = M[S.enter_dir + y];
    P.spend(80);
    return {};
  };

  // ---- the pictures
  // infantry_pictures ($9519)
  P.bat_infantry_pictures = function () {
    M[S.unit_count] = 6;
    const y = side();
    let x = first(y, 6);
    P.spend(20);
    do {
      let pic = null;
      if (IR(S.obj_fall + x)) {
        if (!(M[S.obj_picture + x] & 0x80)) {
          const f = (IR(S.obj_fall + x) + 1) & 255;
          M[S.obj_fall + x] = f;
          if (f === 4) {
            M[S.obj_keep + x] = 0;
            M[R.units_inf + y] = (M[R.units_inf + y] - 1) & 255;
            M[S.obj_redraw + x]++;
            P.spend(30);
          } else pic = ((f - 2) + M[S.inf_fall_pic + y]) & 255;
        }
      } else if (M[S.inf_fallback + y] || M[S.inf_state + y] === 1) pic = (M[S.inf_frame + y] + M[S.inf_walk_pic + y]) & 255;
      else if (M[S.inf_state + y] === 0) pic = M[S.inf_stand_pic + y];
      else pic = M[S.inf_frame + y] ? M[S.inf_fire_pic + x] : M[S.inf_aim_pic + x];
      if (pic !== null && pic !== M[S.obj_picture + x]) { M[S.obj_picture + x] = pic; M[S.obj_redraw + x]++; }
      P.spend(40);
      x--;
      M[S.unit_count] = (M[S.unit_count] - 1) & 255;
    } while (M[S.unit_count]);
    return P.bat_draw_objects();
  };
  // cavalry_pictures ($95A0)
  P.bat_cavalry_pictures = function () {
    let y = side();
    P.spend(10);
    if (IR(S.cav_timer + y)) return {};
    M[S.cav_timer + y] = 6;
    M[S.cav_frame + y] = (M[S.cav_frame + y] + 1) & 255;
    P.spend(20);
    P.bat_cavalry_move();
    if (P.bat_cavalry_gone().up) return {};
    M[S.unit_count] = 3;
    y = side();
    let x = first(y, 3);
    P.spend(20);
    do {
      let pic = null;
      const f = M[S.f_8624 + x];
      if (f) {
        if (!(M[S.f_833F + x] & 0x80)) {
          let a = f;
          if (a !== 0x0B) { a = (a + 1) & 255; if (a >= 0x0A) a = 8; }
          M[S.f_8624 + x] = a;
          pic = ((a - 2) + M[S.cav_fall_pic + y]) & 255;
        }
      } else if (M[S.cav_fallback + y]) {
        const fr = M[S.cav_frame + y] & 1;
        M[S.cav_frame + y] = fr;
        pic = (fr + M[S.cav_walk_pic + (y ^ 1)]) & 255;
      } else {
        const st = M[S.cav_state + y];
        if (st === 0) pic = M[S.cav_stand_pic + y];
        else if (st === 1) { const fr = M[S.cav_frame + y] & 1; M[S.cav_frame + y] = fr; pic = (fr + M[S.cav_walk_pic + y]) & 255; }
        else if (st === 2) {
          P.bat_charge_hits({ x });
          let fr = M[S.cav_frame + y];
          if (fr >= 4) { fr = 2; M[S.cav_frame + y] = 2; }
          pic = (fr + M[S.cav_charge_pic + y]) & 255;
        } else { const fr = M[S.cav_frame + y] & 1; M[S.cav_frame + y] = fr; pic = (fr + M[S.cav_fall_pic + y]) & 255; }
      }
      if (pic !== null && pic !== M[S.f_833F + x]) { M[S.f_833F + x] = pic; M[S.f_83B7 + x]++; }
      P.spend(40);
      x--;
      M[S.unit_count] = (M[S.unit_count] - 1) & 255;
    } while (M[S.unit_count]);
    return P.bat_draw_objects();
  };
  // cannon_pictures ($966E)
  P.bat_cannon_pictures = function () {
    const y = side(), x = y;
    P.spend(10);
    if (M[S.cannon_done + y] & 0x80) return {};
    let pic;
    const f = IR(S.f_862A + x);
    if (f) {
      if (M[S.f_8345 + x] & 0x80) return P.bat_draw_objects();
      const n = (f + 1) & 255;
      M[S.f_862A + x] = n;
      if (n === 5) {
        M[S.f_8345 + x] = 0xFF;
        M[R.units_cannon + y] = (M[R.units_cannon + y] - 1) & 255;
        P.spend(30);
        return P.bat_draw_objects();
      }
      pic = ((n - 2) + M[S.can_hit_pic + y]) & 255;
    } else if (M[S.can_leaving + y] || M[S.can_state + y] === 1) {
      pic = (M[S.can_frame + y] + (M[S.can_dir + y] & 1 ? M[S.can_side_pic + y] : M[S.can_end_pic + y])) & 255;
    } else if (M[S.can_state + y] === 0 || !M[S.can_fired + y]) pic = M[S.can_stand_pic + y];
    else pic = (M[S.can_frame + y] + M[S.can_shot_pic + y]) & 255;
    if (pic !== M[S.f_8345 + x]) { M[S.f_8345 + x] = pic; M[S.f_83BD + x]++; }
    P.spend(40);
    return P.bat_draw_objects();
  };

  // ---- a person's choice and orders
  P.bat_choose_unit = function () {
    const y = side();
    P.spend(10);
    if (M[S.battle_key] !== (y ? 5 : 4)) return {};
    if (((M[S.stick_y] + M[S.stick_x]) & 255) || !M[S.stick_fire] || IR(S.choose_wait + y)) return {};
    if (!M[S.inf_arriving + y]) M[S.inf_state + y] = 0;
    let a = M[S.unit_choice + y] + 1;
    if (a === 3) a = 0;
    M[S.unit_choice + y] = a;
    P.spend(40);
    sound(0x05);
    P.bat_unit_skip();
    M[S.choose_wait + y] = 0x0C;
    return P.bat_unit_icons();
  };
  // unit_skip ($9748): past a unit the side has none of; the reserve read is the Union's for both
  P.bat_unit_skip = function () {
    const y = side();
    for (let x = 0; ; ) {
      const c = M[S.unit_choice + y];
      P.spend(10);
      if (c === 0) { if (M[R.units_inf + y]) return { x }; }
      else if (c === 1) { if (M[R.units_cav + y]) return { x }; }
      else if (!IR(S.f_862A + y) || M[S.cannon_reserve]) return { x };
      let a = c + 1;
      if (a === 3) a = 0;
      M[S.unit_choice + y] = a;
      x++;
      P.spend(20);
      if (x >= 3) return { x };
    }
  };
  // unit_check ($9781): the choice again; the old one kept in the operand of the cmp at $9790
  P.bat_unit_check = function () {
    const y = side();
    M[0x9791] = M[S.unit_choice + y];
    P.bat_unit_skip();
    P.spend(14);
    if (M[S.unit_choice + y] === M[0x9791]) return {};
    M[S.choose_wait + y] = 0x0C;
    return P.bat_unit_icons();
  };
  P.bat_person_input = function () {
    P.spend(10);
    if (M[R.cpu_union] & M[R.cpu_confed]) return {};
    if (!(M[R.cpu_union] | M[R.cpu_confed])) return side() ? P.bat_stick_port1() : P.bat_stick_port2();
    if (!M[R.opt_keyboard]) return P.bat_stick_port2();
    M[S.stick_x] = 0; M[S.stick_y] = 0; M[S.stick_fire] = 1;
    const k = P.bat_key_scan().a;
    P.spend(20);
    if (k === 0x5A) M[S.stick_x] = 0xFF;
    else if (k === 0x58) M[S.stick_x] = 1;
    else if (k === 0x50) M[S.stick_y] = 0xFF;
    else if (k === 0x4C) M[S.stick_y] = 1;
    else if (k === 0x20) M[S.stick_fire] = 0;
    return {};
  };
  // battle_orders ($9805)
  P.bat_battle_orders = function () {
    const y = side();
    P.spend(10);
    if (M[R.fell_back + y]) { M[S.can_state + y] = 0; return {}; }
    if (M[R.cpu_union + y]) return P.bat_computer_orders();
    const c = M[S.unit_choice + y];
    if (c === 1) return P.bat_cavalry_orders();
    if (c !== 0) return P.bat_cannon_orders();
    if (M[S.inf_arriving + y] || M[S.inf_fallback + y] || M[S.inf_state + y] === 2 || M[S.inf_reforming + y]) return {};
    P.spend(20);
    if (!M[S.stick_fire]) return M[S.inf_formation + y] ? P.bat_infantry_reform_start() : P.bat_infantry_fire();
    const sx = M[S.stick_x], sy = M[S.stick_y];
    const stand = () => { M[S.inf_state + y] = 0; return {}; };
    P.spend(10);
    if (!((sx + sy) & 255)) return stand();
    if (sx) {
      if (!(sx & 0x80)) {
        if (y && !M[S.inf_formation + y]) return P.bat_infantry_reform_start();
        if (M[S.inf_at_right + y]) return stand();
        M[S.inf_at_left + y] = 0;
        return P.bat_infantry_go({ a: 1 });
      }
      if (!y && !M[S.inf_formation + y]) return P.bat_infantry_reform_start();
      if (M[S.inf_at_left + y]) return stand();
      M[S.inf_at_right + y] = 0;
      return P.bat_infantry_go({ a: 3 });
    }
    if (!sy) return {};
    if (sy & 0x80) {
      if (M[S.inf_at_top + y]) return stand();
      M[S.inf_at_bottom + y] = 0;
      return P.bat_infantry_go({ a: 0 });
    }
    if (M[S.inf_at_bottom + y]) return stand();
    M[S.inf_at_top + y] = 0;
    return P.bat_infantry_go({ a: 2 });
  };
  P.bat_cavalry_orders = function () {
    const y = side();
    P.spend(14);
    if (M[S.cav_arriving + y] || M[S.cav_fallback + y] || M[S.cav_turning + y]) return {};
    if (!M[S.stick_fire]) {
      if (M[S.cav_formation + y]) { M[S.cav_state + y] = 1; P.bat_cavalry_turn_start(); return {}; }
      return P.bat_cavalry_charge();
    }
    M[S.cav_dir + y] = M[S.forward_dir + y];
    const sx = M[S.stick_x], sy = M[S.stick_y];
    P.spend(14);
    if (!((sx + sy) & 255)) { if (M[S.cav_state + y]) M[S.cav_state + y] = 1; return {}; }
    if (!M[S.cav_state + y]) sound(0x02);
    if (sx) {
      const back = sx & 0x80 ? y === 0 : y !== 0;
      if (back) {
        if (!M[S.cav_formation + y]) { M[S.cav_state + y] = 1; if (P.bat_cavalry_turn_start().up) return {}; }
        return P.bat_cavalry_rear();
      }
      M[S.cav_dir + y] = sx & 0x80 ? 3 : 1;
      return P.bat_cavalry_charge();
    }
    M[S.cav_state + y] = 1;
    if (!sy) return {};
    if (sy & 0x80) {
      if (M[S.cav_at_top + y]) return {};
      M[S.cav_at_bottom + y] = 0;
      return P.bat_cavalry_go({ a: 0 });
    }
    if (M[S.cav_at_bottom + y]) return {};
    M[S.cav_at_top + y] = 0;
    return P.bat_cavalry_go({ a: 2 });
  };
  P.bat_cannon_orders = function () {
    const y = side();
    P.spend(14);
    if (M[S.can_arriving + y] || !M[S.cannon_shots + y] || IR(S.f_862A + y) || M[S.can_leaving + y]) return {};
    if (M[S.can_state + y] === 2) {
      if (M[S.can_fired + y]) return {};
      if (!M[S.stick_fire]) {
        M[S.can_fire_wait + y] = 2;
        P.spend(10);
        if (IR(S.range_timer + y)) return {};
        M[S.range_timer + y] = 2;
        for (;;) {
          const f = IR(S.side_frames + y);
          P.spend(20);
          if (f < 4) { M[S.side_frames + y] = f; return P.bat_gauge_draw(); }
          M[S.side_frames + y] = f - 4;
          const r = M[S.cannon_range + y] + 1;
          if (r === 0x20) return fireWait();
          M[S.cannon_range + y] = r;
        }
      }
      return fireWait();
    }
    if (!M[S.stick_fire]) return P.bat_cannon_aim();
    const sy = M[S.stick_y];
    const stop = () => { M[S.can_state + y] = 0; M[S.can_dir + y] = M[S.forward_dir + y]; return {}; };
    P.spend(10);
    if (!sy) return stop();
    if (sy & 0x80) {
      if (M[S.can_at_top + y]) return stop();
      M[S.can_at_bottom + y] = 0;
      return P.bat_cannon_go({ a: 0 });
    }
    if (M[S.can_at_bottom + y]) return stop();
    M[S.can_at_top + y] = 0;
    return P.bat_cannon_go({ a: 2 });
  };
  // b_99DC: three passes after fire is let go, the shot
  const fireWait = () => {
    const y = side();
    const v = (M[S.can_fire_wait + y] - 1) & 255;
    M[S.can_fire_wait + y] = v;
    P.spend(14);
    if (!(v & 0x80)) return {};
    M[S.can_fired + y] = 1;
    P.bat_cannon_fire();
    return P.bat_gauge_restore_side();
  };

  // ---- the computer's orders
  P.bat_computer_orders = function () {
    P.bat_computer_cannon();
    P.bat_computer_cavalry();
    P.bat_computer_infantry();
    return P.bat_computer_fallback();
  };
  P.bat_computer_fallback = function () {
    const y = side();
    P.spend(14);
    if (M[R.retreat_to + y] & 0x80) return {};
    if ((M[S.inf_arriving + y] + M[S.cav_arriving + y]) & 255) return {};
    const own = (M[R.units_inf + y] + M[R.units_cav + y]) & 255;
    P.spend(14);
    if (!own || own >= 4) return {};
    M[0x9A63] = own;
    const x = y ^ 1;
    const other = (M[R.units_inf + x] + M[R.units_cav + x]) & 255;
    P.spend(14);
    if (!other || other < M[0x9A63]) return {};
    if (P.bat_bat_random().a !== 0) return {};
    if (P.bat_bat_random().a < 0x7F) return {};
    return P.bat_fall_back_start({ y });
  };
  P.bat_computer_infantry = function () {
    const y = side();
    P.spend(14);
    if (M[S.inf_fallback + y] || M[S.inf_arriving + y]) return {};
    let x = (y ? 3 : 0) + 2;
    const stand = () => { M[S.inf_state + y] = 0; M[S.inf_frame + y] = 0; return {}; };
    for (let k = 0; k < 3; k++, x--) { P.spend(8); if (!(IR(S.shot_live + x) & 0x80)) return stand(); }
    x = P.bat_own_soldier().x;
    if (x === 0xFF) return stand();
    M[S.ai_own_y] = M[S.obj_y + x]; M[S.ai_own_x] = M[S.obj_x + x];
    const n = P.bat_nearest_by_x({ a: M[S.ai_own_x] });
    x = n.x;
    P.spend(20);
    if (x === 0xFF) return stand();
    if (n.a >= M[S.ai_own_x] ? y === 1 : y === 0) return stand();
    const ey = M[S.obj_y + x], oy = M[S.ai_own_y];
    P.spend(20);
    if (ey < oy) {
      if (((oy - ey) & 255) >= 4) {
        if (M[S.inf_at_top + y]) return P.bat_infantry_go({ a: M[S.enter_dir + y] });
        M[S.inf_at_bottom + y] = 0;
        return P.bat_infantry_go({ a: 0 });
      }
    } else if (((ey - oy) & 255) >= 4) {
      if (M[S.inf_at_bottom + y]) return P.bat_infantry_go({ a: M[S.enter_dir + y] });
      M[S.inf_at_top + y] = 0;
      return P.bat_infantry_go({ a: 2 });
    }
    P.bat_infantry_stand();
    if (M[S.near_dist] >= 0x1E) return P.bat_infantry_go({ a: M[S.enter_dir + y] });
    if (P.bat_level_chance().up) return {};
    return P.bat_infantry_fire();
  };
  P.bat_infantry_stand = function () { M[S.inf_state + side()] = 0; P.spend(8); return { a: 0 }; };
  P.bat_own_soldier = function () {
    for (let x = 0x0B; x >= 0; x--) { P.spend(14); if (M[S.obj_side + x] === side() && !IR(S.obj_fall + x)) return { x }; }
    return { x: 0xFF };
  };
  P.bat_computer_cavalry = function () {
    const y = side();
    P.spend(14);
    if (M[S.cav_fallback + y] || M[S.cav_arriving + y] || M[S.cav_turning + y]) return {};
    const plan = M[S.ai_cav_plan + y];
    P.spend(10);
    if (plan === 0) {
      if (P.bat_level_chance().up) return {};
      if (!M[S.field_type]) { M[S.ai_cav_plan + y] = 5; sound(0x02); return {}; }
      return intoFile();
    }
    if (plan === 1 || plan === 4) { if (!M[S.cav_turning + y]) M[S.ai_cav_plan + y]++; return {}; }
    if (plan === 2) {
      const x = P.bat_own_rider().x;
      if (x === 0xFF) return {};
      M[S.ai_rider_y] = M[S.f_838F + x];
      const by = M[S.bridge_y + M[S.field_type]];
      P.spend(20);
      if (by < M[S.ai_rider_y]) return goUp();
      if (((by - M[S.ai_rider_y]) & 255) < 6) {
        M[S.ai_cav_plan + y] = 3;
        P.bat_cavalry_go({ a: M[S.enter_dir + y] });
        return P.bat_cavalry_charge();
      }
      return goDown();
    }
    if (plan === 3) {
      const x = P.bat_own_rider().x;
      if (x === 0xFF) return {};
      const rx = M[S.f_8367 + x];
      P.spend(10);
      if (y === 0 ? rx >= 0x5A : rx < 0x37) return intoFile();
      return {};
    }
    if (plan === 5) {
      let x = P.bat_own_rider().x;
      if (x === 0xFF) return P.bat_cavalry_stop();
      M[S.ai_own_y] = (M[S.f_838F + x] + 4) & 255;
      x = P.bat_nearest_by_y({ a: M[S.ai_own_y] }).x;
      if (x === 0xFF) return P.bat_cavalry_stop();
      P.spend(14);
      if (M[S.near_dist] < 4) {
        M[S.ai_cav_plan + y] = 6;
        M[S.cav_dir + y] = M[S.enter_dir + y];
        return P.bat_cavalry_charge();
      }
      M[S.cav_state + y] = 1;
      return M[S.obj_y + x] >= M[S.ai_own_y] ? goDown() : goUp();
    }
    return {};
  };
  // b_9B7E: sound 2, walking, the plan's next step and the turn into file
  const intoFile = () => {
    const y = side();
    sound(0x02);
    M[S.cav_state + y] = 1;
    M[S.ai_cav_plan + y] = (M[S.ai_cav_plan + y] + 1) & 255;
    P.spend(20);
    P.bat_cavalry_turn_start();
    return {};
  };
  // j_9BD4 and b_9BF0: up or down to the height wanted, unless at the edge
  const goUp = () => {
    const y = side();
    if (M[S.cav_at_top + y]) return P.bat_cavalry_stop();
    M[S.cav_at_bottom + y] = 0; M[S.cav_state + y] = 1;
    return P.bat_cavalry_go({ a: 0 });
  };
  const goDown = () => {
    const y = side();
    if (M[S.cav_at_bottom + y]) return P.bat_cavalry_stop();
    M[S.cav_at_top + y] = 0; M[S.cav_state + y] = 1;
    return P.bat_cavalry_go({ a: 2 });
  };
  P.bat_cavalry_stop = function () { M[S.cav_state + side()] = 0; P.spend(8); return { a: 0 }; };
  P.bat_own_rider = function () {
    for (let x = 5; x >= 0; x--) { P.spend(14); if (M[S.f_8638 + x] === side() && !M[S.f_8624 + x]) return { x }; }
    return { x: 0xFF };
  };
  P.bat_computer_cannon = function () {
    const y = side();
    P.spend(20);
    if ((M[S.f_8345 + y] & 0x80) || IR(S.f_862A + y) || M[S.can_leaving + y] || M[S.can_arriving + y] || M[S.can_state + y] === 2) return {};
    if (!IR(S.f_8734 + y)) return {};
    if (M[S.ai_can_delay + y]) { M[S.ai_can_delay + y]--; P.spend(10); return {}; }
    const n = P.bat_nearest_by_y({ a: M[S.f_8395 + y] });
    const x = n.x;
    if (x === 0xFF) return P.bat_b_9CC5();
    P.spend(14);
    if (M[S.near_dist] >= 8) return P.bat_cannon_go({ a: M[S.obj_y + x] >= M[S.f_8395 + y] ? 2 : 0 });
    P.bat_b_9CC5();
    if (P.bat_bat_random().a >= 0x14) return P.bat_b_9CC5();
    if (P.bat_level_chance().up) return {};
    const cx = M[S.f_836D + y], ex = M[S.obj_x + x];
    let d = cx >= ex ? cx - ex : ex - cx;
    d = ((d >> 2) - 1) & 255;
    P.spend(30);
    if (d >= 0x20) return {};
    M[S.cannon_range + y] = d;
    M[S.can_state + y] = 2; M[S.can_frame + y] = 0;
    M[S.can_anim_timer + y] = 0x0A; M[S.ai_can_delay + y] = 0x0A;
    M[S.can_fired + y] = 1;
    P.spend(40);
    return P.bat_cannon_fire();
  };
  // b_9CC5, which computer_cannon also calls as a subroutine: the cannon stands
  P.bat_b_9CC5 = function () { M[S.can_state + side()] = 0; P.spend(8); return { a: 0 }; };
  // level_chance ($9D14): up when the computer's level says no this time
  P.bat_level_chance = function () {
    const l = M[R.level + side()];
    P.spend(10);
    if (l === 0) return P.bat_bat_random().a < 0x0C ? {} : { up: true };
    if (l === 1) return P.bat_bat_random().a < 0x19 ? {} : { up: true };
    return {};
  };
  const nearest = (a, key) => {
    M[S.near_from] = a;
    M[S.near_dist] = 0xFF; M[S.near_slot] = 0xFF;
    for (let x = 0x13; x >= 0; x--) {
      P.spend(16);
      if (M[S.obj_side + x] === side() || (M[S.obj_picture + x] & 0x80) || IR(S.obj_fall + x)) continue;
      const ox = M[S.obj_x + x];
      if (ox >= 0x91 || ox < 5) continue;
      const v = M[key + x];
      const d = v >= M[S.near_from] ? (v - M[S.near_from]) & 255 : (M[S.near_from] - v) & 255;
      P.spend(20);
      if (d >= M[S.near_dist]) continue;
      M[S.near_dist] = d; M[S.near_slot] = x;
    }
    const x = M[S.near_slot];
    return { a: M[key + x], x };
  };
  P.bat_nearest_by_y = r => nearest(r.a, S.obj_y);
  P.bat_nearest_by_x = r => nearest(r.a, S.obj_x);

  // ---- the moves
  P.bat_cannon_anim = function () { return P.bat_cannon_frame(); };
  P.bat_cannon_frame = function () {
    const y = side();
    P.spend(10);
    if (IR(S.can_anim_timer + y)) return {};
    M[S.can_anim_timer + y] = 0x0A;
    M[S.can_frame + y] ^= 1;
    P.spend(14);
    if (M[S.can_frame + y]) return {};
    if (M[S.can_state + y] === 2 && M[S.can_fired + y]) M[S.can_state + y] = 0;
    return {};
  };
  P.bat_infantry_tick = function () {
    const y = side();
    P.spend(10);
    if (IR(S.inf_timer + y)) return {};
    M[S.inf_timer + y] = 0x0A;
    P.bat_infantry_move();
    M[S.inf_frame + y] ^= 1;
    P.spend(14);
    if (!M[S.inf_frame + y] && M[S.inf_state + y] === 2) M[S.inf_state + y] = 0;
    return P.bat_infantry_pictures();
  };
  P.bat_cannon_move_tick = function () { P.spend(10); if (M[R.fell_back + side()]) return {}; return P.bat_cannon_move(); };
  P.bat_cannon_move = function () {
    const y = side(), x = y;
    P.spend(10);
    if (IR(S.can_move_timer + y)) return {};
    M[S.can_move_timer + y] = 0x0A;
    if ((M[S.f_8345 + x] & 0x80) || IR(S.f_862A + x)) return {};
    const left = () => { M[S.f_836D + x] = (M[S.f_836D + x] - 2) & 255; };
    const right = () => { M[S.f_836D + x] = (M[S.f_836D + x] + 2) & 255; };
    P.spend(20);
    if (M[S.can_leaving + y]) { if (y === 1) right(); else left(); }
    else {
      const st = M[S.can_state + y];
      if (st === 0 || st === 2) return {};
      const d = M[S.can_dir + y];
      if (d === 0) {
        const v = (M[S.f_8395 + x] - 4) & 255;
        if (v < 0x10) M[S.can_at_top + y] = 1; else M[S.f_8395 + x] = v;
      } else if (d === 1) right();
      else if (d === 2) {
        const v = (M[S.f_8395 + x] + 4) & 255;
        if (v < 0xAA) M[S.f_8395 + x] = v; else M[S.can_at_bottom + y] = 1;
      } else left();
    }
    P.spend(20);
    P.bat_cannon_left_field();
    return P.bat_cannon_arrived();
  };
  P.bat_infantry_move = function () {
    const y = side();
    P.spend(10);
    if (!M[S.inf_fallback + y]) {
      if (M[S.inf_reforming + y]) return P.bat_infantry_reform();
      const st = M[S.inf_state + y];
      if (st === 0 || st === 2) return {};
    }
    M[S.unit_count] = 6;
    let x = first(y, 6);
    do {
      P.spend(14);
      if (!(M[S.obj_picture + x] & 0x80) && !IR(S.obj_fall + x)) {
        const d = M[S.inf_dir + y];
        if (d === 0) {
          if (!M[S.inf_at_top + y]) { const v = (M[S.obj_y + x] - 3) & 255; M[S.obj_y + x] = v; if (v < 0x0A) M[S.inf_at_top + y] = 1; }
        } else if (d === 1) {
          const v = (M[S.obj_x + x] + 2) & 255; M[S.obj_x + x] = v; if (v >= 0x8C) M[S.inf_at_right + y] = 1;
        } else if (d === 2) {
          if (!M[S.inf_at_bottom + y]) { const v = (M[S.obj_y + x] + 3) & 255; M[S.obj_y + x] = v; if (v >= 0xAA) M[S.inf_at_bottom + y] = 1; }
        } else {
          const v = (M[S.obj_x + x] - 2) & 255; M[S.obj_x + x] = v; if (v < 0x10) M[S.inf_at_left + y] = 1;
        }
        P.spend(30);
      }
      x--;
      M[S.unit_count] = (M[S.unit_count] - 1) & 255;
    } while (M[S.unit_count]);
    P.bat_infantry_gone();
    return P.bat_infantry_arrived();
  };
  P.bat_infantry_reform = function () {
    const y = side();
    M[S.unit_count] = 6;
    let x = first(y, 6);
    do {
      P.spend(14);
      if (!(M[S.obj_picture + x] & 0x80)) {
        if (IR(S.obj_fall + x)) return {};
        const f = M[S.inf_formation + y];
        M[S.obj_x + x] = (M[S.obj_x + x] + M[(f ? S.reform_dx1 : S.reform_dx0) + x]) & 255;
        M[S.obj_y + x] = (M[S.obj_y + x] + M[(f ? S.reform_dy1 : S.reform_dy0) + x]) & 255;
        P.spend(30);
      }
      x--;
      M[S.unit_count] = (M[S.unit_count] - 1) & 255;
    } while (M[S.unit_count]);
    M[S.inf_reform_step + y] = (M[S.inf_reform_step + y] + 1) & 255;
    P.spend(14);
    if (M[S.inf_reform_step + y] !== 6) return {};
    M[S.inf_formation + y] ^= 1; M[S.inf_reforming + y] = 0;
    return {};
  };
  P.bat_cavalry_move = function () {
    const y = side();
    if (M[S.cav_arrived + y]) { M[S.cav_arrived + y] = 0; M[S.cav_state + y] = 0; M[S.cav_arriving + y] = 0; }
    M[S.unit_count] = 3;
    let x = first(y, 3);
    P.spend(20);
    do {
      P.spend(14);
      if (!(M[S.f_833F + x] & 0x80)) {
        const f = M[S.f_8624 + x];
        const walk = M[S.cav_state + y] === 1;
        if (f) {
          if (f >= 8) {
            if (y === 0) { M[S.f_8367 + x] = (M[S.f_8367 + x] + 3) & 255; P.bat_cavalry_right_edge({ a: M[S.f_8367 + x], x }); }
            else { M[S.f_8367 + x] = (M[S.f_8367 + x] - 3) & 255; P.bat_cavalry_left_edge({ a: M[S.f_8367 + x], x }); }
          }
        } else if (M[S.cav_fallback + y] || (M[S.cav_state + y] && M[S.cav_state + y] !== 3)) {
          const d = M[S.cav_dir + y];
          if (d === 0) {
            if (!M[S.cav_at_top + y]) { const v = (M[S.f_838F + x] - 3) & 255; M[S.f_838F + x] = v; if (v < 0x10) M[S.cav_at_top + y] = 1; }
          } else if (d === 1) {
            M[S.f_8367 + x] = (M[S.f_8367 + x] + (walk ? 2 : 3)) & 255;
            P.bat_cavalry_right_edge({ a: M[S.f_8367 + x], x });
          } else if (d === 2) {
            if (!M[S.cav_at_bottom + y]) { const v = (M[S.f_838F + x] + 3) & 255; M[S.f_838F + x] = v; if (v >= 0xAA) M[S.cav_at_bottom + y] = 1; }
          } else {
            M[S.f_8367 + x] = (M[S.f_8367 + x] - (walk ? 2 : 3)) & 255;
            P.bat_cavalry_left_edge({ a: M[S.f_8367 + x], x });
          }
        }
        P.spend(30);
      }
      x--;
      M[S.unit_count] = (M[S.unit_count] - 1) & 255;
    } while (M[S.unit_count]);
    if (M[S.cav_turning + y]) P.bat_cavalry_turn();
    return {};
  };
  P.bat_cavalry_turn = function () {
    const y = side();
    M[S.unit_count] = 3;
    let x = first(y, 3);
    do {
      P.spend(14);
      if (!(M[S.f_833F + x] & 0x80) && !M[S.f_8624 + x]) {
        const f = M[S.cav_formation + y];
        M[S.f_8367 + x] = (M[S.f_8367 + x] + M[(f ? S.turn_dx1 : S.turn_dx0) + x]) & 255;
        M[S.f_838F + x] = (M[S.f_838F + x] + M[(f ? S.turn_dy1 : S.turn_dy0) + x]) & 255;
        P.spend(30);
      }
      x--;
      M[S.unit_count] = (M[S.unit_count] - 1) & 255;
    } while (M[S.unit_count]);
    M[S.cav_turn_step + y] = (M[S.cav_turn_step + y] + 1) & 255;
    P.spend(14);
    if (M[S.cav_turn_step + y] !== 8) return {};
    M[S.cav_formation + y] ^= 1; M[S.cav_turning + y] = 0;
    return {};
  };
  // hazards ($A113): the ravine's and the river's columns, through ($50)
  P.bat_hazards = function () {
    const f = M[S.field_type];
    P.spend(8);
    if (!f) return {};
    const t = f === 1 ? S.canyon_hazard : S.river_hazard;
    M[0x50] = t & 255; M[0x51] = t >> 8;
    for (let x = 0x13; x >= 0; x--) {
      P.spend(14);
      if (M[S.obj_picture + x] & 0x80) continue;
      const fl = IR(S.obj_fall + x);
      if (fl && fl < 8) continue;
      const col = M[(t + (M[S.obj_y + x] >> 3)) & 0xFFFF];
      P.spend(20);
      if (col & 0x80) continue;
      M[S.hazard_col] = col;
      const c = M[S.obj_x + x] >> 2;
      if (c < col || ((c - 4) & 255) >= col) continue;
      if (!fl) { M[S.obj_fall + x] = 1; continue; }
      if (!M[S.obj_keep + x]) continue;
      M[S.obj_keep + x] = 0;
      const y = M[S.obj_side + x];
      M[R.units_cav + y] = (M[R.units_cav + y] - 1) & 255;
      if (!M[R.units_cav + y]) M[S.cav_state + y] = 0;
      M[S.obj_fall + x] = 0x0B;
      P.spend(40);
    }
    return {};
  };
  // bullet_hits ($A18F), from the frame interrupt: bullet X against the enemy's objects
  P.bat_bullet_hits = function (r) {
    const x = r.x;
    if (x >= 6) return { x };
    for (let y = 0x13; y >= 0; y--) {
      P.spend(14);
      if ((M[S.obj_picture + y] & 0x80) || M[S.obj_fall + y]) continue;
      if (x < 3 ? !M[S.obj_side + y] : M[S.obj_side + y]) continue;
      const ox = M[S.obj_x + y], sx = M[S.shot_x + x];
      if (ox < sx || ((ox - 8) & 255) >= sx) continue;
      const oy = (M[S.obj_y + y] - 4) & 255, sy = M[S.shot_y + x];
      if (oy >= sy || ((oy + 8) & 255) < sy) continue;
      M[S.obj_fall + y] = 1; M[S.shot_live + x] = 0xFF; M[S.hit_sound] = 1;
      if (y >= 0x12) { M[S.cannon_hit] = 1; M[S.cannon_hit_slot] = y; }
      P.spend(40);
      return { x };
    }
    return { x };
  };
  P.bat_cannon_left_field = function () {
    const y = side();
    P.spend(10);
    if (!M[S.can_leaving + y]) return {};
    const cx = M[S.f_836D + y];
    if (cx < 0xA0 || cx >= 0xF0) return {};
    M[S.f_8345 + y] = 0xFF;
    P.spend(14);
    if (!M[R.fell_back + y] && M[S.cannon_reserve + y]) {
      M[S.can_leaving + y] = 0;
      P.bat_lanes_clear();
      return P.bat_bring_cannon();
    }
    M[S.can_leaving + y] = 0; M[S.f_862A + y] = 0; M[S.can_state + y] = 0;
    M[S.f_8345 + y] = 0xFF; M[S.cannon_done + y] = 0xFF;
    P.spend(30);
    return {};
  };
  P.bat_cannon_arrived = function () {
    const y = side();
    P.spend(10);
    if (!M[S.can_arriving + y]) return {};
    if (y === 0) {
      const cx = M[S.f_836D];
      if (cx >= 0xA0 || cx < 0x0C) return {};
      M[S.can_state] = 0; M[S.can_arriving] = 0;
      return {};
    }
    if (M[S.a_836E] >= 0x8B) return {};
    M[S.a_8697] = 0; M[S.a_8617] = 0;
    return {};
  };
  P.bat_infantry_arrived = function () {
    const y = side();
    P.spend(10);
    if (!M[S.inf_arriving + y]) return {};
    const fall = y ? S.f_861E : S.obj_fall, xs = y ? S.f_8361 : S.obj_x;
    let x = 5;
    for (; x >= 0; x--) { P.spend(10); if (!IR(fall + x)) break; }
    if (x < 0) return {};
    const ox = M[xs + x];
    if (y === 0) {
      if (ox >= 0xA0 || ox < 0x20) return {};
      M[S.inf_state] = 0; M[S.inf_arriving] = 0; M[S.inf_at_right] = 0;
      return {};
    }
    if (ox >= 0x78) return {};
    M[S.a_864D] = 0; M[S.a_8613] = 0;
    return {};
  };
  P.bat_infantry_gone = function () {
    const y = side();
    P.spend(10);
    if (!M[S.inf_fallback + y]) return {};
    const lines = y ? S.f_850C : S.drawn_line;
    for (let x = 5; x >= 0; x--) { P.spend(9); if (!(M[lines + x] & 0x80)) return {}; }
    M[S.inf_fallback + y] = 0; M[S.inf_state + y] = 0; M[S.inf_arriving + y] = 1;
    return {};
  };
  // cavalry_gone ($A2E0): up when the riders have all gone (its two pla end cavalry_pictures' pass)
  P.bat_cavalry_gone = function () {
    const y = side();
    P.spend(10);
    if (!M[S.cav_fallback + y]) return {};
    const lines = y ? S.f_8515 : S.f_8512;
    for (let x = 2; x >= 0; x--) { P.spend(9); if (!(M[lines + x] & 0x80)) return {}; }
    M[S.cav_fallback + y] = 0; M[S.cav_state + y] = 0; M[S.cav_arriving + y] = 1;
    return { up: true };
  };
  P.bat_infantry_reform_start = function () {
    const y = side();
    M[S.inf_reforming + y] = 1; M[S.inf_state + y] = 1; M[S.inf_reform_step + y] = 0;
    P.spend(20);
    return { a: 0 };
  };
  // infantry_fire ($A384): the first standing soldier of each pair fires
  P.bat_infantry_fire = function () {
    let y = side();
    M[S.inf_state + y] = 2; M[S.inf_frame + y] = 0;
    M[S.pairs_left] = 3;
    let x = 0;
    if (y) { y = 3; x = 6; } else y = 0;
    P.spend(30);
    do {
      let a;
      if (!IR(S.obj_fall + x)) { P.bat_bullet_start({ x, y }); x += 2; a = 0; }
      else if (!IR(S.obj_fall + x + 1)) { x++; P.bat_bullet_start({ x, y }); x++; a = 0; }
      else { x += 2; a = 0xFF; }
      M[S.shot_live + y] = a;
      y++;
      M[S.pairs_left] = (M[S.pairs_left] - 1) & 255;
      P.spend(40);
    } while (M[S.pairs_left]);
    sound(0x06);
    return {};
  };
  // bullet_start ($A3CB): bullet Y from soldier X; X kept in the operand of the ldx at $A3D8
  P.bat_bullet_start = function (r) {
    M[0xA3D9] = r.x;
    M[S.shot_x + r.y] = (M[S.obj_x + r.x] + M[S.muzzle_dx + side()]) & 255;
    M[S.shot_y + r.y] = (M[S.obj_y + r.x] - 2) & 255;
    M[S.shot_life + r.y] = 0x0F;
    P.spend(50);
    return { x: r.x, y: r.y };
  };
  P.bat_infantry_go = function (r) {
    const y = side();
    M[S.inf_dir + y] = r.a; M[S.inf_state + y] = 1; M[S.inf_frame + y] &= 1;
    P.spend(24);
    return {};
  };
  // cavalry_turn_start ($A3FD): up but when a single rider is left on the field (one rider has no
  // formation); the count in the operand at $A42A
  P.bat_cavalry_turn_start = function () {
    const y = side();
    P.spend(8);
    if (M[S.cav_turning + y]) return { up: true };
    M[0xA42A] = 0;
    const x0 = y === 1 ? 5 : 2;
    for (let k = 0; k < 3; k++) if (!(M[S.f_8512 + x0 - k] & 0x80)) M[0xA42A]++;
    P.spend(40);
    const n = M[0xA42A];
    if (n === 0) return { up: true };
    if (n === 1) return {};
    M[S.cav_turning + y] = 1; M[S.cav_turn_step + y] = 0;
    return { up: true };
  };
  P.bat_cavalry_charge = function () {
    const y = side();
    P.spend(8);
    if (M[S.cav_state + y] === 2) return {};
    M[S.cav_state + y] = 2; M[S.cav_frame + y] = 0;
    return {};
  };
  P.bat_cavalry_rear = function () { M[S.cav_state + side()] = 3; P.spend(8); return {}; };
  P.bat_cavalry_go = function (r) {
    const y = side();
    M[S.cav_dir + y] = r.a; M[S.cav_frame + y] &= 1;
    P.spend(20);
    return {};
  };
  // cavalry_left_edge ($A462), after rider X moved left, its x in A
  P.bat_cavalry_left_edge = function (r) {
    const y = side(), a = r.a, x = r.x;
    P.spend(8);
    if (a < 0x8B) { if (a >= 0x86 && M[S.cav_arriving + y]) M[S.cav_arrived + y] = 1; return {}; }
    if (a < 0xF5) return {};
    M[S.f_8367 + x] = (a - 0x3C) & 255;
    if (P.bat_horse_gone({ x }).up) return {};
    M[S.cav_arriving + y] = 1; M[S.ai_cav_plan + y] = 0;
    P.spend(20);
    if (M[S.cav_formation + y]) P.bat_cavalry_turn_start();
    return {};
  };
  P.bat_cavalry_right_edge = function (r) {
    const y = side(), a = r.a, x = r.x;
    P.spend(8);
    if (a < 0x0F) return {};
    if (a < 0x14) { if (M[S.cav_arriving + y]) M[S.cav_arrived + y] = 1; return {}; }
    if (a < 0x96 || a >= 0xA0) return {};
    M[S.f_8367 + x] = (a + 0x3C) & 255;
    if (P.bat_horse_gone({ x }).up) return {};
    M[S.cav_arriving + y] = 1; M[S.ai_cav_plan + y] = 0;
    P.spend(20);
    if (M[S.cav_formation + y]) P.bat_cavalry_turn_start();
    return {};
  };
  // horse_gone ($A4CC): up when a riderless horse goes for good (its two pla end the edge check)
  P.bat_horse_gone = function (r) {
    const x = r.x;
    P.spend(10);
    if (M[S.f_8624 + x] < 8 || !M[S.f_853A + x]) return {};
    M[S.f_853A + x] = 0;
    M[R.units_cav + side()] = (M[R.units_cav + side()] - 1) & 255;
    P.spend(20);
    return { up: true };
  };
  P.bat_cannon_aim = function () {
    const y = side();
    M[S.can_state + y] = 2; M[S.can_fire_wait + y] = 2;
    M[S.can_spare + y] = 0; M[S.can_fired + y] = 0; M[S.cannon_range + y] = 0; M[S.side_frames + y] = 0;
    M[0xA509] = y;
    P.spend(40);
    P.bat_gauge_clear();
    M[S.range_timer + M[0xA509]] = 4;
    return {};
  };
  P.bat_cannon_go = function (r) {
    const y = side();
    M[S.can_dir + y] = r.a; M[S.can_frame + y] &= 1; M[S.can_state + y] = 1;
    P.spend(24);
    return {};
  };

  // ---- the shots
  P.bat_shots_to_sprites = function () {
    for (let x = 7; x >= 0; x--) {
      const sx = M[S.shot_x + x] << 1;
      M[S.sprite_hi_bit] = sx >> 8;
      const v = (sx & 255) + 0x18;
      M[S.slist_x + x] = v & 255; M[S.slist_xhi + x] = (M[S.sprite_hi_bit] + (v > 255 ? 1 : 0)) & 255;
      M[S.slist_y + x] = (M[S.shot_y + x] + 0x32) & 255;
      M[S.slist_ptr + x] = (M[S.shot_kind + x] + 0xDE) & 255;
      M[S.slist_col + x] = 0;
      if (M[S.shot_live + x] & 0x80) { M[S.slist_ptr + x] = 0xE0; M[S.slist_y + x] = 0xEE; }
      P.spend(90);
    }
    return {};
  };
  P.bat_cannon_fire = function () {
    const y = side();
    sound(0x04);
    M[S.f_8734 + y] = 0;
    M[S.f_871C + y] = (M[S.f_836D + y] + M[S.muzzle_cannon + y]) & 255;
    M[S.f_8724 + y] = M[S.f_8395 + y];
    M[S.f_873C + y] = ((M[S.cannon_range + y] + 2) << 1) & 255;
    M[S.cannon_shots + y] = (M[S.cannon_shots + y] - 1) & 255;
    P.spend(70);
    if (M[S.cannon_shots + y]) return {};
    M[S.can_leaving + y] = 1;
    M[S.can_dir + y] = ((y << 1) + 1) & 255;
    return {};
  };
  // shots_move ($A5A3), from the frame interrupt
  P.bat_shots_move = function () {
    for (let x = 7; x >= 0; x--) {
      P.spend(10);
      if (M[S.shot_live + x] & 0x80) continue;
      P.bat_bullet_hits({ x });
      const v = (M[S.shot_x + x] + M[S.shot_speed + x]) & 255;
      M[S.shot_x + x] = v;
      if (v >= 0xB4) M[S.shot_live + x] = 0xFF;
      M[S.shot_life + x] = (M[S.shot_life + x] - 1) & 255;
      if (!M[S.shot_life + x]) { M[S.shot_live + x] = 0xFF; M[S.shot_landed + x] = 1; }
      P.spend(40);
    }
    return {};
  };
  // balls_land ($A5D3): the balls marked landed, from shot 6 on. After a hit on a bridge,
  // ball_crater comes back with X at $FF (bat_picture's), so the loop goes on from shot 0 and takes
  // every bullet that has run out of life as a ball landing (Discoveries)
  P.bat_balls_land = function () {
    let x = 6;
    do {
      P.spend(10);
      if (IR(S.shot_landed + x)) {
        M[S.shot_landed + x] = 0;
        x = P.bat_ball_crater({ x }).x;
        const sx = IR(S.shot_x + x), sy = IR(S.shot_y + x);
        for (let y = 0x13; y >= 0; y--) {
          P.spend(14);
          if ((M[S.obj_picture + y] & 0x80) || IR(S.obj_fall + y)) continue;
          const ox = (M[S.obj_x + y] + 9) & 255;
          if (ox < sx || ((ox - 0x12) & 255) >= sx) continue;
          const oy = (M[S.obj_y + y] - 8) & 255;
          if (oy >= sy || ((oy + 0x10) & 255) < sy) continue;
          M[S.obj_fall + y] = 1;
          if (y >= 0x12) { M[S.cannon_hit] = 1; M[S.cannon_hit_slot] = y; }
          P.spend(30);
        }
      }
      x = (x + 1) & 255;
    } while (x < 8);
    return { x };
  };
  P.bat_cannon_hit_gauge = function () {
    P.spend(8);
    if (!IR(S.cannon_hit)) return {};
    M[S.cannon_hit] = 0;
    const s = IR(S.cannon_hit_slot);
    if (s < 0x12) return {};
    const y = s - 0x12;
    P.spend(20);
    if (M[R.cpu_union + y] || M[S.can_state + y] !== 2) return {};
    return P.bat_gauge_restore({ x: (y << 1) & 255 });
  };
  P.bat_charge_hits = function (r) {
    const x = r.x;
    for (let y = 0x13; y >= 0; y--) {
      P.spend(14);
      if (M[S.obj_side + y] === side() || (M[S.obj_picture + y] & 0x80) || IR(S.obj_fall + y)) continue;
      const ox = (M[S.obj_x + y] + 4) & 255, rx = M[S.f_8367 + x];
      if (ox < rx || ((ox - 8) & 255) >= rx) continue;
      const oy = (M[S.obj_y + y] - 4) & 255, ry = M[S.f_838F + x];
      if (oy >= ry || ((oy + 8) & 255) < ry) continue;
      M[S.obj_fall + y] = 1;
      if (y >= 0x12) { M[S.cannon_hit] = 1; M[S.cannon_hit_slot] = y; }
      P.spend(30);
    }
    return { x, y: side() };
  };
  // ball_crater ($A6A5): the ball's mark, or the bridge's damage
  P.bat_ball_crater = function (r) {
    const x = r.x;
    sound(0x0F);
    const f = M[S.field_type];
    P.spend(10);
    if (f) {
      const col = M[((M[0x50] | M[0x51] << 8) + (IR(S.shot_y + x) >> 3)) & 0xFFFF];
      const c = IR(S.shot_x + x) >> 2;
      P.spend(30);
      if (!(col & 0x80)) {
        M[S.hazard_col] = col;
        if (c >= col && ((c - 6) & 255) < col) return { x };
      } else if (c >= 0x10 && c < 0x17) {
        const h = M[S.bridge_hits] + 1;
        M[S.bridge_hits] = h;
        P.spend(20);
        if (h > 3) { M[S.bridge_hits] = 3; return { x }; }
        if (h === 3) P.bat_bridge_break();
        let p = (M[S.bridge_hits] + 6) & 255;
        if (M[S.field_type] !== 1) p = (p + 3) & 255;
        return P.bat_bat_picture({ a: (M[S.field_type] + 0x0A) & 255, x: p });
      }
    }
    // the crater, at the cell below the landing
    M[S.place10_bitmap] = 0; M[S.a_822F] = 0x40; M[S.place10_screen] = 0; M[S.a_8249] = 0x60;
    let n = ((IR(S.shot_y + x) >> 3) + 1) & 255;
    do {
      let v = (M[S.place10_bitmap] | M[S.a_822F] << 8) + 0x140; M[S.place10_bitmap] = v & 255; M[S.a_822F] = (v >> 8) & 255;
      v = (M[S.place10_screen] | M[S.a_8249] << 8) + 0x28; M[S.place10_screen] = v & 255; M[S.a_8249] = (v >> 8) & 255;
      n = (n - 1) & 255;
      P.spend(50);
    } while (n);
    const c = IR(S.shot_x + x) >> 2;
    if (c) {
      let v = (M[S.place10_screen] | M[S.a_8249] << 8) + c; M[S.place10_screen] = v & 255; M[S.a_8249] = (v >> 8) & 255;
      // eight times the column, the carry of its last asl added to the high byte as well
      const b = c << 3, cy = b > 255 ? 1 : 0;
      const lo = M[S.place10_bitmap] + (b & 255);
      M[S.place10_bitmap] = lo & 255;
      M[S.a_822F] = (M[S.a_822F] + (lo > 255 ? 1 : 0) + cy) & 255;
      P.spend(60);
    }
    M[0xA792] = x;
    P.bat_bat_picture({ a: 0x0A, x: M[S.field_type] === 1 ? 0x0D : 0x0E });
    return { x: M[0xA792] };
  };
  P.bat_bridge_break = function () {
    M[S.river_bridge] = 0x11; M[S.a_8759] = 0x11; M[S.a_875A] = 0x11;
    M[S.canyon_bridge] = 0x10; M[S.a_8776] = 0x10;
    P.spend(30);
    return {};
  };
  P.bat_fall_back = function () {
    const y = side();
    P.spend(14);
    if (M[R.cpu_union + y] || (M[R.retreat_to + y] & 0x80)) return {};
    const k = M[S.battle_key];
    if (k === 0xFF || k !== M[S.fallback_key + y]) return {};
    return P.bat_fall_back_start({ y });
  };
  P.bat_fall_back_start = function (r) {
    const y = r.y, x = y ^ 1;
    P.spend(14);
    if (M[R.fell_back + x] || M[R.fell_back + y]) return {};
    if (!((M[R.units_cav + y] + M[R.units_inf + y]) & 255)) return {};
    if (!((M[R.units_cav + x] + M[R.units_inf + x]) & 255)) return {};
    M[S.cav_fallback + y] = 1; M[S.inf_fallback + y] = 1; M[R.fell_back + y] = 1;
    M[S.cav_dir + y] = M[S.fallback_dir + y]; M[S.inf_dir + y] = M[S.fallback_dir + y];
    P.spend(40);
    return {};
  };
  P.bat_bring_reserves = function () {
    let y = side();
    P.spend(10);
    if (M[R.fell_back + y]) return {};
    if (M[R.units_inf + y]) {
      let x = (y ? 6 : 0) + 5, all = true;
      for (let k = 6; k; k--, x--) { P.spend(14); if (!(M[S.obj_picture + x] & 0x80) || !IR(S.obj_fall + x)) { all = false; break; } }
      if (all) { P.bat_lanes_clear(); P.bat_bring_infantry(); }
    }
    y = side();
    if (M[R.units_cav + y]) {
      let x = (y ? 3 : 0) + 2, all = true;
      for (let k = 3; k; k--, x--) { P.spend(14); if (!(M[S.f_833F + x] & 0x80) || !M[S.f_8624 + x]) { all = false; break; } }
      if (all) { P.bat_lanes_clear(); P.bat_bring_cavalry(); }
    }
    y = side();
    P.spend(14);
    if (!M[R.units_cannon + y] || !(M[S.f_8345 + y] & 0x80) || !IR(S.f_862A + y)) return {};
    M[S.f_8518 + y] = 0xFF;
    P.bat_lanes_clear();
    return P.bat_bring_cannon();
  };
  // battle_end ($A869)
  P.bat_battle_end = function () {
    P.bat_wiped_out();
    P.spend(8);
    if (!M[S.battle_done]) return P.bat_fallback_done();
    if (IR(S.end_timer)) return {};
    M[S.end_timer] = 0x64;
    if (!M[S.mapsfx_fade]) M[S.mapsfx_fade] = 9;
    M[S.end_steps] = (M[S.end_steps] - 1) & 255;
    P.spend(20);
    if (M[S.end_steps]) return {};
    return P.bat_battle_exit();
  };
  P.bat_fallback_done = function () {
    const y = side();
    P.spend(10);
    if (!M[R.fell_back + y] || ((M[S.cav_fallback + y] + M[S.inf_fallback + y]) & 255)) return {};
    M[R.units_cannon + y] = 0; M[S.cannon_reserve + y] = 0;
    M[S.battle_done] = 1; M[R.side_out + y] = 0xFF;
    return {};
  };
  P.bat_wiped_out = function () {
    const y = side();
    P.spend(14);
    if (M[R.units_cannon + y] && (M[S.cannon_reserve + y] || M[S.cannon_shots + y])) return {};
    if ((M[R.units_cav + y] + M[R.units_inf + y]) & 255) return {};
    M[S.battle_done] = 1; M[R.fell_back + y] = 0; M[R.units_cannon + y] = 0; M[R.side_out + y] = 0xFF;
    P.spend(20);
    return {};
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
