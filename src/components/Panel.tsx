// `.trust li` from the site: 18px radius, a faint white border over a 3%
// white fill, a soft drop shadow, and an optional tinted glow in one corner.

import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { colors, panelShadow, radius } from "../theme";

type Tint = "blue" | "teal" | "none";

const TINTS: Record<Exclude<Tint, "none">, readonly [string, string]> = {
  // rgba(96, 165, 250, .3) top left and rgba(45, 212, 191, .26) top right
  blue: ["rgba(96, 165, 250, 0.26)", "rgba(96, 165, 250, 0)"],
  teal: ["rgba(45, 212, 191, 0.22)", "rgba(45, 212, 191, 0)"],
};

export function Panel({
  children,
  tint = "none",
  style,
}: {
  children: ReactNode;
  tint?: Tint;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.panel, panelShadow, style]}>
      {tint !== "none" ? (
        <LinearGradient
          colors={[TINTS[tint][0], TINTS[tint][1]]}
          start={{ x: tint === "blue" ? 0.1 : 0.9, y: 0 }}
          end={{ x: 0.5, y: 0.75 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.panel,
    overflow: "hidden",
  },
});
