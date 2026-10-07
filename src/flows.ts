// The three things this version does: subscribe to a card, notify one card,
// and pull the development inbox. Screens call these and render the result.

import { ApiError, devInbox, notify, subscribe } from "./api/client";
import { decryptAlert, encryptAlert, etHash, parseConnectInput } from "./crypto/contract";
import { randomNonce, randomUuid } from "./crypto/random";
import {
  cardToken,
  listCards,
  saveSent,
  saveAlert,
  saveCard,
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
  await subscribe({
    et_hash: hash,
    push_id_hash: device.pushIdHash,
    push_token: device.pushToken,
    platform: device.platform,
    device_credential: device.credentialHex,
  });
  return saveCard(token);
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
    throw new Error("No contacts to notify.");
  }
  const campaignId = randomUuid();
  const result = await notify({
    sender_push_id_hash: device.pushIdHash,
    device_credential: device.credentialHex,
    campaign_id: campaignId,
    deliveries: contacts.map((card) => ({
      et_hash: card.etHash,
      encrypted_payload: encryptAlert(cardToken(card), sti, randomNonce()),
    })),
  });
  const retrying = result.retrying;
  // Nobody else is on those codes yet: the server gave the slot back, so do
  // not mark anyone as notified and let a later tap reach them.
  const delivered = result.pushed + retrying > 0;
  if (delivered) {
    const notifiedAt = new Date().toISOString();
    for (const card of contacts) {
      await updateCard(card.etHash, {
        notifiedAt,
        notifiedStis: card.notifiedStis.includes(sti) ? card.notifiedStis : [...card.notifiedStis, sti],
        lastPushed: null,
      });
    }
    await saveSent(sti);
  }
  return {
    pushed: result.pushed,
    retrying,
    contacts: contacts.length,
    campaignId,
  };
}

export type InboxStatus = "ok" | "unavailable" | "offline";

export interface InboxPull {
  status: InboxStatus;
  received: AlertRecord[];
}

/**
 * Pulls the stub-mode inbox and tries every stored card token on each
 * message. The pull clears the server copy, so everything is saved locally
 * even when no token decrypts it.
 */
export async function pullInbox(device: DeviceIdentity): Promise<InboxPull> {
  let notifications;
  try {
    ({ notifications } = await devInbox({
      push_id_hash: device.pushIdHash,
      device_credential: device.credentialHex,
    }));
  } catch (error) {
    if (error instanceof ApiError && error.status === 0) {
      return { status: "offline", received: [] };
    }
    // 404: inbox is off (not development + stub). 403: device unknown yet,
    // which is normal before the first subscribe.
    return { status: "unavailable", received: [] };
  }

  if (notifications.length === 0) {
    return { status: "ok", received: [] };
  }

  const cards = await listCards();
  const received: AlertRecord[] = [];
  for (const item of notifications) {
    // One push can carry several ciphertexts (the server bundles them per
    // device). Several contacts or senders reporting the same infection
    // become one alert; different infections stay separate.
    const found = new Map<string, { enc: string; etHash: string; sti: string }>();
    for (const enc of [item.enc, ...(item.more ?? [])]) {
      for (const card of cards) {
        try {
          const payload = decryptAlert(cardToken(card), enc);
          if (!found.has(payload.sti)) {
            found.set(payload.sti, { enc, etHash: card.etHash, sti: payload.sti });
          }
          break;
        } catch {
          // Not this card.
        }
      }
    }
    if (found.size === 0) {
      // Nothing decrypts. Keep the message anyway, as before.
      received.push(await saveAlert({ alert: item.alert, enc: item.enc, etHash: null, sti: null }));
      continue;
    }
    for (const match of found.values()) {
      received.push(await saveAlert({ alert: item.alert, ...match }));
    }
  }
  return { status: "ok", received };
}

export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409 && error.detail === "code_in_use") {
      return "This code is already in use.";
    }
    if (error.status === 409 && error.detail === "campaign_already_used") {
      return "This notification was already sent.";
    }
    if (error.status === 429) {
      return error.detail;
    }
    if (error.status === 403) {
      return `Refused. ${error.detail}`;
    }
    return error.detail;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong";
}
