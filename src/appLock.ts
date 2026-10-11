// App lock: the content opens only after Face ID, Touch ID or the phone code, so someone who
// picks up the phone cannot read the alerts and history. Nothing is stored by AfterCare and there
// is no app password: the operating system does the check (tech spec, "Authentication").
//
// States: "checking" (first launch, deciding), "locked" (asking), "open".
// The app locks at launch, and again after it has been in the background for LOCK_AFTER_MS.
// If the phone has no code or biometrics set up there is nothing to check against, so the app
// stays open and `noPasscode` is true so the caller can warn.

import Constants, { ExecutionEnvironment } from "expo-constants";
import * as LocalAuthentication from "expo-local-authentication";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { shouldLock } from "./lockPolicy";

export type LockState = "checking" | "locked" | "open";

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

export function useAppLock(): {
  state: LockState;
  /** True while the app is not in the foreground: the screen should show a cover for the app switcher. */
  covered: boolean;
  /** The phone has no code or biometrics, so the app cannot lock. Never true in Expo Go. */
  noPasscode: boolean;
  unlock: () => Promise<void>;
} {
  const [state, setState] = useState<LockState>("checking");
  const [covered, setCovered] = useState(false);
  const [noPasscode, setNoPasscode] = useState(false);
  const leftAt = useRef<number | null>(null);
  const asking = useRef(false);

  const unlock = useCallback(async () => {
    if (asking.current) {
      return;
    }
    asking.current = true;
    try {
      if (!(await lockAvailable())) {
        // The code was removed while the app was locked: there is nothing to ask.
        setNoPasscode(!IN_EXPO_GO);
        setState("open");
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock AfterCare",
        cancelLabel: "Cancel",
      });
      if (result.success) {
        setState("open");
      }
    } catch {
      // Stay locked; the button asks again.
    } finally {
      asking.current = false;
    }
  }, []);

  // First launch.
  useEffect(() => {
    let cancelled = false;
    void lockAvailable().then((available) => {
      if (cancelled) {
        return;
      }
      if (!available) {
        setNoPasscode(!IN_EXPO_GO);
        setState("open");
        return;
      }
      setState("locked");
      void unlock();
    });
    return () => {
      cancelled = true;
    };
  }, [unlock]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      setCovered(next !== "active");
      if (next === "background") {
        leftAt.current = Date.now();
      } else if (next === "active") {
        const away = leftAt.current;
        leftAt.current = null;
        if (shouldLock(away, Date.now())) {
          setState((current) => (current === "checking" ? current : "locked"));
          void unlock();
        }
      }
    });
    return () => sub.remove();
  }, [unlock]);

  return { state, covered, noPasscode, unlock };
}
