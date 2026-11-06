// Locks src/crypto/v2.ts to backend/docs/CRYPTO.md §4 (and §2 for the message plaintext).
// Node's hkdfSync and AES-256-GCM are the independent reference.

import assert from "node:assert/strict";
import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { decryptAlert } from "../src/crypto/contract";
import { utf8Encode } from "../src/crypto/encoding";
import { setRandomSourceForTesting } from "../src/crypto/random";
import {
  decryptMessage,
  encryptMessage,
  encryptMessageWithNonceForTesting,
  msgKey,
  routeId,
  sealKey,
  sealPush,
  sealPushWithNonceForTesting,
  slotSecret,
} from "../src/crypto/v2";

setRandomSourceForTesting((n) => new Uint8Array(randomBytes(n)));

const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");
const TOKEN = Uint8Array.from({ length: 16 }, (_, i) => i);
const TOKEN_2 = Uint8Array.from({ length: 16 }, (_, i) => i + 1);
const INSTALL = Uint8Array.from({ length: 32 }, (_, i) => 0x20 + i);
const NONCE = Uint8Array.from({ length: 12 }, (_, i) => 0xb0 + i);

const V2_VECTOR = {
  routeId: "7a4626761e714da82b642e9e700c6c96149003b47a360cc7a36568c0e5cedfd0",
  sealKey: "5bc9124fc1d449fa5d4925b0efc0e7d2d50e8b36b06d10abd950327a23124392",
  msgKey: "45948aa1f2bf3af95770c57fd502e27f43e63756100406aac6862a780889f233",
  slotSecret: "811ebc9091ea9e63aeccbcbdbb6571ca4b0af91b5e3be408073e08b4fa8eaae7",
  slotHash: "22cddc42ca0f0cfa4959482778b43a7780f3c09a30eb5ed559d9a0980a01c2bc",
  json: '{"p":"ios","t":"' + "ab".repeat(32) + '","l":"de"}',
  sealedPush:
    "sLGys7S1tre4ubq7/v9bvO6kelsER+cnlRIpCGbvjBNUt/fMYU6iTFzKYraGn8qu4n5ZXN2yqRxlltR5IyaG25z+FhLUXzJp6Wjomhw2mZZMLX3Hb73L6UBMAXcJUTRs3Z7hF+DfGkdeEEcgI+wx7YwGet/82D507A2fnlfungKrYJYtQ/usfrLMWXEpZ/PowVcFhA1zKQjUzJuq9FHtZfiBI/9Pwpq3Zmo9anqd6EoeRxGJJKbFslCoYGeY4b7Gm+hzRtZvbcUkAfTTnvReI7JlGOdvypMSs/SZLOE6w8tV0fZ6yNl6yd9fZ0gnYen2NmkvpLWsB4gsKufGX+o4AFLD9BTnVnbpJE/3whF9k93RJ3DCllZ/X2HIQmM=",
};

function nodeHkdf(ikm: Uint8Array, salt: Uint8Array, label: string): string {
  return Buffer.from(hkdfSync("sha256", ikm, salt, label, 32)).toString("hex");
}

function nodeOpen(key: Uint8Array, b64: string): Buffer {
  const blob = Buffer.from(b64, "base64");
  const d = createDecipheriv("aes-256-gcm", key, blob.subarray(0, 12));
  d.setAuthTag(blob.subarray(blob.length - 16));
  return Buffer.concat([d.update(blob.subarray(12, blob.length - 16)), d.final()]);
}

function padded(json: string): Buffer {
  const out = Buffer.alloc(256);
  out.write(json, "utf8");
  return out;
}

test("route_id, seal_key and msg_key match §4.5 and Node HKDF", () => {
  for (const [fn, expected, label] of [
    [routeId, V2_VECTOR.routeId, "aftercare/v2/route"],
    [sealKey, V2_VECTOR.sealKey, "aftercare/v2/seal"],
    [msgKey, V2_VECTOR.msgKey, "aftercare/v2/msg"],
  ] as const) {
    assert.equal(hex(fn(TOKEN)), expected);
    assert.equal(nodeHkdf(TOKEN, Buffer.alloc(0), label), expected);
    // "salt absent" means 32 zero bytes (RFC 5869)
    assert.equal(nodeHkdf(TOKEN, Buffer.alloc(32), label), expected);
  }
  assert.throws(() => routeId(new Uint8Array(15)), /TOKEN must be 16 bytes/);
});

test("slot_secret and slot_hash match §4.5 and Node HKDF with the raw route_id salt", () => {
  const rid = routeId(TOKEN);
  const secret = slotSecret(INSTALL, rid);
  assert.equal(hex(secret), V2_VECTOR.slotSecret);
  assert.equal(nodeHkdf(INSTALL, rid, "aftercare/v2/slot"), V2_VECTOR.slotSecret);
  assert.equal(createHash("sha256").update(secret).digest("hex"), V2_VECTOR.slotHash);
});

test("a hex route_id salt does not reproduce slot_secret and is refused", () => {
  const ridHex = V2_VECTOR.routeId;
  assert.notEqual(nodeHkdf(INSTALL, Buffer.from(ridHex, "utf8"), "aftercare/v2/slot"), V2_VECTOR.slotSecret);
  assert.throws(() => slotSecret(INSTALL, utf8Encode(ridHex)), /route_id must be 32 bytes/);
});

test("two cards give unrelated slot secrets", () => {
  const r1 = routeId(TOKEN);
  const r2 = routeId(TOKEN_2);
  const s1 = slotSecret(INSTALL, r1);
  const s2 = slotSecret(INSTALL, r2);
  assert.equal(hex(s1), nodeHkdf(INSTALL, r1, "aftercare/v2/slot"));
  assert.equal(hex(s2), nodeHkdf(INSTALL, r2, "aftercare/v2/slot"));
  assert.notEqual(hex(s1), hex(s2));
});

