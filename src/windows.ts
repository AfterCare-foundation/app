// Which saved contacts a Notify should reach.
//
// The user is never asked "who". It follows from the infection and the last
// date they are sure they were healthy:
//   - last negative test known: contacts saved on or after that day;
//   - not known: the standard lookback period for that infection, counted
//     back from today (a freshly received positive result is assumed).
// Contacts already notified about the same infection are skipped.
//
// A "contact" is one stored card token. The scan time stands in for the
// encounter time (spec 3.3, `activated_at`): scans happen 0 to 24 hours after
// the encounter, so no extra date is asked from the user.

import type { CardRecord } from "./storage/secureStore";

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Server subscriptions expire after 60 days, so older contacts cannot be reached. */
export const MAX_AGE_DAYS = 60;

/** `POST /notify` accepts at most this many contacts per campaign. */
export const MAX_CONTACTS_PER_CAMPAIGN = 100;

// PLACEHOLDER: 14 days for every infection until the clinical research is
// done. Replace the values here; nothing else depends on them being equal.
export const LOOKBACK_DAYS: Readonly<Record<string, number>> = {
  gonorrhoea: 14,
  chlamydia: 14,
  syphilis: 14,
  hiv: 14,
  mpox: 14,
  hpv: 14,
};

/** Used for "Don't specify" and free-text "Other": the most common infections' period. */
export function lookbackDays(sti: string): number {
  const days = Object.prototype.hasOwnProperty.call(LOOKBACK_DAYS, sti) ? LOOKBACK_DAYS[sti] : undefined;
  return days ?? Math.max(LOOKBACK_DAYS.gonorrhoea ?? 14, LOOKBACK_DAYS.chlamydia ?? 14);
}

/** Latest time any contact was notified from this phone, or null. */
export function lastNotifiedAt(cards: readonly CardRecord[]): number | null {
  let latest: number | null = null;
  for (const card of cards) {
    if (card.notifiedAt === null) {
      continue;
    }
    const t = new Date(card.notifiedAt).getTime();
    if (latest === null || t > latest) {
      latest = t;
    }
  }
  return latest;
}

const same = (a: string | null, b: string): boolean =>
  a !== null && a.trim().toLowerCase() === b.trim().toLowerCase();

export interface NotifyCriteria {
  /** The value that goes on the wire (`other` for "Don't specify"). */
  sti: string;
  /** Start of the day of the last negative test, or null when not known. */
  lastNegative: number | null;
}

/** The moment contacts must be newer than. */
export function notifyFrom(criteria: NotifyCriteria, now: number = Date.now()): number {
  const floor = now - MAX_AGE_DAYS * DAY_MS;
  const start =
    criteria.lastNegative === null ? now - lookbackDays(criteria.sti) * DAY_MS : criteria.lastNegative;
  return Math.max(floor, start);
}

/**
 * Contacts to notify, newest first: inside the period, not yet told about this
 * infection, never more than the per-campaign cap.
 */
export function selectContacts(
  cards: readonly CardRecord[],
  criteria: NotifyCriteria,
  now: number = Date.now(),
): CardRecord[] {
  const from = notifyFrom(criteria, now);
  return cards
    .filter((card) => {
      const t = new Date(card.scannedAt).getTime();
      return t >= from && t <= now && !same(card.notifiedSti, criteria.sti);
    })
    .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
    .slice(0, MAX_CONTACTS_PER_CAMPAIGN);
}
