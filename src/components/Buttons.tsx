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

/** `.why-btn` shape (10px corners, hairline border, glow) in the brand gradient, violet to teal. */
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
  const sent = stops === gradients.sent;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.pressable,
        sent ? styles.glowSent : styles.glowNotify,
        pressed && styles.pressed,
        // A finished "Sent" button stays fully lit, like the site's.
        inactive && !sent && styles.disabled,
        style,
      ]}
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
      colors={sent ? gradients.sent : gradients.primary}
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

interface ActionTileProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  onPress: () => void;
  /** The filled brand-gradient tile; the other one is outlined. */
  highlighted?: boolean;
}

/** Square home action: icon on top, title and one line below. */
export function ActionTile({ title, subtitle, icon, onPress, highlighted = false }: ActionTileProps) {
  const content = (
    <>
      <View style={[styles.tileIcon, highlighted && styles.tileIconOnGradient]}>{icon}</View>
      <View style={styles.tileText}>
        <Text style={styles.tileTitle}>{title}</Text>
        <Text style={[styles.tileSubtitle, highlighted && styles.tileSubtitleOnGradient]}>{subtitle}</Text>
      </View>
    </>
  );
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      style={({ pressed }) => [styles.tileWrap, highlighted && styles.glowNotify, pressed && styles.pressed]}
    >
      {highlighted ? (
        <LinearGradient
          colors={[gradients.primary[0], gradients.primary[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.tile, styles.tileFilled]}
        >
          {content}
        </LinearGradient>
      ) : (
        <View style={[styles.tile, styles.tileOutlined]}>{content}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tileWrap: { flex: 1, aspectRatio: 1, borderRadius: radius.panel },
  tile: {
    flex: 1,
    borderRadius: radius.panel,
    padding: 16,
    justifyContent: "space-between",
  },
  tileFilled: { borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.18)" },
  tileOutlined: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(45, 212, 191, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(45, 212, 191, 0.4)",
  },
  tileIconOnGradient: {
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  tileText: { gap: 2 },
  tileTitle: { color: "#fff", fontFamily: fonts.semibold, fontSize: 20, letterSpacing: -0.4 },
  tileSubtitle: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 17 },
  tileSubtitleOnGradient: { color: "rgba(255, 255, 255, 0.85)" },
  pressable: {
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.13)",
  },
  glowNotify: {
    shadowColor: "#6d28d9",
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 7 },
  },
  glowSent: {
    shadowColor: "#138a72",
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 7 },
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
  gradient: {
    borderRadius: radius.button - 1,
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
    letterSpacing: 0.12,
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
