// When the app locks itself. Plain TypeScript so it can be tested in Node.

/**
 * How long the app may stay in the background before it asks for Face ID or the phone code again.
 * One minute: a quick look at another app (or a call, or a message) and back does not ask again,
 * but a phone put down or handed over locks the private screens almost at once. System dialogs
 * (camera or notification permission) do not count at all, because they only make the app
 * inactive, not backgrounded.
 */
export const LOCK_AFTER_MS = 60_000;

/**
 * `leftAt` is when the app went to the background (null if it has not). The app locks once it has
 * been away for `graceMs` or longer. A phone that has just locked and woke up again counts as being
 * away, because iOS sends the app to the background when the screen locks.
 */
export function shouldLock(leftAt: number | null, now: number, graceMs: number = LOCK_AFTER_MS): boolean {
  if (leftAt === null) {
    return false;
  }
  // A clock that went backwards must not keep the app open.
  if (now < leftAt) {
    return true;
  }
  return now - leftAt >= graceMs;
}
