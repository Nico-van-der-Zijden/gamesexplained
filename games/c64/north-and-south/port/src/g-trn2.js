// The train, second part: the two fighters, the attacker and a guard, their poses and their orders,
// a person's and the computer's; the carriages' roofs and the ground beside the track, the ladders,
// the gaps; the knives. The code is the fort's (g-frt2.js) with its own addresses, without the
// walls, the dog and the barrel. The 6502's two pla that end a caller's pass are an up: true the
// callers return on; the handlers chosen by state through a jmp ($FFFF) are found by address.
(function (root) {
'use strict';
const G = root.NSGroups = root.NSGroups || {};
G.trn2 = function (P) {
  const M = P.M, S = root.NSSyms.trn, R = root.NSSyms.res;
  const IR = P.trnIR;
  const sound = a => P.trn_train_sound({ a });
  const ptr = a => M[a] | M[a + 1] << 8;
  // a - b in 16 bits, negative when the high byte's top bit is set, as a bmi after the sbc reads it
  const diff = (a, b) => { const v = (a - b) & 0xFFFF; return v & 0x8000 ? v - 0x10000 : v; };
  const add16 = (lo, hi, d) => { const v = (M[lo] | M[hi] << 8) + d; M[lo] = v & 255; M[hi] = (v >> 8) & 255; };
  const inList = (list, v) => { for (let x = 0; ; x++) { const c = M[list + x]; P.spend(14); if (c & 0x80) return false; if (c === v) return true; } };
  // the guard's bytes are the attacker's + 1
  const F = k => S[k];

  // fighter_pictures ($8E2E): each fighter's pose by its state; the guard's only when one is on
  P.trn_fighter_pictures = function () {
    let y = 1;
    P.spend(10);
    if (!M[S.guard_on]) y = 0;
    for (; y >= 0; y--) {
      M[S.pose_fighter] = y;
      const st = M[S.fighter_state + y];
      M[0x8E48] = M[S.pose_lo + st]; M[0x8E49] = M[S.pose_hi + st];
      const f = POSE_AT[ptr(0x8E48)];
      if (!f) throw new Error('fighter_pictures: no pose at $' + ptr(0x8E48).toString(16));
      P.spend(30);
      P[f]({ y });
      y = M[S.pose_fighter];
    }
    return {};
  };
  const POSE_AT = {};
  P.frtPoseAt = POSE_AT;
  // the pictures' common end: top, bottom, offsets
  const pose = (y, top, bottom, dx2, dy, dy2) => {
    M[S.fighter_top + y] = top & 255; M[S.fighter_bottom + y] = bottom & 255;
    M[S.fighter_dx2 + y] = dx2; M[S.fighter_dy + y] = dy; M[S.fighter_dy2 + y] = dy2;
    P.spend(40);
  };
  P.trn_pose_uniform = function (r) {
    const x = M[S.pose_fighter];
    P.spend(14);
    const conf = x ? !M[R.attacker] : !!M[R.attacker];
    return { a: conf ? (r.a + 0x3C) & 255 : r.a };
  };
  P.trn_pose_stand = function (r) {
    const y = r.y;
    let a = 0x58;
    if (M[S.fighter_facing + y] & 0x80) a += 2;
    a = P.trn_pose_uniform({ a }).a;
    pose(y, a, a + 1, 0, 0, 0x15);
    return { y };
  };
  P.trn_pose_walk = function (r) {
    const y = r.y;
    let a = M[S.fighter_frame + y];
    if (!IR(S.tfighter_timer + y)) {
      M[S.tfighter_timer + y] = 4;
      a++;
      if (a >= 6) a = 0;
      M[S.fighter_frame + y] = a;
      P.spend(20);
    }
    a += 0x40;
    if (M[S.fighter_moving + y] & 0x80) a += 0x0C;
    a = P.trn_pose_uniform({ a: a & 255 }).a;
    pose(y, a, a + 6, 0, 0, 0x15);
    return { y };
  };
  P.trn_pose_jump = function (r) {
    const y = r.y;
    const f = M[S.fighter_frame + y];
    P.spend(14);
    if (f > 4) {
      M[S.fighter_state + y] = 0; M[S.climb_dir + y] = 0; M[S.arc_step + y] = 0;
      return { y };
    }
    if (f === 2) {
      let a = 0x42;
      M[S.fighter_moving + y] = M[S.fighter_facing + y];
      if (M[S.fighter_facing + y] & 0x80) a += 0x0C;
      a = P.trn_pose_uniform({ a }).a;
      pose(y, a, a + 6, 0, 0, 0x15);
      if (IR(S.tfighter_timer + y)) return { y };
      M[S.tfighter_timer + y] = 1;
      const x = M[S.arc_step + y];
      const d = M[S.jump_arc + x];
      P.spend(20);
      if (d === 0x80) {
        sound(0x0D);
        M[S.fighter_frame + y] = (M[S.fighter_frame + y] + 1) & 255;
        M[S.fighter_moving + y] = 0;
        return { y };
      }
      M[S.fighter_y + y] = (d + M[S.fighter_y + y]) & 255;
      M[S.arc_step + y] = (M[S.arc_step + y] + 1) & 255;
      return { y };
    }
    if (f === 0 || f === 3) {
      M[S.tfighter_timer + y] = 5;
      M[S.fighter_frame + y] = (M[S.fighter_frame + y] + 1) & 255;
      P.spend(16);
    }
    let a = 0x64;
    if (M[S.fighter_facing + y] & 0x80) a += 2;
    a = P.trn_pose_uniform({ a }).a;
    pose(y, a, a + 1, 0, 0, 0x15);
    if (!IR(S.tfighter_timer + y)) M[S.fighter_frame + y] = (M[S.fighter_frame + y] + 1) & 255;
    return { y };
  };
  P.trn_pose_strike = function (r) {
    const y = r.y;
    let a = M[S.fighter_frame + y];
    if (!IR(S.tfighter_timer + y)) {
      M[S.tfighter_timer + y] = 9;
      a++;
      P.spend(20);
      if (a >= 2) { M[S.fighter_state + y] = 0; M[S.tfighter_timer + y] = 5; return { y }; }
      M[S.fighter_frame + y] = a;
    }
    a = ((a << 1) + 0x5C) & 255;
    if (M[S.fighter_facing + y] & 0x80) a += 4;
    a = P.trn_pose_uniform({ a: a & 255 }).a;
    pose(y, a, a + 1, 0, 0, 0x15);
    return { y };
  };
  P.trn_pose_climb = function (r) {
    let a = M[S.fighter_frame];
    if (!IR(S.tfighter_timer) && M[S.climb_dir]) {
      M[S.fighter_y] = (M[S.fighter_y] + (M[S.climb_dir] & 0x80 ? 8 : -8)) & 255;
      M[S.tfighter_timer] = 6;
      M[S.fighter_frame] ^= 1;
      a = M[S.fighter_frame];
      P.spend(30);
    }
    a = ((a << 1) + 0x6C) & 255;
    a = P.trn_pose_uniform({ a }).a;
    pose(0, a, a + 1, 0, 0, 0x15);
    return { y: r.y };
  };
  P.trn_pose_drop = function (r) {
    const y = r.y;
    M[S.fighter_dx2 + y] = 0x0C;
    let a = P.trn_pose_uniform({ a: 0x70 }).a;
    if (M[S.fighter_facing + y] & 0x80) {
      a = (a + 2) & 255;
      M[S.fighter_bottom + y] = a; M[S.fighter_top + y] = (a + 1) & 255;
      M[S.fighter_dy2 + y] = 0xF2; M[S.fighter_dy + y] = 0x0E;
    } else {
      M[S.fighter_top + y] = a; M[S.fighter_bottom + y] = (a + 1) & 255;
      M[S.fighter_dy2 + y] = 0x0E; M[S.fighter_dy + y] = 0;
    }
    P.spend(40);
    if (IR(S.tfighter_timer + y)) return { y };
    M[S.tfighter_timer + y] = 1;
    M[S.fighter_y + y] = (M[S.fighter_y + y] + 4) & 255;
    return { y };
  };
  P.trn_pose_beaten = function (r) {
    M[S.fighter_dx2] = 0x18;
    let a = P.trn_pose_uniform({ a: 0x74 }).a;
    if (M[S.fighter_facing] & 0x80) {
      a = (a + 4) & 255;
      M[S.fighter_bottom] = a;
      M[S.fighter_top] = (a + 1 + M[S.fighter_frame]) & 255;
    } else {
      M[S.fighter_top] = a;
      M[S.fighter_bottom] = (a + 1 + M[S.fighter_frame]) & 255;
    }
    M[S.fighter_dy] = 0x11; M[S.fighter_dy2] = 0;
    P.spend(50);
    if (IR(S.tfighter_timer)) return { y: r.y };
    M[S.tfighter_timer] = 6;
    let f = M[S.fighter_frame] + 1;
    if (f >= 3) f = 0;
    M[S.fighter_frame] = f;
    return { y: r.y };
  };
  P.trn_pose_down = function (r) {
    const y = r.y;
    M[S.fighter_dx2 + y] = 0x18;
    let a = P.trn_pose_uniform({ a: 0x68 }).a;
    if (M[S.fighter_facing + y] & 0x80) {
      a = (a + 2) & 255;
      M[S.fighter_bottom + y] = a; M[S.fighter_top + y] = (a + 1) & 255;
    } else { M[S.fighter_top + y] = a; M[S.fighter_bottom + y] = (a + 1) & 255; }
    M[S.fighter_dy + y] = 0x12; M[S.fighter_dy2 + y] = 0;
    P.spend(40);
    return { y };
  };
  P.trn_pose_knocked = function (r) {
    const y = r.y;
    M[S.fighter_dx2 + y] = 0x0C;
    let a = P.trn_pose_uniform({ a: 0x70 }).a;
    if (M[S.fighter_facing + y] & 0x80) {
      a = (a + 3) & 255;
      M[S.fighter_top + y] = a; M[S.fighter_bottom + y] = (a - 1) & 255;
      M[S.fighter_dy2 + y] = 0xF2; M[S.fighter_dy + y] = 0x0E;
    } else {
      M[S.fighter_top + y] = a; M[S.fighter_bottom + y] = (a + 1) & 255;
      M[S.fighter_dy2 + y] = 0x0E; M[S.fighter_dy + y] = 0;
    }
    P.spend(40);
    if (IR(S.tfighter_timer + y)) return { y };
    M[S.tfighter_timer + y] = 1;
    const x = M[S.arc_step + y], d = M[S.jump_arc + x];
    P.spend(20);
    if (d === 0x80) {
      M[S.fighter_state + y] = 8; M[S.fighter_moving + y] = 0; M[S.arc_step + y] = 0; M[S.tfighter_timer + y] = 0x32;
      return { y };
    }
    M[S.fighter_y + y] = (d + M[S.fighter_y + y]) & 255;
    M[S.arc_step + y] = (M[S.arc_step + y] + 1) & 255;
    return { y };
  };

  // ---- the attacker's orders
  const at = {};                       // the handlers' addresses, filled from the syms
  const handlerAt = (op) => {
    const a = ptr(op);
    const f = at[a];
    if (!f) throw new Error('train: no handler at $' + a.toString(16) + ' (the jmp through $' + op.toString(16) + ')');
    return f;
  };
  P.trn_attacker_orders = function () {
    const y = M[R.attacker];
    P.spend(10);
    if (M[R.cpu_union + y]) return P.trn_computer_attacker();
    const x = M[S.fighter_state];
    M[0x919A] = M[S.attacker_lo + x]; M[0x919B] = M[S.attacker_hi + x];
    P.spend(24);
    return P[handlerAt(0x919A)]({});
  };
  P.trn_train_nothing = function () { P.spend(6); return {}; };
  const walkState = a => { M[S.fighter_state] = a; M[S.fighter_frame] = 0; M[S.tfighter_timer] = 0; P.spend(20); };
  P.trn_attacker_duck = function () {
    M[S.fighter_frame] = 4; M[S.tfighter_timer] = 0x19; M[S.fighter_state] = 2; M[S.fighter_moving] = 0;
    M[S.fighter_y] = (M[S.fighter_y] & 0xF8) | 2;
    P.spend(40);
    return {};
  };
  P.trn_attacker_drop = function () {
    if (P.trn_attacker_ground().up) return {};
    M[S.fighter_frame] = 4; M[S.tfighter_timer] = 0x14; M[S.fighter_state] = 2; M[S.fighter_moving] = 0;
    M[S.fighter_y] = (M[S.fighter_y] & 0xF8) | 2;
    P.spend(40);
    sound(0x0D);
    return {};
  };
  P.trn_attacker_get_up = function () {
    P.spend(6);
    if (IR(S.tfighter_timer)) return {};
    M[S.fighter_state] = 0; M[S.fighter_moving] = 0; M[S.guard_delay] = 2;
    return {};
  };
  P.trn_attacker_strike = function () {
    P.spend(8);
    if (IR(S.tfighter_timer) !== 2) return {};
    if (M[S.a_8D6C] >= 6) return {};
    if (((IR(S.a_8D76) - M[S.fighter_x]) & 255) >= 0x1E) return {};
    if (M[S.fighter_floor] !== M[S.a_8D84]) return {};
    if (P.trn_train_random().a >= 0x14) return {};
    sound(0x06);
    M[S.a_8D6C] = 9; M[S.a_8D80] = 0; M[S.a_8DA1] = 0; M[S.a_8D6A] = 0;
    M[S.a_8D82] = ((M[S.fighter_facing] - 1) & 255) ^ 0xFF;
    P.spend(40);
    return {};
  };
  // attacker_floor ($93B2), guard_floor ($93D8): the floor and the rows' screen address; the row
  // kept in the operand of the sbc at $93C3 or $93E9
  P.trn_attacker_floor = function () {
    const r = M[S.fighter_y] >> 3;
    M[0x93C4] = r;
    const x = (((r - 4) & 255) << 1) & 255;
    M[S.fighter_floor] = (0x15 - M[0x93C4]) & 255;
    const v = M[S.row_offsets + x] + 7;
    M[0x10] = v & 255;
    M[0x11] = (M[S.f_88EB + x] + 0x48 + (v > 255 ? 1 : 0)) & 255;
    P.spend(60);
    return { x };
  };
  P.trn_guard_floor = function () {
    const r = M[S.a_8D72] >> 3;
    M[0x93EA] = r;
    const x = (((r - 5) & 255) << 1) & 255;
    M[S.a_8D84] = (0x15 - M[0x93EA]) & 255;
    let v = M[S.row_offsets + x];
    M[0x20] = v & 255;
    M[0x21] = (M[S.f_88EB + x] + 0x48) & 255;
    const gx = IR(S.a_8D76) | ((IR(S.a_8D78) & 1) << 8);
    let c = gx >> 3;
    M[0x22] = c;
    if (c & 0x80) c = 3;
    else { if (c >= 0x25) c = 0x25; if (c < 3) c = 3; }
    v = M[0x20] + c;
    M[0x20] = v & 255; M[0x21] = (M[0x21] + (v > 255 ? 1 : 0)) & 255;
    M[S.guard_checks_off] = 0;
    P.spend(110);
    return { x };
  };
  const sidle = (y, col) => {
    if (y === col) { M[S.fighter_moving] = 0; M[S.to_ladder] = 0; M[S.fine_scroll] = 0; }
    else { const d = y > col ? 1 : 0xFF; M[S.fighter_moving] = d; M[S.to_ladder] = d; }
    P.spend(20);
  };
  P.trn_climb_down = function () {
    P.spend(8);
    if (M[S.fighter_floor]) return {};
    M[S.fighter_state] = 0; M[S.climb_dir] = 0; M[S.on_ground] = 1;
    return {};
  };
  // the floors under the feet, the cell's character in the operand of the list's cmp
  const onList = (base, y, op, list) => { const c = IR((base + y) & 0xFFFF); M[op] = c; P.spend(20); return inList(list, c); };
  P.trn_attacker_ground = function () {
    P.spend(6);
    if (!M[S.fighter_floor]) { M[S.on_ground] = 1; return {}; }
    if (onList(ptr(0x10), 0x7B, 0x949E, S.tfloor_chars)) return {};
    M[S.fighter_state] = 6; M[S.fighter_moving] = M[S.fighter_facing];
    return { up: true };
  };
  P.trn_guard_ground = function () {
    P.spend(8);
    if (M[S.guard_checks_off] || !M[S.a_8D84]) return {};
    if (onList(ptr(0x20), 0x9E, 0x951B, S.tfloor_chars)) return {};
    M[S.a_8D6C] = 6; M[S.a_8D80] = M[S.a_8D82];
    return { up: true };
  };
  P.trn_guard_ledge = function () {
    P.spend(8);
    if (M[S.guard_checks_off] || !M[S.a_8D84]) return {};
    if (onList(ptr(0x20), 0x9D, 0x9549, S.tfloor_chars)) return {};
    M[S.a_8D6C] = 2; M[S.a_8DA1] = 0; M[S.a_8D6A] = 0; M[S.a_8D80] = 0;
    return { up: true };
  };
  P.trn_attacker_ledge = function () {
    if (onList(ptr(0x10), 0x7D, 0x9572, S.tfloor_chars)) return {};
    M[S.fighter_state] = 2; M[S.arc_step] = 0; M[S.fighter_frame] = 0; M[S.fighter_moving] = 0;
    return { up: true };
  };
  P.trn_guard_lands = function () {
    P.spend(6);
    if (!M[S.a_8D84]) return {};
    if (onList(ptr(0x20), 0x9E, 0x95A0, S.tfloor_chars)) return {};
    return { up: true };
  };
  // fighter_strike ($95AA): fighter Y's stroke; the distance in the operand of the cmp at $95CD;
  // up when it strikes, or when the guard is to the attacker's left
  P.trn_fighter_strike = function (r) {
    const y = r.y;
    P.spend(10);
    if (!M[S.guard_on] || M[S.fighter_floor] !== M[S.a_8D84]) return { y };
    const d = diff(IR(S.a_8D76) | IR(S.a_8D78) << 8, M[S.fighter_x] | M[S.fighter_x_hi] << 8);
    M[0x95CC] = d & 255;
    P.spend(30);
    if (d < 0) return { y, up: true };
    if ((d >> 8) & 255) return { y };
    if (M[0x95CC] >= 0x1E) return { y };
    if (P.trn_train_random().a < 5) {
      M[S.fighter_state + y] = 1; M[S.fighter_moving + y] = M[S.fighter_facing + y];
      return { y };
    }
    sound(0x1E);
    M[S.fighter_state + y] = 3; M[S.fighter_frame + y] = 0; M[S.fighter_moving + y] = 0; M[S.tfighter_timer + y] = 5;
    P.spend(30);
    return { y, up: true };
  };
  P.trn_fighter_throw = function (r) {
    const y = r.y;
    sound(0x14);
    M[S.fighter_state + y] = 4; M[S.fighter_frame + y] = 0; M[S.fighter_moving + y] = 0; M[S.tfighter_timer + y] = 5;
    M[S.knife_on + y] = 1;
    M[S.knives_left + y] = (M[S.knives_left + y] - 1) & 255;
    M[S.knife_x + y] = IR(S.fighter_x + y); M[S.knife_x_hi + y] = IR(S.fighter_x_hi + y);
    M[S.knife_y + y] = (M[S.fighter_y + y] + 0x10) & 255;
    M[S.knife_dir + y] = M[S.fighter_facing + y];
    P.spend(90);
    if (y === 0) return { y: P.trn_knives_draw().y };
    return { y };
  };
  P.trn_knives_draw = function () {
    let y = M[S.knives_left];
    for (let x = 1; x < 5; x++) {
      if (y && !(y & 0x80)) { M[0x4800 + x] = 0xFE; M[0x4828 + x] = 0xFF; }
      else { M[0x4800 + x] = 0; M[0x4828 + x] = 0; }
      y = (y - 1) & 255;
      P.spend(24);
    }
    return { x: 5, y };
  };
  P.trn_guards_draw = function () {
    for (let x = 0x27; x >= 7; x--) { M[0x4800 + x] = 0; M[0x4828 + x] = 0; }
    let x = 0x25;
    P.spend(33 * 14);
    for (let y = M[S.guards_left]; y; y = (y - 1) & 255) {
      let a = ((M[R.attacker] << 2) + 0xF6) & 255;
      M[0x4800 + x] = a; a = (a + 1) & 255; M[0x4801 + x] = a; a = (a + 1) & 255; M[0x4828 + x] = a; a = (a + 1) & 255; M[0x4829 + x] = a;
      x = (x - 2) & 255;
      P.spend(50);
    }
    return { x };
  };
  P.trn_knives_to_sprites = function () {
    for (let y = 1; y >= 0; y--) {
      P.spend(8);
      if (!M[S.knife_on + y]) continue;
      const x = M[S.tlist_count];
      M[S.flist_col + x] = 1;
      M[S.flist_ptr + x] = M[S.knife_dir + y] & 0x80 ? 0xDC : 0xDB;
      M[S.flist_x + x] = M[S.knife_x + y]; M[S.flist_xhi + x] = M[S.knife_x_hi + y]; M[S.flist_y + x] = M[S.knife_y + y];
      M[S.tlist_count]++;
      P.spend(60);
    }
    return {};
  };
  const turnBack = y => { M[S.fighter_moving + y] = ((M[S.fighter_moving + y] - 1) & 255) ^ 0xFF; };
  // the scrolls from the frame interrupt: each thing moves against the attacker's walk
  const against = (lo, hi) => {
    const m = M[S.fighter_moving];
    P.spend(10);
    if (!m) return;
    add16(lo, hi, m & 0x80 ? M[S.scroll_speed] : -M[S.scroll_speed]);
    P.spend(20);
  };
  P.trn_guard_gone = function () {
    P.spend(6);
    if (!M[S.guard_on]) return {};
    const h = IR(S.a_8D78);
    if (!h) return {};
    if (h === 1) { if (IR(S.a_8D76) < 0x5A || !IR(S.a_8D78)) return {}; }
    M[S.guard_on] = 0;
    return {};
  };
  P.trn_knives_fly = function () {
    for (let y = 1; y >= 0; y--) {
      P.spend(10);
      if (!M[S.knife_on + y] || IR(S.tknife_timer + y)) continue;
      M[S.tknife_timer + y] = 1;
      if (M[S.knife_dir + y] & 0x80) {
        add16(S.knife_x + y, S.knife_x_hi + y, -8);
        if (M[S.knife_x_hi + y] & 0x80) M[S.knife_on + y] = 0;
      } else {
        add16(S.knife_x + y, S.knife_x_hi + y, 8);
        if (M[S.knife_x_hi + y] && M[S.knife_x + y] >= 0x40) M[S.knife_on + y] = 0;
      }
      P.spend(40);
    }
    return {};
  };
  // at_start ($97D0): up when the attacker would go back past the train's start
  P.trn_at_start = function () {
    P.spend(10);
    if ((IR(0x04) | IR(0x05) << 8) >= (M[S.start_lo] | M[S.start_hi] << 8)) return {};
    M[S.fighter_state] = 0; M[S.fighter_moving] = 0;
    return { up: true };
  };
  P.trn_time_up = function () {
    P.spend(6);
    if (!M[S.time_over]) return {};
    M[S.fighter_moving] = 0; M[S.fighter_state] = 7;
    return { up: true };
  };
  // knife_hits ($97FA): knife X against fighter Y, the other side's; the difference in the operand
  // of the cmp at $9840
  P.trn_knife_hits = function () {
    for (let x = 1, y = 0; x >= 0; x--, y++) {
      P.spend(10);
      if (!M[S.knife_on + x]) continue;
      const st = M[S.fighter_state + y];
      if (st >= 5 || (st === 2 && M[S.fighter_frame + y] >= 4)) continue;
      if (!M[S.attacker_on + y]) continue;
      const dy = M[S.fighter_y + y] + 0x28 - M[S.knife_y + x];
      P.spend(20);
      if (((M[S.fighter_y + y] + 0x28) & 255) < M[S.knife_y + x] || ((dy) & 255) >= 0x28) continue;
      const d = diff(IR(S.fighter_x + y) | IR(S.fighter_x_hi + y) << 8, M[S.knife_x + x] | M[S.knife_x_hi + x] << 8);
      M[0x983F] = d & 255;
      P.spend(20);
      const hi = (d >> 8) & 255;
      if (!(hi & 0x80)) { if (hi || M[0x983F] >= 0x10) continue; }
      else if (((hi + 1) & 255) || M[0x983F] < 0xE8) continue;
      if (M[S.fighter_state + y] !== 2) M[S.arc_step + y] = 0;
      M[S.fighter_state + y] = 9; M[S.fighter_frame + y] = 9;
      turnBack(y);
      M[S.knife_on + x] = 0;
      sound(0x1C);
    }
    return {};
  };

  // ---- the defender
  P.trn_defender_orders = function () {
    P.spend(6);
    if (!M[S.guard_on]) return {};
    const x = M[S.a_8D6C];
    M[0x9899] = M[S.guard_lo + x]; M[0x989A] = M[S.guard_hi + x];
    P.spend(24);
    return P[handlerAt(0x9899)]({});
  };
  P.trn_guard_stand = function () {
    P.spend(6);
    if (IR(S.tguard_timer)) return {};
    if (P.trn_guard_ground().up) return {};
    // the high byte first: with it set the game never reads the low one
    let gx = -1;
    P.spend(14);
    const walkLeft = () => {
      if (M[S.a_8D80]) return {};
      M[S.a_8D80] = 0xFF; M[S.a_8D82] = 0xFF; M[S.a_8D6C] = 1; M[S.a_8D6A] = 0; M[S.tguard_timer] = 0;
      P.spend(30);
      return {};
    };
    if (IR(S.a_8D78) || (gx = IR(S.a_8D76)) >= 0x7F) {
      // a stroke ends the pass here (its two pla, reached by jmp, take guard_fight's return)
      if (P.trn_guard_fight().up) return {};
      if (M[S.a_8D6C] === 3) return {};
      return walkLeft();
    }
    if (gx < 0x64) return walkLeft();
    const st = M[S.fighter_state];
    if (st < 5) {
      if (st === 2) {
        if (M[S.a_8D84] !== M[S.jump_floor]) return walkLeft();
        sound(0x06);
        M[S.fighter_state] = 9; M[S.fighter_moving] = 0; M[S.fighter_frame] = 0;
        M[S.fighter_facing] = ((M[S.a_8D82] - 1) & 255) ^ 0xFF;
      } else if (M[S.fighter_floor] !== M[S.a_8D84]) return walkLeft();
    }
    M[S.a_8D6C] = 0; M[S.a_8D80] = 0;
    P.trn_guard_fight();
    return {};
  };
  // guard_fight ($9937): the distance in the operand of the cmp at $9978
  P.trn_guard_fight = function () {
    const y = M[R.attacker] ^ 1;
    P.spend(10);
    if (!M[R.cpu_union + y]) {
      P.trn_defender_stick();
      P.spend(6);
      if (M[S.fstick_fire]) return {};
      if (M[S.guard_delay]) { M[S.guard_delay]--; return {}; }
      if (P.trn_fighter_strike({ y: 1 }).up) return {};
      P.spend(10);
      if (!M[S.guard_knives] || M[S.a_8115]) return {};
      return P.trn_fighter_throw({ y: 1 });
    }
    if (M[S.fighter_state] >= 6) return {};
    if (P.trn_train_random().a >= 0x50) return {};
    if (M[S.fighter_floor] !== M[S.a_8D84]) return {};
    const d = diff(IR(S.a_8D76) | IR(S.a_8D78) << 8, M[S.fighter_x] | M[S.fighter_x_hi] << 8);
    M[0x9977] = d & 255;
    P.spend(30);
    if (d < 0) return {};
    if (!M[S.a_8115] && P.trn_train_random().a < 0x64 && M[0x9977] >= 0x28) return P.trn_fighter_throw({ y: 1 });
    P.spend(6);
    if (M[S.guard_delay]) { M[S.guard_delay]--; return {}; }
    return P.trn_fighter_strike({ y: 1 });
  };
  P.trn_guard_drop = function () {
    if (P.trn_guard_ground().up) return {};
    M[S.a_8D6A] = 4; M[S.tguard_timer] = 0x14; M[S.a_8D6C] = 2; M[S.a_8D80] = 0;
    M[S.a_8D72] = (M[S.a_8D72] & 0xF8) | 2;
    P.spend(40);
    return {};
  };
  P.trn_guard_get_up = function () {
    P.spend(6);
    if (IR(S.tguard_timer)) return {};
    const a = M[S.guard_bounced] ? 1 : 0;
    M[S.a_8D6C] = a; M[S.a_8D80] = a;
    P.spend(10);
    return {};
  };
  P.trn_guard_nothing = function () { P.spend(6); return {}; };
  P.trn_guard_jump = function () {
    P.spend(6);
    if (M[S.a_8D6A] !== 2) return {};
    const s = M[S.a_8DA1];
    if (s < 0x0A || s >= 0x16) return {};
    if (P.trn_guard_lands().up) return {};
    M[S.a_8D6C] = 0; M[S.a_8D80] = 0;
    M[S.a_8D72] = (M[S.a_8D72] & 0xF8) | 2;
    sound(0x0D);
    return {};
  };
  P.trn_guard_strike = function () {
    P.spend(8);
    if (IR(S.tguard_timer) !== 2 || M[S.fighter_state] >= 6) return {};
    if (((IR(S.a_8D76) - M[S.fighter_x]) & 255) >= 0x1E) return {};
    if (P.trn_train_random().a >= 0x1E) return {};
    sound(0x06);
    M[S.fighter_state] = 9; M[S.fighter_moving] = 0; M[S.arc_step] = 0; M[S.fighter_frame] = 0;
    M[S.fighter_facing] = ((M[S.a_8D82] - 1) & 255) ^ 0xFF;
    P.spend(40);
    return {};
  };
  // guard_move ($9A5F), from the frame interrupt
  P.trn_guard_move = function () {
    P.spend(6);
    if (!M[S.guard_on] || !M[S.a_8D80]) return {};
    add16(S.a_8D76, S.a_8D78, M[S.a_8D80] & 0x80 ? -3 : 3);
    P.spend(24);
    return {};
  };

  // ---- the computer's attacker
  P.trn_computer_attacker = function () {
    const x = M[S.fighter_state];
    M[0x9B26] = M[S.cpu_lo + x]; M[0x9B27] = M[S.cpu_hi + x];
    P.spend(24);
    return P[handlerAt(0x9B26)]({});
  };
  // j_9E3E: the time, then every few frames a stroke or a knife at a guard ahead
  const cpuFight = () => {
    if (P.trn_time_up().up) return {};
    P.spend(6);
    if (IR(S.tcpu_delay)) return {};
    M[S.tcpu_delay] = P.trn_train_random().a & 0x0F;
    P.spend(10);
    if (!M[S.guard_on] || M[S.a_8D6C] >= 5) return {};
    if (P.trn_fighter_strike({ y: 0 }).up) return {};
    P.spend(10);
    if (M[S.fighter_floor] !== M[S.a_8D84]) return {};
    const d = diff(IR(S.a_8D76) | IR(S.a_8D78) << 8, M[S.fighter_x] | M[S.fighter_x_hi] << 8);
    P.spend(20);
    if (d < 0 || !M[S.knives_left] || M[S.knife_on]) return {};
    return P.trn_fighter_throw({ y: 0 });
  };

  // ---- what the train does its own way
  // fighters_to_sprites ($8DA3): the attacker at x $64 where the scroll keeps him, the guard at its x
  P.trn_fighters_to_sprites = function () {
    let x = M[S.tlist_count];
    M[S.flist_ptr + x] = M[S.fighter_top]; M[S.f_8611 + x] = M[S.fighter_bottom];
    let v = (M[S.fighter_y] + M[S.fighter_dy]) & 255;
    M[S.flist_y + x] = v; M[S.f_85E1 + x] = (v + M[S.fighter_dy2]) & 255;
    M[S.flist_x + x] = 0x64; M[S.f_85F1 + x] = (0x64 + M[S.fighter_dx2]) & 255;
    M[S.flist_col + x] = M[S.fighter_colour]; M[S.f_8621 + x] = M[S.fighter_colour];
    M[S.flist_xhi + x] = 0; M[S.f_8601 + x] = 0;
    x = (x + 2) & 255;
    M[S.tlist_count] = x;
    P.spend(110);
    if (!M[S.guard_on]) return { x };
    M[S.flist_ptr + x] = M[S.a_8D6E]; M[S.f_8611 + x] = M[S.a_8D70];
    v = (M[S.a_8D72] + M[S.a_8D7A]) & 255;
    M[S.flist_y + x] = v; M[S.f_85E1 + x] = (v + M[S.a_8D7E]) & 255;
    const sx = M[S.a_8D76] + M[S.a_8D7C];
    M[S.flist_x + x] = M[S.a_8D76]; M[S.f_85F1 + x] = sx & 255;
    M[S.flist_xhi + x] = M[S.a_8D78]; M[S.f_8601 + x] = (M[S.a_8D78] + (sx > 255 ? 1 : 0)) & 255;
    M[S.flist_col + x] = M[S.a_8D74]; M[S.f_8621 + x] = M[S.a_8D74];
    x = (x + 2) & 255;
    M[S.tlist_count] = x;
    P.spend(110);
    return { x };
  };
  // attacker_stand ($91B0): on the ground only up and down count
  P.trn_attacker_stand = function () {
    P.spend(6);
    if (IR(S.tfighter_timer)) return {};
    P.spend(6);
    if (M[S.on_ground]) return P.trn_attacker_up_down();
    P.trn_attacker_stick();
    P.spend(6);
    if (!M[S.fstick_fire]) {
      if (P.trn_fighter_strike({ y: 0 }).up) return {};
      P.spend(10);
      if (M[S.knives_left] && !M[S.knife_on]) return P.trn_fighter_throw({ y: 0 });
    }
    const x = M[S.fstick_x];
    P.spend(10);
    if (x) {
      if (!(x & 0x80)) { M[S.fighter_moving] = 1; M[S.fighter_facing] = 1; walkState(1); }
      else {
        if (P.trn_at_start().up) return {};
        M[S.fighter_moving] = 0xFF; M[S.fighter_facing] = 0xFF;
        walkState(1);
      }
    }
    return P.trn_attacker_up_down();
  };
  // attacker_up_down ($9206): up a ladder or a jump, down a duck; no ladders go down
  P.trn_attacker_up_down = function () {
    if (P.trn_attacker_ground().up) return {};
    if (P.trn_time_up().up) return {};
    P.trn_attacker_stick();
    const y = M[S.fstick_y];
    P.spend(10);
    if (!y) { M[S.at_top] = 0; return {}; }
    if (!(y & 0x80)) { P.trn_attacker_duck(); M[S.at_top] = 0; return {}; }
    if (M[S.at_top]) return {};
    if (P.trn_ladder_up().up) return {};
    return jumpStart();
  };
  // j_922C: the jump from this floor
  const jumpStart = () => {
    M[S.fighter_state] = 2; M[S.fighter_moving] = 0; M[S.fighter_frame] = 0; M[S.arc_step] = 0;
    M[S.jump_floor] = M[S.fighter_floor];
    P.spend(30);
    return {};
  };
  // attacker_walk ($9262): there are no walls on the train
  P.trn_attacker_walk = function () {
    P.trn_attacker_stick();
    const x = M[S.fstick_x];
    P.spend(10);
    const stop = () => { M[S.fighter_state] = 0; M[S.fighter_moving] = 0; return {}; };
    if (!x) return stop();
    if (!(x & 0x80)) { if (M[S.fighter_moving] !== 1) return stop(); }
    else {
      if (M[S.fighter_moving] !== 0xFF) return stop();
      if (P.trn_at_start().up) return {};
    }
    return P.trn_attacker_up_down();
  };
  P.trn_attacker_climb = function () {
    P.spend(6);
    if (M[S.to_ladder]) {
      const c = IR((ptr(0x10) + M[S.ladder_col]) & 0xFFFF);
      P.spend(14);
      if (c !== M[S.ladder_char]) return {};
      M[S.to_ladder] = 0; M[S.fighter_moving] = 0; M[S.climb_dir] = 1;
      return {};
    }
    P.trn_attacker_stick();
    const y = M[S.fstick_y];
    P.spend(10);
    if (!y) { M[S.climb_dir] = 0; return {}; }
    if (!(y & 0x80)) { M[S.climb_dir] = 0xFF; return P.trn_climb_down(); }
    M[S.climb_dir] = 1;
    return P.trn_climb_up();
  };
  P.trn_attacker_jump = function () {
    P.spend(6);
    if (M[S.fighter_frame] !== 2) return {};
    const s = M[S.arc_step];
    P.spend(10);
    if (s < 0x0A || s >= 0x16) return {};
    if (P.trn_attacker_lands().up) return {};
    M[S.fighter_state] = 0; M[S.fighter_moving] = 0;
    M[S.fighter_y] = (M[S.fighter_y] & 0xF8) | 2;
    sound(0x0D);
    return {};
  };
  // ladder_up ($9433): a ladder in the first two cells of the row at the attacker's head
  P.trn_ladder_up = function () {
    let y = 1;
    for (; y >= 0; y--) { P.spend(14); if (IR((ptr(0x10) + y) & 0xFFFF) === 0x12) break; }
    if (y < 0) return { y: 0xFF };
    M[S.fighter_moving] = 0; M[S.to_ladder] = 0; M[S.fighter_state] = 5; M[S.fighter_frame] = 0; M[S.on_ground] = 0;
    M[S.climb_dir] = 1;
    P.spend(40);
    return { y, up: true };
  };
  P.trn_climb_up = function () {
    P.spend(8);
    if (M[S.fighter_floor] !== 0x0B) return {};
    M[S.fighter_state] = 0; M[S.climb_dir] = 0; M[S.fighter_moving] = 0; M[S.at_top] = 1; M[S.tfighter_timer] = 1;
    P.spend(24);
    return {};
  };
  // attacker_lands ($94B9): a floor under the feet lands the jump; a ladder there catches him
  P.trn_attacker_lands = function () {
    P.spend(6);
    if (!M[S.fighter_floor]) return {};
    if (onList(ptr(0x10), 0x7B, 0x94CD, S.tfloor_chars)) return {};
    P.spend(8);
    if (M[0x94CD] === 0x12) {
      M[S.fighter_moving] = 0; M[S.to_ladder] = 0; M[S.fighter_state] = 5; M[S.fighter_frame] = 0; M[S.on_ground] = 0;
      M[S.climb_dir] = 1;
      M[S.fighter_y] = (M[S.fighter_y] & 0xF8) | 2;
      P.spend(50);
    }
    return { up: true };
  };
  // guard_with_view ($96DD), from the frame interrupt: the guard kept in its place on the train as
  // the view moves; one on the ground falls behind; with the attacker on the ground, one on the
  // train goes away with it
  P.trn_guard_with_view = function () {
    P.spend(6);
    if (!M[S.guard_on]) return {};
    const done = () => { M[S.scroll_steps] = 0; P.spend(6); return {}; };
    P.spend(6);
    if (M[S.on_ground]) {
      if (!M[S.a_8D84] || !M[S.scroll_steps]) return {};
      add16(S.a_8D76, S.a_8D78, M[S.scroll_speed]);
      return done();
    }
    P.spend(6);
    if (!M[S.a_8D84]) { add16(S.a_8D76, S.a_8D78, -8); return done(); }
    if (!M[S.scroll_steps]) return {};
    let m = M[S.fighter_moving];
    if (!m) m = M[S.fighter_facing];
    add16(S.a_8D76, S.a_8D78, m & 0x80 ? M[S.scroll_speed] : -M[S.scroll_speed]);
    P.spend(24);
    return done();
  };
  P.trn_guard_walk = function () {
    if (P.trn_guard_ledge().up) return {};
    return P.trn_guard_stand();
  };
  // guard_start ($9A8F): a guard onto the roofs from the right, before the locomotive and while
  // the train has not gone
  P.trn_guard_start = function () {
    P.spend(10);
    if (M[S.guard_on] || M[S.fighter_state] === 7) return {};
    if ((IR(0x04) | IR(0x05) << 8) >= 0x26D6) return {};
    P.spend(6);
    if (IR(S.rear_columns)) return {};
    const y = M[R.attacker] ^ 1;
    P.spend(14);
    if (!M[R.cpu_union + y]) {
      P.trn_defender_stick();
      if (!M[S.fstick_y]) return {};
    } else {
      if (IR(S.tguard_start_timer)) return {};
      M[S.tguard_start_timer] = 0x32;
      if (P.trn_train_random().a >= 0xC8) return {};
    }
    M[S.a_8D72] = 0x52;
    P.spend(10);
    if (!M[S.guards_left]) return {};
    M[S.guards_left]--;
    M[S.a_8D76] = 0x50; M[S.a_8D78] = 1; M[S.guard_on] = 1;
    M[S.a_8D80] = 0xFF; M[S.a_8D82] = 0xFF;
    M[S.a_8D6C] = 1; M[S.tguard_timer] = 1;
    M[S.a_8D7A] = 0; M[S.a_8D7C] = 0; M[S.a_8D7E] = 0; M[S.a_8D6A] = 0; M[S.scroll_steps] = 0; M[S.guard_bounced] = 0;
    P.spend(80);
    return P.trn_guards_draw();
  };
  P.trn_cpu_climb = function () {
    M[S.attacker_bounced] = 0; M[S.on_ground] = 0;
    P.spend(10);
    if (M[S.to_ladder]) {
      const c = IR((ptr(0x10) + M[S.ladder_col]) & 0xFFFF);
      P.spend(14);
      if (c !== M[S.ladder_char]) return {};
      M[S.to_ladder] = 0; M[S.fighter_moving] = 0; M[S.climb_dir] = 1;
      return {};
    }
    M[S.climb_dir] = 1;
    M[S.tcpu_delay] = P.trn_train_random().a & 3;
    return P.trn_climb_up();
  };
  // cpu_stand ($9B71): on the ground, now and then back up a ladder, or a jump; on the train, walk
  P.trn_cpu_stand = function () {
    P.spend(6);
    if (!IR(S.tfighter_timer)) {
      P.spend(6);
      if (M[S.on_ground]) {
        const a = P.trn_train_random().a;
        P.spend(4);
        if (a < 0x19) {
          if (P.trn_ladder_up().up) return {};
          return jumpStart();
        }
        M[S.tfighter_timer] = a & 3;
        return {};
      }
      M[S.fighter_moving] = 1; M[S.fighter_state] = 1; M[S.fighter_frame] = 1; M[S.tfighter_timer] = 1;
      P.spend(20);
    }
    return cpuFight();
  };
  P.trn_cpu_walk = function () {
    if (P.trn_attacker_ground().up) return {};
    P.spend(6);
    if (!M[S.on_ground] && M[S.fighter_floor] !== 8 && P.trn_attacker_ledge().up) return {};
    M[S.at_top] = 0;
    return cpuFight();
  };

  // the handlers by their addresses, for the jmps through the state tables, which are read from
  // memory as the game reads them: every routine of the port at its label's address
  for (const k in S) if (typeof P['trn_' + k] === 'function') { at[S[k]] = 'trn_' + k; POSE_AT[S[k]] = 'trn_' + k; }
};
})(typeof window !== 'undefined' ? window : globalThis);
