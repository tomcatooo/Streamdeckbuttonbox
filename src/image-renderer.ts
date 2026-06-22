// Renders SVG button images for the Stream Deck.
// The @elgato/streamdeck SDK's setImage() accepts raw SVG strings directly.
//
// Layout (72×72 px):
//   With icon  → icon fills a 64×50 area (y 4–54), label at y 66
//   No icon    → label centred at y 40
//
// Visual design:
//   OFF — near-black bg, dim icon, dark-grey label, hairline border
//   ON  — full-colour bg, white icon, white label, thick glowing border + corner accents

export interface RenderOptions {
  label: string;
  isActive: boolean;
  colorOff?: string;
  colorOn?: string;
  icon?: string;
}

// 72×72 viewport path data for each icon.
// Embedded in a nested <svg> so the stream deck button viewport handles scaling.
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
  // 4-blade fan: each blade sweeps from centre to outer arc
  fan:
    "M36 36 L30 18 A10 10 0 0 1 42 18 Z  M36 36 L54 30 A10 10 0 0 1 54 42 Z  M36 36 L42 54 A10 10 0 0 1 30 54 Z  M36 36 L18 42 A10 10 0 0 1 18 30 Z  M36 28 a8 8 0 0 0 0 16 a8 8 0 0 0 0-16",
};

export function renderButtonSvg(opts: RenderOptions): string {
  return opts.isActive
    ? renderOn(opts.label, opts.colorOn ?? "#1a6fd4", opts.icon)
    : renderOff(opts.label, opts.colorOff ?? "#1a1a1a", opts.icon);
}

// OFF — near-black, everything dim
function renderOff(label: string, colorOff: string, icon?: string): string {
  const bg        = darken(colorOff, 0.15);
  const border    = lighten(colorOff, 0.1);
  const iconColor = "#505050";
  const textColor = "#606060";
  const iconPath  = icon ? ICON_PATHS[icon] : undefined;
  const labelY    = iconPath ? 67 : 40;

  const iconSvg = iconPath
    ? `<g transform="translate(11,4) scale(0.6944)">` +
      `<path d="${iconPath}" fill="${iconColor}"/>` +
      `</g>`
    : "";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">`,
    `<rect x="0" y="0" width="72" height="72" rx="8" fill="${bg}" stroke="${border}" stroke-width="1"/>`,
    iconSvg,
    `<text x="36" y="${labelY}" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="bold" fill="${textColor}" letter-spacing="0.5">${escXml(label)}</text>`,
    `</svg>`,
  ].join("");
}

// ON — full colour, thick border, glow, corner accents
function renderOn(label: string, colorOn: string, icon?: string): string {
  const bg        = colorOn;
  const bright    = lighten(colorOn, 0.4);
  const glow      = lighten(colorOn, 0.25);
  const iconColor = "#ffffff";
  const textColor = "#ffffff";
  const iconPath  = icon ? ICON_PATHS[icon] : undefined;
  const labelY    = iconPath ? 67 : 40;

  const iconSvg = iconPath
    ? `<g transform="translate(11,4) scale(0.6944)">` +
      `<path d="${iconPath}" fill="${iconColor}"/>` +
      `</g>`
    : "";

  const corners = [
    `<path d="M4 14 L4 4 L14 4"   stroke="${bright}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    `<path d="M58 4 L68 4 L68 14" stroke="${bright}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    `<path d="M4 58 L4 68 L14 68" stroke="${bright}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    `<path d="M58 68 L68 68 L68 58" stroke="${bright}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  ].join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">`,
    `<defs><filter id="glow" x="-40%" y="-40%" width="180%" height="180%">`,
    `<feGaussianBlur stdDeviation="4" result="b"/>`,
    `<feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>`,
    `</filter></defs>`,
    `<rect x="1" y="1" width="70" height="70" rx="8" fill="none" stroke="${glow}" stroke-width="6" opacity="0.4" filter="url(#glow)"/>`,
    `<rect x="2" y="2" width="68" height="68" rx="7" fill="${bg}" stroke="${bright}" stroke-width="2"/>`,
    iconSvg,
    `<text x="36" y="${labelY}" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="bold" fill="${textColor}" letter-spacing="0.5">${escXml(label)}</text>`,
    corners,
    `</svg>`,
  ].join("");
}

function lighten(hex: string, t: number): string { return blend(hex, "#ffffff", t); }
function darken(hex: string, t: number): string  { return blend(hex, "#000000", t); }

function blend(hex: string, target: string, t: number): string {
  const [r1, g1, b1] = parseHex(hex);
  const [r2, g2, b2] = parseHex(target);
  const c = (a: number, b: number) => Math.round(Math.max(0, Math.min(255, a + (b - a) * t)));
  return `#${[c(r1, r2), c(g1, g2), c(b1, b2)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function parseHex(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
