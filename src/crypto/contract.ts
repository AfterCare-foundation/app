// App <-> server crypto contract, v1.
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
export const CONNECT_URL_PREFIX = "https://after-care.eu/connect#et=";

const ENC_KEY_LABEL = utf8Encode("aftercare-enc-v1");

/** `sti` strings suggested by the contract. The server does not validate. */
export const STI_TYPES = [
  "gonorrhoea",
  "chlamydia",
  "syphilis",
  "hiv",
  "mpox",
  "hpv",
  "other",
] as const;
export type StiType = (typeof STI_TYPES)[number];

export type Platform = "ios" | "android";

export interface AlertPayload {
  v: 1;
  sti: string;
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

/** UTF-8 JSON plaintext with no whitespace: `{"v":1,"sti":"..."}`. */
export function alertPlaintext(sti: string): Uint8Array {
  return utf8Encode(JSON.stringify({ v: 1, sti }));
}

/**
 * `encrypted_payload` for one card: Base64 of `nonce || ciphertext || tag`.
 * AES-256-GCM, 12-byte nonce, no AAD. The nonce is passed in so tests are
 * deterministic; callers in the app must supply 12 fresh random bytes.
 */
export function encryptAlert(
  token: Uint8Array,
  sti: string,
  nonce: Uint8Array,
): string {
  assertLength(nonce, NONCE_BYTES, "nonce");
  const key = encryptionKey(token);
  const sealed = gcm(key, nonce).encrypt(alertPlaintext(sti));
  return bytesToBase64(concatBytes(nonce, sealed));
}

/** Reverse of `encryptAlert`. Throws if the token is wrong or data is bad. */
export function decryptAlert(token: Uint8Array, encryptedPayload: string): AlertPayload {
  const blob = base64ToBytes(encryptedPayload);
  if (blob.length < NONCE_BYTES + TAG_BYTES) {
    throw new Error("encrypted_payload too short");
  }
  const nonce = blob.subarray(0, NONCE_BYTES);
  const sealed = blob.subarray(NONCE_BYTES);
  const key = encryptionKey(token);
  const plain = gcm(key, nonce).decrypt(sealed);
  const parsed: unknown = JSON.parse(utf8Decode(plain));
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as { v?: unknown }).v !== 1 ||
    typeof (parsed as { sti?: unknown }).sti !== "string"
  ) {
    throw new Error("Unexpected alert payload");
  }
  return parsed as AlertPayload;
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
