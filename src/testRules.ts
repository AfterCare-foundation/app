// Whether a test the user has already taken makes a new alert pointless. Plain TypeScript so the
// tests can run it.
//
// The contact is the day the card was scanned. A test is kept as its day and its result. Per infection:
//   - a positive test on a later day than the contact: the person is already tested, whatever the
//     result of anything else says;
//   - a negative test on a later day than the contact counts only once the infection's window had
//     passed by the test day (windowDays in advice.ts); sooner than that it may have been too early;
//   - a test on the same day as the contact, or before it, says nothing about this contact.
// Infections without a window (mpox: no test without symptoms) are never cleared by a negative.
// An unknown infection type names nothing, so nothing can be compared.

import { ADVICE } from "./advice";
import { UNSPECIFIED_STI } from "./sti";

export type TestResult = "negative" | "positive";

export interface TestEntry {
  sti: string;
  /** ISO time of the start of the day the test was taken. */
  testedAt: string;
  result: TestResult;
}

export type Coverage =
  | { kind: "none" }
  | { kind: "positive"; testedAt: string }
  | { kind: "negative"; testedAt: string }
  | { kind: "early"; testedAt: string };

const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfLocalDay(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** The newest test of one infection with one result, or null. */
export function latestTest(tests: readonly TestEntry[], sti: string, result: TestResult): TestEntry | null {
  let best: TestEntry | null = null;
  for (const test of tests) {
    if (test.sti === sti && test.result === result && (best === null || test.testedAt > best.testedAt)) {
      best = test;
    }
  }
  return best;
}

export function coverage(sti: string | null, contactAt: string | null, tests: readonly TestEntry[]): Coverage {
  if (!sti || sti === UNSPECIFIED_STI || !contactAt) {
    return { kind: "none" };
  }
  const contactMs = new Date(contactAt).getTime();
  if (Number.isNaN(contactMs)) {
    return { kind: "none" };
  }
  const contactDay = startOfLocalDay(contactMs);

  const positive = latestTest(tests, sti, "positive");
  if (positive && contactDay < startOfLocalDay(new Date(positive.testedAt).getTime())) {
    return { kind: "positive", testedAt: positive.testedAt };
  }

  const negative = latestTest(tests, sti, "negative");
  if (negative) {
    const testDay = startOfLocalDay(new Date(negative.testedAt).getTime());
    if (contactDay < testDay) {
      const windowDays = ADVICE[sti]?.windowDays ?? null;
      const waited = Math.round((testDay - contactDay) / DAY_MS);
      return windowDays !== null && waited >= windowDays
        ? { kind: "negative", testedAt: negative.testedAt }
        : { kind: "early", testedAt: negative.testedAt };
    }
  }
  return { kind: "none" };
}

/**
 * What a test said about one alert, worked out once and kept on the alert: when it arrived, or
 * when the user entered a test from it. Later changes to the stored tests never re-evaluate it, so
 * trying different dates cannot reveal the contact date. `testedAt` is the test that was compared.
 */
export interface TestCheck {
  kind: Coverage["kind"];
  testedAt: string;
}

export function testCheck(c: Coverage, entered: string): TestCheck {
  return { kind: c.kind, testedAt: c.kind === "none" ? entered : c.testedAt };
}

/**
 * Judges a test the user enters on one alert. It only counts for an alert if it was taken on the
 * day the alert arrived or later: that date is visible to the user, so trying dates reveals
 * nothing and a refused date can simply be entered again (null). An accepted test is judged once
 * against the hidden contact day: a positive covers it, a negative covers it when the infection's
 * window had passed by the test day, otherwise it was too early ("early": the item leaves the
 * list and the retest reminders go on).
 */
export function judgeEntry(entry: TestEntry, receivedAt: string, contactAt: string | null): TestCheck | null {
  const testDay = startOfLocalDay(new Date(entry.testedAt).getTime());
  if (testDay < startOfLocalDay(new Date(receivedAt).getTime())) {
    return null;
  }
  const contactMs = contactAt === null ? NaN : new Date(contactAt).getTime();
  if (entry.result === "positive" || Number.isNaN(contactMs)) {
    return { kind: entry.result, testedAt: entry.testedAt };
  }
  const windowDays = ADVICE[entry.sti]?.windowDays ?? null;
  const waited = Math.round((testDay - startOfLocalDay(contactMs)) / DAY_MS);
  return { kind: windowDays !== null && waited >= windowDays ? "negative" : "early", testedAt: entry.testedAt };
}

/** The test makes this alert pointless: nothing is asked of the user. */
export function isCovered(c: { kind: Coverage["kind"] } | null | undefined): boolean {
  return c?.kind === "positive" || c?.kind === "negative";
}
