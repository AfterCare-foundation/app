// Which saved contacts a Notify should reach.
//
// The user is never asked "who". It follows from the infection and the last
// date they are sure they were healthy:
//   - last negative test known: contacts saved on or after that day;
//   - not known: the standard lookback period for that infection, counted
//     back from today (a freshly received positive result is assumed).
// Contacts already notified about the same infection are skipped. A generic
// "Don't specify" notice carries less than a named one, so it is skipped for
// anyone already told about any infection.
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

// Partner notification lookback, counted back from the positive result. We
// launch in Germany, so DSTIG is the primary source; where it gives no period,
// IUSTI is used. Both agree where they overlap. Values above MAX_AGE_DAYS are
// cut to it when contacts are selected.
//
// Sources:
//   [DSTIG]  Deutsche STI-Gesellschaft, "Leitfaden STI-Therapie", 5th edition,
//            September 2026, table 3 "Partner*innenmanagement, Abstinenz und ToC":
//            https://dstig.de/wp-content/uploads/2026/09/DSTIG-Leitfaden_Aufl05_2026_09_NEU.pdf
//   [AWMF]   S2k guideline "Sexuell uebertragbare Infektionen (STI) - Beratung,
//            Diagnostik, Therapie" (059-006), section 5.4; it names no periods
//            and refers to the guidelines per infection:
//            https://register.awmf.org/de/leitlinien/detail/059-006
//   [IUSTI]  IUSTI 2024 European guidelines for the management of partners of
//            persons with sexually transmitted infections, table 1:
//            https://files.magicapp.org/guideline/7f8e15c7-071b-45a8-9b33-6fd65f31da17/published_guideline_8829-1_1.pdf
//
// Herpes and HPV are not offered at all: neither source recommends notifying
// past partners (IUSTI 2024, page 6).
// Hepatitis A, B and C have no fixed period in either source ("according to
// the estimated time of infection") and use the fallback in lookbackDays().
export const LOOKBACK_DAYS: Readonly<Record<string, number>> = {
  // [DSTIG] 3 months. [IUSTI] 3 months.
  gonorrhoea: 90,
  // [DSTIG] 6 months. [IUSTI] 6 months.
  chlamydia: 180,
  // [DSTIG] since the likely infection, up to 2 years. [IUSTI] 3 months to 2 years by stage.
  syphilis: 730,
  // [IUSTI] 3 months in recent infection, or since the last negative test. [DSTIG] gives no period.
  hiv: 90,
  // [DSTIG] and [IUSTI] say "current partners" and give no number. OUR ASSUMPTION: 30 days.
  mycoplasma: 30,
  // [DSTIG] mainly current partners, partly the last few weeks. [IUSTI] 2 months.
  trichomoniasis: 60,
  // [IUSTI] 21 days from last contact.
  mpox: 21,
  // [IUSTI] 1 week before symptom onset.
  shigella: 7,
  // [IUSTI] 2 months before diagnosis.
  scabies: 60,
  // [IUSTI] 3 months before diagnosis.
  lice: 90,
};

/** Used for "Don't specify" and infections without their own value: the most common infections' period. */
export function lookbackDays(sti: string): number {
  const days = Object.prototype.hasOwnProperty.call(LOOKBACK_DAYS, sti) ? LOOKBACK_DAYS[sti] : undefined;
  return days ?? Math.max(LOOKBACK_DAYS.gonorrhoea ?? 90, LOOKBACK_DAYS.chlamydia ?? 180);
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

const norm = (value: string): string => value.trim().toLowerCase();

/** True when this contact needs nothing more for this infection. */
function alreadyTold(card: CardRecord, sti: string): boolean {
  if (norm(sti) === "other") {
    return card.notifiedStis.length > 0;
  }
  return card.notifiedStis.some((told) => norm(told) === norm(sti));
}

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
      return t >= from && t <= now && !alreadyTold(card, criteria.sti);
    })
    .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
    .slice(0, MAX_CONTACTS_PER_CAMPAIGN);
}
