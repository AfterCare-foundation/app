// The three things this version does: subscribe to a card, notify one card,
// and pull the development inbox. Screens call these and render the result.

import { getLang, t } from "./i18n";
import { ApiError, confirmInbox, deleteDevice, fetchInbox, notify, subscribe, updatePushId, type InboxMessage } from "./api/client";
import { ADVICE, retestDueStage } from "./advice";
import { contactBeforePositive } from "./alertRules";
import { coverage, isCovered, judgeEntry, testCheck, windowPassed, type TestResult } from "./testRules";
import { requestPushToken } from "./push";
import { cancelRetestReminder } from "./reminders";
import { UNSPECIFIED_STI } from "./sti";
import { decryptAlertWithKey, encryptAlert, encryptionKey, etHash, parseConnectInput, pushIdHash } from "./crypto/contract";
import { randomNonce, randomUuid } from "./crypto/random";
import {
  cardToken,
  listCards,
  saveSent,
  dismissRetest,
  listAlerts,
  listSent,
  listTests,
  closeAlert,
  markAlertNoAction,
  saveAlert,
  saveTest,
  setAlertTestCheck,
  loadOrCreateDevice,
  clearLocalData,
  setWipePending,
  clearWipePending,
  isWipePending,
  saveCard,
  saveDevice,
  updateCard,
  type AlertRecord,
  type CardRecord,
  type DeviceIdentity,
} from "./storage/secureStore";

export { ApiError };

/** Scan or paste -> parse -> POST /subscribe -> store the card. */
export async function subscribeToCard(device: DeviceIdentity, scanned: string): Promise<CardRecord> {
  const token = parseConnectInput(scanned);
  const hash = etHash(token);
  // First contact is the moment to ask for notification permission, so subscribe with the real token.
  const current = await syncPushToken(device, (await requestPushToken(true)) ?? device.pushToken);
  await subscribe({
    et_hash: hash,
    push_id_hash: current.pushIdHash,
    push_token: current.pushToken,
    platform: current.platform,
    device_credential: current.credentialHex,
    lang: getLang(),
  });
  if (!current.subscribedAt) {
    await saveDevice({ ...(await loadOrCreateDevice()), subscribedAt: new Date().toISOString() });
  }
  return saveCard(token);
}

/**
 * Joins the given codes again with the phone's current push token. The server may have dropped
 * this device's subscriptions (for example after the phone was off for over 30 days with a dead
 * token) while still knowing the device. Re-joining a code the device is still on is harmless (200,
 * no slot used). Returns the cards that are still ours; a code someone else has taken (409
 * `code_in_use`) stays a final answer and is left out. Other failures keep the card in the list.
 */
async function resubscribe(device: DeviceIdentity, cards: readonly CardRecord[]): Promise<CardRecord[]> {
  const kept: CardRecord[] = [];
  for (const card of cards) {
    try {
      await subscribe({
        et_hash: card.etHash,
        push_id_hash: device.pushIdHash,
        push_token: device.pushToken,
        platform: device.platform,
        device_credential: device.credentialHex,
        lang: getLang(),
      });
      kept.push(card);
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 409)) {
        kept.push(card);
      }
    }
  }
  return kept;
}

export interface NotifyOutcome {
  /** Devices reached right now. */
  pushed: number;
  /** Pushes the server is retrying for up to a day. */
  retrying: number;
  /** Contacts this send covered. */
  contacts: number;
  campaignId: string;
}

/**
 * One tap of Notify for a whole group of contacts: one campaign, one delivery
 * per contact, each encrypted with that contact's own token. The server
 * rate-limits per campaign, so a hundred contacts still cost one send.
 */
