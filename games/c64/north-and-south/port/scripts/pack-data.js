'use strict';
// The game as the Play page carries it: its data, and none of its program. The machine is the one
// the script leaves when it calls the title (parts/title/work/entry.vsf), and the fourteen files
// are the tapes' (work/files.json), each at its own address and length. In both, every byte of an
// instruction, as its part's listing marks them, is a zero, but for the sound drivers the page
// runs on the kit's 6502 (the title's and the ending's tunes, the menu's and the map's sound
// effects). What is left is the game's tables, texts, pictures, maps and variables, which the port
// reads where the game keeps them. The machine's memory outside the resident's and the title's
// listings (what the boot left above the title, under the ROMs) is a zero too.
// Some instructions are the game's state, and the port keeps that state where the game does: the
// operands the code rewrites, the bytes a routine reads as data. Those stay, wherever port/src
// names their address, as a number or as a label (test/t-page.js runs the page's machine on this
// beside the whole game, and finds any it reads that this misses).
//
//   node pack-data.js [out.json]    (default: print what it keeps; with a file, write it)
// The result is { machine, files: { NAME: { addr, bytes: base64 } }, kept: { NAME: [code, data, state] } }.
const fs = require('fs'), path = require('path');
const lib = require('../test/lib.js');

// each file's part, whose listing marks its instructions (the years' texts are data whole)
const PART = { TP: 'title', OC: 'menu', OM: 'menu', M1: 'map', M2: 'map', M3: 'map', BS: 'battle', S1: 'fort', S2: 'train', CS: 'ending' };
// the sound drivers, run as the game's code
const DRIVERS = { title: [[0x9000, 0x95DE]], menu: [[0xF632, 0xFB4D]], map: [[0xF128, 0xF879]], ending: [[0x3000, 0x375A]] };

// The addresses the port names, as a number or as a label of any part, each with the two bytes
// after it (an instruction's operand, where a name stands for the instruction's address)
const SRC = path.join(__dirname, '../src');
function named() {
  if (!globalThis.NSSyms) require(path.join(SRC, 'syms.js'));
  const syms = globalThis.NSSyms, keep = new Set();
  const add = a => { for (let k = 0; k < 3; k++) keep.add((a + k) & 0xFFFF); };
  for (const f of fs.readdirSync(SRC)) {
    if (f === 'syms.js') continue;
    const text = fs.readFileSync(path.join(SRC, f), 'utf8');
    for (const m of text.matchAll(/\b0x([0-9A-Fa-f]{4})\b/g)) add(parseInt(m[1], 16));
    for (const m of text.matchAll(/\b[SR]\.([A-Za-z_][\w]*)/g)) for (const p of Object.values(syms)) if (p[m[1]] !== undefined) add(p[m[1]]);
  }
  return keep;
}
// The addresses of the instructions in a part's listing, with their bytes
const instructions = {};
function code(part) {
  if (!instructions[part]) {
    const at = new Map();
    for (const r of lib.listing(part).records) if (r.t === 'code') for (let i = 0; i < r.b.length; i++) at.set(r.a + i, r.b[i]);
    for (const [lo, hi] of DRIVERS[part] || []) for (let a = lo; a <= hi; a++) at.delete(a);
    instructions[part] = at;
  }
  return instructions[part];
}
// bytes at base, of the part's: its instructions blanked; a byte that is not the listing's is a
// self-modified operand, blanked too, but more than one in twenty means the file is not the part's
function blank(bytes, base, part, keep, name) {
  const at = code(part), out = bytes.slice();
  let n = 0, differ = 0, state = 0;
  for (let i = 0; i < out.length; i++) {
    const a = (base + i) & 0xFFFF;
    if (!at.has(a)) continue;
    if (keep.has(a)) { state++; continue; }
    if (at.get(a) !== out[i]) differ++;
    out[i] = 0; n++;
  }
  if (differ > n / 20) throw new Error(name + ': ' + differ + ' of ' + n + ' instruction bytes differ from ' + part + "'s listing");
  return { out, n, state };
}

function pack() {
  const keep = named(), files = {}, kept = {};
  for (const [name, f] of Object.entries(lib.files())) {
    if (!PART[name]) { files[name] = { addr: f.addr, bytes: f.bytes.slice() }; kept[name] = [0, f.bytes.length, 0]; continue; }
    const r = blank(f.bytes, f.addr, PART[name], keep, name);
    files[name] = { addr: f.addr, bytes: r.out };
    kept[name] = [r.n, f.bytes.length - r.n, r.state];
  }
  // the machine at the title's call: the resident's and the title's instructions blanked, and the
  // memory past them ($0C00-$17FF, $A000 on) a zero but for the vectors at $FFFA
  const m = lib.machine('entry.vsf', { part: 'title' });
  const s = m.save();
  const ram = Uint8Array.from(Buffer.from(s.ram, 'base64'));
  const low = blank(ram.subarray(0, 0x0C00), 0, 'resident', keep, 'resident');
  const tp = blank(ram.subarray(0x1800, 0xA000), 0x1800, 'title', keep, 'title');
  ram.set(low.out, 0); ram.set(tp.out, 0x1800);
  ram.fill(0, 0x0C00, 0x1800); ram.fill(0, 0xA000, 0xFFFA);
  s.ram = Buffer.from(ram).toString('base64');
  kept.machine = [low.n + tp.n, 0x10000 - low.n - tp.n, low.state + tp.state];
  return { machine: s, files, kept };
}

if (require.main === module) {
  const p = pack(), b64 = u => Buffer.from(u).toString('base64');
  for (const [k, [c, n, st]] of Object.entries(p.kept)) console.log(k.padEnd(8) + String(c).padStart(6) + ' bytes of code blanked, ' + n + ' kept, ' + st + ' of them code the port keeps state in');
  if (process.argv[2]) {
    const o = { machine: p.machine, files: {} };
    for (const [k, v] of Object.entries(p.files)) o.files[k] = { addr: v.addr, bytes: b64(v.bytes) };
    fs.writeFileSync(process.argv[2], JSON.stringify(o));
    console.log('wrote ' + process.argv[2] + ', ' + Math.round(fs.statSync(process.argv[2]).size / 1024) + ' KB');
  }
}
module.exports = { pack, PART, DRIVERS };
