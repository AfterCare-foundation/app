// The only place the app asks the OS for randomness.

import { CREDENTIAL_BYTES, MESSAGE_ID_BYTES, NONCE_BYTES, TOKEN_BYTES } from "./contract";

function expoCrypto(): typeof import("expo-crypto") {
  // Loaded here so the unit tests (plain Node) can import this file.
  return require("expo-crypto") as typeof import("expo-crypto");
}

let source: ((n: number) => Uint8Array) | null = null;

/** Tests install `node:crypto.randomBytes`, never a constant. */
export function setRandomSourceForTesting(fn: (n: number) => Uint8Array): void {
  source = fn;
}

function bytes(n: number): Uint8Array {
  return (source ?? expoCrypto().getRandomBytes)(n);
}

export function randomNonce(): Uint8Array {
  return bytes(NONCE_BYTES);
}

export function randomMessageId(): Uint8Array {
  return bytes(MESSAGE_ID_BYTES);
}

export function randomCredential(): Uint8Array {
  return bytes(CREDENTIAL_BYTES);
}

export function randomUuid(): string {
  return expoCrypto().randomUUID();
}

/** A random number of milliseconds from 0 up to `maxMs`. */
export function randomDelayMs(maxMs: number): number {
  const b = bytes(4);
  const value = ((b[0]! << 24) | (b[1]! << 16) | (b[2]! << 8) | b[3]!) >>> 0;
  return Math.floor((value / 2 ** 32) * maxMs);
}

/** A fresh card TOKEN for the Home flow (16 random bytes). */
export function randomToken(): Uint8Array {
  return bytes(TOKEN_BYTES);
}
