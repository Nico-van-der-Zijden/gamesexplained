// The fort, second part: the two fighters (the attacker and a guard), their poses and their
// orders, a person's and the computer's; the floors, ladders, walls and ledges they meet; the
// knives, the dog and the barrel. The 6502's two pla that end a caller's pass (a wall, a ledge, a
// ladder, the start, the time up, a stroke) are an up: true the callers return on; the handlers
// chosen by state through a jmp ($FFFF) are tables of the port's functions.
(function (root) {
'use strict';
const G = root.NSGroups = root.NSGroups || {};
G.frt2 = function (P) {
  const M = P.M, S = root.NSSyms.frt, R = root.NSSyms.res;
  const IR = P.frtIR;
  const sound = a => P.frt_fort_sound({ a });
  const ptr = a => M[a] | M[a + 1] << 8;
  // a - b in 16 bits, negative when the high byte's top bit is set, as a bmi after the sbc reads it
  const diff = (a, b) => { const v = (a - b) & 0xFFFF; return v & 0x8000 ? v - 0x10000 : v; };
  const add16 = (lo, hi, d) => { const v = (M[lo] | M[hi] << 8) + d; M[lo] = v & 255; M[hi] = (v >> 8) & 255; };
  const inList = (list, v) => { for (let x = 0; ; x++) { const c = M[list + x]; P.spend(14); if (c & 0x80 && c === 0xFF) return false; if (c === v) return true; } };
  const notFF = (list, v) => { for (let x = 0; ; x++) { const c = M[list + x]; P.spend(14); if (c === 0xFF) return false; if (c === v) return true; } };
  // the guard's bytes are the attacker's + 1
  const F = k => S[k];

  P.frt_fighters_to_sprites = function () {
    let x = M[S.flist_count];
    M[S.flist_ptr + x] = M[S.fighter_top]; M[S.f_85B8 + x] = M[S.fighter_bottom];
    let v = (M[S.fighter_y] + M[S.fighter_dy]) & 255;
    M[S.flist_y + x] = v; M[S.f_8588 + x] = (v + M[S.fighter_dy2] + ((M[S.fighter_y] + M[S.fighter_dy]) > 255 ? 1 : 0)) & 255;
    M[S.flist_x + x] = 0x64; M[S.f_8598 + x] = (0x64 + M[S.fighter_dx2]) & 255;
    M[S.flist_col + x] = M[S.fighter_colour]; M[S.f_85C8 + x] = M[S.fighter_colour];
    M[S.flist_xhi + x] = 0; M[S.f_85A8 + x] = 0;
    x = (x + 2) & 255;
    M[S.flist_count] = x;
    P.spend(120);
    if (!M[S.guard_on]) return { x };
    M[S.flist_ptr + x] = M[S.a_8BE0]; M[S.f_85B8 + x] = M[S.a_8BE2];
    const s = M[S.a_8BE4] + M[S.a_8BEC];
    v = s & 255;
    M[S.flist_y + x] = v; M[S.f_8588 + x] = (v + M[S.a_8BF0] + (s > 255 ? 1 : 0)) & 255;
    const sx = M[S.a_8BE8] + M[S.a_8BEE];
    M[S.flist_x + x] = M[S.a_8BE8]; M[S.f_8598 + x] = sx & 255;
    M[S.flist_xhi + x] = M[S.a_8BEA]; M[S.f_85A8 + x] = (M[S.a_8BEA] + (sx > 255 ? 1 : 0)) & 255;
    M[S.flist_col + x] = M[S.a_8BE6]; M[S.f_85C8 + x] = M[S.a_8BE6];
    x = (x + 2) & 255;
    M[S.flist_count] = x;
    P.spend(120);
    return { x };
  };
  // fighter_pictures ($8CA0): each fighter's pose by its state; the guard's only when one is on
  P.frt_fighter_pictures = function () {
    let y = 1;
    P.spend(10);
    if (!M[S.guard_on]) y = 0;
    for (; y >= 0; y--) {
      M[S.pose_fighter] = y;
      const st = M[S.fighter_state + y];
      M[0x8CBA] = M[S.pose_lo + st]; M[0x8CBB] = M[S.pose_hi + st];
      const f = POSE_AT[ptr(0x8CBA)];
      if (!f) throw new Error('fighter_pictures: no pose at $' + ptr(0x8CBA).toString(16));
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
  P.frt_pose_uniform = function (r) {
    const x = M[S.pose_fighter];
    P.spend(14);
    const conf = x ? !M[R.attacker] : !!M[R.attacker];
    return { a: conf ? (r.a + 0x3C) & 255 : r.a };
  };
  P.frt_pose_stand = function (r) {
    const y = r.y;
    let a = 0x58;
    if (M[S.fighter_facing + y] & 0x80) a += 2;
    a = P.frt_pose_uniform({ a }).a;
    pose(y, a, a + 1, 0, 0, 0x15);
    return { y };
  };
  P.frt_pose_walk = function (r) {
    const y = r.y;
    let a = M[S.fighter_frame + y];
    if (!IR(S.fighter_timer + y)) {
      M[S.fighter_timer + y] = 4;
      a++;
      if (a >= 6) a = 0;
      M[S.fighter_frame + y] = a;
      P.spend(20);
    }
    a += 0x40;
    if (M[S.fighter_moving + y] & 0x80) a += 0x0C;
    a = P.frt_pose_uniform({ a: a & 255 }).a;
    pose(y, a, a + 6, 0, 0, 0x15);
    return { y };
  };
  P.frt_pose_jump = function (r) {
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
      a = P.frt_pose_uniform({ a }).a;
      pose(y, a, a + 6, 0, 0, 0x15);
      if (IR(S.fighter_timer + y)) return { y };
      M[S.fighter_timer + y] = 1;
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
      M[S.fighter_timer + y] = 5;
      M[S.fighter_frame + y] = (M[S.fighter_frame + y] + 1) & 255;
      P.spend(16);
    }
    let a = 0x64;
    if (M[S.fighter_facing + y] & 0x80) a += 2;
    a = P.frt_pose_uniform({ a }).a;
    pose(y, a, a + 1, 0, 0, 0x15);
    if (!IR(S.fighter_timer + y)) M[S.fighter_frame + y] = (M[S.fighter_frame + y] + 1) & 255;
    return { y };
  };
  P.frt_pose_strike = function (r) {
    const y = r.y;
    let a = M[S.fighter_frame + y];
    if (!IR(S.fighter_timer + y)) {
      M[S.fighter_timer + y] = 9;
      a++;
      P.spend(20);
      if (a >= 2) { M[S.fighter_state + y] = 0; M[S.fighter_timer + y] = 5; return { y }; }
      M[S.fighter_frame + y] = a;
    }
    a = ((a << 1) + 0x5C) & 255;
    if (M[S.fighter_facing + y] & 0x80) a += 4;
    a = P.frt_pose_uniform({ a: a & 255 }).a;
    pose(y, a, a + 1, 0, 0, 0x15);
    return { y };
  };
  P.frt_pose_climb = function (r) {
    let a = M[S.fighter_frame];
    if (!IR(S.fighter_timer) && M[S.climb_dir]) {
      M[S.fighter_y] = (M[S.fighter_y] + (M[S.climb_dir] & 0x80 ? 8 : -8)) & 255;
      M[S.fighter_timer] = 6;
      M[S.fighter_frame] ^= 1;
      a = M[S.fighter_frame];
      P.spend(30);
    }
    a = ((a << 1) + 0x6C) & 255;
    a = P.frt_pose_uniform({ a }).a;
    pose(0, a, a + 1, 0, 0, 0x15);
    return { y: r.y };
  };
  P.frt_pose_drop = function (r) {
    const y = r.y;
    M[S.fighter_dx2 + y] = 0x0C;
    let a = P.frt_pose_uniform({ a: 0x70 }).a;
    if (M[S.fighter_facing + y] & 0x80) {
      a = (a + 2) & 255;
      M[S.fighter_bottom + y] = a; M[S.fighter_top + y] = (a + 1) & 255;
      M[S.fighter_dy2 + y] = 0xF2; M[S.fighter_dy + y] = 0x0E;
    } else {
      M[S.fighter_top + y] = a; M[S.fighter_bottom + y] = (a + 1) & 255;
      M[S.fighter_dy2 + y] = 0x0E; M[S.fighter_dy + y] = 0;
    }
    P.spend(40);
    if (IR(S.fighter_timer + y)) return { y };
    M[S.fighter_timer + y] = 1;
    M[S.fighter_y + y] = (M[S.fighter_y + y] + 4) & 255;
    return { y };
  };
  P.frt_pose_beaten = function (r) {
    M[S.fighter_dx2] = 0x18;
    let a = P.frt_pose_uniform({ a: 0x74 }).a;
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
    if (IR(S.fighter_timer)) return { y: r.y };
    M[S.fighter_timer] = 6;
    let f = M[S.fighter_frame] + 1;
    if (f >= 3) f = 0;
    M[S.fighter_frame] = f;
    return { y: r.y };
  };
  P.frt_pose_down = function (r) {
    const y = r.y;
    M[S.fighter_dx2 + y] = 0x18;
    let a = P.frt_pose_uniform({ a: 0x68 }).a;
    if (M[S.fighter_facing + y] & 0x80) {
      a = (a + 2) & 255;
      M[S.fighter_bottom + y] = a; M[S.fighter_top + y] = (a + 1) & 255;
    } else { M[S.fighter_top + y] = a; M[S.fighter_bottom + y] = (a + 1) & 255; }
    M[S.fighter_dy + y] = 0x12; M[S.fighter_dy2 + y] = 0;
    P.spend(40);
    return { y };
  };
  P.frt_pose_knocked = function (r) {
    const y = r.y;
    M[S.fighter_dx2 + y] = 0x0C;
    let a = P.frt_pose_uniform({ a: 0x70 }).a;
    if (M[S.fighter_facing + y] & 0x80) {
      a = (a + 3) & 255;
      M[S.fighter_top + y] = a; M[S.fighter_bottom + y] = (a - 1) & 255;
      M[S.fighter_dy2 + y] = 0xF2; M[S.fighter_dy + y] = 0x0E;
    } else {
      M[S.fighter_top + y] = a; M[S.fighter_bottom + y] = (a + 1) & 255;
      M[S.fighter_dy2 + y] = 0x0E; M[S.fighter_dy + y] = 0;
    }
    P.spend(40);
    if (IR(S.fighter_timer + y)) return { y };
    M[S.fighter_timer + y] = 1;
    const x = M[S.arc_step + y], d = M[S.jump_arc + x];
    P.spend(20);
    if (d === 0x80) {
      M[S.fighter_state + y] = 8; M[S.fighter_moving + y] = 0; M[S.arc_step + y] = 0; M[S.fighter_timer + y] = 0x32;
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
    if (!f) throw new Error('fort: no handler at $' + a.toString(16) + ' (the jmp through $' + op.toString(16) + ')');
    return f;
  };
  P.frt_attacker_orders = function () {
    const y = M[R.attacker];
    P.spend(10);
    if (M[R.cpu_union + y]) return P.frt_computer_attacker();
    const x = M[S.fighter_state];
    M[0x900C] = M[S.attacker_lo + x]; M[0x900D] = M[S.attacker_hi + x];
    P.spend(24);
    return P[handlerAt(0x900C)]({});
  };
  P.frt_fort_nothing = function () { P.spend(6); return {}; };
  P.frt_attacker_stand = function () {
    P.spend(6);
    if (IR(S.fighter_timer)) return {};
    P.frt_attacker_stick();
    P.spend(6);
    if (!M[S.fstick_fire]) {
      if (P.frt_fighter_strike({ y: 0 }).up) return {};
      P.spend(10);
      if (M[S.knives_left] && !M[S.knife_on]) return P.frt_fighter_throw({ y: 0 });
    }
    const x = M[S.fstick_x];
    P.spend(10);
    if (x) {
      if (!(x & 0x80)) { M[S.fighter_moving] = 1; M[S.fighter_facing] = 1; walkState(1); }
      else {
        if (P.frt_at_start().up) return {};
        M[S.fighter_moving] = 0xFF; M[S.fighter_facing] = 0xFF;
        walkState(1);
      }
    }
    return P.frt_attacker_up_down();
  };
  const walkState = a => { M[S.fighter_state] = a; M[S.fighter_frame] = 0; M[S.fighter_timer] = 0; P.spend(20); };
  P.frt_attacker_up_down = function () {
    if (P.frt_attacker_ground().up) return {};
    if (P.frt_time_up().up) return {};
    P.frt_attacker_stick();
    const y = M[S.fstick_y];
    P.spend(10);
    if (!y) { M[S.at_top] = 0; return {}; }
    if (!(y & 0x80)) {
      if (P.frt_ladder_down().up) return {};
      P.frt_attacker_duck();
      M[S.at_top] = 0;
      return {};
    }
    if (M[S.at_top]) return {};
    if (P.frt_ladder_up().up) return {};
    if (P.frt_at_start().up) return {};
    M[S.fighter_state] = 2; M[S.fighter_moving] = 0; M[S.fighter_frame] = 0; M[S.arc_step] = 0;
    M[S.jump_floor] = M[S.fighter_floor];
    P.spend(30);
    return {};
  };
  P.frt_attacker_duck = function () {
    M[S.fighter_frame] = 4; M[S.fighter_timer] = 0x19; M[S.fighter_state] = 2; M[S.fighter_moving] = 0;
    M[S.fighter_y] = (M[S.fighter_y] & 0xF8) | 2;
    P.spend(40);
    return {};
  };
  P.frt_attacker_walk = function () {
    P.frt_attacker_stick();
    const x = M[S.fstick_x];
    P.spend(10);
    const stop = () => { M[S.fighter_state] = 0; M[S.fighter_moving] = 0; return {}; };
    if (!x) return stop();
    if (!(x & 0x80)) {
      if (M[S.fighter_moving] !== 1) return stop();
      if (P.frt_wall_right().up) return {};
    } else {
      if (M[S.fighter_moving] !== 0xFF) return stop();
      if (P.frt_wall_left().up) return {};
      if (P.frt_at_start().up) return {};
    }
    return P.frt_attacker_up_down();
  };
  P.frt_attacker_climb = function () {
    P.spend(6);
    if (M[S.to_ladder]) {
      const c = M[(ptr(0x10) + M[S.ladder_col]) & 0xFFFF];
      P.spend(14);
      if (c !== M[S.ladder_char]) return {};
      M[S.to_ladder] = 0; M[S.fighter_moving] = 0; M[S.climb_dir] = 1;
      return {};
    }
    if (IR(S.fine_scroll)) M[S.fine_scroll] = (IR(S.fine_scroll) - 1) & 255;
    P.frt_attacker_stick();
    const y = M[S.fstick_y];
    P.spend(10);
    if (!y) { M[S.climb_dir] = 0; return {}; }
    if (!(y & 0x80)) { M[S.climb_dir] = 0xFF; return P.frt_climb_down(); }
    M[S.climb_dir] = 1;
    return P.frt_climb_up();
  };
  P.frt_attacker_drop = function () {
    if (P.frt_attacker_ground().up) return {};
    M[S.fighter_frame] = 4; M[S.fighter_timer] = 0x14; M[S.fighter_state] = 2; M[S.fighter_moving] = 0;
    M[S.fighter_y] = (M[S.fighter_y] & 0xF8) | 2;
    P.spend(40);
    sound(0x0D);
    return {};
  };
  P.frt_attacker_jump = function () {
    P.spend(6);
    if (M[S.fighter_frame] !== 2) return {};
    if (M[S.fighter_moving] & 0x80) { if (P.frt_wall_left().up) return {}; }
    else if (P.frt_wall_right().up) return {};
    const s = M[S.arc_step];
    P.spend(10);
    if (s < 0x0A || s >= 0x16) return {};
    if (P.frt_attacker_lands().up) return {};
    M[S.fighter_state] = 0; M[S.fighter_moving] = 0;
    M[S.fighter_y] = (M[S.fighter_y] & 0xF8) | 2;
    sound(0x0D);
    return {};
  };
  P.frt_attacker_get_up = function () {
    P.spend(6);
    if (IR(S.fighter_timer)) return {};
    M[S.fighter_state] = 0; M[S.fighter_moving] = 0; M[S.guard_delay] = 2;
    return {};
  };
  P.frt_attacker_strike = function () {
    P.spend(8);
    if (IR(S.fighter_timer) !== 2) return {};
    if (M[S.a_8BDE] >= 6) return {};
    if (((IR(S.a_8BE8) - M[S.fighter_x]) & 255) >= 0x1E) return {};
    if (M[S.fighter_floor] !== M[S.a_8BF6]) return {};
    if (P.frt_fort_random().a >= 0x14) return {};
    sound(0x06);
    M[S.a_8BDE] = 9; M[S.a_8BF2] = 0; M[S.a_8C13] = 0; M[S.a_8BDC] = 0;
    M[S.a_8BF4] = ((M[S.fighter_facing] - 1) & 255) ^ 0xFF;
    P.spend(40);
    return {};
  };
  // the walls: the cell's character kept in the operand of the cmp after the list's load
  const wall = (base, y0, ymax, step, op) => {
    for (let y = y0; y < ymax; y += step) {
      const c = M[(base + y) & 0xFFFF];
      M[op] = c;
      P.spend(20);
      if (notFF(S.wall_chars, c)) return true;
    }
    return false;
  };
  P.frt_wall_right = function () {
    if (!wall(ptr(0x10), 5, 0xA0, 0x28, 0x9252)) return {};
    M[S.fighter_moving] = 0xFF; M[S.fighter_state] = 9; M[S.attacker_bounced] = 1;
    sound(0x13);
    return { up: true };
  };
  P.frt_wall_left = function () {
    if (!wall(ptr(0x10), 0, 0xA0, 0x28, 0x928B)) return {};
    M[S.fighter_moving] = 1; M[S.fighter_state] = 9;
    sound(0x13);
    return { up: true };
  };
  P.frt_guard_wall = function () {
    if (!wall(ptr(0x20), 0x26, 0x9E, 0x28, 0x92BF)) return {};
    M[S.a_8BF2] = 1; M[S.a_8BDE] = 9; M[S.guard_bounced] = 1; M[S.a_8C13] = 0; M[S.a_8BDC] = 0;
    sound(0x13);
    return { up: true };
  };
  P.frt_dog_start = function () {
    P.spend(6);
    if (M[S.dog_on] || IR(S.dog_timer)) return {};
    M[S.dog_timer] = 0x96;
    const l = M[R.level + (M[R.attacker] ^ 1)];
    P.spend(20);
    if (P.frt_fort_random().a >= M[S.dog_chance + l]) return {};
    if (P.frt_fort_random().a & 0x80) { M[S.dog_dir] = 0xFF; M[S.dog_on] = 1; M[S.dog_x_hi] = 1; M[S.dog_x] = 0x50; }
    else { M[S.dog_dir] = 1; M[S.dog_on] = 1; M[S.dog_x_hi] = 0; M[S.dog_x] = 0; }
    P.spend(30);
    return {};
  };
  // attacker_floor ($9339), guard_floor ($935F): the floor and the rows' screen address; the row
  // kept in the operand of the sbc at $934A or $9370
  P.frt_attacker_floor = function () {
    const r = M[S.fighter_y] >> 3;
    M[0x934B] = r;
    const x = (((r - 4) & 255) << 1) & 255;
    M[S.fighter_floor] = (0x15 - M[0x934B]) & 255;
    const v = M[S.row_offsets + x] + 7;
    M[0x10] = v & 255;
    M[0x11] = (M[S.f_88BC + x] + 0x48 + (v > 255 ? 1 : 0)) & 255;
    P.spend(60);
    return { x };
  };
  P.frt_guard_floor = function () {
    const r = M[S.a_8BE4] >> 3;
    M[0x9371] = r;
    const x = (((r - 5) & 255) << 1) & 255;
    M[S.a_8BF6] = (0x15 - M[0x9371]) & 255;
    let v = M[S.row_offsets + x];
    M[0x20] = v & 255;
    M[0x21] = (M[S.f_88BC + x] + 0x48) & 255;
    const gx = IR(S.a_8BE8) | ((IR(S.a_8BEA) & 1) << 8);
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
  // ladder_up ($93BA): up when the climb starts
  P.frt_ladder_up = function () {
    let y = 0x2D;
    for (; y >= 0x28; y--) { P.spend(14); if (M[(ptr(0x10) + y) & 0xFFFF] === 0x10) break; }
    if (y < 0x28) return {};
    M[S.ladder_char] = 0x10; M[S.ladder_col] = 0x2B;
    sidle(y, 0x2B);
    M[S.fighter_state] = 5; M[S.fighter_frame] = 0; M[S.climb_dir] = 1;
    P.spend(30);
    return { up: true };
  };
  const sidle = (y, col) => {
    if (y === col) { M[S.fighter_moving] = 0; M[S.to_ladder] = 0; M[S.fine_scroll] = 0; }
    else { const d = y > col ? 1 : 0xFF; M[S.fighter_moving] = d; M[S.to_ladder] = d; }
    P.spend(20);
  };
  P.frt_climb_up = function () {
    P.spend(8);
    if (M[S.fighter_floor] !== 0x0B) return {};
    M[S.fighter_state] = 0; M[S.climb_dir] = 0; M[S.fighter_moving] = 0; M[S.at_top] = 1; M[S.fighter_timer] = 1;
    return {};
  };
  P.frt_climb_down = function () {
    P.spend(8);
    if (M[S.fighter_floor]) return {};
    M[S.fighter_state] = 0; M[S.climb_dir] = 0; M[S.on_ground] = 1;
    return {};
  };
  P.frt_ladder_down = function () {
    let y = 0x7D;
    for (; y >= 0x78; y--) { P.spend(14); if (M[(ptr(0x10) + y) & 0xFFFF] === 0x12) break; }
    if (y < 0x78) return {};
    M[S.ladder_char] = 0x10; M[S.ladder_col] = 0x7B;
    sidle(y, 0x7B);
    M[S.fighter_state] = 5; M[S.fighter_frame] = 0; M[S.climb_dir] = 0xFF;
    P.spend(30);
    return { up: true };
  };
  // the floors under the feet, the cell's character in the operand of the list's cmp
  const onList = (base, y, op, list) => { const c = M[(base + y) & 0xFFFF]; M[op] = c; P.spend(20); return inList(list, c); };
  P.frt_attacker_ground = function () {
    P.spend(6);
    if (!M[S.fighter_floor]) { M[S.on_ground] = 1; return {}; }
    if (onList(ptr(0x10), 0x7B, 0x949E, S.floor_chars)) return {};
    M[S.fighter_state] = 6; M[S.fighter_moving] = M[S.fighter_facing];
    return { up: true };
  };
  P.frt_attacker_lands = function () {
    P.spend(6);
    if (!M[S.fighter_floor]) return {};
    if (onList(ptr(0x10), 0x7B, 0x94CD, S.landing_chars)) return {};
    return { up: true };
  };
  P.frt_guard_ground = function () {
    P.spend(8);
    if (M[S.guard_checks_off] || !M[S.a_8BF6]) return {};
    if (onList(ptr(0x20), 0x9E, 0x94F0, S.floor_chars)) return {};
    M[S.a_8BDE] = 6; M[S.a_8BF2] = M[S.a_8BF4];
    return { up: true };
  };
  P.frt_guard_ledge = function () {
    P.spend(8);
    if (M[S.guard_checks_off] || !M[S.a_8BF6]) return {};
    if (onList(ptr(0x20), 0x9D, 0x951E, S.floor_chars)) return {};
    M[S.a_8BDE] = 2; M[S.a_8C13] = 0; M[S.a_8BDC] = 0; M[S.a_8BF2] = 0;
    return { up: true };
  };
  P.frt_attacker_ledge = function () {
    if (onList(ptr(0x10), 0x7D, 0x9547, S.floor_chars)) return {};
    M[S.fighter_state] = 2; M[S.arc_step] = 0; M[S.fighter_frame] = 0; M[S.fighter_moving] = 0;
    return { up: true };
  };
  P.frt_guard_lands = function () {
    P.spend(6);
    if (!M[S.a_8BF6]) return {};
    if (onList(ptr(0x20), 0x9E, 0x9575, S.landing_chars)) return {};
    return { up: true };
  };
  // fighter_strike ($957F): fighter Y's stroke; the distance in the operand of the cmp at $95A2;
  // up when it strikes, or when the guard is to the attacker's left
  P.frt_fighter_strike = function (r) {
    const y = r.y;
    P.spend(10);
    if (!M[S.guard_on] || M[S.fighter_floor] !== M[S.a_8BF6]) return { y };
    const d = diff(IR(S.a_8BE8) | IR(S.a_8BEA) << 8, M[S.fighter_x] | M[S.fighter_x_hi] << 8);
    M[0x95A1] = d & 255;
    P.spend(30);
    if (d < 0) return { y, up: true };
    if ((d >> 8) & 255) return { y };
    if (M[0x95A1] >= 0x1E) return { y };
    if (P.frt_fort_random().a < 5) {
      M[S.fighter_state + y] = 1; M[S.fighter_moving + y] = M[S.fighter_facing + y];
      return { y };
    }
    sound(0x1E);
    M[S.fighter_state + y] = 3; M[S.fighter_frame + y] = 0; M[S.fighter_moving + y] = 0; M[S.fighter_timer + y] = 5;
    P.spend(30);
    return { y, up: true };
  };
  P.frt_fighter_throw = function (r) {
    const y = r.y;
    sound(0x14);
    M[S.fighter_state + y] = 4; M[S.fighter_frame + y] = 0; M[S.fighter_moving + y] = 0; M[S.fighter_timer + y] = 5;
    M[S.knife_on + y] = 1;
    M[S.knives_left + y] = (M[S.knives_left + y] - 1) & 255;
    M[S.knife_x + y] = M[S.fighter_x + y]; M[S.knife_x_hi + y] = M[S.fighter_x_hi + y];
    M[S.knife_y + y] = (M[S.fighter_y + y] + 0x10) & 255;
    M[S.knife_dir + y] = M[S.fighter_facing + y];
    P.spend(90);
    if (y === 0) return { y: P.frt_knives_draw().y };
    return { y };
  };
  P.frt_knives_draw = function () {
    let y = M[S.knives_left];
    for (let x = 1; x < 5; x++) {
      if (y && !(y & 0x80)) { M[0x4800 + x] = 0xFE; M[0x4828 + x] = 0xFF; }
      else { M[0x4800 + x] = 0; M[0x4828 + x] = 0; }
      y = (y - 1) & 255;
      P.spend(24);
    }
    return { x: 5, y };
  };
  P.frt_guards_draw = function () {
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
  P.frt_knives_to_sprites = function () {
    for (let y = 1; y >= 0; y--) {
      P.spend(8);
      if (!M[S.knife_on + y]) continue;
      const x = M[S.flist_count];
      M[S.flist_col + x] = 1;
      M[S.flist_ptr + x] = M[S.knife_dir + y] & 0x80 ? 0xDC : 0xDB;
      M[S.flist_x + x] = M[S.knife_x + y]; M[S.flist_xhi + x] = M[S.knife_x_hi + y]; M[S.flist_y + x] = M[S.knife_y + y];
      M[S.flist_count]++;
      P.spend(60);
    }
    return {};
  };
  // a fighter's place against something's: within 24 pixels either side (the low byte of the
  // difference in the operand of the cmp at hiOp + 1)
  const near = (y, ox, oxh, op) => {
    const d = diff(M[S.fighter_x + y] | M[S.fighter_x_hi + y] << 8, IR(ox) | IR(oxh) << 8);
    M[op] = d & 255;
    P.spend(30);
    if (d >= 0) return !((d >> 8) & 255) && M[op] < 0x18;
    return ((d >> 8) & 255) === 0xFF && M[op] >= 0xE8;
  };
  const turnBack = y => { M[S.fighter_moving + y] = ((M[S.fighter_moving + y] - 1) & 255) ^ 0xFF; };
  P.frt_barrel_hits = function () {
    P.spend(6);
    if (!M[S.barrel_on]) return {};
    if (!M[S.barrel_frame]) {
      for (let y = 1; y >= 0; y--) {
        P.spend(10);
        if (!M[S.attacker_on + y] || M[S.fighter_floor + y]) continue;
        if (!near(y, S.barrel_x, S.barrel_x_hi, 0x96DD)) continue;
        M[S.fighter_state + y] = 9;
        sound(0x0F);
        M[S.barrel_frame] = 1; M[S.barrel_timer] = 3;
        M[S.arc_step + y] = 0; M[S.fighter_frame + y] = 0;
        turnBack(y);
        return {};
      }
      return {};
    }
    if (IR(S.barrel_timer)) return {};
    M[S.barrel_timer] = 3;
    const a = M[S.barrel_frame] + 1;
    P.spend(14);
    if (a >= 0x0A) { M[S.barrel_frame] = 0; M[S.barrel_on] = 0; return {}; }
    M[S.barrel_frame] = a;
    return {};
  };
  P.frt_dog_bites = function () {
    P.spend(6);
    if (!M[S.dog_on]) return {};
    for (let y = 1; y >= 0; y--) {
      P.spend(14);
      if (M[S.fighter_state + y] >= 5 || !M[S.attacker_on + y] || M[S.fighter_floor + y]) continue;
      if (!near(y, S.dog_x, S.dog_x_hi, 0x976A)) continue;
      M[S.arc_step + y] = 0;
      sound(0x07);
      M[S.fighter_state + y] = 9; M[S.fighter_frame + y] = 9;
      turnBack(y);
      return {};
    }
    return {};
  };
  P.frt_barrel_sprite = function () {
    P.spend(6);
    if (!M[S.barrel_on]) return {};
    const x = M[S.flist_count];
    M[S.flist_col + x] = 2; M[S.flist_ptr + x] = (0xB8 + M[S.barrel_frame]) & 255;
    M[S.flist_x + x] = M[S.barrel_x]; M[S.flist_xhi + x] = M[S.barrel_x_hi]; M[S.flist_y + x] = M[S.barrel_y];
    M[S.flist_count]++;
    P.spend(60);
    return {};
  };
  P.frt_dog_sprite = function () {
    P.spend(6);
    if (!M[S.dog_on]) return {};
    const x = M[S.flist_count];
    M[S.flist_col + x] = 0x0B; M[S.f_85C8 + x] = 0x0B;
    const v = M[S.dog_x] + 0x18;
    let p;
    if (M[S.dog_dir] & 0x80) {
      M[S.f_8598 + x] = M[S.dog_x]; M[S.flist_x + x] = v & 255;
      M[S.f_85A8 + x] = M[S.dog_x_hi]; M[S.flist_xhi + x] = (M[S.dog_x_hi] + (v > 255 ? 1 : 0)) & 255;
      p = 0xCE;
    } else {
      M[S.flist_x + x] = M[S.dog_x]; M[S.f_8598 + x] = v & 255;
      M[S.flist_xhi + x] = M[S.dog_x_hi]; M[S.f_85A8 + x] = (M[S.dog_x_hi] + (v > 255 ? 1 : 0)) & 255;
      p = 0xC8;
    }
    p = (p + M[S.dog_frame]) & 255;
    M[S.flist_ptr + x] = p; M[S.f_85B8 + x] = (p + 3) & 255;
    M[S.flist_y + x] = M[S.dog_y]; M[S.f_8588 + x] = M[S.dog_y];
    M[S.flist_count] = (M[S.flist_count] + 2) & 255;
    P.spend(110);
    return {};
  };
  P.frt_dog_run = function () {
    P.spend(6);
    if (!M[S.dog_on] || IR(S.dog_move_timer)) return {};
    M[S.dog_move_timer] = 5;
    add16(S.dog_x, S.dog_x_hi, M[S.dog_dir] & 0x80 ? -10 : 10);
    let a = M[S.dog_frame] + 1;
    if (a >= 3) a = 0;
    M[S.dog_frame] = a;
    P.spend(40);
    if (P.frt_fort_random().a < 0x0A) sound(0x1D);
    return {};
  };
  // the scrolls from the frame interrupt: each thing moves against the attacker's walk
  const against = (lo, hi) => {
    const m = M[S.fighter_moving];
    P.spend(10);
    if (!m) return;
    add16(lo, hi, m & 0x80 ? M[S.scroll_speed] : -M[S.scroll_speed]);
    P.spend(20);
  };
  P.frt_dog_scroll = function () { P.spend(6); if (M[S.dog_on]) against(S.dog_x, S.dog_x_hi); return {}; };
  P.frt_barrel_scroll = function () { P.spend(6); if (M[S.barrel_on]) against(S.barrel_x, S.barrel_x_hi); return {}; };
  P.frt_guard_scroll = function () {
    P.spend(6);
    if (!M[S.guard_on]) return {};
    while (M[S.scroll_steps]) {
      let m = M[S.fighter_moving];
      if (!m) m = M[S.fighter_facing];
      add16(S.a_8BE8, S.a_8BEA, m & 0x80 ? M[S.scroll_speed] : -M[S.scroll_speed]);
      M[S.scroll_steps]--;
      P.spend(40);
    }
    return {};
  };
  P.frt_dog_gone = function () {
    P.spend(6);
    if (!M[S.dog_on]) return {};
    const h = IR(S.dog_x_hi);
    if (!h) return {};
    if (!(h & 0x80) && IR(S.dog_x) < 0x50) return {};
    M[S.dog_on] = 0;
    return {};
  };
  P.frt_barrel_gone = function () {
    P.spend(6);
    if (!M[S.barrel_on]) return {};
    const h = IR(S.barrel_x_hi);
    if (!h) return {};
    if (!(h & 0x80) && IR(S.barrel_x) < 0x50) return {};
    M[S.barrel_on] = 0;
    return {};
  };
  P.frt_barrel_start = function () {
    const m = IR(S.scroll_moved);
    P.spend(6);
    if (!m) return {};
    M[S.scroll_moved] = 0;
    if (!(m & 0x80)) {
      M[S.barrel_count] = (M[S.barrel_count] + 1) & 255;
      P.spend(14);
      if (M[S.barrel_count] !== 0x3C) return {};
      M[S.barrel_on] = 1; M[S.barrel_x_hi] = 1; M[S.barrel_x] = 0x48; M[S.barrel_frame] = 0; M[S.barrel_count] = 0;
      return {};
    }
    const c = (M[S.barrel_count] - 1) & 255;
    M[S.barrel_count] = c;
    P.spend(14);
    if (c & 0x80) { M[S.barrel_count] = 0x3B; return {}; }
    if (c !== 0x13) return {};
    M[S.barrel_on] = 1; M[S.barrel_x] = 8; M[S.barrel_x_hi] = 0; M[S.barrel_frame] = 0;
    return {};
  };
  P.frt_guard_gone = function () {
    P.spend(6);
    if (!M[S.guard_on]) return {};
    const h = IR(S.a_8BEA);
    if (!h) return {};
    if (h === 1) { if (IR(S.a_8BE8) < 0x5A || !IR(S.a_8BEA)) return {}; }
    M[S.guard_on] = 0;
    return {};
  };
  P.frt_knives_fly = function () {
    for (let y = 1; y >= 0; y--) {
      P.spend(10);
      if (!M[S.knife_on + y] || IR(S.knife_timer + y)) continue;
      M[S.knife_timer + y] = 1;
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
  // at_start ($9A39): up when the attacker would go back past the fort's start
  P.frt_at_start = function () {
    P.spend(10);
    if ((IR(0x04) | IR(0x05) << 8) >= (M[S.start_lo] | M[S.start_hi] << 8)) return {};
    M[S.fighter_state] = 0; M[S.fighter_moving] = 0;
    return { up: true };
  };
  P.frt_time_up = function () {
    P.spend(6);
    if (!M[S.time_over]) return {};
    M[S.fighter_moving] = 0; M[S.fighter_state] = 7;
    return { up: true };
  };
  // knife_hits ($9A63): knife X against fighter Y, the other side's; the difference in the operand
  // of the cmp at $9AA9
  P.frt_knife_hits = function () {
    for (let x = 1, y = 0; x >= 0; x--, y++) {
      P.spend(10);
      if (!M[S.knife_on + x]) continue;
      const st = M[S.fighter_state + y];
      if (st >= 5 || (st === 2 && M[S.fighter_frame + y] >= 4)) continue;
      if (!M[S.attacker_on + y]) continue;
      const dy = M[S.fighter_y + y] + 0x28 - M[S.knife_y + x];
      P.spend(20);
      if (((M[S.fighter_y + y] + 0x28) & 255) < M[S.knife_y + x] || ((dy) & 255) >= 0x28) continue;
      const d = diff(M[S.fighter_x + y] | M[S.fighter_x_hi + y] << 8, M[S.knife_x + x] | M[S.knife_x_hi + x] << 8);
      M[0x9AA8] = d & 255;
      P.spend(20);
      const hi = (d >> 8) & 255;
      if (!(hi & 0x80)) { if (hi || M[0x9AA8] >= 0x10) continue; }
      else if (((hi + 1) & 255) || M[0x9AA8] < 0xE8) continue;
      if (M[S.fighter_state + y] !== 2) M[S.arc_step + y] = 0;
      M[S.fighter_state + y] = 9; M[S.fighter_frame + y] = 9;
      turnBack(y);
      M[S.knife_on + x] = 0;
      sound(0x1C);
    }
    return {};
  };

  // ---- the defender
  P.frt_defender_orders = function () {
    P.spend(6);
    if (!M[S.guard_on]) return {};
    const x = M[S.a_8BDE];
    M[0x9B02] = M[S.guard_lo + x]; M[0x9B03] = M[S.guard_hi + x];
    P.spend(24);
    return P[handlerAt(0x9B02)]({});
  };
  P.frt_guard_walk = function () {
    if (P.frt_guard_ledge().up) return {};
    P.spend(8);
    if (M[S.a_8BF2] !== 1 && P.frt_guard_wall().up) return {};
    return P.frt_guard_stand();
  };
  P.frt_guard_stand = function () {
    P.spend(6);
    if (IR(S.guard_timer)) return {};
    if (P.frt_guard_ground().up) return {};
    const gx = IR(S.a_8BE8);
    P.spend(14);
    const walkLeft = () => {
      if (M[S.a_8BF2]) return {};
      M[S.a_8BF2] = 0xFF; M[S.a_8BF4] = 0xFF; M[S.a_8BDE] = 1; M[S.a_8BDC] = 0; M[S.guard_timer] = 0;
      P.spend(30);
      return {};
    };
    if (IR(S.a_8BEA) || gx >= 0x7F) {
      // a stroke ends the pass here (its two pla, reached by jmp, take guard_fight's return)
      if (P.frt_guard_fight().up) return {};
      if (M[S.a_8BDE] === 3) return {};
      return walkLeft();
    }
    if (gx < 0x64) return walkLeft();
    const st = M[S.fighter_state];
    if (st < 5) {
      if (st === 2) {
        if (M[S.a_8BF6] !== M[S.jump_floor]) return walkLeft();
        sound(0x06);
        M[S.fighter_state] = 9; M[S.fighter_moving] = 0; M[S.fighter_frame] = 0;
        M[S.fighter_facing] = ((M[S.a_8BF4] - 1) & 255) ^ 0xFF;
      } else if (M[S.fighter_floor] !== M[S.a_8BF6]) return walkLeft();
    }
    M[S.a_8BDE] = 0; M[S.a_8BF2] = 0;
    P.frt_guard_fight();
    return {};
  };
  // guard_fight ($9BAA): the distance in the operand of the cmp at $9BEB
  P.frt_guard_fight = function () {
    const y = M[R.attacker] ^ 1;
    P.spend(10);
    if (!M[R.cpu_union + y]) {
      P.frt_defender_stick();
      P.spend(6);
      if (M[S.fstick_fire]) return {};
      if (M[S.guard_delay]) { M[S.guard_delay]--; return {}; }
      if (P.frt_fighter_strike({ y: 1 }).up) return {};
      P.spend(10);
      if (!M[S.guard_knives] || M[S.a_8118]) return {};
      return P.frt_fighter_throw({ y: 1 });
    }
    if (M[S.fighter_state] >= 6) return {};
    if (P.frt_fort_random().a >= 0x50) return {};
    if (M[S.fighter_floor] !== M[S.a_8BF6]) return {};
    const d = diff(IR(S.a_8BE8) | IR(S.a_8BEA) << 8, M[S.fighter_x] | M[S.fighter_x_hi] << 8);
    M[0x9BEA] = d & 255;
    P.spend(30);
    if (d < 0) return {};
    if (!M[S.a_8118] && P.frt_fort_random().a < 0x64 && M[0x9BEA] >= 0x28) return P.frt_fighter_throw({ y: 1 });
    P.spend(6);
    if (M[S.guard_delay]) { M[S.guard_delay]--; return {}; }
    return P.frt_fighter_strike({ y: 1 });
  };
  P.frt_guard_drop = function () {
    if (P.frt_guard_ground().up) return {};
    M[S.a_8BDC] = 4; M[S.guard_timer] = 0x14; M[S.a_8BDE] = 2; M[S.a_8BF2] = 0;
    M[S.a_8BE4] = (M[S.a_8BE4] & 0xF8) | 2;
    P.spend(40);
    return {};
  };
  P.frt_guard_get_up = function () {
    P.spend(6);
    if (IR(S.guard_timer)) return {};
    const a = M[S.guard_bounced] ? 1 : 0;
    M[S.a_8BDE] = a; M[S.a_8BF2] = a;
    P.spend(10);
    return {};
  };
  P.frt_guard_nothing = function () { P.spend(6); return {}; };
  P.frt_guard_jump = function () {
    P.spend(6);
    if (M[S.a_8BDC] !== 2) return {};
    const s = M[S.a_8C13];
    if (s < 0x0A || s >= 0x16) return {};
    if (P.frt_guard_lands().up) return {};
    M[S.a_8BDE] = 0; M[S.a_8BF2] = 0;
    M[S.a_8BE4] = (M[S.a_8BE4] & 0xF8) | 2;
    sound(0x0D);
    return {};
  };
  P.frt_guard_strike = function () {
    P.spend(8);
    if (IR(S.guard_timer) !== 2 || M[S.fighter_state] >= 6) return {};
    if (((IR(S.a_8BE8) - M[S.fighter_x]) & 255) >= 0x1E) return {};
    if (P.frt_fort_random().a >= 0x1E) return {};
    sound(0x06);
    M[S.fighter_state] = 9; M[S.fighter_moving] = 0; M[S.arc_step] = 0; M[S.fighter_frame] = 0;
    M[S.fighter_facing] = ((M[S.a_8BF4] - 1) & 255) ^ 0xFF;
    P.spend(40);
    return {};
  };
  // guard_move ($9CD2), from the frame interrupt
  P.frt_guard_move = function () {
    P.spend(6);
    if (!M[S.guard_on] || !M[S.a_8BF2]) return {};
    add16(S.a_8BE8, S.a_8BEA, M[S.a_8BF2] & 0x80 ? -3 : 3);
    P.spend(24);
    return {};
  };
  P.frt_guard_start = function () {
    P.spend(10);
    if (M[S.guard_on] || M[S.fighter_state] === 7) return {};
    if ((IR(0x04) | IR(0x05) << 8) >= 0x287A) return {};
    const y = M[R.attacker] ^ 1;
    let high;
    P.spend(14);
    if (!M[R.cpu_union + y]) {
      P.frt_defender_stick();
      const s = M[S.fstick_y];
      if (!s) return {};
      high = !!(s & 0x80);
    } else {
      if (IR(S.guard_start_timer)) return {};
      M[S.guard_start_timer] = 0x32;
      if (P.frt_fort_random().a >= 0xC8) return {};
      high = !!M[S.fighter_floor];
    }
    M[S.a_8BE4] = high ? 0x52 : 0xAA;
    P.spend(10);
    if (!M[S.guards_left]) return {};
    M[S.guards_left]--;
    M[S.a_8BE8] = 0x50; M[S.a_8BEA] = 1; M[S.guard_on] = 1;
    M[S.a_8BF2] = 0xFF; M[S.a_8BF4] = 0xFF;
    M[S.a_8BDE] = 1; M[S.guard_timer] = 1;
    M[S.a_8BEC] = 0; M[S.a_8BEE] = 0; M[S.a_8BF0] = 0; M[S.a_8BDC] = 0; M[S.scroll_steps] = 0; M[S.guard_bounced] = 0;
    P.spend(80);
    return P.frt_guards_draw();
  };

  // ---- the computer's attacker
  P.frt_computer_attacker = function () {
    const x = M[S.fighter_state];
    M[0x9DA3] = M[S.cpu_lo + x]; M[0x9DA4] = M[S.cpu_hi + x];
    P.spend(24);
    return P[handlerAt(0x9DA3)]({});
  };
  P.frt_cpu_climb = function () {
    M[S.attacker_bounced] = 0; M[S.on_ground] = 0;
    P.spend(10);
    if (M[S.to_ladder]) {
      const c = M[(ptr(0x10) + M[S.ladder_col]) & 0xFFFF];
      P.spend(14);
      if (c !== M[S.ladder_char]) return {};
      M[S.to_ladder] = 0; M[S.fighter_moving] = 0; M[S.climb_dir] = 1;
      return {};
    }
    if (IR(S.fine_scroll)) M[S.fine_scroll] = (IR(S.fine_scroll) - 1) & 255;
    M[S.climb_dir] = 1;
    M[S.cpu_delay] = P.frt_fort_random().a & 3;
    return P.frt_climb_up();
  };
  P.frt_cpu_stand = function () {
    P.spend(6);
    if (!IR(S.fighter_timer)) {
      const m = M[S.attacker_bounced] ? 0xFF : 1;
      M[S.fighter_moving] = m; M[S.fighter_state] = 1; M[S.fighter_frame] = 1; M[S.fighter_timer] = 1;
      P.spend(20);
      if (m === 0xFF) return {};
    }
    return cpuFight();
  };
  P.frt_cpu_walk = function () {
    if (P.frt_attacker_ground().up) return {};
    P.spend(6);
    if (M[S.attacker_bounced]) { P.frt_ladder_up(); return {}; }
    if (P.frt_wall_right().up) return {};
    P.spend(6);
    if (!M[S.on_ground] && P.frt_attacker_ledge().up) return {};
    M[S.at_top] = 0;
    return cpuFight();
  };
  // j_9E3E: the time, then every few frames a stroke or a knife at a guard ahead
  const cpuFight = () => {
    if (P.frt_time_up().up) return {};
    P.spend(6);
    if (IR(S.cpu_delay)) return {};
    M[S.cpu_delay] = P.frt_fort_random().a & 0x0F;
    P.spend(10);
    if (!M[S.guard_on] || M[S.a_8BDE] >= 5) return {};
    if (P.frt_fighter_strike({ y: 0 }).up) return {};
    P.spend(10);
    if (M[S.fighter_floor] !== M[S.a_8BF6]) return {};
    const d = diff(IR(S.a_8BE8) | IR(S.a_8BEA) << 8, M[S.fighter_x] | M[S.fighter_x_hi] << 8);
    P.spend(20);
    if (d < 0 || !M[S.knives_left] || M[S.knife_on]) return {};
    return P.frt_fighter_throw({ y: 0 });
  };

  // the handlers by their addresses, for the jmps through the state tables, which are read from
  // memory as the game reads them: every routine of the port at its label's address
  for (const k in S) if (typeof P['frt_' + k] === 'function') { at[S[k]] = 'frt_' + k; POSE_AT[S[k]] = 'frt_' + k; }
};
})(typeof window !== 'undefined' ? window : globalThis);
