// Everything the app keeps on the phone lives in the OS keystore via
// expo-secure-store (iOS Keychain / Android Keystore).
//
// Layout (one key per record so no single value grows past the 2 KB
// SecureStore limit):
//   device                 DeviceIdentity JSON
//   cards.index            comma-separated et_hash list, newest last
//   card.<et_hash>         CardRecord JSON (includes the raw token)
//   alerts.index           comma-separated alert ids, newest last
//   alert.<id>             AlertRecord JSON
//   sent.index             comma-separated sent-log ids, newest last
//   sent.<id>              SentRecord JSON (when and what, never to whom)

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import {
  credentialHex,
  etHash,
  pushIdHash,
  type Platform as ApiPlatform,
} from "../crypto/contract";
import { bytesToBase64, base64ToBytes } from "../crypto/encoding";
import { randomCredential, randomUuid } from "../crypto/random";

const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const KEY_DEVICE = "device";
const KEY_CARDS = "cards.index";
const KEY_ALERTS = "alerts.index";
const KEY_SENT = "sent.index";

export interface DeviceIdentity {
  /** 32 random bytes, hex. Sent on every mutating request. */
  credentialHex: string;
  /** Stub push token. Stays fixed for this install so push_id_hash is stable. */
  pushToken: string;
  pushIdHash: string;
  platform: ApiPlatform;
  createdAt: string;
  /** Set after the first successful /subscribe. Until then the server has never heard of this device. */
  subscribedAt?: string;
}

export interface CardRecord {
  etHash: string;
  /** Raw 16-byte token, Base64. Needed to encrypt and decrypt for this card. */
  tokenB64: string;
  scannedAt: string;
  /** Set after a successful POST /notify for this card. */
  notifiedAt: string | null;
  /** Every infection this contact was already told about. */
  notifiedStis: string[];
  lastPushed: number | null;
}

export interface AlertRecord {
  id: string;
  receivedAt: string;
  alert: string;
  enc: string;
  /** Card that decrypted it, or null when no local token fits. */
  etHash: string | null;
  sti: string | null;
  /** Set when the user taps the card's button. Local only. */
  acknowledgedAt: string | null;
}

/** One line of the local "I notified people" log. No contacts, no counts. */
export interface SentRecord {
  id: string;
  sentAt: string;
  /** The text that was encrypted for recipients: a known type or the typed name. */
  sti: string;
}

async function readJson<T>(key: string): Promise<T | null> {
  const raw = await SecureStore.getItemAsync(key, OPTIONS);
  if (raw === null) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await SecureStore.setItemAsync(key, JSON.stringify(value), OPTIONS);
}

async function readIndex(key: string): Promise<string[]> {
  const raw = await SecureStore.getItemAsync(key, OPTIONS);
  return raw ? raw.split(",").filter(Boolean) : [];
}

async function writeIndex(key: string, ids: string[]): Promise<void> {
  await SecureStore.setItemAsync(key, ids.join(","), OPTIONS);
}

function apiPlatform(): ApiPlatform {
  // The server accepts only ios or android. Web and others map to ios so
  // local development on a Mac still talks to the API.
  return Platform.OS === "android" ? "android" : "ios";
}

/** Creates the device identity on first launch, then reuses it forever. */
export async function loadOrCreateDevice(): Promise<DeviceIdentity> {
  const existing = await readJson<DeviceIdentity>(KEY_DEVICE);
  if (existing) {
    return existing;
  }
  const platform = apiPlatform();
  const pushToken = `stub-${platform}-${randomUuid()}`;
  const identity: DeviceIdentity = {
    credentialHex: credentialHex(randomCredential()),
    pushToken,
    pushIdHash: pushIdHash(pushToken),
    platform,
    createdAt: new Date().toISOString(),
  };
  await writeJson(KEY_DEVICE, identity);
  return identity;
}

/** Saves the identity again, after its push token was replaced on the server. */
export async function saveDevice(identity: DeviceIdentity): Promise<void> {
  await writeJson(KEY_DEVICE, identity);
}

/** Older saves kept one `notifiedSti`; turn it into the list. */
function normalizeCard(raw: (CardRecord & { notifiedSti?: string | null }) | null): CardRecord | null {
  if (!raw) {
    return null;
  }
  const { notifiedSti, ...card } = raw;
  const list = Array.isArray(card.notifiedStis) ? card.notifiedStis : [];
  return { ...card, notifiedStis: notifiedSti && !list.includes(notifiedSti) ? [...list, notifiedSti] : list };
}

export async function listCards(): Promise<CardRecord[]> {
  const ids = await readIndex(KEY_CARDS);
  const cards = await Promise.all(ids.map((id) => getCard(id)));
  return cards.filter((c): c is CardRecord => c !== null).reverse();
}

export async function getCard(hash: string): Promise<CardRecord | null> {
  return normalizeCard(await readJson<CardRecord>(`card.${hash}`));
}

export function cardToken(card: CardRecord): Uint8Array {
  return base64ToBytes(card.tokenB64);
}

