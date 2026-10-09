import assert from "node:assert/strict";
import test from "node:test";

import { normalizeMore, pushItemFrom } from "../src/pushPayload.ts";

test("finds enc in the content data", () => {
  assert.deepEqual(pushItemFrom([{ enc: "AAA" }], "hi"), { alert: "hi", enc: "AAA" });
});

test("falls back to the raw payload, top level or under data", () => {
  assert.equal(pushItemFrom([{}, { aps: {}, enc: "BBB" }], "x")?.enc, "BBB");
  assert.equal(pushItemFrom([null, { data: { enc: "CCC" } }], "x")?.enc, "CCC");
});

test("keeps more as a list, from an array or a JSON string", () => {
  assert.deepEqual(pushItemFrom([{ enc: "A", more: ["B", "C"] }], "x")?.more, ["B", "C"]);
  assert.deepEqual(pushItemFrom([{ enc: "A", more: '["B","C"]' }], "x")?.more, ["B", "C"]);
  assert.equal(pushItemFrom([{ enc: "A", more: [] }], "x")?.more, undefined);
});

test("ignores anything that is not an AfterCare push", () => {
  assert.equal(pushItemFrom([{ foo: 1 }, "text", null], "x"), null);
  assert.equal(pushItemFrom([{ enc: "" }], "x"), null);
  assert.equal(normalizeMore("not json"), undefined);
});
