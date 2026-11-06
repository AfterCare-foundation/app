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
  decryptAlertWithKey,
  encryptAlert,
  encryptionKey,
  etHash,
  parseConnectInput,
  pushIdHash,
  PAYLOAD_B64_CHARS,
  PAYLOAD_BYTES,
  PLAINTEXT_BYTES,
} from "../src/crypto/contract";
import { STI_OPTIONS, UNSPECIFIED_STI } from "../src/sti";

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

const ALL_STI = [...STI_OPTIONS.map((o) => o.id), UNSPECIFIED_STI];
const MSG_ID = Uint8Array.from({ length: 16 }, (_, i) => 0x40 + i);
const DATE = "2026-11-04";
const seal = (sti: readonly string[], id = MSG_ID, nonce = NONCE) => encryptAlert(TOKEN, sti, DATE, id, nonce);

// Sealed with Node, so the tests can build plaintexts the app itself would never send.
function sealRaw(plain: Buffer): string {
  const cipher = createCipheriv("aes-256-gcm", nodeKey(TOKEN), Buffer.from(NONCE));
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([Buffer.from(NONCE), ct, cipher.getAuthTag()]).toString("base64");
}
const padTo256 = (json: string) => {
  const out = Buffer.alloc(PLAINTEXT_BYTES);
  out.write(json, "utf8");
  return out;
};

// The §2 test vector from backend/docs/CRYPTO.md, verbatim. TOKEN, NONCE, MSG_ID and DATE above
// are its inputs; the server's tests/test_payload_size.py checks the same values.
const V2_VECTOR = {
  stis: ["gonorrhoea", "hiv"],
  jsonText: '{"v":2,"id":"QEFCQ0RFRkdISUpLTE1OTw","d":"2026-11-04","sti":["gonorrhoea","hiv"]}',
  // CRYPTO.md's prose says 80 bytes + 176 zeros; the JSON it prints is 81 bytes + 175 zeros.
  jsonBytes: 81,
  payload:
    "oKGio6SlpqeoqaqrHjn3jZsQ/uuY91afMvEAPlnWO9N/MIuDIrsLhRnYppG1EXjRBY0qzFXOXBs+bsaTmS1ygZCVHejLeeHeACFYQEQVf3aFyYS8k+12fP8eJUdgjxAn4qTKyF8Fa5MuFoifKTOo4WSfRXFgr1Z4FCFm8YLy/mjZbrNM/ylbR/rtJYqQXi77wwkCmkWvcDVqsF2ZohSiIS9lqUfYrcpamjR+cUw0c2c+FTDjGTD50Eo9aH5Ij26tupHIxMOo4wq/8vl6uqJVGMNHIK68YFt+zN5F4KtVLFPWpJ1vQisuEf05o7JpBrmnjwOb5aS9sARhup7mkkjg6+NqdxwPhfm8BSygs50Q3NNJK5V0124hcLHwNUk=",
};

test("plaintext is padded compact JSON, exactly 256 bytes", () => {
  const plain = alertPlaintext(MSG_ID, DATE, V2_VECTOR.stis);
  assert.equal(Buffer.byteLength(V2_VECTOR.jsonText, "utf8"), V2_VECTOR.jsonBytes);
  assert.deepEqual(Buffer.from(plain), padTo256(V2_VECTOR.jsonText));
});

test("v2 fixed vector matches and Node AES-256-GCM opens it", () => {
  const payload = seal(V2_VECTOR.stis);
  assert.equal(payload, V2_VECTOR.payload);

  const blob = Buffer.from(payload, "base64");
  assert.equal(blob.length, PAYLOAD_BYTES);
  assert.deepEqual(blob.subarray(0, 12), Buffer.from(NONCE));

  const decipher = createDecipheriv("aes-256-gcm", nodeKey(TOKEN), blob.subarray(0, 12));
  decipher.setAuthTag(blob.subarray(blob.length - 16));
  const plain = Buffer.concat([decipher.update(blob.subarray(12, blob.length - 16)), decipher.final()]);
  assert.deepEqual(plain, padTo256(V2_VECTOR.jsonText));
});

test("every single STI id gives exactly 380 base64 chars / 284 bytes", () => {
  assert.equal(PLAINTEXT_BYTES, 256);
  assert.equal(PAYLOAD_BYTES, 284);
  assert.equal(PAYLOAD_B64_CHARS, 380);
  for (const sti of ALL_STI) {
    const payload = seal([sti]);
    assert.equal(payload.length, PAYLOAD_B64_CHARS, sti);
    assert.equal(base64ToBytes(payload).length, PAYLOAD_BYTES, sti);
  }
});

test("messages for different STIs have identical lengths", () => {
  assert.equal(seal(["hiv"]).length, seal(["gonorrhoea"]).length);
  assert.equal(seal(["hiv"]).length, seal(["hepatitis_a", "trichomoniasis"]).length);
});

test("worst case: all STI ids in one message still fits 256 bytes", () => {
  const json = JSON.stringify({ v: 2, id: bytesToBase64Url(MSG_ID), d: DATE, sti: ALL_STI });
  const bytes = Buffer.byteLength(json, "utf8");
  console.log(`# all ${ALL_STI.length} STI ids: JSON is ${bytes} of ${PLAINTEXT_BYTES} bytes`);
  assert.ok(bytes <= PLAINTEXT_BYTES);
  const payload = seal(ALL_STI);
  assert.equal(payload.length, PAYLOAD_B64_CHARS);
  assert.deepEqual(decryptAlert(TOKEN, payload).sti, ALL_STI);
});