test("sealed push reproduces §4.5 exactly and opens with Node to 91 bytes + 165 zeros", () => {
  assert.equal(Buffer.byteLength(V2_VECTOR.json, "utf8"), 91);
  const input = { p: "ios", t: "ab".repeat(32), l: "de" } as const;
  const sealed = sealPushWithNonceForTesting(sealKey(TOKEN), input, NONCE);
  assert.equal(sealed, V2_VECTOR.sealedPush);
  const plain = nodeOpen(sealKey(TOKEN), sealed);
  assert.equal(plain.length, 256);
  assert.deepEqual(plain, padded(V2_VECTOR.json));
  assert.ok(plain.subarray(91).every((b) => b === 0));
});

test("sealPush draws a fresh nonce each call and is always 380 characters", () => {
  const input = { p: "ios", t: "ab".repeat(32), l: "de" } as const;
  const a = sealPush(sealKey(TOKEN), input);
  const b = sealPush(sealKey(TOKEN), input);
  assert.notEqual(a, b);
  assert.notEqual(a.slice(0, 16), b.slice(0, 16));
  for (let i = 0; i < 20; i++) {
    const s = sealPush(sealKey(TOKEN), input);
    assert.equal(s.length, 380);
    assert.deepEqual(nodeOpen(sealKey(TOKEN), s), padded(V2_VECTOR.json));
    assert.equal(encryptMessage(msgKey(TOKEN), ["hiv"], "2026-11-04").length, 380);
  }
});

test("length boundaries: 229 ios / 225 android seal, one more throws", () => {
  const key = sealKey(TOKEN);
  assert.equal(sealPush(key, { p: "ios", t: "a".repeat(229), l: "en" }).length, 380);
  assert.throws(() => sealPush(key, { p: "ios", t: "a".repeat(230), l: "en" }), /limit is 256/);
  assert.equal(sealPush(key, { p: "android", t: "a".repeat(225), l: "en" }).length, 380);
  assert.throws(() => sealPush(key, { p: "android", t: "a".repeat(226), l: "en" }), /limit is 256/);
  assert.throws(() => sealPush(key, { p: "web" as "ios", t: "a", l: "en" }));
  assert.throws(() => sealPush(key, { p: "ios", t: "a", l: "fr" as "en" }));
  assert.throws(() => sealPush(key, { p: "ios", t: "", l: "en" }));
  assert.throws(() => sealPush(new Uint8Array(16), { p: "ios", t: "a", l: "en" }), /seal_key must be 32 bytes/);
});

test("msg_key round trip with the §2 plaintext", () => {
  const msgId = Uint8Array.from({ length: 16 }, (_, i) => 0x40 + i);
  const nonce = Uint8Array.from({ length: 12 }, (_, i) => 0xa0 + i);
  const stis = ["gonorrhoea", "hiv"];
  const enc = encryptMessageWithNonceForTesting(msgKey(TOKEN), stis, "2026-11-04", msgId, nonce);
  const json = '{"v":2,"id":"QEFCQ0RFRkdISUpLTE1OTw","d":"2026-11-04","sti":["gonorrhoea","hiv"]}';
  assert.deepEqual(nodeOpen(msgKey(TOKEN), enc), padded(json));
  assert.deepEqual(decryptMessage(msgKey(TOKEN), enc), {
    v: 2,
    id: "QEFCQ0RFRkdISUpLTE1OTw",
    d: "2026-11-04",
    sti: stis,
  });
  assert.throws(() => decryptAlert(TOKEN, enc));

  const e1 = encryptMessage(msgKey(TOKEN), stis, "2026-11-04");
  const e2 = encryptMessage(msgKey(TOKEN), stis, "2026-11-04");
  assert.notEqual(e1, e2);
  assert.deepEqual(decryptMessage(msgKey(TOKEN), e1).sti, stis);
});

test("decryptMessage refuses v1 plaintexts, padded or not", () => {
  const key = Buffer.from(msgKey(TOKEN));
  const seal = (plain: Buffer) => {
    const c = createCipheriv("aes-256-gcm", key, Buffer.from(NONCE));
    const ct = Buffer.concat([c.update(plain), c.final()]);
    return Buffer.concat([Buffer.from(NONCE), ct, c.getAuthTag()]).toString("base64");
  };
  const v1 = '{"v":1,"sti":"hiv"}';
  assert.throws(() => decryptMessage(msgKey(TOKEN), seal(Buffer.from(v1))));
  assert.throws(() => decryptMessage(msgKey(TOKEN), seal(padded(v1))));
});

test("no code outside src/crypto/ mentions a ...ForTesting function", () => {
  const root = path.join(__dirname, "..", "src");
  const files = (readdirSync(root, { recursive: true }) as string[])
    .map((f) => f.split(path.sep).join("/"))
    .filter((f) => /\.tsx?$/.test(f));
  const scanned: string[] = [];
  for (const f of files) {
    if (f.startsWith("crypto/")) {
      continue;
    }
    scanned.push(f);
    const text = readFileSync(path.join(root, f), "utf8");
    assert.ok(!/\w+ForTesting\b/.test(text), `${f} mentions a ForTesting function`);
  }
  assert.ok(scanned.includes("flows.ts"), "guard must scan flows.ts");
  assert.ok(!scanned.includes("crypto/v2.ts"), "guard must skip crypto/v2.ts");
  assert.ok(/\w+ForTesting\b/.test(readFileSync(path.join(root, "crypto/v2.ts"), "utf8")));
});