export async function notifyContacts(
  device: DeviceIdentity,
  contacts: readonly CardRecord[],
  sti: string,
): Promise<NotifyOutcome> {
  if (contacts.length === 0) {
    throw new Error(t("No contacts to notify."));
  }
  const campaignId = randomUuid();
  const send = (list: readonly CardRecord[]) =>
    notify({
      sender_push_id_hash: device.pushIdHash,
      device_credential: device.credentialHex,
      campaign_id: campaignId,
      deliveries: list.map((card) => ({
        et_hash: card.etHash,
        encrypted_payload: encryptAlert(cardToken(card), sti, randomNonce()),
      })),
    });
  let reached = contacts;
  let result;
  try {
    result = await send(contacts);
  } catch (error) {
    // The server no longer lists this phone on one of the codes (its cleanup removed the
    // subscriptions). Join again and retry once, with the codes that are still ours.
    if (!(error instanceof ApiError && error.status === 403 && /subscriber/i.test(error.detail))) {
      throw error;
    }
    reached = await resubscribe(device, contacts);
    if (reached.length === 0) {
      throw error;
    }
    result = await send(reached);
  }
  const retrying = result.retrying;
  // Nobody else is on those codes yet: the server gave the slot back, so do
  // not mark anyone as notified and let a later tap reach them.
  const delivered = result.pushed + retrying > 0;
  if (delivered) {
    const notifiedAt = new Date().toISOString();
    for (const card of reached) {
      await updateCard(card.etHash, {
        notifiedAt,
        notifiedStis: card.notifiedStis.includes(sti) ? card.notifiedStis : [...card.notifiedStis, sti],
        lastPushed: null,
      });
    }
    await saveSent(sti);
    await settleRetests(sti);
    await settleUnreadAlerts(sti);
  }
  return {
    pushed: result.pushed,
    retrying,
    contacts: reached.length,
    campaignId,
  };
}

/**
 * The user has just told their contacts about an infection, so they tested positive for it: a
 * retest reminder for an earlier alert about the same infection no longer applies. Hides the
 * reminders and cancels the scheduled notifications, for alerts opened or not. Alerts that
 * arrive later are new exposures and get their own. An unknown infection type names no infection, so it
 * settles nothing.
 */
/**
 * Turns every retest that has come due into an ordinary unread alert: it shows on Home exactly
 * like a new alert, with the same text, and joins the To-do list once seen. Nothing marks it
 * as a retest in the UI. The stage is then dismissed on the alert it follows, so each stage
 * fires once. Returns how many alerts were raised. Call when the app opens or comes to the front.
 */
export async function raiseDueRetests(now: number = Date.now()): Promise<number> {
  const alerts = await listAlerts();
  const cards = await listCards();
  const tests = await listTests();
  let raised = 0;
  for (const alert of alerts) {
    if (!alert.sti || alert.retestOf || alert.noAction || alert.closedAt || !alert.acknowledgedAt) {
      continue;
    }
    const scannedAt = cards.find((c) => c.etHash === alert.etHash)?.scannedAt ?? null;
    if (
      alert.testCheck?.kind === "positive" ||
      (alert.testCheck?.kind === "negative" && windowPassed(alert.sti, alert.testCheck.testedAt, scannedAt))
    ) {
      continue; // a positive result, or a negative taken after the window, needs no retest
    }
    const due = retestDueStage(alert.sti, scannedAt, alert.acknowledgedAt, alert.retestDismissedDays ?? 0, now, alert.retestDelayMs ?? 0);
    if (due === null) {
      continue;
    }
    const unread = (await listAlerts()).some((a) => a.sti === alert.sti && !a.acknowledgedAt);
    // A test recorded since (from another alert or Notify) may already cover this exposure.
    const coveredNow = isCovered(coverage(alert.sti, scannedAt, tests));
    if (!unread && !coveredNow) {
      // Dated at the scheduled time, and carrying the original payload: it looks like the alert again.
      await saveAlert(
        { alert: genericAlert(), enc: alert.enc, etHash: alert.etHash, sti: alert.sti, retestOf: alert.id },
        new Date(due.at).toISOString(),
      );
      raised += 1;
    }
    await dismissRetest(alert.id, due.days);
    await cancelRetestReminder(alert.id, due.days);
  }
  return raised;
}

/**
 * An alert nobody has opened yet, for an infection the user has just notified contacts about, came
 * through a card scanned before now: it needs no action any more.
 */
async function settleUnreadAlerts(sti: string): Promise<void> {
  if (sti === UNSPECIFIED_STI) {
    return;
  }
  const sent = await listSent();
  const cards = await listCards();
  for (const alert of await listAlerts()) {
    if (alert.sti !== sti || alert.acknowledgedAt || alert.noAction || alert.retestOf) {
      continue;
    }
    const scannedAt = cards.find((c) => c.etHash === alert.etHash)?.scannedAt ?? null;
    if (contactBeforePositive(alert.sti, scannedAt, sent)) {
      await markAlertNoAction(alert.id);
    }
  }
}

