import assert from "node:assert/strict";
import test from "node:test";

import { judged, openGroups, openItems, untested } from "../src/todo.ts";
import type { AlertRecord } from "../src/storage/secureStore.ts";

let n = 0;
const alert = (over: Partial<AlertRecord> = {}): AlertRecord => ({
  id: `a${(n += 1)}`,
  receivedAt: `2026-10-${String(10 + n).padStart(2, "0")}T10:00:00.000Z`,
  alert: "x",
  enc: `e${n}`,
  etHash: "h",
  sti: "gonorrhoea",
  acknowledgedAt: "2026-10-20T10:00:00.000Z",
  ...over,
});

test("a seen alert that needs action is an item; an unseen one is not yet", () => {
  const seen = alert();
  const unseen = alert({ acknowledgedAt: null });
  assert.deepEqual(openItems([seen, unseen]).map((a) => a.id), [seen.id]);
});

test("no action, a covering test and removal close an item", () => {
  const items = openItems([
    alert({ noAction: true }),
    alert({ testCheck: { kind: "negative", testedAt: "2026-10-01T00:00:00.000Z" } }),
    alert({ closedAt: "2026-10-21T00:00:00.000Z" }),
  ]);
  assert.equal(items.length, 0);
});

test("a test that does not clear the alert leaves the item on the list, open to a later test", () => {
  const early = alert({ testCheck: { kind: "early", testedAt: "2026-10-01T00:00:00.000Z" } });
  assert.deepEqual(openItems([early]).map((a) => a.id), [early.id]);
  assert.equal(untested({ sti: "gonorrhoea", alerts: [early] }).length, 1);
  const retest = alert({ retestOf: early.id });
  assert.deepEqual(openItems([early, retest]).map((a) => a.id), [retest.id]);
});

test("an alert and its retest are one item, shown as the newest", () => {
  const first = alert();
  const retest = alert({ retestOf: first.id });
  assert.deepEqual(openItems([first, retest]).map((a) => a.id), [retest.id]);
});

test("closing the exposure through the retest closes the whole item", () => {
  const first = alert();
  const retest = alert({ retestOf: first.id, testCheck: { kind: "positive", testedAt: "2026-10-22T00:00:00.000Z" } });
  assert.equal(openItems([first, retest]).length, 0);
});

test("a retest not yet seen hides the item: Home shows its card", () => {
  const first = alert();
  const retest = alert({ retestOf: first.id, acknowledgedAt: null });
  assert.equal(openItems([first, retest]).length, 0);
});

test("open exposures to one infection are one row", () => {
  const a = alert({ sti: "gonorrhoea" });
  const b = alert({ sti: "gonorrhoea" });
  const c = alert({ sti: "hiv" });
  const groups = openGroups([a, b, c]);
  assert.deepEqual(groups.map((g) => [g.sti, g.alerts.length]).sort(), [["gonorrhoea", 2], ["hiv", 1]]);
});

test("a test is entered on every open alert of the row, including one an earlier test did not clear", () => {
  const checked = alert({ testCheck: { kind: "early", testedAt: "2026-10-05T00:00:00.000Z" } });
  const fresh = alert();
  const [group] = openGroups([checked, fresh]);
  assert.deepEqual(untested(group).map((x) => x.id).sort(), [checked.id, fresh.id].sort());
  assert.equal(judged(group), true);
});

test("rows are ordered by their newest alert, so a new alert moves its row to the top", () => {
  const oldHiv = alert({ sti: "hiv", receivedAt: "2026-10-01T10:00:00.000Z" });
  const gono = alert({ sti: "gonorrhoea", receivedAt: "2026-10-05T10:00:00.000Z" });
  assert.deepEqual(openGroups([oldHiv, gono]).map((g) => g.sti), ["gonorrhoea", "hiv"]);
  const newHiv = alert({ sti: "hiv", receivedAt: "2026-10-09T10:00:00.000Z" });
  assert.deepEqual(openGroups([oldHiv, gono, newHiv]).map((g) => g.sti), ["hiv", "gonorrhoea"]);
});

test("a covering test closes the exposure until a retest alert arrives", () => {
  const covered = alert({ testCheck: { kind: "negative", testedAt: "2026-10-22T00:00:00.000Z" }, receivedAt: "2026-10-22T10:00:00.000Z" });
  assert.equal(openItems([covered]).length, 0);
  const retest = alert({ retestOf: covered.id, receivedAt: "2026-11-20T10:00:00.000Z" });
  assert.deepEqual(openItems([covered, retest]).map((a) => a.id), [retest.id]);
});
