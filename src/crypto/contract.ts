// App <-> server crypto contract, v2 messages (v1 still readable).
// Source of truth: backend/docs/CRYPTO.md. Every value here must match it
// byte for byte or the two phones will not interoperate.
//
// This file is pure TypeScript. It takes random bytes as arguments instead
// of generating them, so Node tests can use fixed vectors.

import { gcm } from "@noble/ciphers/aes.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, concatBytes } from "@noble/hashes/utils.js";

import {
  base64ToBytes,
  bytesToBase64,
  bytesToBase64Url,
  utf8Decode,
  utf8Encode,
} from "./encoding";

export const TOKEN_BYTES = 16;
export const CREDENTIAL_BYTES = 32;
export const NONCE_BYTES = 12;
export const TAG_BYTES = 16;
export const MESSAGE_ID_BYTES = 16;
/** Every v2 message pads its plaintext to this size so ciphertext length reveals nothing. */
export const PLAINTEXT_BYTES = 256;
export const PAYLOAD_BYTES = NONCE_BYTES + PLAINTEXT_BYTES + TAG_BYTES;
export const PAYLOAD_B64_CHARS = Math.ceil(PAYLOAD_BYTES / 3) * 4;
export const CONNECT_URL_PREFIX = "https://after-care.eu/connect#et=";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const ENC_KEY_LABEL = utf8Encode("aftercare-enc-v1");

export type Platform = "ios" | "android";

/** A decoded message. `id` and `d` are null for legacy v1 messages. */
export interface AlertPayload {
  v: 1 | 2;
  id: string | null;
  d: string | null;
  sti: string[];
}

function assertLength(bytes: Uint8Array, expected: number, what: string): void {
  if (bytes.length !== expected) {
    throw new Error(`${what} must be ${expected} bytes, got ${bytes.length}`);
  }
}

/** `et_hash`: SHA-256 of the 16 raw token bytes, lowercase hex. */
export function etHash(token: Uint8Array): string {
  assertLength(token, TOKEN_BYTES, "TOKEN");
  return bytesToHex(sha256(token));
}

/** `push_id_hash`: SHA-256 of the UTF-8 push token string, lowercase hex. */
export function pushIdHash(pushToken: string): string {
  return bytesToHex(sha256(utf8Encode(pushToken)));
}

/** `device_credential`: the 32 secret bytes as lowercase hex. */
export function credentialHex(secret: Uint8Array): string {
  assertLength(secret, CREDENTIAL_BYTES, "device_credential");
  return bytesToHex(secret);
}

/** `enc_key = SHA-256("aftercare-enc-v1" || TOKEN)`. Never `SHA-256(TOKEN)`. */
export function encryptionKey(token: Uint8Array): Uint8Array {
  assertLength(token, TOKEN_BYTES, "TOKEN");
  return sha256(concatBytes(ENC_KEY_LABEL, token));
}

function assertDate(date: string): void {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!DATE_PATTERN.test(date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error("d must be a valid YYYY-MM-DD date");
  }
}

function assertStiList(sti: unknown): asserts sti is string[] {
  if (!Array.isArray(sti) || sti.length === 0 || sti.some((s) => typeof s !== "string")) {
    throw new Error("sti must be a non-empty list of strings");
  }
}

/**
 * v2 plaintext: UTF-8 JSON with no whitespace, `{"v":2,"id":"...","d":"YYYY-MM-DD","sti":[...]}`,
 * followed by 0x00 bytes up to exactly PLAINTEXT_BYTES. Throws rather than truncating.
 */
export function alertPlaintext(messageId: Uint8Array, date: string, sti: readonly string[]): Uint8Array {
  assertLength(messageId, MESSAGE_ID_BYTES, "message id");
  assertDate(date);
  assertStiList(sti);
  if (new Set(sti).size !== sti.length) {
    throw new Error("sti must not contain duplicates");
  }
  return padPlaintext(JSON.stringify({ v: 2, id: bytesToBase64Url(messageId), d: date, sti }), "alert");
}

/** UTF-8 encodes `json` and zero-pads to PLAINTEXT_BYTES. Throws rather than truncating. */
export function padPlaintext(json: string, what: string): Uint8Array {
  const bytes = utf8Encode(json);
  if (bytes.length > PLAINTEXT_BYTES) {
    throw new Error(`${what} is ${bytes.length} bytes, the limit is ${PLAINTEXT_BYTES}`);
  }
  const padded = new Uint8Array(PLAINTEXT_BYTES);
  padded.set(bytes);
  return padded;
}

/** Base64 of `nonce || ciphertext || tag`: AES-256-GCM, 12-byte nonce, no AAD. */
export function sealPaddedWithKey(key: Uint8Array, padded: Uint8Array, nonce: Uint8Array): string {
  assertLength(nonce, NONCE_BYTES, "nonce");
  return bytesToBase64(concatBytes(nonce, gcm(key, nonce).encrypt(padded)));
}

