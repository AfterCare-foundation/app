// Switching the app icon. The native module is not part of Expo Go, so it is
// loaded lazily and everything degrades to "not available" without it.

import Constants, { ExecutionEnvironment } from "expo-constants";

import { loadIconChoice, saveIconChoice, type AppIconChoice } from "./storage/secureStore";

/** Name given to the discreet icon in app.json; the default (playful) icon is `null`. */
const DISCREET_NAME = "Discreet";

interface IconModule {
  supportsAlternateIcons: boolean;
  getAppIconName: () => string | null;
  setAlternateAppIcon: (name: string | null) => Promise<string | null>;
}

let cached: IconModule | null | undefined;

function native(): IconModule | null {
  if (cached === undefined) {
    // Expo Go lacks the native module, and a failed require is logged as an error even when caught.
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
      cached = null;
      return cached;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      cached = require("expo-alternate-app-icons") as IconModule;
    } catch {
      cached = null;
    }
  }
  return cached;
}

/** True in an installed build; false in Expo Go and on devices that cannot switch. */
export function iconSwitchingAvailable(): boolean {
  return native()?.supportsAlternateIcons === true;
}

export async function currentIconChoice(): Promise<AppIconChoice> {
  const module = native();
  if (module?.supportsAlternateIcons) {
    return module.getAppIconName() === DISCREET_NAME ? "discreet" : "playful";
  }
  return loadIconChoice();
}

export async function chooseIcon(choice: AppIconChoice): Promise<void> {
  const module = native();
  if (module?.supportsAlternateIcons) {
    await module.setAlternateAppIcon(choice === "discreet" ? DISCREET_NAME : null);
  }
  await saveIconChoice(choice);
}
