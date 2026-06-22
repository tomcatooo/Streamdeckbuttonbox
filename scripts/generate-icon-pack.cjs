#!/usr/bin/env node
'use strict';

// Generates a ready-to-use icon pack: 9 icons × 2 states (ON + OFF) = 18 PNGs.
// Output: icon-pack/  (72×72 and 144×144 @2x versions)
// Run:    node scripts/generate-icon-pack.cjs

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const OUT  = path.join(ROOT, 'icon-pack');
fs.mkdirSync(OUT, { recursive: true });

// ── Preset ON colours (matching the TypeScript presets) ───────────────────────
const PRESETS = {
  headlights: [0xFF, 0xD7, 0x00],
  pit:        [0x00, 0xCC, 0x44],
  abs:        [0xFF, 0x33, 0x33],
  tc:         [0xFF, 0x88, 0x00],
  flag:       [0xFF, 0xD7, 0x00],
  fuel:       [0x1A, 0x6F, 0xD4],
  ignition:   [0xFF, 0x33, 0x33],
  brake:      [0xFF, 0x55, 0x00],
  fan:        [0x00, 0xAA, 0xFF],
};

const OFF_BG   = [0x1D, 0x1D, 0x1D];
const OFF_ICON = [0x99, 0x99, 0x99];
const ON_ICON  = [0xFF, 0xFF, 0xFF];

// ── Shape helpers ─────────────────────────────────────────────────────────────
// All shapes are in 72×72 design-space coordinates.

// Returns signed distance: negative = inside, positive = outside.
function distCircle(px, py, cx, cy, r) {
  return Math.hypot(px - cx, py - cy) - r;
}

function distRect(px, py, x, y, w, h) {
  const dl = x - px, dr = px - (x + w);
  const dt = y - py, db = py - (y + h);
  return Math.max(dl, dr, dt, db);
}

function distRotRect(px, py, rx, ry, rw, rh, angleDeg, cx, cy) {
  const rad = -angleDeg * Math.PI / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const tx = px - cx, ty = py - cy;
  const lx = tx * cos - ty * sin + cx;
  const ly = tx * sin + ty * cos + cy;
  return distRect(lx, ly, rx, ry, rw, rh);
}

// Point-in-polygon via ray casting, returns -1 (inside) or +1 (outside).
function distPolygon(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside ? -1 : 1;
}

// Anti-aliased pixel coverage from signed distance.
function coverage(dist) {
  if (dist <= -0.7) return 1.0;
  if (dist >=  0.7) return 0.0;
  return (0.7 - dist) / 1.4;
}

// ── Icon definitions ──────────────────────────────────────────────────────────
// Each entry is an array of layers rendered in order.
// type 'fg' paints with icon colour; 'bg' paints with background colour (to cut holes).
// Supported shape types: circle, ring, rect, rotrect, polygon

function sunRays(n, cx, cy, innerR, outerR, halfW) {
  // n equally-spaced rounded-rect rays; modelled as rotrect shapes
  const layers = [];
  for (let i = 0; i < n; i++) {
    const angle = (360 / n) * i;
    const rad   = angle * Math.PI / 180;
    // Ray centre: midpoint between innerR and outerR along the ray direction
    // Rect: positioned so its top is at innerR and bottom at outerR from cx,cy
    layers.push({
      type: 'rotrect',
      rx:   cx - halfW, ry: cy - outerR,
      rw:   halfW * 2,  rh: outerR - innerR,
      angle, cx, cy, color: 'fg',
    });
  }
  return layers;
}

const ICONS = {
  headlights: [
    ...sunRays(8, 36, 36, 12, 25, 3),
    { type: 'circle', cx: 36, cy: 36, r: 10, color: 'fg' },
  ],
  pit: [
    { type: 'rect', x: 9,  y: 17, w: 54, h: 8, color: 'fg' },
    { type: 'rect', x: 9,  y: 32, w: 54, h: 8, color: 'fg' },
    { type: 'rect', x: 9,  y: 47, w: 54, h: 8, color: 'fg' },
  ],
  abs: [
    { type: 'circle', cx: 36, cy: 36, r: 24, color: 'fg' },
    { type: 'circle', cx: 36, cy: 36, r: 17, color: 'bg' },
    { type: 'circle', cx: 36, cy: 36, r:  9, color: 'fg' },
    { type: 'circle', cx: 36, cy: 36, r:  4, color: 'bg' },
  ],
  tc: [
    { type: 'polygon', pts: [[36,10],[63,60],[9,60]], color: 'fg' },
    { type: 'polygon', pts: [[36,22],[54,56],[18,56]], color: 'bg' },
    { type: 'rect',   x: 33, y: 30, w: 6, h: 14, color: 'fg' },
    { type: 'circle', cx: 36, cy: 50, r:  4, color: 'fg' },
  ],
  flag: [
    { type: 'rect',    x: 14, y: 8,  w: 6, h: 54, color: 'fg' },
    { type: 'polygon', pts: [[20,8],[63,22],[20,42]], color: 'fg' },
  ],
  fuel: [
    { type: 'rect', x: 21, y: 24, w: 28, h: 34, color: 'fg' },
    { type: 'rect', x: 27, y: 14, w: 16, h: 12, color: 'fg' },
    { type: 'rect', x: 43, y: 18, w: 12, h:  5, color: 'fg' },
    { type: 'rect', x: 25, y: 30, w: 20, h: 14, color: 'bg' }, // window cutout
  ],
  ignition: [
    { type: 'circle', cx: 36, cy: 42, r: 20, color: 'fg' },
    { type: 'circle', cx: 36, cy: 42, r: 13, color: 'bg' },
    { type: 'rect',   x: 32, y: 14,  w:  8, h: 30, color: 'fg' },
    { type: 'rect',   x: 32, y: 36,  w:  8, h:  8, color: 'bg' }, // gap in bar
  ],
  brake: [
    { type: 'circle', cx: 36, cy: 36, r: 24, color: 'fg' },
    { type: 'circle', cx: 36, cy: 36, r: 19, color: 'bg' },
    { type: 'circle', cx: 36, cy: 36, r: 15, color: 'fg' },
    { type: 'circle', cx: 36, cy: 36, r: 10, color: 'bg' },
    { type: 'circle', cx: 36, cy: 36, r:  5, color: 'fg' },
  ],
  fan: [
    { type: 'circle', cx: 36, cy: 36, r: 7, color: 'fg' },
    ...([20, 110, 200, 290].map(angle => ({
      type: 'rotrect',
      rx: 33, ry: 8, rw: 6, rh: 22,
      angle, cx: 36, cy: 36, color: 'fg',
    }))),
  ],
};

