// Notify partners. Not tied to one card and nobody is picked by hand: the
// infection and the last negative test decide who is reached (see windows.ts).
// Contacts are never counted on screen.

import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { GradientButton } from "../components/Buttons";
import { DateWheel } from "../components/DateWheel";
import { SubHeader } from "../components/Chrome";
import { HoldToConfirm } from "../components/HoldToConfirm";
import { ReportedText, stiTitle } from "../components/ExposureCard";
import { STI_OPTIONS, UNSPECIFIED_STI, chipText, findSti } from "../sti";
import { Panel } from "../components/Panel";
import { describeError, notifyContacts, type NotifyOutcome } from "../flows";
import { saveTest, type CardRecord, type DeviceIdentity, type TestRecord } from "../storage/secureStore";
import { startOfLocalDay } from "../testRules";
import { colors, fonts, gradients, radius, type } from "../theme";
import { lookbackSource, notifyFrom, selectContacts, windowBasis } from "../windows";

// The id of an option from sti.ts, or null until one is picked: the infection is always named.
type Choice = string | null;

const COMMON = STI_OPTIONS.filter((option) => option.common);
const MORE = STI_OPTIONS.filter((option) => !option.common);

function formatDay(ms: number, withYear = false): string {
  const d = new Date(ms);
  const showYear = withYear || d.getFullYear() !== new Date().getFullYear();
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(showYear ? { year: "numeric" } : {}) });
}

