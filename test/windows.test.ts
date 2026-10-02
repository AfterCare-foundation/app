import assert from "node:assert/strict";
import test from "node:test";

import type { CardRecord } from "../src/storage/secureStore.ts";
import { DAY_MS, MAX_CONTACTS_PER_CAMPAIGN, selectContacts } from "../src/windows.ts";

const NOW = Date.UTC(2026, 9, 3, 12, 0, 0);

function card(id: string, daysAgo: number, notifiedDaysAgo: number | null = null): CardRecord {
  return {
    etHash: id,
    tokenB64: "",
    scannedAt: new Date(NOW - daysAgo * DAY_MS).toISOString(),
    notifiedAt: notifiedDaysAgo === null ? null : new Date(NOW - notifiedDaysAgo * DAY_MS).toISOString(),
    notifiedSti: null,
    lastPushed: null,
  };
}

const cards = [card("a", 1), card("b", 6), card("c", 13), card("d", 20), card("e", 45), card("f", 70)];

test("last week keeps only contacts from the last 7 days", () => {
  assert.deepEqual(selectContacts(cards, "1w", NOW).map((c) => c.etHash), ["a", "b"]);
});

test("last 2 weeks", () => {
  assert.deepEqual(selectContacts(cards, "2w", NOW).map((c) => c.etHash), ["a", "b", "c"]);
});

test("last 4 weeks", () => {
  assert.deepEqual(selectContacts(cards, "4w", NOW).map((c) => c.etHash), ["a", "b", "c", "d"]);
});

test("everyone stops at the server's 60 day expiry", () => {
  assert.deepEqual(selectContacts(cards, "all", NOW).map((c) => c.etHash), ["a", "b", "c", "d", "e"]);
});

test("since last notification skips contacts already told", () => {
  const withSent = [card("a", 1), card("b", 6), card("c", 13, 10), card("d", 20, 10)];
  assert.deepEqual(selectContacts(withSent, "sinceNotified", NOW).map((c) => c.etHash), ["a", "b"]);
});

test("since last notification with no earlier send means everyone in 60 days", () => {
  assert.equal(selectContacts(cards, "sinceNotified", NOW).length, 5);
});

test("the per campaign cap keeps the newest contacts", () => {
  const many = Array.from({ length: 130 }, (_, i) => card(`x${i}`, i * 0.4));
  const picked = selectContacts(many, "all", NOW);
  assert.equal(picked.length, MAX_CONTACTS_PER_CAMPAIGN);
  assert.equal(picked[0]?.etHash, "x0");
});