/**
 * "I've been tested recently" on one alert: stores the test and works out, once, what it says about
 * this alert. Other alerts are left as they are. When it covers the contact, the retest stages of
 * the exposure are dismissed and their reminders cancelled; other unread retest alerts for it go.
 */
export async function recordTestForAlert(
  alertId: string,
  sti: string,
  result: TestResult,
  testedAt: string,
): Promise<{ accepted: boolean; covered: boolean; notBefore?: string }> {
  await saveTest(sti, result, testedAt);
  const alerts = await listAlerts();
  const alert = alerts.find((a) => a.id === alertId);
  if (!alert) {
    return { accepted: false, covered: false };
  }
  const scannedAt = (await listCards()).find((c) => c.etHash === alert.etHash)?.scannedAt ?? null;
  // One free try per exposure, on the original alert only: a retest never gets one, and neither
  // does an exposure where something has been judged already.
  const key = alert.retestOf ?? alert.id;
  const firstTry = !alert.retestOf && !alerts.some((a) => (a.retestOf ?? a.id) === key && a.testCheck);
  const check = judgeEntry({ sti, result, testedAt }, alert.receivedAt, scannedAt, firstTry);
  if (check === null) {
    return { accepted: false, covered: false, notBefore: alert.receivedAt }; // too early a date: it stays on the list
  }
  await setAlertTestCheck(alert.id, check);
  if (!isCovered(check)) {
    return { accepted: true, covered: false }; // not covered: stays on the list, the retest reminders go on
  }
  const originalId = alert.retestOf ?? alert.id;
  for (const other of alerts) {
    // An unread retest stays on Home until the user presses OK; it just turns into "No action needed".
    if (other.id !== alert.id && other.retestOf === originalId && !other.acknowledgedAt) {
      await setAlertTestCheck(other.id, check);
    }
  }
  // A positive result, or a negative taken after the window, needs no retest. Any other test that
  // clears the alert leaves them running, and the user is not told. Only one entry can clear an
  // alert, so this shows one yes/no about the contact day at most.
  const concluded = check.kind === "positive" || (check.kind === "negative" && windowPassed(sti, check.testedAt, scannedAt));
  const stages = concluded ? (ADVICE[sti]?.retestDays ?? []) : [];
  if (stages.length > 0) {
    await dismissRetest(originalId, Math.max(...stages));
    for (const days of stages) {
      await cancelRetestReminder(originalId, days);
    }
  }
  return { accepted: true, covered: true };
}

/** The user removes an exposure from the To-do list without a result: no more retests for it. */
export async function closeExposure(alert: AlertRecord): Promise<void> {
  const originalId = alert.retestOf ?? alert.id;
  for (const other of await listAlerts()) {
    if (other.id === originalId || other.retestOf === originalId) {
      await closeAlert(other.id);
    }
  }
  const stages = alert.sti ? (ADVICE[alert.sti]?.retestDays ?? []) : [];
  if (stages.length > 0) {
    await dismissRetest(originalId, Math.max(...stages));
    for (const days of stages) {
      await cancelRetestReminder(originalId, days);
    }
  }
}

async function settleRetests(sti: string): Promise<void> {
  const stages = sti === UNSPECIFIED_STI ? [] : (ADVICE[sti]?.retestDays ?? []);
  if (stages.length === 0) {
    return;
  }
  for (const alert of await listAlerts()) {
    if (alert.sti !== sti) {
      continue;
    }
    if (alert.retestOf) {
      // A retest alert nobody has opened yet is no longer needed, but it stays on Home until the
      // user presses OK; it turns into "No action needed".
      if (!alert.acknowledgedAt) {
        await markAlertNoAction(alert.id);
      }
      continue;
    }
    await dismissRetest(alert.id, Math.max(...stages));
    for (const days of stages) {
      await cancelRetestReminder(alert.id, days);
    }
  }
}

/**
 * The push token the OS hands out right now, without prompting. Without real push (Expo Go,
 * Android, or notifications not allowed yet) it is the stored token, which never changes.
 */
export async function currentPushToken(device: DeviceIdentity): Promise<string> {
  return (await requestPushToken(false)) ?? device.pushToken;
}

