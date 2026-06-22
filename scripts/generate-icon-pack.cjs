#!/usr/bin/env node
'use strict';

// Generates a Lovely Sim Racing-style icon pack:
//   OFF: near-black bg (#111), dark-crimson border, white icon
//   ON:  red bg (#cc0000), bright-red border, white icon
// Output: icon-pack/ (72×72 + 144×144 @2x)
// Run:    node scripts/generate-icon-pack.cjs

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const OUT  = path.join(ROOT, 'icon-pack');
fs.mkdirSync(OUT, { recursive: true });

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
  offBorder: [90,   0,   0],   // dark crimson frame
  offBg:     [15,  15,  15],   // near-black field
  onBorder:  [255,  60,  60],  // bright red frame
  onBg:      [200,   0,   0],  // main red field
  icon:      [255, 255, 255],  // white — same for both states
};

// ── Signed-distance functions ─────────────────────────────────────────────────

function distCircle(px, py, cx, cy, r) {
  return Math.hypot(px - cx, py - cy) - r;
}

function distRect(px, py, x, y, w, h) {
  return Math.max(x - px, px - (x + w), y - py, py - (y + h));
}

// Standard rounded-box SDF (correct for all quadrants incl. corners)
function distRRect(px, py, x, y, w, h, rx) {
  const qx = Math.abs(px - (x + w / 2)) - (w / 2 - rx);
  const qy = Math.abs(py - (y + h / 2)) - (h / 2 - rx);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
         Math.min(Math.max(qx, qy), 0) - rx;
}

function distRotRect(px, py, rx, ry, rw, rh, angleDeg, cx, cy) {
  const rad = -angleDeg * Math.PI / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const tx = px - cx, ty = py - cy;
  const lx = tx * cos - ty * sin + cx;
  const ly = tx * sin + ty * cos + cy;
  return distRect(lx, ly, rx, ry, rw, rh);
}

function distPolygon(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside ? -1 : 1;
}

function coverage(dist) {
  if (dist <= -0.7) return 1.0;
  if (dist >=  0.7) return 0.0;
  return (0.7 - dist) / 1.4;
}

// ── Icon definitions (72×72 design space) ────────────────────────────────────

function rays(n, cx, cy, innerR, outerR, halfW) {
  return Array.from({ length: n }, (_, i) => ({
    type: 'rotrect',
    rx: cx - halfW, ry: cy - outerR,
    rw: halfW * 2,  rh: outerR - innerR,
    angle: (360 / n) * i, cx, cy, color: 'icon',
  }));
}

const ICONS = {
  headlights: [
    ...rays(8, 36, 36, 13, 26, 3),
    { type: 'circle', cx: 36, cy: 36, r: 10, color: 'icon' },
  ],
  pit: [
    { type: 'rect', x:  9, y: 17, w: 54, h: 8, color: 'icon' },
    { type: 'rect', x:  9, y: 32, w: 54, h: 8, color: 'icon' },
    { type: 'rect', x:  9, y: 47, w: 54, h: 8, color: 'icon' },
  ],
  abs: [
    { type: 'circle', cx: 36, cy: 36, r: 24, color: 'icon' },
    { type: 'circle', cx: 36, cy: 36, r: 17, color: 'bg'   },
    { type: 'circle', cx: 36, cy: 36, r:  9, color: 'icon' },
    { type: 'circle', cx: 36, cy: 36, r:  4, color: 'bg'   },
  ],
  tc: [
    { type: 'polygon', pts: [[36,10],[63,60],[9,60]], color: 'icon' },
    { type: 'polygon', pts: [[36,22],[54,56],[18,56]], color: 'bg'  },
    { type: 'rect',   x: 33, y: 30, w: 6, h: 14, color: 'icon' },
    { type: 'circle', cx: 36, cy: 50, r:  4,      color: 'icon' },
  ],
  flag: [
    { type: 'rect',    x: 14, y:  8, w: 6, h: 54, color: 'icon' },
    { type: 'polygon', pts: [[20,8],[63,22],[20,42]], color: 'icon' },
  ],
  fuel: [
    { type: 'rect', x: 21, y: 24, w: 28, h: 34, color: 'icon' },
    { type: 'rect', x: 27, y: 14, w: 16, h: 12, color: 'icon' },
    { type: 'rect', x: 43, y: 18, w: 12, h:  5, color: 'icon' },
    { type: 'rect', x: 25, y: 30, w: 20, h: 14, color: 'bg'   },
  ],
  ignition: [
    { type: 'circle', cx: 36, cy: 42, r: 20, color: 'icon' },
    { type: 'circle', cx: 36, cy: 42, r: 13, color: 'bg'   },
    { type: 'rect',   x: 32, y: 14,  w:  8, h: 30, color: 'icon' },
    { type: 'rect',   x: 32, y: 36,  w:  8, h:  8, color: 'bg'   },
  ],
  brake: [
    { type: 'circle', cx: 36, cy: 36, r: 24, color: 'icon' },
    { type: 'circle', cx: 36, cy: 36, r: 19, color: 'bg'   },
    { type: 'circle', cx: 36, cy: 36, r: 15, color: 'icon' },
    { type: 'circle', cx: 36, cy: 36, r: 10, color: 'bg'   },
    { type: 'circle', cx: 36, cy: 36, r:  5, color: 'icon' },
  ],
  fan: [
    { type: 'circle', cx: 36, cy: 36, r: 7, color: 'icon' },
    ...([20, 110, 200, 290].map(angle => ({
      type: 'rotrect', rx: 33, ry: 8, rw: 6, rh: 22,
      angle, cx: 36, cy: 36, color: 'icon',
    }))),
  ],
};

