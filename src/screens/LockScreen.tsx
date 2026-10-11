// Shown instead of the app while it is locked, and as a plain cover while the app is not in the
// foreground (so the app switcher never shows alerts or history). Nothing private is drawn here:
// only the logo, like a loading screen. Face ID starts by itself; if it was cancelled, tapping the
// screen asks again.

import { Image, Pressable, StyleSheet, View } from "react-native";

import { cachedIconChoice } from "../appIcon";

import { Logo } from "../components/Logo";
import { colors } from "../theme";

const LOGO_SIZE = 150;

/** The big mark: the app logo, or the plain "A" icon when the discreet icon is chosen. */
function Mark() {
  if (cachedIconChoice() === "discreet") {
    return (
      <Image
        source={require("../../assets/icon-discreet.png")}
        style={styles.discreet}
        accessibilityLabel="AfterCare"
      />
    );
  }
  return <Logo size={LOGO_SIZE} />;
}

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  return (
    <Pressable
      style={styles.center}
      onPress={onUnlock}
      accessibilityRole="button"
      accessibilityLabel="Unlock AfterCare"
    >
      <Mark />
    </Pressable>
  );
}

/** Used while the app is inactive or in the background. */
export function PrivacyCover() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.center, styles.cover]} pointerEvents="none">
      <Mark />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  discreet: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE * 0.22,
  },
  cover: {
    backgroundColor: colors.bg,
  },
});
