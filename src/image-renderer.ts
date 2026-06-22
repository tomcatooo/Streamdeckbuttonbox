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

// Lovely Sim Racing palette — fixed regardless of user colour settings
const LSR = {
  offBg:     "#0f0f0f",
  offBorder: "#5a0000",
  onBg:      "#cc0000",
  onBorder:  "#ff3c3c",
};

export function renderButtonSvg(opts: RenderOptions): string {
  return opts.isActive ? renderOn(opts.label, opts.icon) : renderOff(opts.label, opts.icon);
}

function buildIconSvg(icon: string, iconColor: string, bgColor: string): string {
  const def = ICON_SVG[icon];
  if (!def) return "";
  return def.replace(/\bIC\b/g, iconColor).replace(/\bBG\b/g, bgColor);
}

// OFF — near-black bg, dark crimson border, white icon/text
function renderOff(label: string, icon?: string): string {
  const labelY  = icon && ICON_SVG[icon] ? 67 : 40;
  const iconSvg = icon && ICON_SVG[icon]
    ? `<g transform="translate(11,4) scale(0.6944)">${buildIconSvg(icon, "#ffffff", LSR.offBg)}</g>`
    : "";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">`,
    `<rect x="0" y="0" width="72" height="72" rx="10" fill="${LSR.offBg}" stroke="${LSR.offBorder}" stroke-width="3"/>`,
    iconSvg,
    `<text x="36" y="${labelY}" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="bold" fill="#ffffff" letter-spacing="0.5">${escXml(label)}</text>`,
    `</svg>`,
  ].join("");
}

// ON — red bg, bright red border, white icon/text
function renderOn(label: string, icon?: string): string {
  const labelY  = icon && ICON_SVG[icon] ? 67 : 40;
  const iconSvg = icon && ICON_SVG[icon]
    ? `<g transform="translate(11,4) scale(0.6944)">${buildIconSvg(icon, "#ffffff", LSR.onBg)}</g>`
    : "";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">`,
    `<rect x="0" y="0" width="72" height="72" rx="10" fill="${LSR.onBg}" stroke="${LSR.onBorder}" stroke-width="3"/>`,
    iconSvg,
    `<text x="36" y="${labelY}" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="bold" fill="#ffffff" letter-spacing="0.5">${escXml(label)}</text>`,
    `</svg>`,
  ].join("");
}

function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
