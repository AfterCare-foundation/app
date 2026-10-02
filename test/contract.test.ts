// Locks src/crypto/contract.ts to backend/docs/CRYPTO.md.
// Node's own `crypto` module is the independent reference for SHA-256 and
// AES-256-GCM. The hex/Base64 constants were also checked against Python's
// hashlib, which is what the server uses.

import assert from "node:assert/strict";
import { createCipheriv, createDecipheriv, createHash } from "node:crypto";
import { test } from "node:test";

import {
  base64ToBytes,
  bytesToBase64,
  bytesToBase64Url,
} from "../src/crypto/encoding";
import {
  alertPlaintext,
  connectUrl,
  credentialHex,
  decryptAlert,
  encryptAlert,
  encryptionKey,
  etHash,
  parseConnectInput,
  pushIdHash,
} from "../src/crypto/contract";

const TOKEN = Uint8Array.from({ length: 16 }, (_, i) => i);
const NONCE = Uint8Array.from({ length: 12 }, (_, i) => 0xa0 + i);

const EXPECTED = {
  etHash: "be45cb2605bf36bebde684841a28f0fd43c69850a3dce5fedba69928ee3a8991",
  encKey: "c29c9b7d2767a42d6beeb84e5ea783cc3c3e0aa8f640e135d4095abfc5ed3200",
  payload: "oKGio6SlpqeoqaqrHjn3jZsT/uuC5x2HKoIiF3ToefNRDYWGSZXGPG7hRCUtbMhbJvsr15lj",
  url: "https://after-care.eu/connect#et=AAECAwQFBgcICQoLDA0ODw",
  pushIdHash: "aae09fe46a90f4ab4a612a138040c44f96e9668dcfba2585a86ec52153bdf4fb",
};

function nodeKey(token: Uint8Array): Buffer {
  return createHash("sha256")
    .update(Buffer.concat([Buffer.from("aftercare-enc-v1", "utf8"), Buffer.from(token)]))
    .digest();
}

test("et_hash is SHA-256 of the raw 16 bytes, lowercase hex", () => {
  assert.equal(etHash(TOKEN), EXPECTED.etHash);
  assert.equal(etHash(TOKEN), createHash("sha256").update(TOKEN).digest("hex"));
  assert.match(etHash(TOKEN), /^[0-9a-f]{64}$/);
});

test("et_hash refuses anything but 16 bytes", () => {
  assert.throws(() => etHash(new Uint8Array(15)));
  assert.throws(() => etHash(new Uint8Array(32)));
});

test("push_id_hash is SHA-256 of the UTF-8 push token", () => {
  assert.equal(pushIdHash("stub-ios-alice"), EXPECTED.pushIdHash);
});

test("device_credential is 32 bytes as 64 lowercase hex", () => {
  const secret = Uint8Array.from({ length: 32 }, (_, i) => 255 - i);
  const hex = credentialHex(secret);
  assert.match(hex, /^[0-9a-f]{64}$/);
  assert.equal(hex.slice(0, 4), "fffe");
  assert.throws(() => credentialHex(new Uint8Array(16)));
});

test("enc_key is SHA-256(label || TOKEN) and is not et_hash", () => {
  const key = Buffer.from(encryptionKey(TOKEN)).toString("hex");
  assert.equal(key, EXPECTED.encKey);
  assert.equal(key, nodeKey(TOKEN).toString("hex"));
  assert.notEqual(key, etHash(TOKEN));
});

test("plaintext is compact JSON", () => {
  assert.equal(Buffer.from(alertPlaintext("gonorrhoea")).toString("utf8"), '{"v":1,"sti":"gonorrhoea"}');
});

