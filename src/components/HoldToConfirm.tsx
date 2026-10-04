// "Press and hold to confirm": a ring fills around the button while the finger
// stays down. Lifting early cancels. Used for the one action that cannot be
// undone, so a stray tap cannot trigger it.

import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Rect } from "react-native-svg";

import { colors, fonts, gradients, radius } from "../theme";

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const RING = 3;
const CORNER = radius.button + 4;

interface HoldToConfirmProps {
  label?: string;
  hint?: string;
  onConfirm: () => void;
  /** While true the button shows a spinner; when it turns false after a confirm, it can be used again. */
  busy?: boolean;
  disabled?: boolean;
  /** How long the finger must stay down. */
  holdMs?: number;
}

export function HoldToConfirm({
  label = "Confirm",
  hint = "Press and hold",
  onConfirm,
  busy = false,
  disabled = false,
  holdMs = 1000,
}: HoldToConfirmProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [holding, setHolding] = useState(false);
  const confirmed = useRef(false);
  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;

  const cancel = () => {
    progress.stopAnimation();
    Animated.timing(progress, { toValue: 0, duration: 160, useNativeDriver: false }).start();
    setHolding(false);
  };

  const fire = () => {
    if (confirmed.current) {
      return;
    }
    confirmed.current = true;
    setHolding(false);
    onConfirmRef.current();
  };

  // After a failed action the parent clears `busy`: allow another try.
  useEffect(() => {
    if (!busy && confirmed.current) {
      confirmed.current = false;
      progress.setValue(0);
    }
  }, [busy, progress]);

  const start = () => {
    if (disabled || busy || confirmed.current) {
      return;
    }
    setHolding(true);
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: holdMs, useNativeDriver: false }).start(({ finished }) => {
      if (finished) {
        fire();
      }
    });
  };

  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  const w = Math.max(0, size.w - RING);
  const h = Math.max(0, size.h - RING);
  const perimeter = 2 * (w + h) - (8 - 2 * Math.PI) * Math.min(CORNER, w / 2, h / 2);
  const dashOffset = progress.interpolate({ inputRange: [0, 1], outputRange: [perimeter, 0] });

  return (
    <View style={[styles.wrap, disabled && styles.disabled]}>
      <Pressable
        onPressIn={start}
        onPressOut={() => {
          if (!confirmed.current) {
            cancel();
          }
        }}
        disabled={disabled || busy}
        onLayout={onLayout}
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${hint}.`}
        accessibilityState={{ disabled: disabled || busy, busy }}
        accessibilityActions={[{ name: "activate" }]}
        onAccessibilityAction={() => {
          if (!disabled && !busy) {
            fire();
          }
        }}
        style={styles.pressable}
      >
        <LinearGradient
          colors={[gradients.primary[0], gradients.primary[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, holding && styles.gradientHolding]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.hint}>{holding ? "Keep holding…" : hint}</Text>
            </>
          )}
        </LinearGradient>
        {size.w > 0 ? (
          <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill} pointerEvents="none">
            <AnimatedRect
              x={RING / 2}
              y={RING / 2}
              width={w}
              height={h}
              rx={CORNER}
              ry={CORNER}
              fill="none"
              stroke="#fff"
              strokeWidth={RING}
              strokeLinecap="round"
              strokeDasharray={`${perimeter} ${perimeter}`}
              strokeDashoffset={dashOffset as unknown as number}
            />
          </Svg>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: CORNER },
  disabled: { opacity: 0.5 },
  pressable: {
    borderRadius: CORNER,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.13)",
    shadowColor: "#6d28d9",
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 7 },
  },
  gradient: {
    borderRadius: CORNER - 1,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 64,
    gap: 2,
  },
  gradientHolding: { opacity: 0.92 },
  label: { color: "#fff", fontFamily: fonts.semibold, fontSize: 17 },
  hint: { color: "rgba(255, 255, 255, 0.8)", fontFamily: fonts.regular, fontSize: 12.5 },
});
