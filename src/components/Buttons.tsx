import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { colors, fonts, gradients, radius } from "../theme";
import { ArrowRightIcon, CheckIcon } from "./Icons";

interface GradientButtonProps {
  label: string;
  onPress?: () => void;
  colors?: readonly [string, string];
  disabled?: boolean;
  busy?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
  compact?: boolean;
  accessibilityLabel?: string;
}

/** The mockup's "Learn what to do" button: violet to teal, white label. */
export function GradientButton({
  label,
  onPress,
  colors: stops = gradients.primary,
  disabled = false,
  busy = false,
  icon,
  style,
  compact = false,
  accessibilityLabel,
}: GradientButtonProps) {
  const inactive = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed, inactive && styles.disabled, style]}
    >
      <LinearGradient
        colors={[stops[0], stops[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, compact && styles.gradientCompact]}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <View style={styles.row}>
            {icon}
            <Text style={[styles.label, compact && styles.labelCompact]}>{label}</Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

interface NotifyButtonProps {
  sent: boolean;
  onPress?: () => void;
  busy?: boolean;
  disabled?: boolean;
}

/** The site's "Notify Partners" control; turns green after a send. */
export function NotifyButton({ sent, onPress, busy, disabled }: NotifyButtonProps) {
  return (
    <GradientButton
      compact
      label={sent ? "Sent" : "Notify Partners"}
      colors={sent ? gradients.sent : gradients.notify}
      onPress={onPress}
      busy={busy}
      disabled={disabled}
      icon={sent ? <CheckIcon size={13} /> : <ArrowRightIcon size={13} />}
    />
  );
}

interface GhostButtonProps {
  label: string;
  onPress?: () => void;
  icon?: ReactNode;
  style?: ViewStyle;
}

export function GhostButton({ label, onPress, icon, style }: GhostButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.ghost, pressed && styles.pressed, style]}
    >
      <View style={styles.row}>
        {icon}
        <Text style={styles.ghostLabel}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: radius.button,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.13)",
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.5,
  },
  gradient: {
    paddingVertical: 15,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  gradientCompact: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    minHeight: 36,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    color: "#fff",
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  labelCompact: {
    fontSize: 12.5,
    letterSpacing: 0.1,
  },
  ghost: {
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingVertical: 13,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostLabel: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
});
