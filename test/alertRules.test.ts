import assert from "node:assert/strict";
import test from "node:test";

import { contactBeforePositive } from "../src/alertRules.ts";
import { UNSPECIFIED_STI } from "../src/sti.ts";

const sent = [{ sti: "gonorrhoea", sentAt: "2026-10-10T12:00:00.000Z" }];

test("a contact scanned before the notification for the same infection needs no action", () => {
  assert.equal(contactBeforePositive("gonorrhoea", "2026-10-01T12:00:00.000Z", sent), true);
});

test("a contact scanned after the notification is a new exposure", () => {
  assert.equal(contactBeforePositive("gonorrhoea", "2026-10-11T12:00:00.000Z", sent), false);
});

test("another infection is not covered", () => {
  assert.equal(contactBeforePositive("syphilis", "2026-10-01T12:00:00.000Z", sent), false);
});

test("without a scan date or an infection name nothing is assumed", () => {
  assert.equal(contactBeforePositive("gonorrhoea", null, sent), false);
  assert.equal(contactBeforePositive(null, "2026-10-01T12:00:00.000Z", sent), false);
});

test("'Don't specify' never counts", () => {
  const other = [{ sti: UNSPECIFIED_STI, sentAt: "2026-10-10T12:00:00.000Z" }];
  assert.equal(contactBeforePositive(UNSPECIFIED_STI, "2026-10-01T12:00:00.000Z", other), false);
});
