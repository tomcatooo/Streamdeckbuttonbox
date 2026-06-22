import { EventEmitter } from "events";
import * as http from "http";
import WebSocket from "ws";

const SIMHUB_HOST = "127.0.0.1";
const SIMHUB_PORT = 8888;
const POLL_MS = 100;
const WS_RECONNECT_MS = 5000;
const WS_CONNECT_TIMEOUT_MS = 3000;

export type TelemetryData = Record<string, unknown>;

// Augment EventEmitter with typed overloads so callers get proper types.
export declare interface SimHubClient {
  on(event: "update", listener: (data: TelemetryData) => void): this;
  emit(event: "update", data: TelemetryData): boolean;
}

// Connects to SimHub and emits "update" events with the latest telemetry.
// Tries a WebSocket connection first (SimHub Dashboard Server on port 8888),
// falls back to HTTP polling if the WS isn't reachable within 3 seconds.
export class SimHubClient extends EventEmitter {
  private _ws: WebSocket | null = null;
  private _pollTimer: ReturnType<typeof setInterval> | null = null;
  private _data: TelemetryData = {};
  private _wsConnected = false;
  private _stopped = false;

  start(): void {
    this._tryWebSocket();
  }

  stop(): void {
    this._stopped = true;
    this._ws?.terminate();
    this._ws = null;
    if (this._pollTimer !== null) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  }

  getData(): TelemetryData {
    return this._data;
  }

  private _tryWebSocket(): void {
    if (this._stopped) return;

    let ws: WebSocket;
    try {
      ws = new WebSocket(`ws://${SIMHUB_HOST}:${SIMHUB_PORT}/`);
    } catch {
      this._startPolling();
      return;
    }

    const timeout = setTimeout(() => {
      if (!this._wsConnected) {
        ws.terminate();
        this._startPolling();
      }
    }, WS_CONNECT_TIMEOUT_MS);

    ws.on("open", () => {
      clearTimeout(timeout);
      this._wsConnected = true;
      this._ws = ws;
    });

    ws.on("message", (raw) => {
      this._parseMessage(raw.toString());
    });

    ws.on("error", () => {
      clearTimeout(timeout);
      if (!this._wsConnected) this._startPolling();
    });

    ws.on("close", () => {
      clearTimeout(timeout);
      this._wsConnected = false;
      this._ws = null;
      if (!this._stopped) {
        setTimeout(() => this._tryWebSocket(), WS_RECONNECT_MS);
      }
    });
  }

  private _startPolling(): void {
    if (this._stopped || this._pollTimer !== null) return;
    this._pollTimer = setInterval(() => this._poll(), POLL_MS);
  }

  private _poll(): void {
    const options: http.RequestOptions = {
      hostname: SIMHUB_HOST,
      port: SIMHUB_PORT,
      path: "/api/v5/status",
      method: "GET",
      timeout: 500,
    };

    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (c: Buffer) => {
        body += c;
      });
      res.on("end", () => {
        try {
          this._parseMessage(body);
        } catch {
          /* ignore malformed responses */
        }
      });
    });

    req.on("error", () => {
      /* SimHub not running — silently skip */
    });
    req.on("timeout", () => {
      try {
        req.destroy();
      } catch {
        /* ignore */
      }
    });
    req.end();
  }

  // Handles both raw JSON and SimHub's "update;{json}" WS wire format.
  // Also flattens known wrapper keys (NewData, data) one level deep.
  private _parseMessage(raw: string): void {
    let parsed: unknown;
    try {
      const jsonStr = raw.startsWith("update;") ? raw.slice(7) : raw;
      parsed = JSON.parse(jsonStr);
    } catch {
      return;
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;

    const flat: TelemetryData = {};
    const merge = (obj: Record<string, unknown>): void => {
      for (const [k, v] of Object.entries(obj)) {
        if (v !== null && typeof v === "object" && !Array.isArray(v)) {
          if (k === "NewData" || k === "data") {
            merge(v as Record<string, unknown>);
          } else {
            flat[k] = v;
          }
        } else {
          flat[k] = v;
        }
      }
    };
    merge(parsed as Record<string, unknown>);

    this._data = { ...this._data, ...flat };
    this.emit("update", this._data);
  }
}
