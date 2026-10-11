import assert from "node:assert/strict";
import test from "node:test";

import { LOCK_AFTER_MS, shouldLock } from "../src/lockPolicy.ts";

test("the default is an immediate lock", () => {
  assert.equal(LOCK_AFTER_MS, 0);
  assert.equal(shouldLock(1_000, 1_000), true);
  assert.equal(shouldLock(1_000, 1_050), true);
});

test("never left the foreground: stays open", () => {
  assert.equal(shouldLock(null, 1_000_000), false);
});

test("with a grace period: back in time stays open, away long enough locks", () => {
  assert.equal(shouldLock(1_000, 1_000 + 299_999, 300_000), false);
  assert.equal(shouldLock(1_000, 1_000 + 300_000, 300_000), true);
  assert.equal(shouldLock(1_000, 1_000 + 24 * 60 * 60 * 1000, 300_000), true);
});

test("a clock that went backwards locks", () => {
  assert.equal(shouldLock(5_000, 1_000, 300_000), true);
});
