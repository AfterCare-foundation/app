// Local retest reminders: notifications the phone schedules for itself. Nothing goes to the
// server. The text is the same generic text a real alert push shows, so a reminder looks like a new
// alert; the infection is named only inside the app.

import * as Notifications from "expo-notifications";

import { retestNotifications } from "./advice";
import { pushSupported } from "./push";
import type { AlertRecord } from "./storage/secureStore";

const BODY = "You have a new message. Open the app to read it.";

const idFor = (alertId: string, days: number) => `retest-${alertId}-${days}`;

/** Schedules a notification for each retest stage still ahead. Call right after an alert is opened. */
export async function scheduleRetestReminders(alert: AlertRecord, scannedAt: string | null): Promise<void> {
  if (!pushSupported || !alert.sti || !alert.acknowledgedAt) {
    return;
  }
  const items = retestNotifications(alert.sti, scannedAt, alert.acknowledgedAt, alert.retestDelayMs ?? 0);
  for (const item of items) {
    if (item.days <= (alert.retestDismissedDays ?? 0)) {
      continue; // already settled, for example by notifying partners about the same infection
    }
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: idFor(alert.id, item.days),
        content: { title: "AfterCare", body: BODY },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(item.at) },
      });
    } catch {
      // Not fatal: the Home card still shows when the app is opened.
    }
  }
}

export async function cancelRetestReminder(alertId: string, days: number): Promise<void> {
  if (!pushSupported) {
    return;
  }
  try {
    await Notifications.cancelScheduledNotificationAsync(idFor(alertId, days));
  } catch {
    // Nothing to cancel.
  }
}

/** For deleting data and resetting the install. Only retest reminders are ever scheduled locally. */
export async function cancelAllRetestReminders(): Promise<void> {
  if (!pushSupported) {
    return;
  }
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Nothing to cancel.
  }
}
