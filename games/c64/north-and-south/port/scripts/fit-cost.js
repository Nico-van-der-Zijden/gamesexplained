'use strict';
// The page's pacing, fitted on the game: each stretch of a part's main program (rows from
// scripts/time-stretches.js) as the stretch's own cycles (seg, by the part and the checkpoints it
// runs between) plus, for every routine the port called in it, that routine's own cycles (call),
// none below zero (non-negative least squares, Lawson and Hanson's, on the normal equations).
// Stretches that end at a raster wait or hold a polling loop's turns are left out: the page's
// clock runs those for itself. Each raster interrupt's cycles are the median of the game's (irq,
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
const read = f => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(parse).filter(r => {
  if (!r) return false;
  if (r.irq) { for (const [k, v] of Object.entries(r.irq)) (irqs[k] = irqs[k] || []).push(...v); return false; }
  return !r.wait && !r.polls;
});
const rows = args.flatMap(read);
// the passes' heads, where a part's main loop begins
const PASS = { map: 0x0C42, bat: 0x805C, frt: 0x803C, trn: 0x803C, end: 0x815D };
const key = r => r.part + ':' + r.from.toString(16) + '>' + r.to.toString(16);
const fns = [...new Set(rows.flatMap(r => Object.keys(r.calls)))].sort();
const segs = [...new Set(rows.map(key))].sort();
const idx = new Map(fns.map((f, i) => [f, i]));
segs.forEach((s, i) => idx.set('@' + s, fns.length + i));
const n = fns.length + segs.length;
const G = Array.from({ length: n }, () => new Float64Array(n)), h = new Float64Array(n);
for (const r of rows) {
  const v = Object.entries(r.calls).map(([k, c]) => [idx.get(k), c]).concat([[idx.get('@' + key(r)), 1]]);
  for (const [i, a] of v) { h[i] += a * r.cycles; for (const [j, b] of v) G[i][j] += a * b; }
}
// coordinate descent on the normal equations, each unknown in turn set to the best it can be with
// the others held and kept at 0 or more, until a sweep moves none by more than a hundredth of a
// cycle (the same optimum as Lawson and Hanson's, far quicker for some hundreds of unknowns)
const x = new Float64Array(n), Gx = new Float64Array(n);
for (let sweep = 0; sweep < 20000; sweep++) {
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
  if (moved < 0.01) break;
}
const model = { seg: {}, call: {}, irq: {} };
segs.forEach(s => { const v = x[idx.get('@' + s)]; if (v > 0) model.seg[s] = Math.round(v * 10) / 10; });
fns.forEach(f => { const v = x[idx.get(f)]; if (v > 0) model.call[f] = Math.round(v * 10) / 10; });
for (const [k, v] of Object.entries(irqs)) { v.sort((a, b) => a - b); model.irq[k] = v[v.length >> 1]; }
// each whole pass of each part, as the model has it, against the game's
function passes(rs) {
  const by = {};
  let c = 0, p = 0, part = null;
  const end = () => { if (c) (by[part] = by[part] || []).push((p - c) / c); c = p = 0; };
  for (const r of rs) {
    if (r.part !== part || r.from === PASS[r.part]) { end(); part = r.part; }
    c += r.cycles;
    p += (model.seg[key(r)] || 0) + Object.entries(r.calls).reduce((s, [k, v]) => s + (model.call[k] || 0) * v, 0);
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
