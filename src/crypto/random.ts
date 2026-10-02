// The only place the app asks the OS for randomness.

import * as Crypto from "expo-crypto";

import { CREDENTIAL_BYTES, NONCE_BYTES } from "./contract";

export function randomNonce(): Uint8Array {
  return Crypto.getRandomBytes(NONCE_BYTES);
}

export function randomCredential(): Uint8Array {
  return Crypto.getRandomBytes(CREDENTIAL_BYTES);
}

export function randomUuid(): string {
  return Crypto.randomUUID();
}
