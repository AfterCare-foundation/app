import assert from "node:assert/strict";
import test from "node:test";

import type { CardRecord } from "../src/storage/secureStore.ts";
import { DAY_MS, MAX_CONTACTS_PER_CAMPAIGN, lookbackDays, notifyFrom, selectContacts } from "../src/windows.ts";

const NOW = Date.UTC(2026, 9, 3, 12, 0, 0);
const daysAgo = (d: number) => NOW - d * DAY_MS;

function card(id: string, scannedDaysAgo: number, notifiedSti: string | null = null): CardRecord {
  return {
    etHash: id,
    tokenB64: "",
    scannedAt: new Date(daysAgo(scannedDaysAgo)).toISOString(),
    notifiedAt: notifiedSti === null ? null : new Date(daysAgo(1)).toISOString(),
    notifiedSti,
    lastPushed: null,
  };
}

const ids = (cards: CardRecord[]) => cards.map((c) => c.etHash);
const cards = [card("a", 1), card("b", 6), card("c", 13), card("d", 20), card("e", 45), card("f", 70)];

test("unknown negative test: the standard lookback counted back from today", () => {
  assert.deepEqual(ids(selectContacts(cards, { sti: "gonorrhoea", lastNegative: null }, NOW)), ["a", "b", "c"]);
});

test("known negative test: contacts from that day on, not before", () => {
  assert.deepEqual(ids(selectContacts(cards, { sti: "gonorrhoea", lastNegative: daysAgo(25) }, NOW)), [
    "a",
    "b",
    "c",
    "d",
  ]);
});

test("a recent negative test narrows the list", () => {
  assert.deepEqual(ids(selectContacts(cards, { sti: "chlamydia", lastNegative: daysAgo(7) }, NOW)), ["a", "b"]);
});

test("a very old negative test stops at the server's 60 day expiry", () => {
  assert.deepEqual(ids(selectContacts(cards, { sti: "hiv", lastNegative: daysAgo(200) }, NOW)), [
    "a",
    "b",
    "c",
    "d",
    "e",
  ]);
});

test("contacts already told about the same infection are skipped", () => {
  const withSent = [card("a", 1), card("b", 6, "gonorrhoea"), card("c", 13, "chlamydia")];
  assert.deepEqual(ids(selectContacts(withSent, { sti: "gonorrhoea", lastNegative: null }, NOW)), ["a", "c"]);
});

test("a different earlier infection does not block a new notification", () => {
  const withSent = [card("a", 1, "syphilis")];
  assert.equal(selectContacts(withSent, { sti: "gonorrhoea", lastNegative: null }, NOW).length, 1);
});

test("free text matches regardless of case and spaces", () => {
  const withSent = [card("a", 1, "Scabies ")];
  assert.equal(selectContacts(withSent, { sti: "scabies", lastNegative: null }, NOW).length, 0);
});

test("unknown infection types use the gonorrhoea and chlamydia period", () => {
  assert.equal(lookbackDays("other"), lookbackDays("gonorrhoea"));
  assert.equal(lookbackDays("constructor"), lookbackDays("gonorrhoea"));
  assert.equal(notifyFrom({ sti: "other", lastNegative: null }, NOW), NOW - lookbackDays("other") * DAY_MS);
});

test("the per campaign cap keeps the newest contacts", () => {
  const many = Array.from({ length: 130 }, (_, i) => card(`x${i}`, i * 0.4));
  const picked = selectContacts(many, { sti: "hiv", lastNegative: daysAgo(60) }, NOW);
  assert.equal(picked.length, MAX_CONTACTS_PER_CAMPAIGN);
  assert.equal(picked[0]?.etHash, "x0");
});
