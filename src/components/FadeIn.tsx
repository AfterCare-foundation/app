// A short fade-in for what a tab shows, so switching tabs is not a hard cut. Give it a `key` that
// changes with the tab: each new key starts the fade again. Shorter than a slide on purpose, since
// tabs are peers and iOS does not slide between them.

import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, StyleSheet } from "react-native";

export function FadeIn({ children }: { children: ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [opacity]);
  return <Animated.View style={[styles.fill, { opacity }]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
