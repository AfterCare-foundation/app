// App lock: the app opens only after Face ID, Touch ID or the phone code, so someone who picks up
// the phone cannot read the alerts. Nothing is stored by AfterCare and there is no app
// password: the operating system does the check (tech spec, "Authentication").
//
// `locked` is true until the check passes. It is asked once when the app opens and once whenever
// the app comes back to the foreground after more than the grace period (see lockPolicy.ts),
// whatever screen was open. The prompt appears by itself; tapping the locked screen asks again.
// It locks only when there is something to protect (a card, an alert or a sent notification), so a
// fresh install opens straight in. If the phone has no code or biometrics there is nothing to check
// against, so nothing is locked and `noPasscode` is true so the caller can warn.

import Constants, { ExecutionEnvironment } from "expo-constants";
import * as LocalAuthentication from "expo-local-authentication";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { shouldLock } from "./lockPolicy";

/**
 * Expo Go is only for development: its prompt would read "for Expo Go" and it is not the real
 * app, so the lock is off there. Installed builds (TestFlight, store) always have it.
 */
const IN_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

async function lockAvailable(): Promise<boolean> {
  if (IN_EXPO_GO) {
    return false;
  }
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    return level !== LocalAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
}

let inactiveIgnored = false;

/** While true, a plain "inactive" state (a system alert) does not show the privacy cover. */
export function ignoreInactive(on: boolean): void {
  inactiveIgnored = on;
}

export function useAppLock(hasData: boolean | null): {
  /** The app must stay hidden behind the lock screen. */
  locked: boolean;
  /** True while the app is not in the foreground: the screen should show a cover for the app switcher. */
  covered: boolean;
  /** The phone has no code or biometrics, so the app cannot lock. Never true in Expo Go. */
  noPasscode: boolean;
  unlock: () => Promise<void>;
} {
  const [locked, setLocked] = useState(true);
  const [ready, setReady] = useState(false);
  const [covered, setCovered] = useState(false);
  const [noPasscode, setNoPasscode] = useState(false);
  const [activations, setActivations] = useState(0);
  const leftAt = useRef<number | null>(null);
  const asking = useRef(false);
  const hasDataRef = useRef(false);
  hasDataRef.current = hasData === true;

  const unlock = useCallback(async () => {
    if (asking.current) {
      return;
    }
    asking.current = true;
    try {
      if (!(await lockAvailable())) {
        // No code on the phone: there is nothing to ask.
        setNoPasscode(!IN_EXPO_GO);
        setLocked(false);
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock AfterCare",
        cancelLabel: "Cancel",
      });
      if (result.success) {
        setLocked(false);
      }
    } catch {
      // Stay locked; tapping the screen asks again.
    } finally {
      asking.current = false;
    }
  }, []);

  // First launch: decided once, as soon as it is known whether there is anything to protect.
  const decided = useRef(false);
  useEffect(() => {
    if (hasData === null || decided.current) {
      return;
    }
    decided.current = true;
    void lockAvailable().then((available) => {
      if (!available) {
        setNoPasscode(!IN_EXPO_GO);
        setLocked(false);
      } else if (!hasData) {
        setLocked(false);
      }
      setReady(true);
    });
  }, [hasData]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      setCovered(next === "background" || (next === "inactive" && !inactiveIgnored));
      if (next === "background") {
        leftAt.current = Date.now();
      } else if (next === "active") {
        const away = leftAt.current;
        leftAt.current = null;
        if (!IN_EXPO_GO && hasDataRef.current && shouldLock(away, Date.now())) {
          setLocked(true);
        }
        setActivations((n) => n + 1);
      }
    });
    return () => sub.remove();
  }, []);

  // Locked: ask, at launch and each time the app comes back to the foreground.
  useEffect(() => {
    if (ready && locked) {
      void unlock();
    }
  }, [ready, locked, activations, unlock]);

  return { locked, covered, noPasscode, unlock };
}
