import assert from "node:assert/strict";
import test from "node:test";

import { coverage, isCovered, judgeEntry, latestTest, testCheck, type TestEntry } from "../src/testRules.ts";
import { UNSPECIFIED_STI } from "../src/sti.ts";

const contact = "2026-09-01T12:00:00";
const t = (sti: string, day: string, result: "negative" | "positive"): TestEntry => ({
  sti,
  testedAt: new Date(`${day}T00:00:00`).toISOString(),
  result,
});

test("a positive test on a later day covers the alert", () => {
  const c = coverage("gonorrhoea", contact, [t("gonorrhoea", "2026-09-05", "positive")]);
  assert.equal(c.kind, "positive");
  assert.equal(isCovered(c), true);
});

test("a test on the day of the contact, or before it, says nothing", () => {
  assert.equal(coverage("gonorrhoea", contact, [t("gonorrhoea", "2026-09-01", "positive")]).kind, "none");
  assert.equal(coverage("gonorrhoea", contact, [t("gonorrhoea", "2026-08-20", "negative")]).kind, "none");
});

test("a negative test counts only after the window (gonorrhoea 21 days)", () => {
  assert.equal(coverage("gonorrhoea", contact, [t("gonorrhoea", "2026-09-22", "negative")]).kind, "negative");
  assert.equal(coverage("gonorrhoea", contact, [t("gonorrhoea", "2026-09-21", "negative")]).kind, "early");
  assert.equal(isCovered(coverage("gonorrhoea", contact, [t("gonorrhoea", "2026-09-10", "negative")])), false);
});

test("HIV window is 45 days", () => {
  assert.equal(coverage("hiv", contact, [t("hiv", "2026-10-16", "negative")]).kind, "negative");
  assert.equal(coverage("hiv", contact, [t("hiv", "2026-10-15", "negative")]).kind, "early");
});

test("a positive later wins over an early negative", () => {
  const c = coverage("gonorrhoea", contact, [t("gonorrhoea", "2026-09-03", "negative"), t("gonorrhoea", "2026-09-10", "positive")]);
  assert.equal(c.kind, "positive");
});

test("an infection with no window is never cleared by a negative", () => {
  assert.equal(coverage("mpox", contact, [t("mpox", "2026-12-01", "negative")]).kind, "early");
  assert.equal(coverage("mpox", contact, [t("mpox", "2026-09-05", "positive")]).kind, "positive");
});

test("another infection, no date, or no infection name is not covered", () => {
  assert.equal(coverage("syphilis", contact, [t("gonorrhoea", "2026-09-05", "positive")]).kind, "none");
  assert.equal(coverage("gonorrhoea", null, [t("gonorrhoea", "2026-09-05", "positive")]).kind, "none");
  assert.equal(coverage(UNSPECIFIED_STI, contact, [t(UNSPECIFIED_STI, "2026-09-05", "positive")]).kind, "none");
  assert.equal(coverage(null, contact, []).kind, "none");
});

test("latestTest picks the newest of one result", () => {
  const tests = [t("hiv", "2026-01-01", "negative"), t("hiv", "2026-03-01", "negative"), t("hiv", "2026-05-01", "positive")];
  assert.equal(latestTest(tests, "hiv", "negative")?.testedAt, tests[1].testedAt);
  assert.equal(latestTest(tests, "syphilis", "negative"), null);
});

test("an alert keeps the check it was given, whatever the tests say later", () => {
  const covering = coverage("gonorrhoea", contact, [t("gonorrhoea", "2026-09-05", "positive")]);
  const check = testCheck(covering, "2026-09-05T00:00:00.000Z");
  assert.equal(check.kind, "positive");
  assert.equal(isCovered(check), true);
  // Deleting or changing tests afterwards does not touch the stored check.
  assert.equal(coverage("gonorrhoea", contact, []).kind, "none");
  assert.equal(isCovered(check), true);
});

test("a test that does not count is remembered with the date that was entered", () => {
  const none = coverage("gonorrhoea", contact, [t("gonorrhoea", "2026-08-20", "negative")]);
  const check = testCheck(none, "2026-08-20T00:00:00.000Z");
  assert.deepEqual(check, { kind: "none", testedAt: "2026-08-20T00:00:00.000Z" });
  assert.equal(isCovered(check), false);
  assert.equal(isCovered(undefined), false);
});

test("a test entered before the alert arrived is refused, from the day it arrived it is judged", () => {
  const arrived = "2026-10-10T09:00:00";
  const scanned = "2026-10-01T12:00:00";
  const at = (day: string) => new Date(`${day}T00:00:00`).toISOString();
  assert.equal(judgeEntry({ sti: "gonorrhoea", result: "negative", testedAt: at("2026-10-09") }, arrived, scanned, false), null);
  assert.equal(judgeEntry({ sti: "gonorrhoea", result: "positive", testedAt: at("2026-10-10") }, arrived, scanned, false)?.kind, "positive");
  // From the arrival day on, a negative clears the alert whatever the window (a retest follows).
  assert.equal(judgeEntry({ sti: "gonorrhoea", result: "negative", testedAt: at("2026-10-13") }, arrived, scanned, false)?.kind, "negative");
  assert.equal(judgeEntry({ sti: "gonorrhoea", result: "negative", testedAt: at("2026-10-22") }, arrived, scanned, false)?.kind, "negative");
});

test("a test on the arrival day clears the alert even if it is also the contact day", () => {
  const at = (day: string) => new Date(`${day}T00:00:00`).toISOString();
  const scanned = "2026-10-01T12:00:00";
  assert.equal(judgeEntry({ sti: "gonorrhoea", result: "positive", testedAt: at("2026-10-01") }, "2026-10-01T15:00:00", scanned, false)?.kind, "positive");
});

test("the first test on an exposure may be dated before the alert; it is judged and the free try is used", () => {
  const arrived = "2026-10-10T09:00:00";
  const scanned = "2026-10-01T12:00:00";
  const at = (day: string) => new Date(`${day}T00:00:00`).toISOString();
  // Before the contact: says nothing. Between contact and arrival: a positive covers it.
  assert.equal(judgeEntry({ sti: "gonorrhoea", result: "negative", testedAt: at("2026-09-25") }, arrived, scanned, true)?.kind, "none");
  assert.equal(judgeEntry({ sti: "gonorrhoea", result: "positive", testedAt: at("2026-10-05") }, arrived, scanned, true)?.kind, "positive");
  assert.equal(judgeEntry({ sti: "gonorrhoea", result: "negative", testedAt: at("2026-10-05") }, arrived, scanned, true)?.kind, "early");
  // Once it is used, the arrival day is the limit again.
  assert.equal(judgeEntry({ sti: "gonorrhoea", result: "positive", testedAt: at("2026-10-05") }, arrived, scanned, false), null);
});

import { windowPassed } from "../src/testRules.ts";

test("windowPassed: a negative is conclusive only after the infection's window", () => {
  const at = (day: string) => new Date(`${day}T00:00:00`).toISOString();
  assert.equal(windowPassed("gonorrhoea", at("2026-10-13"), "2026-10-01T12:00:00"), false); // 12 days of 21
  assert.equal(windowPassed("gonorrhoea", at("2026-10-22"), "2026-10-01T12:00:00"), true);
  assert.equal(windowPassed("gonorrhoea", at("2026-10-22"), null), false);
});