interface NotifyScreenProps {
  device: DeviceIdentity;
  cards: CardRecord[];
  /** Tests the user recorded: the newest one for the infection is where the contact period starts. */
  tests: TestRecord[];
  onBack: () => void;
  onSent: (outcome: NotifyOutcome) => void;
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

export function NotifyScreen({ device, cards, tests, onBack, onSent }: NotifyScreenProps) {
  const [choice, setChoice] = useState<Choice>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  // A date picked here, for one infection; a null date is "I'm not sure". Without one, the stored test is used.
  const [picked, setPicked] = useState<{ sti: string; ms: number | null } | null>(null);
  // What actually gets encrypted. Nothing is sent before an infection is picked.
  const stiValue: string = choice ?? UNSPECIFIED_STI;
  // The newest negative test stored for this infection. Contacts count from there; those from before
  // an earlier positive were already told (marked on their cards), and a positive entered in the
  // To-do tab is the result being reported, so neither is used as a starting point.
  const storedMs = useMemo(() => {
    if (choice === null) {
      return null;
    }
    const latest = tests
      .filter((t) => t.sti === stiValue && t.result === "negative")
      .reduce<string | null>((a, t) => (a === null || t.testedAt > a ? t.testedAt : a), null);
    return latest === null ? null : startOfLocalDay(new Date(latest).getTime());
  }, [tests, choice, stiValue]);
  // Start of the day of the last test; null = not known.
  const lastNegative: number | null = picked && picked.sti === stiValue ? picked.ms : storedMs;
  const setLastNegative = (ms: number | null) => setPicked({ sti: stiValue, ms });
  const contacts = useMemo(
    () => selectContacts(cards, { sti: stiValue, lastNegative }),
    [cards, stiValue, lastNegative],
  );
  const fromMs = notifyFrom({ sti: stiValue, lastNegative });
  const chosenName = findSti(stiValue)?.label ?? "";
  // An infection from "More…" moves up next to the common ones once picked.
  const pickedExtra = MORE.find((option) => option.id === choice) ?? null;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chooseDate = () => setPickerOpen((open) => !open);

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      if (__DEV__) {
        console.log(
          `[notify] ${stiValue}, from ${new Date(fromMs).toISOString()}, last negative ${lastNegative === null ? "unknown" : new Date(lastNegative).toISOString()}: ${contacts.length} contacts selected`,
        );
        // Scan times only (no hashes or tokens), to see where the contacts came from.
        console.log(`[notify] scanned at: ${contacts.map((c) => c.scannedAt.slice(0, 16)).join(", ")}`);
      }
      const outcome = await notifyContacts(device, contacts, stiValue);
      // A changed date becomes the stored test (a negative, taken before today's result).
      if (choice !== null && lastNegative !== null && lastNegative !== storedMs) {
        await saveTest(stiValue, "negative", new Date(lastNegative).toISOString());
      }
      onSent(outcome);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const basis = windowBasis({ sti: stiValue, lastNegative });
  const reason =
    basis.basis === "negative-test"
      ? "Earlier contacts cannot have caught it from you, so they are left out."
      : basis.basis === "test-too-old"
        ? `Your negative test is older than ${basis.capped ? "we can reach" : "the usual"} ${basis.days} days, so that period is used.`
        : basis.capped
          ? `No test date, so we go back as far as we can reach: ${basis.days} days.`
          : `No test date, so we go back the usual ${basis.days} days.`;
  const since = `Contacts since ${formatDay(fromMs)}`;

  if (confirming) {
    return (
      <View style={styles.flex}>
        <SubHeader title="Notify Partners" onBack={() => setConfirming(false)} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Send this notification?</Text>
          <Panel style={styles.cardBox}>
            <Text style={styles.cardLabel}>{stiTitle(stiValue)}</Text>
            <Text style={styles.cardMeta}>{since}</Text>
          </Panel>
          <Panel tint="blue" style={styles.preview}>
            <Text style={styles.previewLabel}>They will see</Text>
            <Text style={styles.previewLock}>You have a new message. Open the app to read it.</Text>
            <Text style={styles.previewIn}>
              Inside the app: "<ReportedText sti={stiValue} />"
            </Text>
          </Panel>
          <Text style={styles.warning}>This cannot be undone.</Text>
          <HoldToConfirm label="Confirm" busy={busy} onConfirm={() => void send()} />
          <Pressable onPress={() => setConfirming(false)} accessibilityRole="button" style={styles.cancel}>
            <Text style={styles.cancelText}>Go back</Text>
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <SubHeader title="Notify Partners" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>What did you test positive for?</Text>
        <View style={styles.chips}>
          {COMMON.map((option) => (
            <Chip
              key={option.id}
              label={chipText(option)}
              selected={choice === option.id}
              onPress={() => setChoice(option.id)}
            />
          ))}
          {pickedExtra ? <Chip label={chipText(pickedExtra)} selected onPress={() => undefined} /> : null}
          <Chip label={moreOpen ? "Less" : "More…"} selected={false} onPress={() => setMoreOpen(!moreOpen)} />
        </View>
        {moreOpen ? (
          <View style={styles.chips}>
            {MORE.filter((option) => option.id !== choice).map((option) => (
              <Chip
                key={option.id}
                label={chipText(option)}
                selected={choice === option.id}
                onPress={() => {
                  setChoice(option.id);
                  setMoreOpen(false);
                }}
              />
            ))}
          </View>
        ) : null}

        <Text style={[styles.sectionTitle, styles.spaced]}>
          When were you last <Text style={styles.underline}>negative</Text>?
        </Text>
        <Text style={styles.sectionHint}>
          {"Date of your last negative test"}
          {chosenName ? (
            <>
              {" for "}
              <Text style={styles.underline}>{chosenName}</Text>
            </>
          ) : null}
          {storedMs !== null ? ", as saved on this phone. Change it if it is wrong." : ". Contacts since then are notified."}
        </Text>
        <View style={styles.chips}>
          {storedMs === null ? (
            <Chip
              label="I'm not sure"
              selected={lastNegative === null}
              onPress={() => {
                setLastNegative(null);
                setPickerOpen(false);
              }}
            />
          ) : null}
          <Chip
            label={lastNegative === null ? "Pick a date" : formatDay(lastNegative, true)}
            selected={lastNegative !== null}
            onPress={() => {
              chooseDate();
            }}
          />
        </View>
        {pickerOpen ? (
          <DateWheel
            initial={lastNegative ?? Date.now()}
            onDone={(ms) => {
              setLastNegative(ms);
              setPickerOpen(false);
            }}
          />
        ) : null}

        <Panel style={{ ...styles.cardBox, ...styles.spaced }}>
          <Text style={styles.cardLabel}>
            {choice === null ? "Pick the infection first" : contacts.length === 0 ? "No contacts to notify" : `${since} will be notified`}
          </Text>
          {choice !== null && contacts.length > 0 ? (
            <>
              <Text style={styles.cardMeta}>{reason}</Text>
              {/* The guidelines give the periods; counting from a negative test is our own reasoning. */}
              {basis.basis !== "negative-test" ? (
                <Text style={styles.cardMeta}>{`Based on: ${lookbackSource(stiValue)}.`}</Text>
              ) : null}
            </>
          ) : null}
        </Panel>

        <GradientButton
          label="Notify Partners"
          colors={gradients.primary}
          style={styles.spaced}
          busy={busy}
          disabled={choice === null || contacts.length === 0}
          onPress={() => {
            setError(null);
            // A date entered or changed here is kept as the last test, so make sure it is right.
            if (choice !== null && lastNegative !== null && lastNegative !== storedMs) {
              Alert.alert(
                "Is this date right?",
                `Your last negative ${stiTitle(stiValue)} test: ${formatDay(lastNegative, true)}.`,
                [
                  { text: "Go back", style: "cancel" },
                  { text: "Yes, continue", onPress: () => setConfirming(true) },
                ],
              );
              return;
            }
            setConfirming(true);
          }}
        />
        <Pressable onPress={onBack} accessibilityRole="button" style={styles.cancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Panel style={styles.note}>
          <Text style={styles.noteTitle}>Private by design</Text>
          <Text style={styles.noteText}>The infection is encrypted on this phone. The server cannot read it.</Text>
        </Panel>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 32,
    gap: 14,
  },
  // Extra air between the three blocks of the form, on top of the normal gap.
  spaced: { marginTop: 14 },
  cardBox: {
    padding: 14,
    gap: 4,
  },
  cardLabel: {
    ...type.cardTitle,
  },
  cardMeta: {
    ...type.cardDesc,
  },
  sectionTitle: {
    ...type.slideTitle,
    color: colors.text,
    marginTop: 4,
  },
  underline: {
    textDecorationLine: "underline",
  },
  sectionHint: {
    ...type.cardDesc,
    marginTop: -6,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  chip: {
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipSelected: {
    borderColor: colors.violetLight,
    backgroundColor: "rgba(125, 71, 224, 0.22)",
  },
  chipText: {
    color: colors.textSoft,
    fontFamily: fonts.regular,
    fontSize: 13.5,
  },
  chipTextSelected: {
    color: colors.text,
    fontFamily: fonts.semibold,
  },
  preview: {
    padding: 14,
    gap: 6,
  },
  previewLabel: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 11.5,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  previewLock: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 14.5,
  },
  previewIn: {
    color: colors.textSoft,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  warning: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: "center",
  },
  cancel: {
    alignItems: "center",
    paddingVertical: 6,
  },
  cancelText: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 14,
    textDecorationLine: "underline",
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.regular,
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: "center",
  },
  note: { padding: 14, gap: 4 },
  noteTitle: { ...type.cardTitle, fontSize: 14 },
  noteText: { ...type.cardDesc },
});