/**
 * Keeps the server's copy of this phone's push token fresh. Run at every launch and on every
 * token refresh. `device.pushToken` is the token the server last accepted. If the OS now reports
 * another one, POST /update-push-id moves the subscriptions across, and the stored token changes
 * only once that call succeeded, so a failure is simply retried on the next launch. A fresh
 * install has no old token on the server and never calls this: it just subscribes as a new device.
 * Returns the identity to use from now on.
 */
export async function syncPushToken(passed: DeviceIdentity, current: string): Promise<DeviceIdentity> {
  const device = await loadOrCreateDevice(); // the caller's copy may predate the first subscribe
  if (current === device.pushToken) {
    return device;
  }
  const next: DeviceIdentity = { ...device, pushToken: current, pushIdHash: pushIdHash(current) };
  if (!device.subscribedAt) {
    // The server has never seen this device (it answers 403 for unknown ones, by design),
    // so there is nothing to move: just remember the new token for the first /subscribe.
    await saveDevice(next);
    return next;
  }
  try {
    await updatePushId({
      old_push_id_hash: device.pushIdHash,
      new_push_id_hash: next.pushIdHash,
      new_push_token: current,
      new_platform: device.platform,
      device_credential: device.credentialHex,
      lang: getLang(),
    });
  } catch (error) {
    if (__DEV__) {
      console.warn("[push] token update failed, will retry at the next launch (a 403 here is a real problem, not a normal case):", error);
    }
    return device;
  }
  await saveDevice(next);
  // The server may have dropped the subscriptions meanwhile; join the stored codes again (best effort).
  void listCards().then((cards) => resubscribe(next, cards)).catch(() => undefined);
  return next;
}

/**
 * Tells the server the language of the push text. Same call as a token update with nothing moved:
 * old and new id are equal. Only for a device the server knows. Failing is harmless: the next
 * launch or language change tries again.
 */
export async function syncLanguage(device: DeviceIdentity): Promise<void> {
  if (!device.subscribedAt) {
    return; // the first /subscribe carries the language
  }
  try {
    await updatePushId({
      old_push_id_hash: device.pushIdHash,
      new_push_id_hash: device.pushIdHash,
      new_push_token: device.pushToken,
      new_platform: device.platform,
      device_credential: device.credentialHex,
      lang: getLang(),
    });
  } catch {
    // retried later
  }
}

export type InboxStatus = "ok" | "unavailable" | "offline";

/** What the last mailbox fetch did, for the developer panel. No message contents. */
export interface PullStats {
  at: string;
  /** Messages the server returned. */
  fetched: number;
  /** Messages no stored card could open. They stay on the server. */
  unreadable: number;
  /** Messages saved as new alerts. */
  saved: number;
  /** Messages the server was told to delete. */
  confirmed: number;
}

export interface InboxPull {
  status: InboxStatus;
  received: AlertRecord[];
  stats: PullStats;
}

const genericAlert = () => t("You have a new message. Open the app to read it.");
const INBOX_PAGE = 200;
const MAX_ROUNDS = 10;

let pulling: Promise<unknown> = Promise.resolve();

/**
 * Fetches the server's mailbox, saves what a stored card can open, and only then confirms those
 * messages so the server deletes them. A message no card opens stays on the server (it is
 * dropped there after 7 days) and comes back on the next fetch. Pushes only wake the app, so
 * this runs on every app open, on a push, and on a timer when real push is not available.
 * Calls run one at a time.
 */
export function pullInbox(device: DeviceIdentity): Promise<InboxPull> {
  const run = pulling.then(() => pullInboxNow(device));
  pulling = run.catch(() => undefined);
  return run;
}

