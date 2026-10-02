// Screen background, header, and the bottom bar from the mockup.

import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts, gradients, radius } from "../theme";
import { BackIcon, BookIcon, HeartFilledIcon, InfoIcon } from "./Icons";
import { Logo } from "./Logo";
import { Wordmark } from "./Wordmark";

export function Screen({ children }: { children: ReactNode }) {
  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[gradients.glow[0], gradients.glow[1]]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.glow}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

export function Header() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
      <Logo size={38} />
      <Wordmark fontSize={30} />
    </View>
  );
}

export function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.subHeader, { paddingTop: insets.top + 10 }]}>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12} style={styles.backButton}>
        <BackIcon size={20} color={colors.text} />
      </Pressable>
      <Text style={styles.subTitle}>{title}</Text>
      <View style={styles.backButton} />
    </View>
  );
}

export function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

export type Tab = "home" | "info" | "resources";

export function TabBar({ active, onSelect }: { active: Tab; onSelect: (tab: Tab) => void }) {
  const insets = useSafeAreaInsets();
  const items: Array<{ key: Tab; label: string; icon: (color: string) => ReactNode }> = [
    { key: "home", label: "Home", icon: (c) => <HeartFilledIcon size={22} color={c} /> },
    { key: "info", label: "Info", icon: (c) => <InfoIcon size={22} color={c} /> },
    { key: "resources", label: "Resources", icon: (c) => <BookIcon size={22} color={c} /> },
  ];
  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {items.map((item) => {
        const isActive = item.key === active;
        const color = isActive ? colors.violetLight : colors.textMuted;
        return (
          <Pressable
            key={item.key}
            onPress={() => onSelect(item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            style={styles.tabItem}
          >
            <View style={[styles.tabIcon, isActive && styles.tabIconActive]}>{item.icon(color)}</View>
            <Text style={[styles.tabLabel, { color }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  glow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 360,
  },
  header: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    paddingBottom: 18,
  },
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  subTitle: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 17,
  },
  chip: {
    alignSelf: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.chip,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipText: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 12.5,
  },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: "rgba(10, 10, 16, 0.96)",
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  tabIcon: {
    width: 40,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  tabIconActive: {
    backgroundColor: "rgba(125, 71, 224, 0.18)",
  },
  tabLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
  },
});
