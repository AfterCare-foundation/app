// Thin client for the AfterCare backend. Request shapes mirror
// backend/app/models.py. Raw tokens never appear here.

import type { Platform } from "../crypto/contract";

const FALLBACK_BASE_URL = "http://127.0.0.1:8000";

export function apiBaseUrl(): string {
  // EXPO_PUBLIC_API_URL wins, so a tester can point a build at a hosted dev
  // backend without editing app.json.
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, "");
  }
  // Loaded here so the unit tests (plain Node) can import this file.
  const Constants = (require("expo-constants") as typeof import("expo-constants")).default;
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
  /** Language of the push text, "en" or "de". The server keeps it per device and never returns it. */
  lang?: string;
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
  lang?: string;
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
  /** Contacts actually reached. */
  contacts: number;
  /** Deliveries the server left out; empty when none. "not_subscribed": this phone is not on that code; "no_recipient": nobody else is. */
  skipped: { et_hash: string; reason: "not_subscribed" | "no_recipient" }[];
}

export interface InboxRequest {
  push_id_hash: string;
  device_credential: string;
}

/** One waiting message: the ciphertext a sender's phone made for one of our cards. */
export interface InboxMessage {
  id: string;
  enc: string;
}

export interface InboxResponse {
  /** Oldest first, at most 200. Fetching deletes nothing. */
  notifications: InboxMessage[];
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

/** Thrown by `send` when fetch itself rejected; each caller maps it to its own error type. */
class NetworkFailure {
  constructor(readonly url: string) {}
}

async function send(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: unknown,
): Promise<{ response: Response; parsed: unknown }> {
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
    throw new NetworkFailure(url);
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

  return { response, parsed };
}

async function request<T>(method: "GET" | "POST" | "DELETE", path: string, body?: unknown): Promise<T> {
  let result: { response: Response; parsed: unknown };
  try {
    result = await send(method, path, body);
  } catch (error) {
    if (error instanceof NetworkFailure) {
      throw new ApiError(0, `Cannot reach ${error.url}. Is the server running?`);
    }
    throw error;
  }
  const { response, parsed } = result;
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

/** The mailbox: ciphertexts waiting for this device. Deletes nothing. */
export function fetchInbox(body: InboxRequest): Promise<InboxResponse> {
  return request("POST", "/inbox", body);
}

/** Deletes messages the app has saved on the phone (1 to 200 ids). */
export function confirmInbox(body: InboxRequest & { ids: string[] }): Promise<{ status: "ok"; deleted: number }> {
  return request("POST", "/inbox/confirm", body);
}

// ---- v2.1 routing (CRYPTO.md §4.3). Not called by the app yet. ----
// Bodies refuse unknown fields, so every card and delivery is rebuilt from named fields.
// Never log a v2 body: it holds slot secrets and seal keys.

/** A card the phone proves: 64 lowercase hex each. */
export interface V2Card {
  route_id: string;
  slot_secret: string;
}

/** A card plus its sealed push address: 380 Base64 characters. */
export interface V2SealedCard extends V2Card {
  sealed_push: string;
}

export interface V2Delivery extends V2Card {
  seal_key: string;
  /** 380 Base64 characters, sealed with the card's msg_key. */
  payload: string;
}

/** One card per request (CRYPTO.md §4.4): a list cannot be written. */
export interface V2ResealRequest {
  cards: [V2SealedCard];
}

export interface V2ForgetRequest {
  cards: [V2Card];
}

export interface V2OkResponse {
  status: "ok";
}

export interface V2NotifyResponse {
  status: "ok";
  sent: number;
  waiting: number;
}

export interface V2InboxResponse {
  notifications: InboxMessage[];
  cards: { route_id: string; connected: boolean }[];
}

export interface V2ConfirmResponse {
  status: "ok";
  deleted: number;
}

export type V2ErrorCode =
  | "unknown_card"
  | "code_in_use"
  | "campaign_already_used"
  | "send_limit"
  | "busy"
  | "too_large"
  | "invalid"
  | "network"
  | "unexpected";

/** `status` is 0 for a network failure. The message never carries a body or the server's detail. */
export class V2Error extends Error {
  readonly code: V2ErrorCode;
  readonly status: number;

  constructor(path: string, status: number, code: V2ErrorCode) {
    super(`${path}: ${status} ${code}`);
    this.name = "V2Error";
    this.code = code;
    this.status = status;
  }
}

function pickCard(card: V2Card): V2Card {
  return { route_id: card.route_id, slot_secret: card.slot_secret };
}

function pickSealedCard(card: V2SealedCard): V2SealedCard {
  return { route_id: card.route_id, slot_secret: card.slot_secret, sealed_push: card.sealed_push };
}

function pickDelivery(d: V2Delivery): V2Delivery {
  return { route_id: d.route_id, slot_secret: d.slot_secret, seal_key: d.seal_key, payload: d.payload };
}

function v2CodeFor(status: number, detail: unknown): V2ErrorCode {
  if (status === 413) return "too_large";
  if (status === 422) return "invalid";
  if (status === 403 && detail === "unknown_card") return "unknown_card";
  if (status === 409 && detail === "code_in_use") return "code_in_use";
  if (status === 409 && detail === "campaign_already_used") return "campaign_already_used";
  if (status === 429 && detail === "send_limit") return "send_limit";
  if (status === 503 && detail === "busy") return "busy";
  return "unexpected";
}

async function v2Request<T>(path: string, body: unknown): Promise<T> {
  let result: { response: Response; parsed: unknown };
  try {
    result = await send("POST", path, body);
  } catch (error) {
    if (error instanceof NetworkFailure) {
      throw new V2Error(path, 0, "network");
    }
    throw error;
  }
  const { response, parsed } = result;
  if (!response.ok) {
    const detail = typeof parsed === "object" && parsed !== null ? (parsed as { detail?: unknown }).detail : undefined;
    const code = v2CodeFor(response.status, detail);
    if (__DEV__) {
      console.warn(`[api] POST ${path} → ${response.status} ${code}`);
    }
    throw new V2Error(path, response.status, code);
  }
  return parsed as T;
}

/** Join a card, or re-scan one (same secret: sealed push replaced). `newInstall` only on this install's first join. */
export function v2Join(card: V2SealedCard, opts?: { newInstall?: boolean }): Promise<V2OkResponse> {
  const body: Record<string, unknown> = { ...pickSealedCard(card) };
  if (opts?.newInstall === true) {
    body.new_install = true;
  }
  return v2Request("/v2/slots", body);
}

/** New push token or language. One card per request (CRYPTO.md §4.4). */
export function v2Reseal(card: V2SealedCard): Promise<V2OkResponse> {
  const body: V2ResealRequest = { cards: [pickSealedCard(card)] };
  return v2Request("/v2/slots/reseal", body);
}

export function v2Notify(campaignId: string, deliveries: readonly V2Delivery[]): Promise<V2NotifyResponse> {
  return v2Request("/v2/notify", { campaign_id: campaignId, deliveries: deliveries.map(pickDelivery) });
}

export async function v2Inbox(
  cards: readonly V2Card[],
  flags?: { firstOpenToday?: boolean; firstOpenThisMonth?: boolean },
): Promise<V2InboxResponse> {
  const body: Record<string, unknown> = { cards: cards.map(pickCard) };
  if (flags?.firstOpenToday === true) {
    body.first_open_today = true;
  }
  if (flags?.firstOpenThisMonth === true) {
    body.first_open_this_month = true;
  }
  const result = await v2Request<Partial<V2InboxResponse> | null>("/v2/inbox", body);
  if (!result || !Array.isArray(result.notifications) || !Array.isArray(result.cards)) {
    throw new V2Error("/v2/inbox", 200, "unexpected");
  }
  return result as V2InboxResponse;
}

export function v2ConfirmInbox(cards: readonly V2Card[], ids: readonly string[]): Promise<V2ConfirmResponse> {
  return v2Request("/v2/inbox/confirm", { cards: cards.map(pickCard), ids: [...ids] });
}

/** Burns the route and deletes the slot. One card per request (CRYPTO.md §4.4). */
export function v2Forget(card: V2Card): Promise<V2OkResponse> {
  const body: V2ForgetRequest = { cards: [pickCard(card)] };
  return v2Request("/v2/forget", body);
}