async function pullInboxNow(device: DeviceIdentity): Promise<InboxPull> {
  const request = { push_id_hash: device.pushIdHash, device_credential: device.credentialHex };
  const received: AlertRecord[] = [];
  const stats: PullStats = { at: new Date().toISOString(), fetched: 0, unreadable: 0, saved: 0, confirmed: 0 };
  try {
    for (let round = 0; round < MAX_ROUNDS; round += 1) {
      const { notifications } = await fetchInbox(request);
      if (notifications.length === 0) {
        break;
      }
      const { saved, confirmIds } = await saveMessages(notifications);
      received.push(...saved);
      stats.fetched += notifications.length;
      stats.saved += saved.length;
      stats.unreadable += notifications.length - confirmIds.length;
      if (confirmIds.length > 0) {
        await confirmInbox({ ...request, ids: confirmIds });
        stats.confirmed += confirmIds.length;
      }
      // A full page means there may be more. If nothing could be confirmed, asking again
      // would return the same page.
      if (notifications.length < INBOX_PAGE || confirmIds.length === 0) {
        break;
      }
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 0) {
      return { status: "offline", received, stats };
    }
    // 403: the server does not know this device yet, which is normal before the first subscribe.
    return { status: "unavailable", received, stats };
  }
  return { status: "ok", received, stats };
}

/**
 * Tries every stored card token on each message. A message that is already saved (a confirm that
 * failed earlier) is confirmed again without saving twice. Several contacts reporting the same
 * infection (or one person reaching you through several cards) become one alert; different infections stay separate.
 */
async function saveMessages(messages: InboxMessage[]): Promise<{ saved: AlertRecord[]; confirmIds: string[] }> {
  // One key derivation per card for the whole batch, not one per attempt.
  const keyed = (await listCards()).map((card) => ({ card, key: encryptionKey(cardToken(card)) }));
  const known = await listAlerts();
  const sent = await listSent();
  const tests = await listTests();
  const saved: AlertRecord[] = [];
  const confirmIds: string[] = [];
  for (const message of messages) {
    let match: { etHash: string; sti: string } | null = null;
    for (const { card, key } of keyed) {
      try {
        match = { etHash: card.etHash, sti: decryptAlertWithKey(key, message.enc).sti };
        break;
      } catch {
        // Not this card.
      }
    }
    if (!match) {
      continue;
    }
    if (!known.some((a) => a.enc === message.enc || (a.sti === match.sti && !a.acknowledgedAt))) {
      const scannedAt = keyed.find((k) => k.card.etHash === match.etHash)?.card.scannedAt ?? null;
      const noAction = contactBeforePositive(match.sti, scannedAt, sent);
      // Judged once, on arrival, against the tests stored now.
      const found = coverage(match.sti, scannedAt, tests);
      const record = await saveAlert({
        alert: genericAlert(),
        enc: message.enc,
        ...match,
        ...(noAction ? { noAction } : {}),
        ...(found.kind !== "none" ? { testCheck: testCheck(found, found.testedAt) } : {}),
      });
      saved.push(record);
      known.push(record);
    }
    confirmIds.push(message.id);
  }
  return { saved, confirmIds };
}

export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409 && error.detail === "code_in_use") {
      return t("This code is already in use.");
    }
    if (error.status === 409 && error.detail === "campaign_already_used") {
      return t("This notification was already sent.");
    }
    if (error.status === 429) {
      return error.detail;
    }
    if (error.status === 403 && /subscriber/i.test(error.detail)) {
      return t("Your contacts could not be reached. Their connections may have expired.");
    }
    if (error.status === 403 && /credential/i.test(error.detail)) {
      return t("The server does not recognise this phone. Delete the app and install it again.");
    }
    if (error.status === 403) {
      return t("Refused. {detail}", { detail: error.detail });
    }
    return error.detail;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return t("Something went wrong");
}

/**
 * "Delete my data": the server first, then this phone. A marker is written before the first step
 * and removed after the last, so if the app is killed in between, `resumePendingWipe` finishes the
 * job at the next launch instead of leaving cards that the server no longer knows. A 403 from the
 * server means it has already forgotten this device, which is what we want. Any other failure
 * (offline, server error) throws and leaves the marker for the caller to deal with.
 */
export async function deleteAllData(): Promise<void> {
  const stored = await loadOrCreateDevice();
  await setWipePending();
  try {
    await deleteDevice({ push_id_hash: stored.pushIdHash, device_credential: stored.credentialHex });
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 403)) {
      throw error;
    }
  }
  await clearLocalData();
  await clearWipePending();
}

/** At launch: finishes a "Delete my data" that was interrupted. True when it did. Offline, it tries again next time. */
export async function resumePendingWipe(): Promise<boolean> {
  if (!(await isWipePending())) {
    return false;
  }
  try {
    await deleteAllData();
    return true;
  } catch {
    return false;
  }
}
