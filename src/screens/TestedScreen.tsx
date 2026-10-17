// "I've tested recently": the date and the result of the user's latest test for the infection an
// alert is about. It is kept on this phone only, shown in History, and decides whether an alert
// still needs a test (see testRules.ts). Any past date is accepted, so a wrong entry can be
// corrected; the alert card then says what the test means.

import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { GradientButton } from "../components/Buttons";
import { SubHeader } from "../components/Chrome";
import { DateWheel } from "../components/DateWheel";
import { formatDate, stiTitle } from "../components/ExposureCard";
import type { TestRecord } from "../storage/secureStore";
import { startOfLocalDay, type TestResult } from "../testRules";
import { colors, fonts, radius, type } from "../theme";

interface TestedScreenProps {
  sti: string;
  /** Tests already stored for this infection. */
  existing: TestRecord[];
  onBack: () => void;
  onSave: (result: TestResult, testedAt: string) => void;
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function TestedScreen({ sti, existing, onBack, onSave }: TestedScreenProps) {
  const [result, setResult] = useState<TestResult | null>(null);
  const [date, setDate] = useState<number | null>(null);

  const stored = result ? (existing.find((t) => t.result === result) ?? null) : null;
  const storedDay = stored ? startOfLocalDay(new Date(stored.testedAt).getTime()) : null;
  const canSave = result !== null && date !== null;

  const name = stiTitle(sti);

  return (
    <View style={styles.flex}>
      <SubHeader title="Your last test" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>
          When was your most recent <Text style={styles.underline}>{name}</Text> test?
        </Text>
        <DateWheel key={storedDay ?? 0} initial={storedDay ?? Date.now()} onChange={setDate} />

        <Text style={[styles.sectionTitle, styles.spaced]}>What was the result?</Text>
        <View style={styles.chips}>
          <Chip label="Negative" selected={result === "negative"} onPress={() => setResult("negative")} />
          <Chip label="Positive" selected={result === "positive"} onPress={() => setResult("positive")} />
        </View>
        {stored ? (
          <Text style={styles.hint}>
            Saved: {formatDate(stored.testedAt)}. Saving replaces it.
          </Text>
        ) : null}

        <GradientButton
          label="Save"
          style={styles.spaced}
          disabled={!canSave}
          onPress={() => {
            if (result !== null && date !== null) {
              Alert.alert(
                "Is this right?",
                `${result === "positive" ? "Positive" : "Negative"} ${name} test on ${formatDate(new Date(date).toISOString())}. It cannot be changed for this alert.`,
                [
                  { text: "Go back", style: "cancel" },
                  { text: "Yes, save", onPress: () => onSave(result, new Date(date).toISOString()) },
                ],
              );
            }
          }}
        />
        <Pressable onPress={onBack} accessibilityRole="button" style={styles.cancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>

        <Text style={styles.privacy}>
          This stays on this phone.{"\n"}It is never sent to the server.{"\n"}Entered by mistake? Settings has
          "Delete my test results".
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 32, gap: 14 },
  spaced: { marginTop: 14 },
  sectionTitle: { ...type.slideTitle, color: colors.text, marginTop: 4 },
  underline: { textDecorationLine: "underline" },
  hint: { ...type.cardDesc },
  chips: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  chip: {
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipSelected: { borderColor: colors.violetLight, backgroundColor: "rgba(125, 71, 224, 0.22)" },
  chipText: { color: colors.textSoft, fontFamily: fonts.regular, fontSize: 13.5 },
  chipTextSelected: { color: colors.text, fontFamily: fonts.semibold },
  cancel: { alignItems: "center", paddingVertical: 6 },
  cancelText: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, textDecorationLine: "underline" },
  privacy: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 6,
  },
});
