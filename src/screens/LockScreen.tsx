// Shown instead of the app while it is locked, and as a plain cover while the app is not in the
// foreground (so the app switcher never shows alerts or history). Nothing private is drawn here.

import { StyleSheet, Text, View } from "react-native";

import { GradientButton } from "../components/Buttons";
import { Header } from "../components/Chrome";
import { colors, fonts } from "../theme";

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  return (
    <View style={styles.fill}>
      <Header />
      <View style={styles.center}>
        <Text style={styles.title}>AfterCare is locked</Text>
        <Text style={styles.body}>Unlock with Face ID or your phone code to see your alerts and history.</Text>
        <GradientButton label="Unlock" onPress={onUnlock} style={styles.button} />
      </View>
    </View>
  );
}

/** Only the header: used while the app is inactive or in the background. */
export function PrivacyCover() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.cover]} pointerEvents="none">
      <Header />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 96,
    gap: 12,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 20,
    textAlign: "center",
  },
  body: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  button: {
    alignSelf: "stretch",
    marginTop: 12,
  },
  cover: {
    backgroundColor: colors.bg,
  },
});
