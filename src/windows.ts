// Which saved contacts a Notify should reach.
//
// A "contact" is one stored card token. The scan time stands in for the
// encounter time (spec 3.3, `activated_at`): scans happen 0 to 24 hours after
// the encounter, so no extra date is asked from the user.

import type { CardRecord } from "./storage/secureStore";

export type WindowId = "1w" | "2w" | "4w" | "sinceNotified" | "all";

export interface NotifyWindow {
  id: WindowId;
  label: string;
  hint: string;
}

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Server subscriptions expire after 60 days, so older contacts cannot be reached. */
export const MAX_AGE_DAYS = 60;

/** `POST /notify` accepts at most this many contacts per campaign. */
export const MAX_CONTACTS_PER_CAMPAIGN = 100;

export const NOTIFY_WINDOWS: readonly NotifyWindow[] = [
  { id: "2w", label: "Last 2 weeks", hint: "Contacts you saved in the last 14 days." },
  { id: "1w", label: "Last week", hint: "Contacts you saved in the last 7 days." },
  { id: "4w", label: "Last 4 weeks", hint: "Contacts you saved in the last 28 days." },
  {
    id: "sinceNotified",
    label: "Since I last notified",
    hint: "Contacts saved after your previous notification, so nobody is told twice.",
  },
  { id: "all", label: "All contacts", hint: "Every contact still on this phone (60 days)." },
];

const WINDOW_DAYS: Partial<Record<WindowId, number>> = {
  "1w": 7,
  "2w": 14,
  "4w": 28,
  all: MAX_AGE_DAYS,
};

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

/**
 * Contacts inside the chosen window, newest first, never older than the
 * server's 60 day expiry and never more than the per-campaign cap.
 */
export function selectContacts(
  cards: readonly CardRecord[],
  windowId: WindowId,
  now: number = Date.now(),
): CardRecord[] {
  const floor = now - MAX_AGE_DAYS * DAY_MS;
  let from = floor;
  if (windowId === "sinceNotified") {
    const last = lastNotifiedAt(cards);
    from = last === null ? floor : Math.max(floor, last);
  } else {
    const days = WINDOW_DAYS[windowId] ?? MAX_AGE_DAYS;
    from = Math.max(floor, now - days * DAY_MS);
  }
  return cards
    .filter((card) => {
      const t = new Date(card.scannedAt).getTime();
      return t >= from && t <= now;
    })
    .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
    .slice(0, MAX_CONTACTS_PER_CAMPAIGN);
}
