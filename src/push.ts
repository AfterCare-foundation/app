// The real push connection: permission, the APNs token, and reading what arrives. Only iOS
// builds do this for now. Expo Go and Android keep the stub token and the dev inbox.

import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

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

/**
 * Calls back when a push arrives while the app is open, or the user taps one. The push only
 * wakes the app: the messages themselves come from the server's mailbox.
 */
export function onPushWake(callback: () => void): () => void {
  if (!pushSupported) {
    return () => {};
  }
  const received = Notifications.addNotificationReceivedListener(callback);
  const tapped = Notifications.addNotificationResponseReceivedListener(callback);
  return () => {
    received.remove();
    tapped.remove();
  };
}

/** Removes delivered AfterCare notifications from the list once their messages are saved. */
export async function clearDeliveredPushes(): Promise<void> {
  if (!pushSupported) {
    return;
  }
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch {
    // Not fatal.
  }
}
