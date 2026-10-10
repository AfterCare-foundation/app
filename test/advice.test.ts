import assert from "node:assert/strict";
import test from "node:test";

import { ADVICE, adviceLines, pepLine, reminderTime, retestDue, retestNotifications } from "../src/advice.ts";

const SCAN = "2026-10-07T15:30:00Z"; // the contact is taken to be on this day, never after the save time
const at = (iso: string) => new Date(iso).getTime();
const text = (lines: string[]) => lines.join(" | ");

test("HIV: PEP for as long as there is still a chance, counted from the save time", () => {
  // the latest the contact can have been is 2026-10-07T15:30Z, so the deadline is 2026-10-10T15:30Z
  assert.match(text(adviceLines("hiv", SCAN, at("2026-10-10T15:00:00Z"))), /PEP/);
  assert.doesNotMatch(text(adviceLines("hiv", SCAN, at("2026-10-10T16:00:00Z"))), /PEP/);
});

test("the alert text never carries a retest date, only that a reminder will come", () => {
  const lines = text(adviceLines("hiv", SCAN, at("2026-10-08T12:00:00Z")));
  assert.match(lines, /Get tested now\. A reminder will show on the Home screen/);
  assert.doesNotMatch(lines, /November|January|again from|Rapid tests/);
});

test("a test is reliable only once the window since the scan day has passed", () => {
  assert.match(text(adviceLines("gonorrhoea", SCAN, at("2026-10-28T00:00:00Z") - 1)), /Get tested now\. A reminder/);
  assert.match(text(adviceLines("gonorrhoea", SCAN, at("2026-10-28T00:00:00Z"))), /A test now gives a reliable result/);
});

test("Doxy-PEP is never suggested", () => {
  for (const sti of Object.keys(ADVICE)) {
    for (const iso of ["2026-10-07T16:00:00Z", "2026-10-08T12:00:00Z", "2026-10-12T00:00:00Z"]) {
      assert.doesNotMatch(text(adviceLines(sti, SCAN, at(iso))), /doxy/i);
    }
  }
});

test("mpox: vaccine offer for 14 days, no test advice, symptom watch for 21 days", () => {
  assert.match(text(adviceLines("mpox", SCAN, at("2026-10-19T00:00:00Z"))), /vaccination/);
  assert.doesNotMatch(text(adviceLines("mpox", SCAN, at("2026-10-22T00:00:00Z"))), /vaccination/);
  assert.doesNotMatch(text(adviceLines("mpox", SCAN, at("2026-10-10T00:00:00Z"))), /tested/);
  assert.match(text(adviceLines("mpox", SCAN, at("2026-10-20T00:00:00Z"))), /21 days/);
  assert.doesNotMatch(text(adviceLines("mpox", SCAN, at("2026-11-01T00:00:00Z"))), /21 days/);
});

test("clinic may treat first: gonorrhoea, chlamydia and syphilis only", () => {
  for (const sti of ["gonorrhoea", "chlamydia", "syphilis"]) {
    assert.match(text(adviceLines(sti, SCAN, at("2026-10-08T00:00:00Z"))), /treat you straight away/);
  }
  assert.doesNotMatch(text(adviceLines("hiv", SCAN, at("2026-10-08T00:00:00Z"))), /treat you straight away/);
});

test("no scan date, unknown infection and other: general line only", () => {
  const general = ["This is general guidance, not a diagnosis. Please see a doctor or a sexual health clinic."];
  assert.deepEqual(adviceLines("hiv", null), general);
  assert.deepEqual(adviceLines("hiv", "not a date"), general);
  assert.deepEqual(adviceLines("other", SCAN), general);
  assert.deepEqual(adviceLines("mycoplasma", SCAN), general);
});

test("every line list ends with the general line, and no line shows a countdown or contact day", () => {
  for (const sti of Object.keys(ADVICE)) {
    const lines = adviceLines(sti, SCAN, at("2026-10-08T00:00:00Z"));
    assert.match(lines.at(-1) ?? "", /not a diagnosis/);
    assert.doesNotMatch(text(lines), /days? ago|days? since|7 October|6 October|7 Oct/);
  }
});