// ── Rasteriser ────────────────────────────────────────────────────────────────
function rasterise(layers, size, bgRgb, iconRgb) {
  const scale  = size / 72;
  const pixels = new Uint8Array(size * size * 4);

  // Fill background
  for (let i = 0; i < size * size; i++) {
    pixels[i * 4]     = bgRgb[0];
    pixels[i * 4 + 1] = bgRgb[1];
    pixels[i * 4 + 2] = bgRgb[2];
    pixels[i * 4 + 3] = 255;
  }

  // Render each layer
  for (const layer of layers) {
    const color = layer.color === 'bg' ? bgRgb : iconRgb;

    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        // 4× supersampling
        let cov = 0;
        for (const [sx, sy] of [[0.25,0.25],[0.75,0.25],[0.25,0.75],[0.75,0.75]]) {
          const x = (px + sx) / scale;
          const y = (py + sy) / scale;
          let d;
          switch (layer.type) {
            case 'circle':
              d = distCircle(x, y, layer.cx, layer.cy, layer.r); break;
            case 'rect':
              d = distRect(x, y, layer.x, layer.y, layer.w, layer.h); break;
            case 'rotrect':
              d = distRotRect(x, y, layer.rx, layer.ry, layer.rw, layer.rh,
                              layer.angle, layer.cx, layer.cy); break;
            case 'polygon':
              d = distPolygon(x, y, layer.pts); break;
            default: d = 1;
          }
          cov += coverage(d);
        }
        cov /= 4;
        if (cov <= 0) continue;

        const i = (py * size + px) * 4;
        pixels[i]     = Math.round(pixels[i]     * (1 - cov) + color[0] * cov);
        pixels[i + 1] = Math.round(pixels[i + 1] * (1 - cov) + color[1] * cov);
        pixels[i + 2] = Math.round(pixels[i + 2] * (1 - cov) + color[2] * cov);
      }
    }
  }
  return pixels;
}

// ── PNG encoder (RGBA) ────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len  = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const tBuf = Buffer.from(type, 'ascii');
  const crc  = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([tBuf, data])));
  return Buffer.concat([len, tBuf, data, crc]);
}

function encodePng(pixels, w, h) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // colour type: RGBA

  // Build raw image data (filter byte 0 per row)
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0; // filter: None
    for (let x = 0; x < w; x++) {
      const src  = (y * w + x) * 4;
      const dest = y * (1 + w * 4) + 1 + x * 4;
      raw[dest]     = pixels[src];
      raw[dest + 1] = pixels[src + 1];
      raw[dest + 2] = pixels[src + 2];
      raw[dest + 3] = pixels[src + 3];
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Generate all icons ────────────────────────────────────────────────────────
let count = 0;
for (const [name, layers] of Object.entries(ICONS)) {
  const onBg   = PRESETS[name] ?? [0x1A, 0x6F, 0xD4];
  const onIcon = ON_ICON;

  for (const [state, bgRgb, iconRgb] of [
    ['on',  onBg,  onIcon],
    ['off', OFF_BG, OFF_ICON],
  ]) {
    for (const size of [72, 144]) {
      const pixels = rasterise(layers, size, bgRgb, iconRgb);
      const suffix = size === 144 ? '@2x' : '';
      const file   = path.join(OUT, `${name}-${state}${suffix}.png`);
      fs.writeFileSync(file, encodePng(pixels, size, size));
      console.log('wrote', path.relative(ROOT, file));
      count++;
    }
  }
}

console.log(`\nDone — ${count} files written to icon-pack/`);
console.log('Assign *-on.png to state 1 and *-off.png to state 0 in Stream Deck.');
