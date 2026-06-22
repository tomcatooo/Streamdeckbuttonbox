// Renders SVG button images for the Stream Deck.
// The @elgato/streamdeck SDK's setImage() accepts raw SVG strings directly.
//
// Layout (72×72 px):
//   With icon  → icon fills a 50×50 area (y 4–54), label at y 66
//   No icon    → label centred at y 40
//
// Visual design:
//   OFF — near-black bg, mid-grey icon, grey label, hairline border
//   ON  — full-colour bg, white icon, white label, thick glowing border + corner accents

export interface RenderOptions {
  label: string;
  isActive: boolean;
  colorOff?: string;
  colorOn?: string;
  icon?: string;
}

// Icons are full SVG element strings in a 72×72 coordinate space.
// Rendered inside <g fill="COLOR" stroke="COLOR" stroke-width="0"> so every
// element inherits the icon colour.  Elements that need a stroke outline
// explicitly set their own stroke-width; elements that should be hollow set
// fill="none".
const ICON_SVG: Record<string, string> = {

  // Sun / high-beam: filled circle + 8 rounded rectangular rays
  headlights:
    '<circle cx="36" cy="36" r="9"/>' +
    '<rect x="33" y="5"  width="6" height="13" rx="3"/>' +
    '<rect x="33" y="5"  width="6" height="13" rx="3" transform="rotate(45 36 36)"/>' +
    '<rect x="33" y="5"  width="6" height="13" rx="3" transform="rotate(90 36 36)"/>' +
    '<rect x="33" y="5"  width="6" height="13" rx="3" transform="rotate(135 36 36)"/>' +
    '<rect x="33" y="5"  width="6" height="13" rx="3" transform="rotate(180 36 36)"/>' +
    '<rect x="33" y="5"  width="6" height="13" rx="3" transform="rotate(225 36 36)"/>' +
    '<rect x="33" y="5"  width="6" height="13" rx="3" transform="rotate(270 36 36)"/>' +
    '<rect x="33" y="5"  width="6" height="13" rx="3" transform="rotate(315 36 36)"/>',

  // Pit lane / menu: 3 thick rounded bars
  pit:
    '<rect x="10" y="17" width="52" height="8" rx="4"/>' +
    '<rect x="10" y="32" width="52" height="8" rx="4"/>' +
    '<rect x="10" y="47" width="52" height="8" rx="4"/>',

  // ABS: target — outer ring + filled centre
  abs:
    '<circle cx="36" cy="36" r="22" fill="none" stroke-width="6"/>' +
    '<circle cx="36" cy="36" r="8"/>',

  // TC: warning triangle (alert/exclamation)
  tc:
    '<polygon points="36,10 64,60 8,60" fill="none" stroke-width="6" stroke-linejoin="round"/>' +
    '<rect x="33" y="28" width="6" height="14" rx="3"/>' +
    '<circle cx="36" cy="50" r="4"/>',

  // Flag: pole + filled pennant
  flag:
    '<rect x="14" y="8"  width="6" height="54" rx="3"/>' +
    '<polygon points="20,8 64,22 20,42"/>',

  // Fuel: canister body + cap + nozzle
  fuel:
    '<rect x="22" y="24" width="28" height="34" rx="4"/>' +
    '<rect x="27" y="14" width="16" height="12" rx="3"/>' +
    '<rect x="44" y="18" width="12" height="5"  rx="2"/>',

  // Ignition / power: open circle + vertical bar (classic power symbol)
  ignition:
    '<circle cx="36" cy="42" r="18" fill="none" stroke-width="7"/>' +
    '<rect   x="32" y="14"  width="8"  height="28" rx="4"/>',

  // Brake disc: two concentric rings + centre dot
  brake:
    '<circle cx="36" cy="36" r="24" fill="none" stroke-width="6"/>' +
    '<circle cx="36" cy="36" r="14" fill="none" stroke-width="5"/>' +
    '<circle cx="36" cy="36" r="5"/>',

  // Fan / A-C: centre hub + 4 blades (slightly rotated so it reads as spinning)
  fan:
    '<circle cx="36" cy="36" r="7"/>' +
    '<rect x="33" y="8"  width="6" height="22" rx="3" transform="rotate(20 36 36)"/>' +
    '<rect x="33" y="8"  width="6" height="22" rx="3" transform="rotate(110 36 36)"/>' +
    '<rect x="33" y="8"  width="6" height="22" rx="3" transform="rotate(200 36 36)"/>' +
    '<rect x="33" y="8"  width="6" height="22" rx="3" transform="rotate(290 36 36)"/>',
};

export function renderButtonSvg(opts: RenderOptions): string {
  return opts.isActive
    ? renderOn(opts.label, opts.colorOn ?? "#1a6fd4", opts.icon)
    : renderOff(opts.label, opts.colorOff ?? "#1a1a1a", opts.icon);
}

// OFF — near-black, everything dim
function renderOff(label: string, colorOff: string, icon?: string): string {
  const bg          = darken(colorOff, 0.15);
  const border      = lighten(colorOff, 0.1);
  const iconColor   = "#888888";
  const textColor   = "#707070";
  const iconContent = icon ? ICON_SVG[icon] : undefined;
  const labelY      = iconContent ? 67 : 40;

  const iconSvg = iconContent
    ? `<g transform="translate(11,4) scale(0.6944)" fill="${iconColor}" stroke="${iconColor}" stroke-width="0">${iconContent}</g>`
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
  const bg          = colorOn;
  const bright      = lighten(colorOn, 0.4);
  const glow        = lighten(colorOn, 0.25);
  const iconColor   = "#ffffff";
  const textColor   = "#ffffff";
  const iconContent = icon ? ICON_SVG[icon] : undefined;
  const labelY      = iconContent ? 67 : 40;

  const iconSvg = iconContent
    ? `<g transform="translate(11,4) scale(0.6944)" fill="${iconColor}" stroke="${iconColor}" stroke-width="0">${iconContent}</g>`
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
