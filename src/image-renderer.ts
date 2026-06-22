// Generates SVG strings for Stream Deck button images.
// The @elgato/streamdeck SDK's setImage() accepts raw SVG strings directly.

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
};

export function renderButtonSvg(opts: RenderOptions): string {
  const {
    label,
    isActive,
    colorOff = "#1a1a1a",
    colorOn = "#1a6fd4",
    icon,
  } = opts;

  const bg = isActive ? colorOn : colorOff;
  const textColor = isActive ? "#ffffff" : "#888888";
  const border = isActive ? adjustColor(bg, 40) : "#3a3a3a";
  const iconColor = isActive ? "#ffffff" : "#555555";

  const iconPath = icon ? ICON_PATHS[icon] : undefined;
  const labelY = iconPath ? 62 : 42;

  const iconSvg = iconPath
    ? `<g transform="translate(18,6) scale(0.5)" fill="${iconColor}"><path d="${iconPath}"/></g>`
    : "";

  const glowDefs = isActive
    ? `<defs><filter id="g"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`
    : "";

  const glowAttr = isActive ? ` filter="url(#g)"` : "";
  const dot = isActive
    ? `<circle cx="36" cy="68" r="2.5" fill="${border}"/>`
    : "";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">`,
    glowDefs,
    `<rect x="1" y="1" width="70" height="70" rx="8" fill="${bg}" stroke="${border}" stroke-width="1.5"${glowAttr}/>`,
    iconSvg,
    `<text x="36" y="${labelY}" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="bold" fill="${textColor}" letter-spacing="0.5">${escXml(label)}</text>`,
    dot,
    `</svg>`,
  ].join("");
}

function adjustColor(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(((n >> 16) & 0xff) + amount);
  const g = clamp(((n >> 8) & 0xff) + amount);
  const b = clamp((n & 0xff) + amount);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
