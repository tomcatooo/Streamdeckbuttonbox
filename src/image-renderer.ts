// Renders SVG button images for the Stream Deck.
// The @elgato/streamdeck SDK's setImage() accepts raw SVG strings directly.
//
// Visual design:
//   OFF — near-black bg, dim icon, dark grey label, hairline border
//   ON  — full-color bg, bright icon, white label, thick glowing border, corner accents

export interface RenderOptions {
  label: string;
  isActive: boolean;
  colorOff?: string;
  colorOn?: string;
  icon?: string;
}

// 72×72-viewport icon path data
const ICON_PATHS: Record<string, string> = {
  headlights:
    "M36 8C20.5 8 8 20.5 8 36s12.5 28 28 28 28-12.5 28-28S51.5 8 36 8zm0 8c11 0 20 9 20 20S47 56 36 56 16 47 16 36s9-20 20-20zm0 4c-8.8 0-16 7.2-16 16s7.2 16 16 16 16-7.2 16-16-7.2-16-16-16zm-2 6h4v8h-4v-8zm-8.5 3.5 2.8 2.8-5.7 5.7-2.8-2.8 5.7-5.7zm21 0 5.7 5.7-2.8 2.8-5.7-5.7 2.8-2.8zM20 34h8v4h-8v-4zm24 0h8v4h-8v-4zm-13.7 9.2 2.8-2.8 5.7 5.7-2.8 2.8-5.7-5.7zm13.4 0 5.7 5.7-2.8 2.8-5.7-5.7 2.8-2.8zM34 46h4v8h-4v-8z",
  pit:
    "M12 20h48v6H12v-6zm0 13h48v6H12v-6zm0 13h48v6H12v-6z",
  abs:
    "M36 14C23.8 14 14 23.8 14 36s9.8 22 22 22 22-9.8 22-22-9.8-22-22-22zm0 6c8.8 0 16 7.2 16 16s-7.2 16-16 16-16-7.2-16-16 7.2-16 16-16z",
  tc:
    "M36 14 58 52H14L36 14zm0 12L24 46h24L36 26z",
  flag:
    "M16 10v52h6V42l30-16-30-16V10h-6zm6 12 18 10-18 10V22z",
  fuel:
    "M20 14h28l4 8v26a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4V22l4-8zm4 4-2 4h28l-2-4H24zm-2 8v24h28V26H22zm8 4h12v4H30v-4z",
  ignition:
    "M36 10l6 18h18L46 40l6 18-16-12-16 12 6-18L12 28h18L36 10z",
  brake:
    "M36 14C23.8 14 14 23.8 14 36s9.8 22 22 22 22-9.8 22-22-9.8-22-22-22zm0 6c8.8 0 16 7.2 16 16s-7.2 16-16 16-16-7.2-16-16 7.2-16 16-16zm0 4c-6.6 0-12 5.4-12 12s5.4 12 12 12 12-5.4 12-12-5.4-12-12-12z",
  // 4-blade fan / propeller (blades meet at centre, arc on outer edge of each)
  fan:
    "M36 36 L32 24 A8 8 0 0 1 40 24 Z M36 36 L48 32 A8 8 0 0 1 48 40 Z M36 36 L40 48 A8 8 0 0 1 32 48 Z M36 36 L24 40 A8 8 0 0 1 24 32 Z M36 31 a5 5 0 0 0 0 10 a5 5 0 0 0 0-10",
};

export function renderButtonSvg(opts: RenderOptions): string {
  const { label, isActive, colorOff = "#1a1a1a", colorOn = "#1a6fd4", icon } = opts;

  return isActive
    ? renderOn(label, colorOn, icon)
    : renderOff(label, colorOff, icon);
}

// OFF — nearly black, everything dimmed
function renderOff(label: string, colorOff: string, icon?: string): string {
  const bg         = darken(colorOff, 0.15); // very dark version of the off colour
  const border     = lighten(colorOff, 0.1);
  const iconColor  = "#444444";
  const textColor  = "#555555";
  const iconPath   = icon ? ICON_PATHS[icon] : undefined;
  const labelY     = iconPath ? 63 : 43;

  const iconSvg = iconPath
    ? `<g transform="translate(18,6) scale(0.5)" fill="${iconColor}"><path d="${iconPath}"/></g>`
    : "";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">`,
    `<rect x="0" y="0" width="72" height="72" rx="8" fill="${bg}" stroke="${border}" stroke-width="1"/>`,
    iconSvg,
    `<text x="36" y="${labelY}" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="bold" fill="${textColor}" letter-spacing="0.5">${escXml(label)}</text>`,
    `</svg>`,
  ].join("");
}

// ON — full colour, thick glowing border, corner accents, bright icon
function renderOn(label: string, colorOn: string, icon?: string): string {
  const bg        = colorOn;
  const bright    = lighten(colorOn, 0.4);   // for border and accents
  const glow      = lighten(colorOn, 0.25);  // for outer glow
  const iconColor = "#ffffff";
  const textColor = "#ffffff";
  const iconPath  = icon ? ICON_PATHS[icon] : undefined;
  const labelY    = iconPath ? 63 : 43;

  const iconSvg = iconPath
    ? `<g transform="translate(18,6) scale(0.5)" fill="${iconColor}"><path d="${iconPath}"/></g>`
    : "";

  // Corner accent lines (L-shaped corners in bright colour)
  const corners = [
    // top-left
    `<path d="M4 14 L4 4 L14 4" stroke="${bright}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    // top-right
    `<path d="M58 4 L68 4 L68 14" stroke="${bright}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    // bottom-left
    `<path d="M4 58 L4 68 L14 68" stroke="${bright}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    // bottom-right
    `<path d="M58 68 L68 68 L68 58" stroke="${bright}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  ].join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">`,
    `<defs>`,
    `  <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">`,
    `    <feGaussianBlur stdDeviation="4" result="b"/>`,
    `    <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>`,
    `  </filter>`,
    `</defs>`,
    // Outer glow layer
    `<rect x="1" y="1" width="70" height="70" rx="8" fill="none" stroke="${glow}" stroke-width="6" opacity="0.4" filter="url(#glow)"/>`,
    // Main background
    `<rect x="2" y="2" width="68" height="68" rx="7" fill="${bg}" stroke="${bright}" stroke-width="2"/>`,
    // Icon
    iconSvg,
    // Label
    `<text x="36" y="${labelY}" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="bold" fill="${textColor}" letter-spacing="0.5">${escXml(label)}</text>`,
    // Corner accents drawn on top
    corners,
    `</svg>`,
  ].join("");
}

// Lighten a hex colour by mixing towards white by `t` (0–1)
function lighten(hex: string, t: number): string {
  return blend(hex, "#ffffff", t);
}

// Darken a hex colour by mixing towards black by `t` (0–1)
function darken(hex: string, t: number): string {
  return blend(hex, "#000000", t);
}

function blend(hex: string, target: string, t: number): string {
  const [r1, g1, b1] = parseHex(hex);
  const [r2, g2, b2] = parseHex(target);
  const clamp = (v: number) => Math.round(Math.max(0, Math.min(255, v)));
  const r = clamp(r1 + (r2 - r1) * t);
  const g = clamp(g1 + (g2 - g1) * t);
  const b = clamp(b1 + (b2 - b1) * t);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function parseHex(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
