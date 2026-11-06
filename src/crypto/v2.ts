// v2.1 routing keys and seals. Source of truth: backend/docs/CRYPTO.md §4.
// Functions without "ForTesting" draw their own nonce (and message id); app code must call
// those. The ForTesting variants exist for fixed vectors only.

import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";

import {
  AlertPayload,
  MESSAGE_ID_BYTES,
  NONCE_BYTES,
  Platform,
  TOKEN_BYTES,
  decryptAlertWithKey,
  encryptAlertWithKey,
  padPlaintext,
  sealPaddedWithKey,
} from "./contract";
import { utf8Encode } from "./encoding";
import { randomMessageId, randomNonce } from "./random";

export const KEY_BYTES = 32;

const INFO_ROUTE = utf8Encode("aftercare/v2/route");
const INFO_SEAL = utf8Encode("aftercare/v2/seal");
const INFO_MSG = utf8Encode("aftercare/v2/msg");
const INFO_SLOT = utf8Encode("aftercare/v2/slot");

export type SealInput = { p: Platform; t: string; l: "en" | "de" };

function assertLength(bytes: Uint8Array, expected: number, what: string): void {
  if (bytes.length !== expected) {
    throw new Error(`${what} must be ${expected} bytes, got ${bytes.length}`);
  }
}

// Salt absent: noble fills undefined with 32 zero bytes, which is RFC 5869's "not provided".
function fromToken(token: Uint8Array, info: Uint8Array): Uint8Array {
  assertLength(token, TOKEN_BYTES, "TOKEN");
  return hkdf(sha256, token, undefined, info, KEY_BYTES);
}

/** `route_id` as 32 raw bytes. Hex-encode for the API; pass the raw bytes to `slotSecret`. */
export function routeId(token: Uint8Array): Uint8Array {
  return fromToken(token, INFO_ROUTE);
}

export function sealKey(token: Uint8Array): Uint8Array {
  return fromToken(token, INFO_SEAL);
}

export function msgKey(token: Uint8Array): Uint8Array {
  return fromToken(token, INFO_MSG);
}

/** Per-card slot secret. The salt is the 32 raw route_id bytes, never their hex text. */
export function slotSecret(installSecret: Uint8Array, routeIdBytes: Uint8Array): Uint8Array {
  assertLength(installSecret, KEY_BYTES, "install secret");
  assertLength(routeIdBytes, KEY_BYTES, "route_id");
  return hkdf(sha256, installSecret, routeIdBytes, INFO_SLOT, KEY_BYTES);
}

export function sealPushWithNonceForTesting(key: Uint8Array, input: SealInput, nonce: Uint8Array): string {
  assertLength(key, KEY_BYTES, "seal_key");
  if (input.p !== "ios" && input.p !== "android") {
    throw new Error("p must be ios or android");
  }
  if (input.l !== "en" && input.l !== "de") {
    throw new Error("l must be en or de");
  }
  if (typeof input.t !== "string" || input.t.length === 0) {
    throw new Error("t must be a non-empty string");
  }
  const json = JSON.stringify({ p: input.p, t: input.t, l: input.l });
  return sealPaddedWithKey(key, padPlaintext(json, "sealed push"), nonce);
}

/** `sealed_push`: 380 Base64 characters, a fresh nonce every call. Throws when too long. */
export function sealPush(key: Uint8Array, input: SealInput): string {
  return sealPushWithNonceForTesting(key, input, randomNonce());
}

export function encryptMessageWithNonceForTesting(
  key: Uint8Array,
  sti: readonly string[],
  date: string,
  messageId: Uint8Array,
  nonce: Uint8Array,
): string {
  assertLength(key, KEY_BYTES, "msg_key");
  assertLength(messageId, MESSAGE_ID_BYTES, "message id");
  assertLength(nonce, NONCE_BYTES, "nonce");
  return encryptAlertWithKey(key, sti, date, messageId, nonce);
}

/** A v2 message for one card, with a fresh message id and nonce. */
export function encryptMessage(key: Uint8Array, sti: readonly string[], date: string): string {
  return encryptMessageWithNonceForTesting(key, sti, date, randomMessageId(), randomNonce());
}

export function decryptMessage(key: Uint8Array, enc: string): AlertPayload {
  assertLength(key, KEY_BYTES, "msg_key");
  const payload = decryptAlertWithKey(key, enc);
  if (payload.v !== 2) {
    throw new Error("Unexpected alert payload");
  }
  return payload;
}
