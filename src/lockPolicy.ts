// When the app locks itself. Plain TypeScript so it can be tested in Node.

/**
 * How long the app may stay in the background before it asks for Face ID or the phone code again.
 * Zero: every time the app leaves the foreground (the phone locks, another app opens, the user goes
 * to Safari from "Find a test") it locks. The health data shown here is too sensitive for a grace
 * period, and Face ID is quick. System dialogs (camera or notification permission) do not count,
 * because they only make the app inactive, not backgrounded.
 */
export const LOCK_AFTER_MS = 0;

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
