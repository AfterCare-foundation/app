// Thin client for the AfterCare backend. Request shapes mirror
// backend/app/models.py. Raw tokens never appear here.

import Constants from "expo-constants";

import type { Platform } from "../crypto/contract";

const FALLBACK_BASE_URL = "http://127.0.0.1:8000";

export function apiBaseUrl(): string {
  // EXPO_PUBLIC_API_URL wins, so a tester can point a build at a hosted dev
  // backend without editing app.json.
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, "");
  }
  const extra = Constants.expoConfig?.extra as { apiBaseUrl?: unknown } | undefined;
  return typeof extra?.apiBaseUrl === "string" ? extra.apiBaseUrl : FALLBACK_BASE_URL;
}

export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;

  constructor(status: number, detail: string) {
    super(`${status}: ${detail}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export interface SubscribeRequest {
  et_hash: string;
  push_id_hash: string;
  push_token: string;
  platform: Platform;
  device_credential: string;
}

export interface Delivery {
  et_hash: string;
  encrypted_payload: string;
  scheduled_at?: string;
}

export interface NotifyRequest {
  sender_push_id_hash: string;
  device_credential: string;
  campaign_id: string;
  deliveries: Delivery[];
}

export interface NotifyResponse {
  status: "ok";
  pushed: number;
  scheduled: number;
  contacts: number;
}

export interface DevInboxRequest {
  push_id_hash: string;
  device_credential: string;
}

export interface InboxNotification {
  alert: string;
  enc: string;
}

export interface DevInboxResponse {
  notifications: InboxNotification[];
}

function detailFromBody(body: unknown, fallback: string): string {
  if (typeof body === "object" && body !== null && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (Array.isArray(detail)) {
      // FastAPI 422 shape: [{ loc, msg, type }]
      return detail
        .map((item) => {
          const loc = Array.isArray(item?.loc) ? item.loc.slice(1).join(".") : "";
          const msg = typeof item?.msg === "string" ? item.msg : "invalid";
          return loc ? `${loc}: ${msg}` : msg;
        })
        .join("; ");
    }
  }
  return fallback;
}

async function request<T>(method: "GET" | "POST" | "DELETE", path: string, body?: unknown): Promise<T> {
  const url = `${apiBaseUrl()}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (__DEV__) {
      console.warn(`[api] ${method} ${path} failed before a response:`, error);
    }
    throw new ApiError(0, `Cannot reach ${url}. Is the server running?`);
  }

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, detailFromBody(parsed, response.statusText || `HTTP ${response.status}`));
  }
  return parsed as T;
}

export async function health(): Promise<boolean> {
  try {
    const result = await request<{ status: string }>("GET", "/health");
    return result?.status === "ok";
  } catch {
    return false;
  }
}

export function subscribe(body: SubscribeRequest): Promise<{ status: "ok" }> {
  return request("POST", "/subscribe", body);
}

export function notify(body: NotifyRequest): Promise<NotifyResponse> {
  return request("POST", "/notify", body);
}

/** Development only. Returns 404 unless the server runs in stub mode. */
export function devInbox(body: DevInboxRequest): Promise<DevInboxResponse> {
  return request("POST", "/dev/inbox", body);
}
