// To-do: what still needs doing after an alert, one row per infection. Tapping a row opens the
// test form; the circle on the right is only the look of a checklist. When a test has been entered
// the row is ticked, then slides away and the rows below move up. Nothing is dated by the contact:
// rows say when the last alert arrived.

import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { Header } from "../components/Chrome";
import { formatDate, stiTitle } from "../components/ExposureCard";
import { Panel } from "../components/Panel";
import { UNSPECIFIED_STI } from "../sti";
import type { TestRecord } from "../storage/secureStore";
import { isRetest, untested, type TodoGroup } from "../todo";
import { colors, type } from "../theme";

/** A row just completed: ticked, then removed from where it was. */
export interface Celebration {
  group: TodoGroup;
  index: number;
}

const ROW_GAP = 10;

function Row({
  group,
  last,
  leaving,
  onPress,
  onGone,
}: {
  group: TodoGroup;
  last: string | null;
  leaving: boolean;
  onPress: () => void;
  onGone: () => void;
}) {
  const arrived = group.alerts.reduce((a, x) => (x.receivedAt > a ? x.receivedAt : a), "");
  const tick = useRef(new Animated.Value(0)).current; // 0 empty circle, 1 ticked
  const collapse = useRef(new Animated.Value(1)).current; // 1 full row, 0 gone
  const [height, setHeight] = useState<number | null>(null);
  const gone = useRef(onGone);
  gone.current = onGone;

  useEffect(() => {
    if (!leaving) {
      return;
    }
    // Let the eye find the row first, tick it, hold a moment, then pull it away faster and faster.
    Animated.sequence([
      Animated.delay(300),
      Animated.timing(tick, { toValue: 1, duration: 260, easing: Easing.out(Easing.back(2)), useNativeDriver: false }),
      Animated.delay(420),
      Animated.timing(collapse, { toValue: 0, duration: 420, easing: Easing.in(Easing.cubic), useNativeDriver: false }),
    ]).start(({ finished }) => {
      if (finished) {
        gone.current();
      }
    });
  }, [leaving, tick, collapse]);

  const wrapper =
    leaving && height !== null
      ? {
          height: collapse.interpolate({ inputRange: [0, 1], outputRange: [0, height] }),
          marginBottom: collapse.interpolate({ inputRange: [0, 1], outputRange: [0, ROW_GAP] }),
          opacity: collapse.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0.8, 1] }),
          transform: [{ translateX: collapse.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }],
          overflow: "hidden" as const,
        }
      : { marginBottom: ROW_GAP };

  return (
    <Animated.View style={wrapper} onLayout={(e) => (height === null ? setHeight(e.nativeEvent.layout.height) : undefined)}>
      <Pressable
        onPress={onPress}
        disabled={leaving}
        accessibilityRole="button"
        accessibilityLabel={`${stiTitle(group.sti)}, not tested yet. Alert received ${formatDate(arrived)}`}
      >
        <Panel style={styles.row}>
          <View style={styles.text}>
            <Text style={styles.sti}>{stiTitle(group.sti)}</Text>
            <Text style={styles.status}>{untested(group).length > 0 ? (isRetest(group) ? "Retest: not tested yet" : "Not tested yet") : "Still needs a test"}</Text>
            <Text style={styles.meta}>
              {isRetest(group) ? "Reminder" : "Last alert"} received {formatDate(arrived)}
            </Text>
            {last ? <Text style={styles.meta}>Last test: {formatDate(last)}</Text> : null}
          </View>
          <Animated.View
            style={[
              styles.box,
              { backgroundColor: tick.interpolate({ inputRange: [0, 1], outputRange: ["rgba(45,212,191,0)", colors.teal] }) },
              { borderColor: tick.interpolate({ inputRange: [0, 1], outputRange: [colors.violetLight, colors.teal] }) },
            ]}
          >
            <Animated.View style={{ opacity: tick, transform: [{ scale: tick.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }] }}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.bg} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <Path d="m5 12.5 4.5 4.5L19 7.5" />
              </Svg>
            </Animated.View>
          </Animated.View>
        </Panel>
      </Pressable>
    </Animated.View>
  );
}

export function TodoScreen({
  groups,
  tests,
  celebrate,
  onCelebrated,
  onTested,
  onRemove,
}: {
  groups: TodoGroup[];
  /** The tests stored on this phone: the newest one for an infection is shown on its row. */
  tests: TestRecord[];
  /** A row to tick and remove: it is no longer in `groups`, so it is put back where it was. */
  celebrate: Celebration | null;
  onCelebrated: () => void;
  onTested: (group: TodoGroup) => void;
  onRemove: (group: TodoGroup) => void;
}) {
  const confirmRemove = (group: TodoGroup) => {
    Alert.alert(
      "Remove from list?",
      "You will not get reminders to test for it. Do this only if you do not need a test.",
      [
        { text: "Keep it", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => onRemove(group) },
      ],
    );
  };

  // A row that cannot take a test (unknown type) can only be removed.
  const act = (group: TodoGroup) =>
    group.sti !== UNSPECIFIED_STI && untested(group).length > 0 ? onTested(group) : confirmRemove(group);

  const lastTest = (sti: string): string | null =>
    tests.filter((t) => t.sti === sti).reduce<string | null>((a, t) => (a === null || t.testedAt > a ? t.testedAt : a), null);

  const shown = [...groups];
  if (celebrate && !shown.some((g) => g.sti === celebrate.group.sti)) {
    shown.splice(Math.min(celebrate.index, shown.length), 0, celebrate.group);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header />
      <Text style={styles.title}>To-do</Text>
      {shown.length === 0 ? (
        <Panel style={styles.empty}>
          <Text style={styles.emptyText}>Nothing to do. Alerts that need a test will wait here until you add a result.</Text>
        </Panel>
      ) : (
        <View>
          {shown.map((group) => (
            <Row
              key={group.sti}
              group={group}
              last={lastTest(group.sti)}
              leaving={celebrate?.group.sti === group.sti}
              onPress={() => act(group)}
              onGone={onCelebrated}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingBottom: 28, gap: 16 },
  title: { ...type.sectionTitle },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  text: { flex: 1, gap: 2 },
  sti: { ...type.cardTitle },
  status: { ...type.cardDesc, color: colors.text },
  meta: { ...type.cardDesc },
  box: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  empty: { padding: 20, alignItems: "center" },
  emptyText: { ...type.slideDesc, color: colors.textSoft, textAlign: "center" },
});
