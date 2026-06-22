// Renders SVG button images for the Stream Deck.
// setImage() accepts SVG strings starting with <svg.
//
// Layout (72×72 px):
//   With icon  → icon in upper 50×50 area, label at y 67
//   No icon    → label centred at y 40
//
// Visual design:
//   OFF — near-black bg, mid-grey icon/label, hairline border
//   ON  — full-colour bg, white icon/label, thick glowing border + corner accents

export interface RenderOptions {
  label: string;
  isActive: boolean;
  colorOff?: string;
  colorOn?: string;
  icon?: string;
}

// Each icon is a string of SVG elements in a 72×72 coordinate space.
// The literal text "IC" acts as a placeholder that gets replaced with the
// real icon colour at render time, giving every element an explicit fill
// or stroke attribute (inheritance from <g> is unreliable in some renderers).
const ICON_SVG: Record<string, string> = {

  // Sun / high-beam: filled circle + 8 rotated rounded rects as rays
  headlights:
    '<circle cx="36" cy="36" r="10" fill="IC"/>' +
    '<rect x="33" y="5"  width="6" height="13" rx="3" fill="IC"/>' +
    '<rect x="33" y="5"  width="6" height="13" rx="3" fill="IC" transform="rotate(45 36 36)"/>' +
    '<rect x="33" y="5"  width="6" height="13" rx="3" fill="IC" transform="rotate(90 36 36)"/>' +
    '<rect x="33" y="5"  width="6" height="13" rx="3" fill="IC" transform="rotate(135 36 36)"/>' +
    '<rect x="33" y="5"  width="6" height="13" rx="3" fill="IC" transform="rotate(180 36 36)"/>' +
    '<rect x="33" y="5"  width="6" height="13" rx="3" fill="IC" transform="rotate(225 36 36)"/>' +
    '<rect x="33" y="5"  width="6" height="13" rx="3" fill="IC" transform="rotate(270 36 36)"/>' +
    '<rect x="33" y="5"  width="6" height="13" rx="3" fill="IC" transform="rotate(315 36 36)"/>',

  // Pit lane: 3 thick rounded bars
  pit:
    '<rect x="9"  y="17" width="54" height="8" rx="4" fill="IC"/>' +
    '<rect x="9"  y="32" width="54" height="8" rx="4" fill="IC"/>' +
    '<rect x="9"  y="47" width="54" height="8" rx="4" fill="IC"/>',

  // ABS: outer ring (filled circle + bg hole) + inner dot
  abs:
    '<circle cx="36" cy="36" r="24" fill="IC"/>' +
    '<circle cx="36" cy="36" r="17" fill="BG"/>' +
    '<circle cx="36" cy="36" r="9"  fill="IC"/>',

  // TC: warning triangle outline + exclamation mark
  tc:
    '<polygon points="36,10 63,60 9,60" fill="IC"/>' +
    '<polygon points="36,22 54,56 18,56" fill="BG"/>' +
    '<rect x="33" y="30" width="6" height="13" rx="3" fill="IC"/>' +
    '<circle cx="36" cy="50" r="4" fill="IC"/>',

  // Flag: vertical pole + solid pennant
  flag:
    '<rect x="14" y="8"  width="6" height="54" rx="3" fill="IC"/>' +
    '<polygon points="20,8 63,22 20,42" fill="IC"/>',

  // Fuel: canister body + cap + nozzle
  fuel:
    '<rect x="21" y="24" width="28" height="34" rx="4" fill="IC"/>' +
    '<rect x="27" y="14" width="16" height="12" rx="3" fill="IC"/>' +
    '<rect x="43" y="18" width="12" height="5"  rx="2" fill="IC"/>',

  // Ignition: classic power-button symbol (ring + vertical bar with gap)
  ignition:
    '<circle cx="36" cy="42" r="20" fill="IC"/>' +
    '<circle cx="36" cy="42" r="13" fill="BG"/>' +
    '<rect   x="32" y="14"  width="8" height="30" rx="4" fill="IC"/>' +
    '<rect   x="32" y="38"  width="8" height="6"        fill="BG"/>',

  // Brake: three concentric rings (5 circles alternating icon/bg colour)
  brake:
    '<circle cx="36" cy="36" r="24" fill="IC"/>' +
    '<circle cx="36" cy="36" r="19" fill="BG"/>' +
    '<circle cx="36" cy="36" r="15" fill="IC"/>' +
    '<circle cx="36" cy="36" r="10" fill="BG"/>' +
    '<circle cx="36" cy="36" r="5"  fill="IC"/>',

  // Fan / A-C: centre hub + 4 blades at 20° offset from cardinal axes
  fan:
    '<circle cx="36" cy="36" r="7" fill="IC"/>' +
    '<rect x="33" y="8" width="6" height="22" rx="3" fill="IC" transform="rotate(20  36 36)"/>' +
    '<rect x="33" y="8" width="6" height="22" rx="3" fill="IC" transform="rotate(110 36 36)"/>' +
    '<rect x="33" y="8" width="6" height="22" rx="3" fill="IC" transform="rotate(200 36 36)"/>' +
    '<rect x="33" y="8" width="6" height="22" rx="3" fill="IC" transform="rotate(290 36 36)"/>',
};

export function renderButtonSvg(opts: RenderOptions): string {
  return opts.isActive
    ? renderOn(opts.label, opts.colorOn ?? "#1a6fd4", opts.icon)
    : renderOff(opts.label, opts.colorOff ?? "#1a1a1a", opts.icon);
}

function buildIconSvg(icon: string, iconColor: string, bgColor: string): string {
  const def = ICON_SVG[icon];
  if (!def) return "";
  return def.replace(/\bIC\b/g, iconColor).replace(/\bBG\b/g, bgColor);
}

// OFF — near-black, everything dim
function renderOff(label: string, colorOff: string, icon?: string): string {
  const bg        = darken(colorOff, 0.15);
  const border    = lighten(colorOff, 0.1);
  const iconColor = "#999999";
  const textColor = "#707070";
  const labelY    = icon && ICON_SVG[icon] ? 67 : 40;

  const iconSvg = icon && ICON_SVG[icon]
    ? `<g transform="translate(11,4) scale(0.6944)">${buildIconSvg(icon, iconColor, bg)}</g>`
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
  const labelY    = icon && ICON_SVG[icon] ? 67 : 40;

  const iconSvg = icon && ICON_SVG[icon]
    ? `<g transform="translate(11,4) scale(0.6944)">${buildIconSvg(icon, iconColor, bg)}</g>`
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
