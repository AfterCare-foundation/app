// Thin client for the AfterCare backend. Request shapes mirror
// backend/app/models.py. Raw tokens never appear here.

import Constants from "expo-constants";

import type { Platform } from "../crypto/contract";
import { normalizeMore } from "../pushPayload";

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

export interface DeleteDeviceRequest {
  push_id_hash: string;
  device_credential: string;
}

export interface Delivery {
  et_hash: string;
  encrypted_payload: string;
}

export interface UpdatePushIdRequest {
  old_push_id_hash: string;
  new_push_id_hash: string;
  new_push_token: string;
  new_platform: Platform;
  device_credential: string;
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
  /** Pushes that failed once; the server keeps retrying them for up to a day. */
  retrying: number;
  contacts: number;
}

export interface DevInboxRequest {
  push_id_hash: string;
  device_credential: string;
}

export interface InboxNotification {
  alert: string;
  /** First ciphertext. */
  enc: string;
  /** Further ciphertexts bundled into the same push (same device, several contacts or senders). */
  more?: string[];
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

// Polling retries every few seconds, so log only when the connection drops and when it returns.
let unreachable = false;

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
    if (__DEV__ && !unreachable) {
      console.warn(`[api] ${method} ${path} failed before a response (further failures are not logged):`, error);
    }
    unreachable = true;
    throw new ApiError(0, `Cannot reach ${url}. Is the server running?`);
  }

  if (unreachable) {
    unreachable = false;
    if (__DEV__) {
      console.log(`[api] server reachable again (${method} ${path})`);
    }
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

/** Erases this device and everything the server holds for it (GDPR Art. 17). */
export function deleteDevice(body: DeleteDeviceRequest): Promise<unknown> {
  return request("DELETE", "/subscribe", body);
}

/** The OS gave this phone a new push token: move its subscriptions to it, keeping their expiry. */
export function updatePushId(body: UpdatePushIdRequest): Promise<{ status: "ok" }> {
  return request("POST", "/update-push-id", body);
}

export function notify(body: NotifyRequest): Promise<NotifyResponse> {
  return request("POST", "/notify", body);
}

/** Development only. Returns 404 unless the server runs in stub mode. */
export async function devInbox(body: DevInboxRequest): Promise<DevInboxResponse> {
  const response = await request<DevInboxResponse>("POST", "/dev/inbox", body);
  // On Android a real push carries `more` as a JSON string; accept both.
  return {
    notifications: response.notifications.map((item) => ({
      ...item,
      more: normalizeMore(item.more),
    })),
  };
}
