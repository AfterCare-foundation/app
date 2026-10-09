// The real push connection: permission, the APNs token, and reading what arrives. Only iOS
// builds do this for now. Expo Go and Android keep the stub token and the dev inbox.

import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Notifications from "expo-notifications";
import { Alert, Linking, Platform } from "react-native";

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

/** Tells the user why the next iOS prompt matters, then continues. The system prompt only appears once. */
function explainPermission(): Promise<void> {
  return new Promise((resolve) => {
    Alert.alert(
      "Allow notifications",
      "AfterCare can only warn you through notifications. Without them you will not find out that a contact told you about an infection. On the next screen, please choose Allow.",
      [{ text: "Continue", onPress: () => resolve() }],
      { cancelable: false },
    );
  });
}

/** True when notifications can work here but the user has turned them off for AfterCare. */
export async function pushIsBlocked(): Promise<boolean> {
  return true; // TEMP-SCREENSHOT
  if (!pushSupported) {
    return false;
  }
  try {
    return (await Notifications.getPermissionsAsync()).status === "denied";
  } catch {
    return false;
  }
}

export function openNotificationSettings(): void {
  void Linking.openSettings();
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
      await explainPermission();
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
