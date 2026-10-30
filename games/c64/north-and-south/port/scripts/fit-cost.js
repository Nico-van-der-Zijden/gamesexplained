'use strict';
// The page's pacing, fitted on the game: each stretch of a part's main program (rows from
// scripts/time-stretches.js) as the stretch's own cycles (seg, by the part and the checkpoints it
// runs between) plus, for every routine the port called in it, that routine's own cycles (call),
// none below zero (non-negative least squares, Lawson and Hanson's, on the normal equations).
// Stretches that end at a raster wait or hold a polling loop's turns are left out: the page's
// clock runs those for itself. Each raster interrupt's cycles are the mean of the game's (irq,
// by part and handler). Prints the error of a whole pass of each part, and with --test the same
// on rows it was not fitted on.
//   node fit-cost.js out.json rows.jsonl... [--test rows.jsonl]
const fs = require('fs');
const args = process.argv.slice(2);
const ti = args.indexOf('--test');
const test = ti >= 0 ? args.splice(ti, 2)[1] : null;
const out = args.shift();
if (!out || !args.length) { console.log('usage: node fit-cost.js out.json rows.jsonl... [--test rows.jsonl]'); process.exit(2); }
const irqs = {};
// a run stopped in the middle of a row leaves half a line
const parse = l => { try { return JSON.parse(l); } catch (e) { return null; } };
// a file read a line at a time, as some are too long for one string
function lines(f) {
  const out = [], fd = fs.openSync(f, 'r'), buf = Buffer.alloc(1 << 24);
  let rest = '';
  for (;;) {
    const n = fs.readSync(fd, buf, 0, buf.length, null);
    if (!n) break;
    const parts = (rest + buf.toString('utf8', 0, n)).split('\n');
    rest = parts.pop();
    for (const l of parts) if (l) out.push(l);
  }
  if (rest) out.push(rest);
  fs.closeSync(fd);
  return out;
}
const read = f => lines(f).map(parse).filter(r => {
  if (!r) return false;
  if (r.irq) { for (const [k, v] of Object.entries(r.irq)) (irqs[k] = irqs[k] || []).push(...v); return false; }
  return !r.wait && !r.polls;
});
const rows = args.flatMap(read);
// the passes' heads, where a part's main loop begins
const PASS = { map: 0x0C42, bat: 0x805C, frt: 0x803C, trn: 0x803C, end: 0x815D };
const key = r => r.part + ':' + r.from.toString(16) + '>' + r.to.toString(16);
const model = { seg: {}, call: {}, irq: {}, scale: {}, est: {} };
// The parts whose stretches are fitted. The rest keep the port's own count of each stretch (P.spend),
// times the game's cycles over that count on their stretches with no wait in them: the map, whose
// work runs mostly in stretches that also wait on the interrupt's timers, so that the fit never sees
// most of its routines alone, and the title, the menu and the script.
const FIT = new Set(['bat', 'frt', 'trn', 'end']);
for (const part of [...new Set(rows.map(r => r.part))].filter(p => !FIT.has(p))) {
  const rs = rows.filter(r => r.part === part && r.estimate > 0);
  const c = rs.reduce((s, r) => s + r.cycles, 0), e = rs.reduce((s, r) => s + r.estimate, 0);
  if (!e) continue;
  model.scale[part] = Math.round(c / e * 1000) / 1000;
  console.log(part + ': ' + rs.length + ' stretches, the game\'s cycles ' + model.scale[part] + ' times the port\'s count');
}
// each part on its own: its stretches and the routines of its own (the port's helpers, spend and
// irqByte among them, and the routines of the parts it calls, are left in the stretches' own cost),
// by coordinate descent on the normal equations, each unknown in turn set to the best it can be with
// the others held and kept at 0 or more, until a sweep moves none by a thousandth of a cycle (the
// optimum of Lawson and Hanson's, far quicker for some hundreds of unknowns)
for (const part of [...new Set(rows.map(r => r.part))].filter(p => FIT.has(p))) {
  const rs = rows.filter(r => r.part === part), own = k => k.startsWith(part + '_');
  const fns = [...new Set(rs.flatMap(r => Object.keys(r.calls).filter(own)))].sort();
  const segs = [...new Set(rs.map(key))].sort();
  const idx = new Map(fns.map((fn, i) => [fn, i]));
  segs.forEach((sg, i) => idx.set('@' + sg, fns.length + i));
  // and one more: the port's own count of the stretch (P.spend), for work that varies call by call
  // (the pictures drawn, the rows copied), when every row has it
  const withEst = rs.every(r => r.estimate !== undefined);
  if (withEst) idx.set('#est', fns.length + segs.length);
  const n = fns.length + segs.length + (withEst ? 1 : 0);
  const G = Array.from({ length: n }, () => new Float64Array(n)), h = new Float64Array(n);
  for (const r of rs) {
    const v = Object.entries(r.calls).filter(([k]) => own(k)).map(([k, c]) => [idx.get(k), c]).concat([[idx.get('@' + key(r)), 1]]).concat(withEst ? [[idx.get('#est'), r.estimate]] : []);
    for (const [i, a] of v) { h[i] += a * r.cycles; for (const [j, b] of v) G[i][j] += a * b; }
  }
  const x = new Float64Array(n), Gx = new Float64Array(n);
  let sweep = 0;
  for (; sweep < 200000; sweep++) {
    let moved = 0;
    for (let i = 0; i < n; i++) {
      if (!G[i][i]) continue;
      const v = Math.max(0, x[i] + (h[i] - Gx[i]) / G[i][i]), d = v - x[i];
      if (!d) continue;
      x[i] = v;
      const Gi = G[i];
      for (let j = 0; j < n; j++) Gx[j] += Gi[j] * d;
      moved = Math.max(moved, Math.abs(d));
    }
    if (moved < 0.001) break;
  }
  console.log(part + ': ' + rs.length + ' stretches, ' + fns.length + ' routines, ' + segs.length + ' kinds of stretch, ' + sweep + ' sweeps');
  if (withEst && x[idx.get('#est')] > 0) model.est[part] = Math.round(x[idx.get('#est')] * 10000) / 10000;
  segs.forEach(sg => { const v = x[idx.get('@' + sg)]; if (v > 0) model.seg[sg] = Math.round(v * 10) / 10; });

  fns.forEach(fn => { const v = x[idx.get(fn)]; if (v > 0) model.call[fn] = Math.round(v * 10) / 10; });
}
for (const [k, v] of Object.entries(irqs)) model.irq[k] = Math.round(v.reduce((s, c) => s + c, 0) / v.length);
// each whole pass of each part, as the model has it, against the game's
function passes(rs) {
  const by = {};
  let c = 0, p = 0, part = null;
  const end = () => { if (c) (by[part] = by[part] || []).push((p - c) / c); c = p = 0; };
  for (const r of rs) {
    if (r.part !== part || r.from === PASS[r.part]) { end(); part = r.part; }
    c += r.cycles;
    p += (model.seg[key(r)] || 0) + (model.est[r.part] || 0) * (r.estimate || 0) + Object.entries(r.calls).reduce((s, [k, v]) => s + (model.call[k] || 0) * v, 0);
  }
  end();
  return Object.entries(by).map(([k, e]) => {
    e.sort((a, b) => a - b);
    const q = f => (e[Math.floor(f * (e.length - 1))] * 100).toFixed(1) + '%';
    return '  ' + k + ': ' + e.length + ' passes, error median ' + q(0.5) + ', 10th percentile ' + q(0.1) + ', 90th ' + q(0.9) +
      ', mean size ' + (e.reduce((s, v) => s + Math.abs(v), 0) / e.length * 100).toFixed(1) + '%';
  }).join('\n');
}
console.log('fitted on ' + rows.length + ' stretches:\n' + passes(rows));
if (test) console.log('not fitted on:\n' + passes(read(test)));
fs.writeFileSync(out, JSON.stringify(model) + '\n');
console.log('wrote ' + out + ': ' + Object.keys(model.call).length + ' routines, ' + Object.keys(model.seg).length + ' stretches, ' +
  Object.keys(model.irq).length + ' interrupt handlers');
