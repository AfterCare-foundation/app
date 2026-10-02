// Base64 and hex helpers with no dependency on Buffer or atob, so the same
// code runs in Hermes and in Node tests.

const B64 =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const B64_LOOKUP: Record<string, number> = {};
for (let i = 0; i < B64.length; i++) {
  B64_LOOKUP[B64[i]!] = i;
}
// Accept the URL-safe alphabet on input as well.
B64_LOOKUP["-"] = 62;
B64_LOOKUP["_"] = 63;

/** Standard Base64 with padding. */
export function bytesToBase64(bytes: Uint8Array): string {
  let out = "";
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8) | bytes[i + 2]!;
    out +=
      B64[(n >> 18) & 63]! +
      B64[(n >> 12) & 63]! +
      B64[(n >> 6) & 63]! +
      B64[n & 63]!;
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i]! << 16;
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]! + "==";
  } else if (rest === 2) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8);
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]! + B64[(n >> 6) & 63]! + "=";
  }
  return out;
}

/** Base64url without padding, as used in the card QR fragment. */
export function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Decodes standard or URL-safe Base64, padded or not. Throws on bad input. */
export function base64ToBytes(input: string): Uint8Array {
  const clean = input.replace(/[\s=]+$/g, "").replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/\-_]*$/.test(clean)) {
    throw new Error("Not Base64");
  }
  if (clean.length % 4 === 1) {
    throw new Error("Not Base64");
  }
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  let i = 0;
  for (; i + 3 < clean.length; i += 4) {
    const n =
      (B64_LOOKUP[clean[i]!]! << 18) |
      (B64_LOOKUP[clean[i + 1]!]! << 12) |
      (B64_LOOKUP[clean[i + 2]!]! << 6) |
      B64_LOOKUP[clean[i + 3]!]!;
    out[o++] = (n >> 16) & 255;
    out[o++] = (n >> 8) & 255;
    out[o++] = n & 255;
  }
  const rest = clean.length - i;
  if (rest === 2) {
    const n = (B64_LOOKUP[clean[i]!]! << 18) | (B64_LOOKUP[clean[i + 1]!]! << 12);
    out[o++] = (n >> 16) & 255;
  } else if (rest === 3) {
    const n =
      (B64_LOOKUP[clean[i]!]! << 18) |
      (B64_LOOKUP[clean[i + 1]!]! << 12) |
      (B64_LOOKUP[clean[i + 2]!]! << 6);
    out[o++] = (n >> 16) & 255;
    out[o++] = (n >> 8) & 255;
  }
  return out.subarray(0, o);
}

export function utf8Encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function utf8Decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}