test("encryptAlert matches the fixed vector and Node AES-256-GCM", () => {
  const payload = encryptAlert(TOKEN, "gonorrhoea", NONCE);
  assert.equal(payload, EXPECTED.payload);

  const blob = Buffer.from(payload, "base64");
  assert.equal(blob.length, 12 + '{"v":1,"sti":"gonorrhoea"}'.length + 16);
  assert.deepEqual(blob.subarray(0, 12), Buffer.from(NONCE));

  const decipher = createDecipheriv("aes-256-gcm", nodeKey(TOKEN), blob.subarray(0, 12));
  decipher.setAuthTag(blob.subarray(blob.length - 16));
  const plain = Buffer.concat([
    decipher.update(blob.subarray(12, blob.length - 16)),
    decipher.final(),
  ]).toString("utf8");
  assert.equal(plain, '{"v":1,"sti":"gonorrhoea"}');
});

test("decryptAlert opens a payload sealed by Node", () => {
  const cipher = createCipheriv("aes-256-gcm", nodeKey(TOKEN), Buffer.from(NONCE));
  const ct = Buffer.concat([cipher.update('{"v":1,"sti":"syphilis"}', "utf8"), cipher.final()]);
  const payload = Buffer.concat([Buffer.from(NONCE), ct, cipher.getAuthTag()]).toString("base64");
  assert.deepEqual(decryptAlert(TOKEN, payload), { v: 1, sti: "syphilis" });
});

test("decryptAlert fails with another card's token", () => {
  const payload = encryptAlert(TOKEN, "hiv", NONCE);
  const other = Uint8Array.from({ length: 16 }, (_, i) => i + 1);
  assert.throws(() => decryptAlert(other, payload));
});

test("decryptAlert rejects tampered bytes and short input", () => {
  const payload = encryptAlert(TOKEN, "mpox", NONCE);
  const blob = Buffer.from(payload, "base64");
  blob[20] = blob[20]! ^ 0x01;
  assert.throws(() => decryptAlert(TOKEN, blob.toString("base64")));
  assert.throws(() => decryptAlert(TOKEN, Buffer.alloc(20).toString("base64")));
});

test("connectUrl encodes the token as base64url in the fragment", () => {
  assert.equal(connectUrl(TOKEN), EXPECTED.url);
  assert.equal(bytesToBase64Url(TOKEN), Buffer.from(TOKEN).toString("base64url"));
});

test("parseConnectInput reads every shape the scanner or paste field can give", () => {
  const b64url = Buffer.from(TOKEN).toString("base64url");
  for (const input of [
    `https://after-care.eu/connect#et=${b64url}`,
    `after-care.eu/connect#et=${b64url}`,
    `aftercare://connect#et=${b64url}`,
    `#et=${b64url}`,
    `et=${b64url}`,
    b64url,
    `  ${b64url}\n`,
    Buffer.from(TOKEN).toString("base64"),
  ]) {
    assert.deepEqual(parseConnectInput(input), TOKEN, input);
  }
});

test("parseConnectInput rejects wrong lengths, other links, and empty input", () => {
  assert.throws(() => parseConnectInput(""));
  assert.throws(() => parseConnectInput("https://example.com/"));
  assert.throws(() => parseConnectInput("https://after-care.eu/connect#et=AAEC"));
  assert.throws(() => parseConnectInput("https://after-care.eu/connect#et=" + Buffer.alloc(32).toString("base64url")));
  assert.throws(() => parseConnectInput("not base64 ***"));
});

test("Base64 helpers round-trip and match Node", () => {
  for (const len of [0, 1, 2, 3, 4, 16, 28, 57]) {
    const bytes = Uint8Array.from({ length: len }, (_, i) => (i * 37 + 11) & 255);
    const std = bytesToBase64(bytes);
    assert.equal(std, Buffer.from(bytes).toString("base64"));
    assert.deepEqual(base64ToBytes(std), bytes);
    assert.deepEqual(base64ToBytes(bytesToBase64Url(bytes)), bytes);
  }
});

test("random nonces produce different ciphertexts for the same STI", () => {
  const nonce2 = Uint8Array.from({ length: 12 }, (_, i) => 0x10 + i);
  assert.notEqual(encryptAlert(TOKEN, "hpv", NONCE), encryptAlert(TOKEN, "hpv", nonce2));
  assert.deepEqual(decryptAlert(TOKEN, encryptAlert(TOKEN, "hpv", nonce2)), { v: 1, sti: "hpv" });
});
