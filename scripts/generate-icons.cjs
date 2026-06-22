#!/usr/bin/env node
'use strict';

// Generates all required placeholder PNG icons for the Stream Deck plugin.
// Pure Node.js (zlib) — no canvas or native deps needed.
// Run: npm run icons

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');

// ── CRC-32 table (PNG chunk integrity) ────────────────────────────────────────
// Must be initialised before any function that calls crc32().
const CRC_TABLE = (function buildCrcTable() {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
}());

// ── Icon list ─────────────────────────────────────────────────────────────────
const ICONS = [
  { out: 'images/plugin-icon.png',                    size: 72,  r: 26, g: 26, b: 26 },
  { out: 'images/plugin-icon@2x.png',                 size: 144, r: 26, g: 26, b: 26 },
  { out: 'images/category-icon.png',                  size: 28,  r: 26, g: 26, b: 26 },
  { out: 'images/category-icon@2x.png',               size: 56,  r: 26, g: 26, b: 26 },
  { out: 'images/actions/telemetry-button.png',        size: 72,  r: 30, g: 80, b: 180 },
  { out: 'images/actions/telemetry-button@2x.png',     size: 144, r: 30, g: 80, b: 180 },
  { out: 'images/actions/state-off.png',               size: 72,  r: 34, g: 34, b: 34 },
  { out: 'images/actions/state-off@2x.png',            size: 144, r: 34, g: 34, b: 34 },
  { out: 'images/actions/state-on.png',                size: 72,  r: 30, g: 80, b: 180 },
  { out: 'images/actions/state-on@2x.png',             size: 144, r: 30, g: 80, b: 180 },
];

// ── Main ──────────────────────────────────────────────────────────────────────
for (const icon of ICONS) {
  const outPath = path.join(ROOT, 'com.simhub.buttonbox.sdPlugin', icon.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, makePng(icon.size, icon.size, icon.r, icon.g, icon.b));
  console.log('wrote', icon.out);
}

console.log('\nDone — replace placeholder PNGs with real artwork before publishing.');

// ── PNG encoder ───────────────────────────────────────────────────────────────
function makePng(w, h, r, g, b) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB

  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    const base = y * (1 + w * 3);
    raw[base] = 0; // filter: None
    for (let x = 0; x < w; x++) {
      raw[base + 1 + x * 3]     = r;
      raw[base + 1 + x * 3 + 1] = g;
      raw[base + 1 + x * 3 + 2] = b;
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const len   = Buffer.alloc(4);  len.writeUInt32BE(data.length);
  const tBuf  = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([tBuf, data])) >>> 0);
  return Buffer.concat([len, tBuf, data, crcBuf]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
