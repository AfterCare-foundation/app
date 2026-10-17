// The To-do list: one item per exposure that still needs the user to act. Plain TypeScript so the
// tests can run it.
//
// An alert and the retests raised after it are one exposure (a retest alert points back with
// `retestOf`). The exposure is open while its newest alert has been seen and nothing closed it:
//   - the contact needs no action (`noAction`);
//   - a recorded test covers it (`testCheck`, judged once, see testRules.ts);
//   - the user removed it (`closedAt`).
// A test entered on the newest alert takes it off the list for now: a covering one for good, a too
// early one until the retest alert arrives. A test dated before the alert is refused and the item
// stays. An alert not yet seen stays on Home as the card; it joins the list once the user has seen it.

import { isCovered } from "./testRules";
import type { AlertRecord } from "./storage/secureStore";

export function exposureKey(alert: AlertRecord): string {
  return alert.retestOf ?? alert.id;
}

/** The alert to show for each open exposure, newest first. */
export function openItems(alerts: readonly AlertRecord[]): AlertRecord[] {
  const groups = new Map<string, AlertRecord[]>();
  for (const alert of alerts) {
    const key = exposureKey(alert);
    groups.set(key, [...(groups.get(key) ?? []), alert]);
  }
  const items: AlertRecord[] = [];
  for (const members of groups.values()) {
    if (members.some((a) => a.noAction || a.closedAt || isCovered(a.testCheck))) {
      continue;
    }
    const latest = members.reduce((a, b) => (b.receivedAt > a.receivedAt ? b : a));
    if (latest.acknowledgedAt && latest.sti && !latest.testCheck) {
      items.push(latest);
    }
  }
  return items.sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));
}

/** One row of the list: every open exposure to one infection. */
export interface TodoGroup {
  sti: string;
  /** The open alerts, newest first. */
  alerts: AlertRecord[];
}

/**
 * Open exposures grouped by infection, the infection with the newest alert first. A test entered on the row applies to the
 * alerts that have no test check yet (each is judged once), and the row only shows that something is
 * open for the infection, not how many contacts or when.
 */
export function openGroups(alerts: readonly AlertRecord[]): TodoGroup[] {
  const groups = new Map<string, AlertRecord[]>();
  for (const alert of openItems(alerts)) {
    const sti = alert.sti as string;
    groups.set(sti, [...(groups.get(sti) ?? []), alert]);
  }
  // The infection with the newest alert first, so a new alert moves its row to the top. The same
  // arrival time (rare) falls back to the infection id, to keep the order steady.
  const newest = (g: TodoGroup): string => g.alerts.reduce((m, x) => (x.receivedAt > m ? x.receivedAt : m), "");
  return [...groups.entries()]
    .map(([sti, members]) => ({ sti, alerts: members }))
    .sort((a, b) => (newest(a) === newest(b) ? (a.sti < b.sti ? -1 : 1) : newest(a) < newest(b) ? 1 : -1));
}

/** The alerts of a group that no test has been entered on yet. */
export function untested(group: TodoGroup): AlertRecord[] {
  return group.alerts.filter((a) => !a.testCheck);
}
