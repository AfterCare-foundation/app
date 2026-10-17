// A day / month / year wheel in the app's own font, with a Done button. The native iOS wheel
// cannot use a custom font, so this one is drawn here: three snapping scroll columns. It lists
// only dates that are allowed (up to today, and from an optional minimum), so a future date can
// never be shown. The date is only taken once Done is pressed, so opening the wheel never picks
// one by itself.

import { useEffect, useRef, useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, View } from "react-native";

import { startOfLocalDay } from "../testRules";
import { colors, fonts } from "../theme";
import { GhostButton } from "./Buttons";
import { Panel } from "./Panel";

const ITEM_H = 40;
const ROWS = 3;
const PAD = ((ROWS - 1) / 2) * ITEM_H;
const YEARS_BACK = 10;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const clamp = (n: number, lo: number, hi: number): number => Math.min(Math.max(n, lo), hi);
const daysIn = (y: number, m: number): number => new Date(y, m + 1, 0).getDate();

interface Ymd {
  y: number;
  m: number;
  d: number;
}

function Column({
  items,
  index,
  onChange,
  flex,
  label,
}: {
  items: string[];
  index: number;
  onChange: (index: number) => void;
  flex: number;
  label: string;
}) {
  const ref = useRef<ScrollView>(null);
  const [live, setLive] = useState(index);

  // Follows the index when it changes from outside (another column forced a clamp).
  useEffect(() => {
    setLive(index);
    const go = () => ref.current?.scrollTo({ y: index * ITEM_H, animated: false });
    go();
    const t = setTimeout(go, 60); // once the list has been laid out
    return () => clearTimeout(t);
  }, [index, items.length]);

  const indexAt = (e: NativeSyntheticEvent<NativeScrollEvent>): number =>
    clamp(Math.round(e.nativeEvent.contentOffset.y / ITEM_H), 0, items.length - 1);
  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = indexAt(e);
    setLive(i);
    if (i !== index) {
      onChange(i);
    }
  };

  return (
    <ScrollView
      ref={ref}
      style={{ flex }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_H}
      decelerationRate="fast"
      contentContainerStyle={{ paddingVertical: PAD }}
      scrollEventThrottle={16}
      onScroll={(e) => setLive(indexAt(e))}
      onMomentumScrollEnd={settle}
      onScrollEndDrag={settle}
      accessibilityLabel={label}
      accessibilityRole="adjustable"
    >
      {items.map((text, i) => (
        <View key={text} style={styles.item}>
          <Text style={[styles.itemText, i === live && styles.itemTextLive]}>{text}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

export function DateWheel({
  initial,
  minimum,
  onDone,
  onChange,
}: {
  /** The date the wheels start on (ms). */
  initial: number;
  /** The earliest date that can be picked. Default: ten years back. */
  minimum?: Date;
  /** With a Done button: the date is only taken when it is pressed. */
  onDone?: (ms: number) => void;
  /** Without Done: called with the date whenever the wheels settle (and once at the start). */
  onChange?: (ms: number) => void;
}) {
  const max = new Date(startOfLocalDay(Date.now()));
  const min = minimum ? new Date(startOfLocalDay(minimum.getTime())) : new Date(max.getFullYear() - YEARS_BACK, 0, 1);
  const minV: Ymd = { y: min.getFullYear(), m: min.getMonth(), d: min.getDate() };
  const maxV: Ymd = { y: max.getFullYear(), m: max.getMonth(), d: max.getDate() };

  const monthRange = (y: number): [number, number] => [y === minV.y ? minV.m : 0, y === maxV.y ? maxV.m : 11];
  const dayRange = (y: number, m: number): [number, number] => [
    y === minV.y && m === minV.m ? minV.d : 1,
    y === maxV.y && m === maxV.m ? maxV.d : daysIn(y, m),
  ];
  // Brings any combination inside the allowed range.
  const fix = (y: number, m: number, d: number): Ymd => {
    const year = clamp(y, minV.y, maxV.y);
    const [m0, m1] = monthRange(year);
    const month = clamp(m, m0, m1);
    const [d0, d1] = dayRange(year, month);
    return { y: year, m: month, d: clamp(d, d0, d1) };
  };

  const start = new Date(clamp(initial, min.getTime(), max.getTime()));
  const [value, setValue] = useState<Ymd>(fix(start.getFullYear(), start.getMonth(), start.getDate()));

  const valueMs = new Date(value.y, value.m, value.d).getTime();
  useEffect(() => {
    onChange?.(valueMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueMs]);

  const years: number[] = [];
  for (let y = minV.y; y <= maxV.y; y += 1) {
    years.push(y);
  }
  const [m0, m1] = monthRange(value.y);
  const [d0, d1] = dayRange(value.y, value.m);
  const months = MONTHS.slice(m0, m1 + 1);
  const days: string[] = [];
  for (let d = d0; d <= d1; d += 1) {
    days.push(String(d));
  }

  return (
    <Panel style={styles.panel}>
      <View style={styles.wheel}>
        <View pointerEvents="none" style={styles.band} />
        <Column
          label="Day"
          flex={1}
          items={days}
          index={value.d - d0}
          onChange={(i) => setValue(fix(value.y, value.m, d0 + i))}
        />
        <Column
          label="Month"
          flex={2}
          items={months}
          index={value.m - m0}
          onChange={(i) => setValue(fix(value.y, m0 + i, value.d))}
        />
        <Column
          label="Year"
          flex={1.3}
          items={years.map(String)}
          index={value.y - minV.y}
          onChange={(i) => setValue(fix(minV.y + i, value.m, value.d))}
        />
      </View>
      {onDone ? <GhostButton label="Done" onPress={() => onDone(valueMs)} /> : null}
    </Panel>
  );
}

const styles = StyleSheet.create({
  panel: { padding: 10, gap: 10 },
  wheel: { height: ITEM_H * ROWS, flexDirection: "row" },
  // The row in the middle that the wheels settle on.
  band: {
    position: "absolute",
    left: 0,
    right: 0,
    top: PAD,
    height: ITEM_H,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.violetLight,
    backgroundColor: "rgba(125, 71, 224, 0.18)",
  },
  item: { height: ITEM_H, alignItems: "center", justifyContent: "center" },
  itemText: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 17 },
  itemTextLive: { color: colors.text, fontFamily: fonts.semibold, fontSize: 18 },
});
