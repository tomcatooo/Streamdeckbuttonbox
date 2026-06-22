import {
  action,
  DidReceiveSettingsEvent,
  KeyAction,
  KeyDownEvent,
  KeyUpEvent,
  PropertyInspectorDidAppearEvent,
  SingletonAction,
  streamDeck,
  WillAppearEvent,
  WillDisappearEvent,
} from "@elgato/streamdeck";
import type { SimHubClient, TelemetryData } from "../simhub-client";

export type GameMapping = {
  game: string;     // SimHub game name, e.g. "assettocorsa" (case-insensitive match)
  property: string; // SimHub property for that game
};

export type ButtonSettings = {
  preset?: string;
  property?: string;
  threshold?: string;
  gameMappings?: GameMapping[];
  controlMapperRole?: string;
};

type ResolvedConfig = {
  property: string;
  threshold: string;
  gameMappings: GameMapping[];
  controlMapperRole: string;
};

type ActionCache = {
  settings: ButtonSettings;
  lastActive: boolean | null;
  subscribedProperty: string;
};

const PRESETS: Record<string, { property: string }> = {
  headlights:     { property: "dcp.gd.Headlights"          },
  pitLimiter:     { property: "dcp.gd.PitLimiter"          },
  abs:            { property: "dcp.gd.ABSActive"           },
  tc:             { property: "dcp.gd.TcActive"            },
  engineIgnition: { property: "dcp.gd.EngineIgnitionOn"    },
  flag:           { property: "dcp.gd.Flag_Yellow"         },
  aircon:         { property: "ShakeItWindPlugin.IsEnabled" },
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

    if (property) this._simhub.subscribe(property);
  }

  override onWillDisappear(ev: WillDisappearEvent<ButtonSettings>): void {
    const entry = this._cache.get(ev.action.id);
    if (entry?.subscribedProperty) {
      this._simhub.unsubscribe(entry.subscribedProperty);
    }
    this._cache.delete(ev.action.id);
  }

  override onKeyDown(ev: KeyDownEvent<ButtonSettings>): void {
    const role = ev.payload.settings.controlMapperRole?.trim();
    if (role) this._simhub.startRole(role).catch(() => {});
  }

  override onKeyUp(ev: KeyUpEvent<ButtonSettings>): void {
    const role = ev.payload.settings.controlMapperRole?.trim();
    if (role) this._simhub.stopRole(role).catch(() => {});
  }

  override onDidReceiveSettings(ev: DidReceiveSettingsEvent<ButtonSettings>): void {
    if (!ev.action.isKey()) return;

    const entry = this._cache.get(ev.action.id);
    if (!entry) return;

    const newProperty = this._pickProperty(ev.payload.settings, this._simhub.getGameName());
    this._swapSubscription(entry, newProperty);
    entry.settings = ev.payload.settings;
    entry.lastActive = null;
  }

  // Send the currently-running game to the PI so it can pre-fill the game name field.
  override onPropertyInspectorDidAppear(_ev: PropertyInspectorDidAppearEvent<ButtonSettings>): void {
    const game = this._simhub.getGameName();
    if (game) streamDeck.ui.sendToPropertyInspector({ type: "currentGame", game }).catch(() => {});
  }

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

    const cfg      = resolveConfig(entry.settings);
    const property = entry.subscribedProperty;
    if (!property) return;

    const raw = data[property];
    if (raw === undefined) return;

    const isActive = Number(raw) > Number(cfg.threshold);
    if (isActive === entry.lastActive) return;
    entry.lastActive = isActive;

    action.setState(isActive ? 1 : 0).catch(() => {});
  }

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
    property:          s.property     ?? preset?.property ?? "",
    threshold:         s.threshold    ?? "0.5",
    gameMappings:      s.gameMappings ?? [],
    controlMapperRole: s.controlMapperRole ?? "",
  };
}
