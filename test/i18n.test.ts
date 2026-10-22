import assert from "node:assert/strict";
import { test } from "node:test";

import { dayMonth, setLang, t } from "../src/i18n/index.ts";
import { de } from "../src/i18n/de.ts";

test("german text, placeholders and fallback", () => {
  setLang("de");
  assert.equal(t("Last test: {date}", { date: "3. Okt. 2026" }), "Letzter Test: 3. Okt. 2026");
  assert.equal(t("not in the dictionary"), "not in the dictionary");
  assert.equal(dayMonth(new Date(2026, 9, 3), true), "3. Okt. 2026");
  setLang("en");
  assert.equal(dayMonth(new Date(2026, 9, 3), true), "3 Oct 2026");
  assert.equal(t("Cancel"), "Cancel");
});

test("every German entry keeps the placeholders of its English key", () => {
  for (const [en, german] of Object.entries(de)) {
    const names = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    assert.equal(names(german), names(en), en);
  }
});