// ── Rasteriser ────────────────────────────────────────────────────────────────

function rasterise(iconLayers, size, borderRgb, bgRgb, iconRgb) {
  const scale  = size / 72;
  const bw     = Math.round(3 * scale);   // border width in output pixels
  const rx     = Math.round(10 * scale);  // outer corner radius
  const pixels = new Uint8Array(size * size * 4);

  // Palette lookup
  function colorOf(key) {
    if (key === 'border') return borderRgb;
    if (key === 'bg')     return bgRgb;
    return iconRgb;
  }

  // Button background: outer rounded rect (border colour) + inner (bg colour)
  const bgLayers = [
    { type: 'rrect', x: 0, y: 0, w: size, h: size, rx, color: 'border' },
    { type: 'rrect', x: bw, y: bw, w: size - bw*2, h: size - bw*2, rx: Math.max(2, rx - bw), color: 'bg' },
  ];

  for (const layer of [...bgLayers, ...iconLayers]) {
    const rgb = colorOf(layer.color);

    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        let cov = 0;
        for (const [sx, sy] of [[0.25,0.25],[0.75,0.25],[0.25,0.75],[0.75,0.75]]) {
          const x = (px + sx) / scale;
          const y = (py + sy) / scale;
          let d;
          switch (layer.type) {
            case 'circle':  d = distCircle(x, y, layer.cx, layer.cy, layer.r); break;
            case 'rect':    d = distRect(x, y, layer.x, layer.y, layer.w, layer.h); break;
            case 'rrect':   d = distRRect(px+sx, py+sy, layer.x, layer.y, layer.w, layer.h, layer.rx); break;
            case 'rotrect': d = distRotRect(x, y, layer.rx, layer.ry, layer.rw, layer.rh, layer.angle, layer.cx, layer.cy); break;
            case 'polygon': d = distPolygon(x, y, layer.pts); break;
            default: d = 1;
          }
          cov += coverage(d);
        }
        cov /= 4;
        if (cov <= 0) continue;

        const i = (py * size + px) * 4;
        pixels[i]     = Math.round(pixels[i]     * (1-cov) + rgb[0] * cov);
        pixels[i+1]   = Math.round(pixels[i+1]   * (1-cov) + rgb[1] * cov);
        pixels[i+2]   = Math.round(pixels[i+2]   * (1-cov) + rgb[2] * cov);
        pixels[i+3]   = 255;
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
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
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
  ihdr[8] = 8; ihdr[9] = 6;  // RGBA

  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0;
    for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4, d = y * (1 + w * 4) + 1 + x * 4;
      raw[d] = pixels[s]; raw[d+1] = pixels[s+1]; raw[d+2] = pixels[s+2]; raw[d+3] = pixels[s+3];
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Generate ──────────────────────────────────────────────────────────────────
let count = 0;
for (const [name, layers] of Object.entries(ICONS)) {
  for (const [state, borderRgb, bgRgb] of [
    ['on',  C.onBorder,  C.onBg ],
    ['off', C.offBorder, C.offBg],
  ]) {
    for (const size of [72, 144]) {
      const pixels = rasterise(layers, size, borderRgb, bgRgb, C.icon);
      const file   = path.join(OUT, `${name}-${state}${size === 144 ? '@2x' : ''}.png`);
      fs.writeFileSync(file, encodePng(pixels, size, size));
      console.log('wrote', path.relative(ROOT, file));
      count++;
    }
  }
}
console.log(`\nDone — ${count} PNGs written to icon-pack/`);
