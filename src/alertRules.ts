// When a received alert needs no action. Plain TypeScript so the tests can run it.

import { UNSPECIFIED_STI } from "./sti";

/**
 * The alert is about an infection the user has already told their contacts about (they tested
 * positive for it), and the contact it came through was made before that: the card was scanned
 * earlier than the notification was sent. Testing again would tell them nothing new.
 * An unknown infection type names nothing to compare, so it never counts. A contact scanned after the
 * notification is a new exposure and is handled as usual.
 */
export function contactBeforePositive(
  sti: string | null,
  scannedAt: string | null,
  sent: readonly { sti: string; sentAt: string }[],
): boolean {
  if (!sti || sti === UNSPECIFIED_STI || !scannedAt) {
    return false;
  }
  const scanned = new Date(scannedAt).getTime();
  return sent.some((r) => r.sti === sti && scanned < new Date(r.sentAt).getTime());
}