/** Stores a scanned card. Call only after POST /subscribe returned 200. */
export async function saveCard(token: Uint8Array): Promise<CardRecord> {
  const hash = etHash(token);
  const existing = await getCard(hash);
  if (existing) {
    return existing;
  }
  const record: CardRecord = {
    etHash: hash,
    tokenB64: bytesToBase64(token),
    scannedAt: new Date().toISOString(),
    notifiedAt: null,
    notifiedStis: [],
    lastPushed: null,
  };
  await writeJson(`card.${hash}`, record);
  const ids = await readIndex(KEY_CARDS);
  if (!ids.includes(hash)) {
    ids.push(hash);
    await writeIndex(KEY_CARDS, ids);
  }
  return record;
}

export async function updateCard(
  hash: string,
  patch: Partial<Omit<CardRecord, "etHash" | "tokenB64">>,
): Promise<CardRecord | null> {
  const card = await getCard(hash);
  if (!card) {
    return null;
  }
  const next = { ...card, ...patch };
  await writeJson(`card.${hash}`, next);
  return next;
}

export async function listAlerts(): Promise<AlertRecord[]> {
  const ids = await readIndex(KEY_ALERTS);
  const alerts = await Promise.all(ids.map((id) => readJson<AlertRecord>(`alert.${id}`)));
  return alerts.filter((a): a is AlertRecord => a !== null).reverse();
}

export async function saveAlert(
  alert: Omit<AlertRecord, "id" | "receivedAt" | "acknowledgedAt">,
): Promise<AlertRecord> {
  const record: AlertRecord = {
    ...alert,
    id: randomUuid(),
    receivedAt: new Date().toISOString(),
    acknowledgedAt: null,
  };
  await writeJson(`alert.${record.id}`, record);
  const ids = await readIndex(KEY_ALERTS);
  ids.push(record.id);
  await writeIndex(KEY_ALERTS, ids);
  return record;
}

export async function acknowledgeAlert(id: string): Promise<AlertRecord | null> {
  const alert = await readJson<AlertRecord>(`alert.${id}`);
  if (!alert) {
    return null;
  }
  const next = { ...alert, acknowledgedAt: new Date().toISOString() };
  await writeJson(`alert.${id}`, next);
  return next;
}

export async function listSent(): Promise<SentRecord[]> {
  const ids = await readIndex(KEY_SENT);
  const sent = await Promise.all(ids.map((id) => readJson<SentRecord>(`sent.${id}`)));
  return sent.filter((r): r is SentRecord => r !== null).reverse();
}

export async function saveSent(sti: string): Promise<SentRecord> {
  const record: SentRecord = { id: randomUuid(), sentAt: new Date().toISOString(), sti };
  await writeJson(`sent.${record.id}`, record);
  const ids = await readIndex(KEY_SENT);
  ids.push(record.id);
  await writeIndex(KEY_SENT, ids);
  return record;
}

/** Local wipe for development. Does not call DELETE /subscribe. */
export async function clearLocalData(): Promise<void> {
  const cards = await readIndex(KEY_CARDS);
  const alerts = await readIndex(KEY_ALERTS);
  const sent = await readIndex(KEY_SENT);
  await Promise.all([
    ...cards.map((id) => SecureStore.deleteItemAsync(`card.${id}`, OPTIONS)),
    ...alerts.map((id) => SecureStore.deleteItemAsync(`alert.${id}`, OPTIONS)),
    ...sent.map((id) => SecureStore.deleteItemAsync(`sent.${id}`, OPTIONS)),
  ]);
  await SecureStore.deleteItemAsync(KEY_CARDS, OPTIONS);
  await SecureStore.deleteItemAsync(KEY_ALERTS, OPTIONS);
  await SecureStore.deleteItemAsync(KEY_SENT, OPTIONS);
  await SecureStore.deleteItemAsync(KEY_DEVICE, OPTIONS);
  await SecureStore.deleteItemAsync(KEY_ICON, OPTIONS);
  await SecureStore.deleteItemAsync(KEY_FINDER_DISMISSED, OPTIONS);
}

export type AppIconChoice = "playful" | "discreet";
const KEY_ICON = "settings.icon";

/** The icon the user picked. The OS holds the real state; this is what Expo Go (no icon switching) remembers. */
export async function loadIconChoice(): Promise<AppIconChoice> {
  const raw = await SecureStore.getItemAsync(KEY_ICON, OPTIONS);
  return raw === "discreet" ? "discreet" : "playful";
}

export async function saveIconChoice(choice: AppIconChoice): Promise<void> {
  await SecureStore.setItemAsync(KEY_ICON, choice, OPTIONS);
}

const KEY_FINDER_DISMISSED = "settings.finderDismissedAt";

/** Time of the newest alert when the History "Need a test?" block was dismissed; a newer alert brings it back. */
export async function loadFinderDismissedAt(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_FINDER_DISMISSED, OPTIONS);
}

export async function saveFinderDismissedAt(receivedAt: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_FINDER_DISMISSED, receivedAt, OPTIONS);
}
