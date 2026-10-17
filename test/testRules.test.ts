import assert from "node:assert/strict";
import test from "node:test";

import { coverage, isCovered, latestTest, testCheck, type TestEntry } from "../src/testRules.ts";
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