/** Mirror of `decryptAlertWithKey`. */
export function encryptAlertWithKey(
  key: Uint8Array,
  sti: readonly string[],
  date: string,
  messageId: Uint8Array,
  nonce: Uint8Array,
): string {
  return sealPaddedWithKey(key, alertPlaintext(messageId, date, sti), nonce);
}

/**
 * `encrypted_payload` for one card: Base64 of `nonce || ciphertext || tag`, always
 * PAYLOAD_B64_CHARS characters. AES-256-GCM, 12-byte nonce, no AAD. The nonce and message id
 * are passed in so tests are deterministic; callers in the app must supply fresh random bytes
 * for both, and `date` is the UTC send date.
 */
export function encryptAlert(
  token: Uint8Array,
  sti: readonly string[],
  date: string,
  messageId: Uint8Array,
  nonce: Uint8Array,
): string {
  return encryptAlertWithKey(encryptionKey(token), sti, date, messageId, nonce);
}

/** Reverse of `encryptAlert`. Throws if the token is wrong or data is bad. */
export function decryptAlert(token: Uint8Array, encryptedPayload: string): AlertPayload {
  return decryptAlertWithKey(encryptionKey(token), encryptedPayload);
}

/**
 * Same as `decryptAlert` with the key already derived. Trying one message against many cards
 * derives each card's key once and calls this for every attempt.
 */
export function decryptAlertWithKey(key: Uint8Array, encryptedPayload: string): AlertPayload {
  const blob = base64ToBytes(encryptedPayload);
  if (blob.length < NONCE_BYTES + TAG_BYTES) {
    throw new Error("encrypted_payload too short");
  }
  const nonce = blob.subarray(0, NONCE_BYTES);
  const sealed = blob.subarray(NONCE_BYTES);
  const plain = gcm(key, nonce).decrypt(sealed);
  // The JSON ends at the last non-zero byte; JSON.parse rejects anything else in front of it.
  let end = plain.length;
  while (end > 0 && plain[end - 1] === 0) {
    end -= 1;
  }
  const parsed = JSON.parse(utf8Decode(plain.subarray(0, end))) as Record<string, unknown> | null;
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Unexpected alert payload");
  }
  if (parsed.v === 2) {
    if (plain.length !== PLAINTEXT_BYTES || !plain.subarray(end).every((b) => b === 0)) {
      throw new Error("Unexpected alert payload");
    }
    if (typeof parsed.id !== "string" || !/^[A-Za-z0-9_-]{22}$/.test(parsed.id) || typeof parsed.d !== "string") {
      throw new Error("Unexpected alert payload");
    }
    assertDate(parsed.d);
    assertStiList(parsed.sti);
    return { v: 2, id: parsed.id, d: parsed.d, sti: parsed.sti };
  }
  // Legacy v1 is only accepted unpadded.
  if (parsed.v === 1 && end === plain.length && typeof parsed.sti === "string") {
    return { v: 1, id: null, d: null, sti: [parsed.sti] };
  }
  throw new Error("Unexpected alert payload");
}

/** Builds the URL a card QR encodes. Used for the paste field and tests. */
export function connectUrl(token: Uint8Array): string {
  assertLength(token, TOKEN_BYTES, "TOKEN");
  return CONNECT_URL_PREFIX + bytesToBase64Url(token);
}

/**
 * Reads the 16 raw token bytes out of whatever the scanner or paste field
 * produced. Accepts the full card URL, a URL without scheme, the
 * `aftercare://` deep link, a bare `#et=...` fragment, `et=...`, or just the
 * Base64url token. Throws if the result is not exactly 16 bytes.
 */
export function parseConnectInput(raw: string): Uint8Array {
  const text = raw.trim();
  if (!text) {
    throw new Error("Nothing to read");
  }

  let candidate = text;
  const hash = text.indexOf("#");
  if (hash >= 0) {
    candidate = text.slice(hash + 1);
  }
  const etMatch = candidate.match(/(?:^|[&?])et=([^&]+)/);
  if (etMatch) {
    candidate = etMatch[1]!;
  } else if (hash < 0 && /[/:?]/.test(candidate)) {
    throw new Error("Not an AfterCare card link");
  }

  let token: Uint8Array;
  try {
    token = base64ToBytes(decodeURIComponent(candidate));
  } catch {
    throw new Error("Card code is not readable");
  }
  if (token.length !== TOKEN_BYTES) {
    throw new Error("Card code has the wrong length");
  }
  return token;
}

/** Short label for a card in lists. Never the raw token. */
export function shortHash(hashHex: string): string {
  return `${hashHex.slice(0, 4)} ${hashHex.slice(4, 8)} ${hashHex.slice(8, 12)}`;
}