test("retest reminder: due on the day, only if the alert was opened before it", () => {
  const opened = "2026-10-08T10:00:00Z";
  // gonorrhoea: scan day 7 Oct + 21 days = 28 Oct. The reminder waits for 10:00 local, so
  // the assertions leave a day and a half of room for any time zone.
  assert.equal(retestDue("gonorrhoea", SCAN, opened, 0, at("2026-10-27T23:00:00Z")), null);
  assert.equal(retestDue("gonorrhoea", SCAN, opened, 0, at("2026-10-30T00:00:00Z")), 21);
  assert.equal(retestDue("gonorrhoea", SCAN, opened, 0, at("2026-12-01T00:00:00Z")), 21);
  // opened after the day: the alert already said a test is reliable
  assert.equal(retestDue("gonorrhoea", SCAN, "2026-10-30T10:00:00Z", 0, at("2026-11-02T00:00:00Z")), null);
  // not opened yet
  assert.equal(retestDue("gonorrhoea", SCAN, null, 0, at("2026-11-02T00:00:00Z")), null);
});

test("retest reminder: dismissing a stage hides it, and syphilis still gets its second", () => {
  const opened = "2026-10-08T10:00:00Z";
  // syphilis stages: 42 days = 18 Nov, 84 days = 30 Dec
  assert.equal(retestDue("syphilis", SCAN, opened, 0, at("2026-11-20T12:00:00Z")), 42);
  assert.equal(retestDue("syphilis", SCAN, opened, 42, at("2026-11-20T12:00:00Z")), null);
  assert.equal(retestDue("syphilis", SCAN, opened, 42, at("2027-01-02T00:00:00Z")), 84);
  assert.equal(retestDue("syphilis", SCAN, opened, 84, at("2027-01-02T00:00:00Z")), null);
});

test("retest reminder: none for mpox, hpv (not offered), other, an unknown infection or a card without a date", () => {
  const opened = "2026-10-08T10:00:00Z";
  const later = at("2027-03-01T00:00:00Z");
  for (const sti of ["mpox", "hpv", "other", "mycoplasma"]) {
    assert.equal(retestDue(sti, SCAN, opened, 0, later), null);
  }
  assert.equal(retestDue("hiv", null, opened, 0, later), null);
});

test("reminder time is never at night: before 10:00 waits for 10:00, after 20:00 for 10:00 next day", () => {
  const local = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m).getTime();
  assert.equal(reminderTime(local(28, 3, 30)), local(28, 10));
  assert.equal(reminderTime(local(28, 10)), local(28, 10));
  assert.equal(reminderTime(local(28, 15, 20)), local(28, 15, 20));
  assert.equal(reminderTime(local(28, 19, 59)), local(28, 19, 59));
  assert.equal(reminderTime(local(28, 20)), local(29, 10));
  assert.equal(reminderTime(local(28, 23, 45)), local(29, 10));
});

test("the random delay pushes the reminder back by up to 72 hours", () => {
  const opened = "2026-10-08T10:00:00Z";
  const delay = 50 * 3600 * 1000;
  const noon = (iso: string) => new Date(iso).getTime();
  // gonorrhoea base day: 28 Oct 00:00Z; with a 50 h delay the due moment is 30 Oct 02:00Z
  assert.equal(retestDue("gonorrhoea", SCAN, opened, 0, noon("2026-10-28T12:00:00Z"), delay), null);
  assert.equal(retestDue("gonorrhoea", SCAN, opened, 0, noon("2026-11-01T00:00:00Z"), delay), 21);
});

test("local notifications are scheduled only for stages still ahead, never before the delayed due time", () => {
  const opened = "2026-10-08T10:00:00Z";
  const now = at("2026-10-08T12:00:00Z");
  const items = retestNotifications("syphilis", SCAN, opened, 0, now);
  assert.deepEqual(items.map((i) => i.days), [42, 84]);
  assert.ok(items.every((i) => i.at > now));
  const withDelay = retestNotifications("syphilis", SCAN, opened, 60 * 3600 * 1000, now);
  assert.ok(withDelay[0]!.at >= at("2026-11-18T00:00:00Z") + 60 * 3600 * 1000 - 24 * 3600 * 1000);
  assert.deepEqual(retestNotifications("syphilis", SCAN, opened, 0, at("2027-06-01T00:00:00Z")), []);
  assert.deepEqual(retestNotifications("mpox", SCAN, opened, 0, now), []);
});

test("alert card line: only HIV and mpox, only while the deadline can be met", () => {
  assert.match(pepLine("hiv", SCAN, at("2026-10-10T15:00:00Z")) ?? "", /PEP/);
  assert.equal(pepLine("hiv", SCAN, at("2026-10-10T16:00:00Z")), null);
  assert.match(pepLine("mpox", SCAN, at("2026-10-19T00:00:00Z")) ?? "", /vaccination/);
  assert.equal(pepLine("mpox", SCAN, at("2026-10-22T00:00:00Z")), null);
  assert.equal(pepLine("gonorrhoea", SCAN, at("2026-10-08T00:00:00Z")), null);
  assert.equal(pepLine("hiv", null), null);
});
