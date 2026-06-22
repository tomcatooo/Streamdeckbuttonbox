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

  // ERS / KERS: lightning bolt
  ers:
    '<polygon points="38,8 20,40 34,40 28,64 46,32 32,32" fill="IC"/>',

  // Steering wheel (FFB)
  wheel:
    '<circle cx="36" cy="36" r="26" fill="IC"/>' +
    '<circle cx="36" cy="36" r="20" fill="BG"/>' +
    '<rect x="34" y="16" width="4" height="14" fill="IC"/>' +
    '<rect x="34" y="16" width="4" height="14" fill="IC" transform="rotate(120 36 36)"/>' +
    '<rect x="34" y="16" width="4" height="14" fill="IC" transform="rotate(240 36 36)"/>' +
    '<circle cx="36" cy="36" r="5" fill="IC"/>',

  // DRS: rear wing + up-arrow
  drs:
    '<polygon points="36,10 44,22 28,22" fill="IC"/>' +
    '<rect x="8"  y="22" width="56" height="8" rx="2" fill="IC"/>' +
    '<rect x="8"  y="18" width="7"  height="18" rx="2" fill="IC"/>' +
    '<rect x="57" y="18" width="7"  height="18" rx="2" fill="IC"/>',

  // Camera: body + viewfinder bump + lens
  camera:
    '<rect x="8"  y="22" width="44" height="30" rx="4" fill="IC"/>' +
    '<rect x="42" y="14" width="12" height="10" rx="3" fill="IC"/>' +
    '<circle cx="29" cy="37" r="11" fill="BG"/>' +
    '<circle cx="29" cy="37" r="8"  fill="IC"/>' +
    '<circle cx="29" cy="37" r="4"  fill="BG"/>',

  // Wiper: arc sweep + pivot
  wiper:
    '<polygon points="10,46 36,30 62,46 54,52 36,38 18,52" fill="IC"/>' +
    '<circle cx="36" cy="60" r="5" fill="IC"/>',

  // Tyre: concentric rings (tyre + rim + hub)
  tyre:
    '<circle cx="36" cy="36" r="26" fill="IC"/>' +
    '<circle cx="36" cy="36" r="21" fill="BG"/>' +
    '<circle cx="36" cy="36" r="16" fill="IC"/>' +
    '<circle cx="36" cy="36" r="10" fill="BG"/>' +
    '<circle cx="36" cy="36" r="4"  fill="IC"/>',

  // Differential: two rings + connecting bar
  diff:
    '<circle cx="24" cy="36" r="14" fill="IC"/>' +
    '<circle cx="24" cy="36" r="9"  fill="BG"/>' +
    '<circle cx="48" cy="36" r="14" fill="IC"/>' +
    '<circle cx="48" cy="36" r="9"  fill="BG"/>' +
    '<rect x="24" y="32" width="24" height="8" fill="IC"/>' +
    '<rect x="27" y="34" width="18" height="4" fill="BG"/>',

  // Speaker / volume
  speaker:
    '<rect x="10" y="27" width="12" height="18" rx="2" fill="IC"/>' +
    '<polygon points="22,27 48,13 48,59 22,45" fill="IC"/>',

  // Chat / speech bubble
  chat:
    '<rect x="6"  y="8"  width="60" height="40" rx="8" fill="IC"/>' +
    '<polygon points="12,48 24,48 16,62" fill="IC"/>',

  // Microphone
  mic:
    '<rect x="28" y="8"  width="16" height="30" rx="8" fill="IC"/>' +
    '<rect x="18" y="30" width="36" height="4"  rx="2" fill="IC"/>' +
    '<rect x="18" y="30" width="4"  height="14" rx="2" fill="IC"/>' +
    '<rect x="50" y="30" width="4"  height="14" rx="2" fill="IC"/>' +
    '<rect x="34" y="42" width="4"  height="14" fill="IC"/>' +
    '<rect x="22" y="56" width="28" height="5"  rx="2" fill="IC"/>',

  // Home / house
  home:
    '<polygon points="36,6 64,34 8,34" fill="IC"/>' +
    '<rect x="14" y="32" width="44" height="30" rx="2" fill="IC"/>' +
    '<rect x="28" y="44" width="16" height="18" fill="BG"/>',

  // Media pause
  pause:
    '<rect x="16" y="14" width="14" height="44" rx="3" fill="IC"/>' +
    '<rect x="42" y="14" width="14" height="44" rx="3" fill="IC"/>',

  // Media play
  play:
    '<polygon points="16,10 16,62 58,36" fill="IC"/>',

  // Engine starter: battery outline + lightning bolt
  engine:
    '<rect x="22" y="16" width="10" height="8"  rx="2" fill="IC"/>' +
    '<rect x="40" y="16" width="10" height="8"  rx="2" fill="IC"/>' +
    '<rect x="14" y="22" width="44" height="32" rx="3" fill="IC"/>' +
    '<rect x="18" y="26" width="36" height="24" rx="1" fill="BG"/>' +
    '<polygon points="38,28 26,41 34,41 30,50 42,37 34,37" fill="IC"/>',

  // Navigation arrows
  arrow_left:
    '<polygon points="12,36 36,10 36,22 60,22 60,50 36,50 36,62" fill="IC"/>',
  arrow_right:
    '<polygon points="60,36 36,10 36,22 12,22 12,50 36,50 36,62" fill="IC"/>',
  arrow_up:
    '<polygon points="36,10 62,36 50,36 50,62 22,62 22,36 10,36" fill="IC"/>',
  arrow_down:
    '<polygon points="36,62 62,36 50,36 50,10 22,10 22,36 10,36" fill="IC"/>',
};

// Blue backlit button palette — fixed regardless of user colour settings
const LSR = {
  offBg:     "#080c14",
  offBorder: "#1a3a6a",
  onBg:      "#0055cc",
  onBorder:  "#4499ff",
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
