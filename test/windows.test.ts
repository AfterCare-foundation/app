import assert from "node:assert/strict";
import test from "node:test";

import type { CardRecord } from "../src/storage/secureStore.ts";
import { DAY_MS, MAX_AGE_DAYS, MAX_CONTACTS_PER_CAMPAIGN, lookbackDays, notifyFrom, selectContacts } from "../src/windows.ts";

const NOW = Date.UTC(2026, 9, 3, 12, 0, 0);
const daysAgo = (d: number) => NOW - d * DAY_MS;

function card(id: string, scannedDaysAgo: number, notifiedSti: string | string[] | null = null): CardRecord {
  const told = notifiedSti === null ? [] : Array.isArray(notifiedSti) ? notifiedSti : [notifiedSti];
  return {
    etHash: id,
    tokenB64: "",
    scannedAt: new Date(daysAgo(scannedDaysAgo)).toISOString(),
    notifiedAt: told.length === 0 ? null : new Date(daysAgo(1)).toISOString(),
    notifiedStis: told,
    lastPushed: null,
  };
}

const ids = (cards: CardRecord[]) => cards.map((c) => c.etHash);
const cards = [card("a", 1), card("b", 6), card("c", 13), card("d", 20), card("e", 45), card("f", 70), card("g", 200)];

test("unknown negative test: the standard lookback counted back from today", () => {
  assert.deepEqual(ids(selectContacts(cards, { sti: "mpox", lastNegative: null }, NOW)), ["a", "b", "c", "d"]);
});

test("a lookback longer than the server keeps codes stops at the 6 month expiry", () => {
  assert.deepEqual(ids(selectContacts(cards, { sti: "syphilis", lastNegative: null }, NOW)), [
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
  ]);
});

test("known negative test: contacts from that day on, not before", () => {
  assert.deepEqual(ids(selectContacts(cards, { sti: "gonorrhoea", lastNegative: daysAgo(25) }, NOW)), [
    "a",
    "b",
    "c",
    "d",
  ]);
});

test("a negative test older than the standard period does not widen it", () => {
  // mpox looks back 21 days; a test from 100 days ago must not reach further.
  assert.deepEqual(ids(selectContacts(cards, { sti: "mpox", lastNegative: daysAgo(100) }, NOW)), [
    "a",
    "b",
    "c",
    "d",
  ]);
});

test("a recent negative test narrows the list", () => {
  assert.deepEqual(ids(selectContacts(cards, { sti: "chlamydia", lastNegative: daysAgo(7) }, NOW)), ["a", "b"]);
});

test("a very old negative test stops at the server's 6 month expiry", () => {
  assert.deepEqual(ids(selectContacts(cards, { sti: "hiv", lastNegative: daysAgo(300) }, NOW)), [
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
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

test("unknown infection types use the longer of the gonorrhoea and chlamydia periods", () => {
  const longer = Math.max(lookbackDays("gonorrhoea"), lookbackDays("chlamydia"));
  assert.equal(lookbackDays("other"), longer);
  assert.equal(lookbackDays("constructor"), longer);
  assert.equal(lookbackDays("hepatitis_b"), longer);
  assert.equal(
    notifyFrom({ sti: "other", lastNegative: null }, NOW),
    NOW - Math.min(lookbackDays("other"), MAX_AGE_DAYS) * DAY_MS,
  );
});

test("the per campaign cap keeps the newest contacts", () => {
  const many = Array.from({ length: 130 }, (_, i) => card(`x${i}`, i * 0.4));
  const picked = selectContacts(many, { sti: "hiv", lastNegative: daysAgo(60) }, NOW);
  assert.equal(picked.length, MAX_CONTACTS_PER_CAMPAIGN);
  assert.equal(picked[0]?.etHash, "x0");
});

test("told about gonorrhoea then chlamydia: gonorrhoea is still skipped", () => {
  const list = [card("a", 1, ["gonorrhoea", "chlamydia"]), card("b", 2)];
  assert.deepEqual(ids(selectContacts(list, { sti: "gonorrhoea", lastNegative: null }, NOW)), ["b"]);
});

test("a generic notice is skipped for anyone already told about something", () => {
  const list = [card("a", 1, "gonorrhoea"), card("b", 2)];
  assert.deepEqual(ids(selectContacts(list, { sti: "other", lastNegative: null }, NOW)), ["b"]);
});

test("a named notice still goes to someone only told generically", () => {
  const list = [card("a", 1, "other")];
  assert.deepEqual(ids(selectContacts(list, { sti: "gonorrhoea", lastNegative: null }, NOW)), ["a"]);
});
