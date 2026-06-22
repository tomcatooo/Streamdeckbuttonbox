import { EventEmitter } from "events";
import * as net from "net";

const SIMHUB_HOST = "127.0.0.1";
const PROP_SERVER_PORT = 18082;
const RECONNECT_MS = 5000;
// Internal property used to track the active game — never exposed to callers.
const GAME_NAME_PROP = "dcp.GameName";

export type TelemetryData = Record<string, unknown>;

export declare interface SimHubClient {
  on(event: "update",     listener: (data: TelemetryData) => void): this;
  on(event: "gameChange", listener: (game: string) => void): this;
  emit(event: "update",     data: TelemetryData): boolean;
  emit(event: "gameChange", game: string): boolean;
}

// Implements the SimHub Property Server TCP protocol (port 18082).
//
// Protocol summary:
//   → connect
//   ← "SimHub Property Server\n"
//   → "subscribe <propertyName>\n"
//   ← "Property <name> <type> <value>\n"  (on connect + on every change, ≤10 Hz)
//   → "unsubscribe <propertyName>\n"
//
// Reference-counted subscriptions let multiple buttons share the same
// property without double-subscribing or premature unsubscribes.
export class SimHubClient extends EventEmitter {
  private _socket: net.Socket | null = null;
  private _buf = "";
  private _connected = false;
  private _stopped = false;
  private _data: TelemetryData = {};
  private _gameName = "";

  // property → number of callers currently watching it
  private readonly _refCounts = new Map<string, number>();

  start(): void {
    this._connect();
  }

  stop(): void {
    this._stopped = true;
    this._socket?.destroy();
    this._socket = null;
  }

  getData(): TelemetryData {
    return this._data;
  }

  getGameName(): string {
    return this._gameName;
  }

  subscribe(property: string): void {
    if (!property) return;
    const prev = this._refCounts.get(property) ?? 0;
    this._refCounts.set(property, prev + 1);
    if (prev === 0 && this._connected) {
      this._send(`subscribe ${property}`);
    }
  }

  unsubscribe(property: string): void {
    if (!property) return;
    const prev = this._refCounts.get(property) ?? 0;
    if (prev <= 1) {
      this._refCounts.delete(property);
      if (this._connected) this._send(`unsubscribe ${property}`);
    } else {
      this._refCounts.set(property, prev - 1);
    }
  }

  private _connect(): void {
    if (this._stopped) return;

    const socket = net.createConnection(PROP_SERVER_PORT, SIMHUB_HOST);
    socket.setEncoding("utf8");
    socket.setTimeout(3000);
    this._buf = "";

    socket.on("connect", () => {
      socket.setTimeout(0);
      this._socket = socket;
    });

    socket.on("data", (chunk: string) => {
      this._buf += chunk;
      const lines = this._buf.split("\n");
      this._buf = lines.pop() ?? "";
      for (const line of lines) {
        this._handleLine(line.trim());
      }
    });

    socket.on("timeout", () => socket.destroy());
    socket.on("error",   () => { /* close will trigger reconnect */ });

    socket.on("close", () => {
      this._socket = null;
      this._connected = false;
      if (!this._stopped) {
        setTimeout(() => this._connect(), RECONNECT_MS);
      }
    });
  }

  private _handleLine(line: string): void {
    if (!line) return;

    // Greeting — subscribe to game name + everything callers registered before connect
    if (line === "SimHub Property Server") {
      this._connected = true;
      this._send(`subscribe ${GAME_NAME_PROP}`);
      for (const property of this._refCounts.keys()) {
        this._send(`subscribe ${property}`);
      }
      return;
    }

    // "Property <name> <type> <value>"
    if (line.startsWith("Property ")) {
      const rest = line.slice(9);
      const s1 = rest.indexOf(" ");
      if (s1 === -1) return;
      const name = rest.slice(0, s1);
      const tail = rest.slice(s1 + 1);
      const s2 = tail.indexOf(" ");
      if (s2 === -1) return;
      const type     = tail.slice(0, s2);
      const rawValue = tail.slice(s2 + 1);

      const value = parseValue(rawValue, type);
      if (value === undefined) return;

      // Track game name changes internally and emit gameChange
      if (name === GAME_NAME_PROP) {
        const newGame = String(value);
        if (newGame !== this._gameName) {
          this._gameName = newGame;
          this.emit("gameChange", newGame);
        }
        return; // don't expose the internal property in _data
      }

      this._data = { ...this._data, [name]: value };
      this.emit("update", this._data);
    }
  }

  // Control Mapper role management via SimHub HTTP API (port 8888).
  // ownerId scopes the start/stop so only our plugin can release what it started.
  async startRole(roleName: string): Promise<void> {
    if (!roleName) return;
    await this._rolePost("StartRole", roleName);
  }

  async stopRole(roleName: string): Promise<void> {
    if (!roleName) return;
    await this._rolePost("StopRole", roleName);
  }

  private async _rolePost(action: string, roleName: string): Promise<void> {
    const body = new URLSearchParams({ ownerId: "com.simhub.buttonbox", roleName });
    await fetch(`http://127.0.0.1:8888/api/ControlMapper/${action}/`, {
      method: "POST",
      body,
    });
  }

  private _send(msg: string): void {
    this._socket?.write(msg + "\n");
  }
}

function parseValue(raw: string, type: string): unknown {
  if (raw === "(null)") return undefined;
  switch (type) {
    case "integer":  return parseInt(raw, 10);
    case "double":   return parseFloat(raw);
    case "boolean":  return raw.toLowerCase() === "true";
    case "string":   return raw;
    case "timespan": return raw;
    default:         return isNaN(Number(raw)) ? raw : Number(raw);
  }
}
