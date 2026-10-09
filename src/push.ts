// The real push connection: permission, the APNs token, and reading what arrives. Only iOS
// builds do this for now. Expo Go and Android keep the stub token and the dev inbox.

import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { pushItemFrom, type PushItem } from "./pushPayload";

export const pushSupported =
  Platform.OS === "ios" && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

/** The app shows alerts itself, so a push that arrives while it is open stays silent. */
export function installNotificationHandler(): void {
  if (!pushSupported) {
    return;
  }
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/**
 * The APNs token for this phone, or null when push is not available. With `ask` the iOS
 * permission prompt may appear; without it a phone that has not allowed notifications yet
 * returns null, so launching the app never prompts.
 */
export async function requestPushToken(ask: boolean): Promise<string | null> {
  if (!pushSupported) {
    return null;
  }
  try {
    let permission = await Notifications.getPermissionsAsync();
    if (permission.status !== "granted" && ask && permission.canAskAgain) {
      permission = await Notifications.requestPermissionsAsync();
    }
    if (permission.status !== "granted") {
      return null;
    }
    const token = await Notifications.getDevicePushTokenAsync();
    return typeof token.data === "string" ? token.data : null;
  } catch (error) {
    if (__DEV__) {
      console.warn("[push] could not get a push token:", error);
    }
    return null;
  }
}

/** Calls back with the new token whenever the OS replaces it. */
export function onPushTokenChange(callback: (token: string) => void): () => void {
  if (!pushSupported) {
    return () => {};
  }
  const subscription = Notifications.addPushTokenListener((token) => {
    if (typeof token.data === "string") {
      callback(token.data);
    }
  });
  return () => subscription.remove();
}

function itemFrom(notification: Notifications.Notification): PushItem | null {
  const { content, trigger } = notification.request;
  const payload = trigger && "payload" in trigger ? trigger.payload : undefined;
  return pushItemFrom([content.data, payload], content.body ?? "");
}

/** Pushes still sitting in the notification list, read and then cleared. */
export async function takeDeliveredPushes(): Promise<PushItem[]> {
  if (!pushSupported) {
    return [];
  }
  const items: PushItem[] = [];
  try {
    for (const notification of await Notifications.getPresentedNotificationsAsync()) {
      const item = itemFrom(notification);
      if (item) {
        items.push(item);
        await Notifications.dismissNotificationAsync(notification.request.identifier);
      }
    }
  } catch {
    // Not fatal: the next launch looks again.
  }
  return items;
}

/**
 * Pushes that arrive while the app is open, and the one the user tapped to open it.
 * Returns the function that stops listening.
 */
export function onPushArrived(callback: (item: PushItem) => void): () => void {
  if (!pushSupported) {
    return () => {};
  }
  const received = Notifications.addNotificationReceivedListener((notification) => {
    const item = itemFrom(notification);
    if (item) {
      callback(item);
    }
  });
  const tapped = Notifications.addNotificationResponseReceivedListener((response) => {
    const item = itemFrom(response.notification);
    if (item) {
      callback(item);
    }
  });
  void Notifications.getLastNotificationResponseAsync().then((response) => {
    const item = response ? itemFrom(response.notification) : null;
    if (item) {
      callback(item);
    }
  });
  return () => {
    received.remove();
    tapped.remove();
  };
}
