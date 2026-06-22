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

export type GameMapping = {
  game: string;     // SimHub game name, e.g. "assettocorsa" (case-insensitive match)
  property: string; // SimHub property for that game, e.g. "dcp.gd.Headlights"
};

export type ButtonSettings = {
  preset?: string;
  property?: string;        // default property (used when no game mapping matches)
  label?: string;
  colorOff?: string;
  colorOn?: string;
  icon?: string;
  threshold?: string;
  gameMappings?: GameMapping[]; // per-game overrides
};

type ResolvedConfig = Required<Omit<ButtonSettings, "preset" | "gameMappings">> & {
  gameMappings: GameMapping[];
};

type ActionCache = {
  settings: ButtonSettings;
  lastActive: boolean | null;
  subscribedProperty: string; // what we actually asked SimHub to subscribe to
};

// Built-in presets use dcp.gd.* (DataCorePlugin.GameData.*) typed properties
// for the best performance. Untyped access works too — just omit the prefix.
// Use `help` in a TCP connection to port 18082 to browse all available properties.
const PRESETS: Record<string, Omit<ButtonSettings, "preset" | "threshold" | "gameMappings"> & { property: string }> = {
  headlights:     { property: "dcp.gd.Headlights",      label: "LIGHTS",   colorOff: "#222222", colorOn: "#FFD700", icon: "headlights" },
  pitLimiter:     { property: "dcp.gd.PitLimiter",       label: "PIT LIM",  colorOff: "#222222", colorOn: "#00CC44", icon: "pit" },
  abs:            { property: "dcp.gd.ABSActive",        label: "ABS",      colorOff: "#222222", colorOn: "#FF3333", icon: "abs" },
  tc:             { property: "dcp.gd.TcActive",         label: "TC",       colorOff: "#222222", colorOn: "#FF8800", icon: "tc" },
  engineIgnition: { property: "dcp.gd.EngineIgnitionOn", label: "IGNITION", colorOff: "#222222", colorOn: "#FF3333", icon: "ignition" },
  flag:           { property: "dcp.gd.Flag_Yellow",      label: "FLAG",     colorOff: "#222222", colorOn: "#FFD700", icon: "flag" },
};

@action({ UUID: "com.simhub.buttonbox.telemetrybutton" })
export class TelemetryButtonAction extends SingletonAction<ButtonSettings> {
  private readonly _simhub: SimHubClient;
  private readonly _cache = new Map<string, ActionCache>();

  constructor(simhub: SimHubClient) {
    super();
    this._simhub = simhub;
    simhub.on("update",     (data) => this._onSimHubUpdate(data));
    simhub.on("gameChange", (game) => this._onGameChange(game));
  }

  override onWillAppear(ev: WillAppearEvent<ButtonSettings>): void {
    if (!ev.action.isKey()) return;

    const property = this._pickProperty(ev.payload.settings, this._simhub.getGameName());
    this._cache.set(ev.action.id, {
      settings: ev.payload.settings,
      lastActive: null,
      subscribedProperty: property,
    });

    ev.action.setImage(renderButtonSvg({ label: "---", isActive: false })).catch(() => {});
    if (property) this._simhub.subscribe(property);
  }

  override onWillDisappear(ev: WillDisappearEvent<ButtonSettings>): void {
    const entry = this._cache.get(ev.action.id);
    if (entry?.subscribedProperty) {
      this._simhub.unsubscribe(entry.subscribedProperty);
    }
    this._cache.delete(ev.action.id);
  }

  override onDidReceiveSettings(ev: DidReceiveSettingsEvent<ButtonSettings>): void {
    if (!ev.action.isKey()) return;

    const entry = this._cache.get(ev.action.id);
    if (!entry) return;

    const newProperty = this._pickProperty(ev.payload.settings, this._simhub.getGameName());
    this._swapSubscription(entry, newProperty);
    entry.settings = ev.payload.settings;
    entry.lastActive = null; // force re-render
  }

  // When the active game changes, re-evaluate which property each button should watch.
  private _onGameChange(game: string): void {
    for (const [, entry] of this._cache) {
      const newProperty = this._pickProperty(entry.settings, game);
      this._swapSubscription(entry, newProperty);
      entry.lastActive = null;
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
    const property = entry.subscribedProperty;
    if (!property) return;

    const raw = data[property];
    if (raw === undefined) return;

    const isActive = Number(raw) > Number(cfg.threshold);
    if (isActive === entry.lastActive) return;
    entry.lastActive = isActive;

    action.setImage(renderButtonSvg({
      label:    cfg.label,
      isActive,
      colorOff: cfg.colorOff,
      colorOn:  cfg.colorOn,
      icon:     cfg.icon || undefined,
    })).catch(() => {});
    action.setState(isActive ? 1 : 0).catch(() => {});
  }

  // Pick the right property name for the current game:
  // 1. Look for a matching gameMappings entry (case-insensitive)
  // 2. Fall back to the default property / preset
  private _pickProperty(settings: ButtonSettings, currentGame: string): string {
    const cfg = resolveConfig(settings);
    if (currentGame && cfg.gameMappings.length > 0) {
      const lower = currentGame.toLowerCase();
      const match = cfg.gameMappings.find((m) => m.game.toLowerCase() === lower);
      if (match?.property) return match.property;
    }
    return cfg.property;
  }

  private _swapSubscription(entry: ActionCache, newProperty: string): void {
    if (entry.subscribedProperty === newProperty) return;
    if (entry.subscribedProperty) this._simhub.unsubscribe(entry.subscribedProperty);
    if (newProperty)              this._simhub.subscribe(newProperty);
    entry.subscribedProperty = newProperty;
  }
}

function resolveConfig(s: ButtonSettings): ResolvedConfig {
  const preset = s.preset ? PRESETS[s.preset] : undefined;
  return {
    property:     s.property  ?? preset?.property  ?? "",
    label:        s.label     ?? preset?.label     ?? "BUTTON",
    colorOff:     s.colorOff  ?? preset?.colorOff  ?? "#222222",
    colorOn:      s.colorOn   ?? preset?.colorOn   ?? "#1a6fd4",
    icon:         s.icon      ?? preset?.icon      ?? "",
    threshold:    s.threshold ?? "0.5",
    gameMappings: s.gameMappings ?? [],
  };
}
