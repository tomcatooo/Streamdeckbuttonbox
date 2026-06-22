import {
  action,
  DidReceiveSettingsEvent,
  KeyAction,
  SingletonAction,
  WillAppearEvent,
  WillDisappearEvent,
} from "@elgato/streamdeck";
import { renderButtonSvg } from "../image-renderer";
import type { SimHubClient, TelemetryData } from "../simhub-client";

export type ButtonSettings = {
  preset?: string;
  property?: string;
  label?: string;
  colorOff?: string;
  colorOn?: string;
  icon?: string;
  threshold?: string;
};

type ResolvedConfig = Required<Omit<ButtonSettings, "preset">>;

type ActionCache = {
  settings: ButtonSettings;
  lastActive: boolean | null;
};

const PRESETS: Record<string, Omit<ButtonSettings, "preset" | "threshold"> & { property: string }> = {
  headlights:     { property: "Headlights",      label: "LIGHTS",   colorOff: "#222222", colorOn: "#FFD700", icon: "headlights" },
  pitLimiter:     { property: "PitLimiter",       label: "PIT LIM",  colorOff: "#222222", colorOn: "#00CC44", icon: "pit" },
  abs:            { property: "ABSActive",        label: "ABS",      colorOff: "#222222", colorOn: "#FF3333", icon: "abs" },
  tc:             { property: "TCActive",         label: "TC",       colorOff: "#222222", colorOn: "#FF8800", icon: "tc" },
  engineIgnition: { property: "EngineIgnitionOn", label: "IGNITION", colorOff: "#222222", colorOn: "#FF3333", icon: "ignition" },
  flag:           { property: "Flag_Yellow",      label: "FLAG",     colorOff: "#222222", colorOn: "#FFD700", icon: "flag" },
};

@action({ UUID: "com.simhub.buttonbox.telemetrybutton" })
export class TelemetryButtonAction extends SingletonAction<ButtonSettings> {
  // Per-instance cache keyed by action.id: avoids calling getSettings() in the hot path.
  private readonly _cache = new Map<string, ActionCache>();

  constructor(simhub: SimHubClient) {
    super();
    simhub.on("update", (data) => this._onSimHubUpdate(data));
  }

  override onWillAppear(ev: WillAppearEvent<ButtonSettings>): void {
    if (!ev.action.isKey()) return;
    this._cache.set(ev.action.id, {
      settings: ev.payload.settings,
      lastActive: null,
    });
    // Show a placeholder immediately so the button isn't blank on first load.
    ev.action.setImage(renderButtonSvg({ label: "---", isActive: false })).catch(() => {});
  }

  override onWillDisappear(ev: WillDisappearEvent<ButtonSettings>): void {
    this._cache.delete(ev.action.id);
  }

  override onDidReceiveSettings(ev: DidReceiveSettingsEvent<ButtonSettings>): void {
    if (!ev.action.isKey()) return;
    const entry = this._cache.get(ev.action.id);
    if (entry) {
      entry.settings = ev.payload.settings;
      entry.lastActive = null; // force re-render with new settings
    }
  }

  private _onSimHubUpdate(data: TelemetryData): void {
    for (const action of this.actions) {
      if (action.isKey()) this._applyData(action, data);
    }
  }

  private _applyData(action: KeyAction<ButtonSettings>, data: TelemetryData): void {
    const entry = this._cache.get(action.id);
    if (!entry) return;

    const cfg = resolveConfig(entry.settings);
    if (!cfg.property) return;

    const raw = data[cfg.property];
    if (raw === undefined) return;

    const isActive = Number(raw) > Number(cfg.threshold);
    if (isActive === entry.lastActive) return; // nothing changed
    entry.lastActive = isActive;

    action
      .setImage(
        renderButtonSvg({
          label: cfg.label,
          isActive,
          colorOff: cfg.colorOff,
          colorOn: cfg.colorOn,
          icon: cfg.icon || undefined,
        })
      )
      .catch(() => {});
    action.setState(isActive ? 1 : 0).catch(() => {});
  }
}

function resolveConfig(s: ButtonSettings): ResolvedConfig {
  const preset = s.preset ? PRESETS[s.preset] : undefined;
  return {
    property:  s.property  ?? preset?.property  ?? "",
    label:     s.label     ?? preset?.label     ?? "BUTTON",
    colorOff:  s.colorOff  ?? preset?.colorOff  ?? "#222222",
    colorOn:   s.colorOn   ?? preset?.colorOn   ?? "#1a6fd4",
    icon:      s.icon      ?? preset?.icon      ?? "",
    threshold: s.threshold ?? "0.5",
  };
}