test("v2 round trip returns id, date and the STI list", () => {
  assert.deepEqual(decryptAlert(TOKEN, seal(V2_VECTOR.stis)), {
    v: 2,
    id: bytesToBase64Url(MSG_ID),
    d: DATE,
    sti: V2_VECTOR.stis,
  });
  assert.equal(bytesToBase64Url(MSG_ID).length, 22);
});

test("v2 encrypt refuses bad input", () => {
  assert.throws(() => seal([]), /non-empty/);
  assert.throws(() => seal(["hiv", "hiv"]), /duplicates/);
  assert.throws(() => seal([1 as unknown as string]));
  assert.throws(() => encryptAlert(TOKEN, ["hiv"], "2026-13-01", MSG_ID, NONCE));
  assert.throws(() => encryptAlert(TOKEN, ["hiv"], "2026-2-1", MSG_ID, NONCE));
  assert.throws(() => encryptAlert(TOKEN, ["hiv"], DATE, new Uint8Array(15), NONCE));
});

test("v2 encrypt throws when the JSON is over 256 bytes, never truncates", () => {
  assert.throws(() => seal(["x".repeat(200)]), /limit is 256/);
  assert.throws(() => seal([...ALL_STI, "x".repeat(40)]), /limit is 256/);
});

test("decryptAlert refuses malformed v2 plaintexts", () => {
  const good = '{"v":2,"id":"QEFCQ0RFRkdISUpLTE1OTw","d":"2026-11-04","sti":["hiv"]}';
  assert.deepEqual(decryptAlert(TOKEN, sealRaw(padTo256(good))).sti, ["hiv"]);

  const junk = padTo256(good);
  junk[200] = 0x41; // non-zero byte after the JSON
  assert.throws(() => decryptAlert(TOKEN, sealRaw(junk)));
  assert.throws(() => decryptAlert(TOKEN, sealRaw(Buffer.from(good)))); // unpadded v2
  const longer = Buffer.alloc(300);
  longer.write(good);
  assert.throws(() => decryptAlert(TOKEN, sealRaw(longer))); // padded past 256
  assert.throws(() => decryptAlert(TOKEN, sealRaw(padTo256(good.replace('"v":2', '"v":3')))));
  assert.throws(() => decryptAlert(TOKEN, sealRaw(padTo256(good.replace('"sti":["hiv"]', '"sti":"hiv"')))));
  assert.throws(() => decryptAlert(TOKEN, sealRaw(padTo256(good.replace('["hiv"]', "[1]")))));
  assert.throws(() => decryptAlert(TOKEN, sealRaw(padTo256(good.replace('["hiv"]', "[]")))));
  assert.throws(() => decryptAlert(TOKEN, sealRaw(padTo256(good.replace("2026-11-04", "2026-11-4")))));
  assert.throws(() => decryptAlert(TOKEN, sealRaw(padTo256(good.replace("QEFCQ0RFRkdISUpLTE1OTw", "short")))));
});

test("decryptAlert keeps unknown STI ids as received", () => {
  const json = '{"v":2,"id":"QEFCQ0RFRkdISUpLTE1OTw","d":"2026-11-04","sti":["hiv","future_sti"]}';
  assert.deepEqual(decryptAlert(TOKEN, sealRaw(padTo256(json))).sti, ["hiv", "future_sti"]);
});

test("legacy v1 still decrypts to a one-item list", () => {
  assert.deepEqual(decryptAlert(TOKEN, EXPECTED.payload), { v: 1, id: null, d: null, sti: ["gonorrhoea"] });
  assert.deepEqual(decryptAlert(TOKEN, sealRaw(Buffer.from('{"v":1,"sti":"syphilis"}'))), {
    v: 1,
    id: null,
    d: null,
    sti: ["syphilis"],
  });
});

test("v1 is refused when padded", () => {
  assert.throws(() => decryptAlert(TOKEN, sealRaw(padTo256('{"v":1,"sti":"hiv"}'))));
});

test("decryptAlert fails with another card's token", () => {
  const payload = seal(["hiv"]);
  const other = Uint8Array.from({ length: 16 }, (_, i) => i + 1);
  assert.throws(() => decryptAlert(other, payload));
});

test("decryptAlert rejects tampered bytes and short input", () => {
  const payload = seal(["mpox"]);
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
  assert.notEqual(seal(["hpv"]), seal(["hpv"], MSG_ID, nonce2));
  assert.deepEqual(decryptAlert(TOKEN, seal(["hpv"], MSG_ID, nonce2)).sti, ["hpv"]);
});

test("worst case: 200 messages tried against 100 cards with cached keys", () => {
  const tokens = Array.from({ length: 100 }, (_, c) => Uint8Array.from({ length: 16 }, (_, i) => (c * 7 + i) & 0xff));
  const messages = Array.from({ length: 200 }, (_, m) =>
    encryptAlert(tokens[m % 100]!, ["chlamydia"], DATE, MSG_ID, Uint8Array.from({ length: 12 }, (_, i) => (m + i) & 0xff)),
  );
  const started = performance.now();
  const keys = tokens.map((token) => encryptionKey(token));
  let opened = 0;
  for (const enc of messages) {
    for (const key of keys) {
      try {
        decryptAlertWithKey(key, enc);
        opened += 1;
        break;
      } catch {
        // Not this card.
      }
    }
  }
  const ms = performance.now() - started;
  assert.equal(opened, 200);
  console.log(`# worst case (about 10,000 attempts) took ${ms.toFixed(0)} ms in Node; measure on a phone`);
});
