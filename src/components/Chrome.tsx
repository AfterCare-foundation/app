// Screen background, header, and the bottom bar from the mockup.

import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { colors, fonts, radius } from "../theme";
import { BackIcon, BookIcon, ClockIcon, HeartFilledIcon, InfoIcon } from "./Icons";
import { Logo } from "./Logo";
import { Wordmark } from "./Wordmark";

/**
 * Site `.hero` in dark mode:
 *   radial-gradient(ellipse at 50% 0%, rgba(29, 78, 216, 0.3), transparent 60%)
 * Centred on the top edge. CSS sizes an ellipse to the farthest corner, so its
 * radii are sqrt(2) times half the width and sqrt(2) times the full height;
 * the colour stops end at 60% of that.
 */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <View style={styles.screen}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <RadialGradient id="hero" cx="0.5" cy="0" rx="0.7071" ry="1.4142" fx="0.5" fy="0">
            <Stop offset="0" stopColor="#1d4ed8" stopOpacity={0.3} />
            <Stop offset="0.6" stopColor="#1d4ed8" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#hero)" />
      </Svg>
      {children}
    </View>
  );
}

/**
 * Site `.logo-badge`, sized for a phone. The site sets the title to
 * clamp(2rem, 1.1rem + 3.5vw, 4rem), which is 32px at phone widths, and
 * derives everything else from that size in em:
 *   logo   1.3em square, pulled up 0.28em, top-aligned with the title
 *   gap    8px between logo and title
 */
const TITLE_SIZE = 32;

export function Header() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 14 + TITLE_SIZE * 0.28 }]}>
      <View style={styles.lockup}>
        <View style={{ marginTop: -TITLE_SIZE * 0.28 }}>
          <Logo size={TITLE_SIZE * 1.3} />
        </View>
        <Wordmark fontSize={TITLE_SIZE} />
      </View>
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

export type Tab = "home" | "history" | "about" | "resources";

export function TabBar({ active, onSelect }: { active: Tab; onSelect: (tab: Tab) => void }) {
  const insets = useSafeAreaInsets();
  const items: Array<{ key: Tab; label: string; icon: (color: string) => ReactNode }> = [
    { key: "home", label: "Home", icon: (c) => <HeartFilledIcon size={22} color={c} /> },
    { key: "history", label: "History", icon: (c) => <ClockIcon size={22} color={c} /> },
    { key: "about", label: "About", icon: (c) => <InfoIcon size={22} color={c} /> },
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
  header: {
    alignItems: "center",
    paddingBottom: 18,
  },
  lockup: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
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
