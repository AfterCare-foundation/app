import assert from "node:assert/strict";
import test from "node:test";

import { preventionNote } from "../src/prevention.ts";

const NOW = Date.UTC(2026, 9, 7, 12, 0, 0);
const hoursAgo = (h: number) => new Date(NOW - h * 3600 * 1000).toISOString();

test("HIV: PEP line while the saved card is under 72 hours old, or when it is unknown", () => {
  assert.match(preventionNote("hiv", hoursAgo(10), NOW) ?? "", /HIV PEP/);
  assert.match(preventionNote("hiv", null, NOW) ?? "", /HIV PEP/);
});

test("no line once the saved card is older than 72 hours", () => {
  assert.equal(preventionNote("hiv", hoursAgo(73), NOW), null);
  assert.equal(preventionNote("chlamydia", hoursAgo(100), NOW), null);
});

test("Doxy-PEP line for chlamydia and syphilis only", () => {
  assert.match(preventionNote("chlamydia", hoursAgo(5), NOW) ?? "", /Doxy-PEP/);
  assert.match(preventionNote("syphilis", hoursAgo(5), NOW) ?? "", /Doxy-PEP/);
  assert.equal(preventionNote("gonorrhoea", hoursAgo(5), NOW), null);
  assert.equal(preventionNote("other", hoursAgo(5), NOW), null);
});
