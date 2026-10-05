// Notify partners. Not tied to one card and nobody is picked by hand: the
// infection and the last negative test decide who is reached (see windows.ts).
// Contacts are never counted on screen.

import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { GradientButton } from "../components/Buttons";
import { SubHeader } from "../components/Chrome";
import { HoldToConfirm } from "../components/HoldToConfirm";
import { reportedText, stiTitle } from "../components/ExposureCard";
import { STI_OPTIONS, UNSPECIFIED_STI, chipText } from "../sti";
import { Panel } from "../components/Panel";
import { describeError, notifyContacts, type NotifyOutcome } from "../flows";
import type { CardRecord, DeviceIdentity } from "../storage/secureStore";
import { colors, fonts, gradients, radius, type } from "../theme";
import { DAY_MS, MAX_AGE_DAYS, lookbackDays, notifyFrom, selectContacts } from "../windows";

// "unspecified" or the id of an option from sti.ts. "Don't specify" goes on the
// wire as the generic `other`, which the recipient reads as "an STI".
type Choice = "unspecified" | string;

const COMMON = STI_OPTIONS.filter((option) => option.common);
const MORE = STI_OPTIONS.filter((option) => !option.common);

const startOfDay = (d: Date): number => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

function formatDay(ms: number, withYear = false): string {
  const d = new Date(ms);
  const showYear = withYear || d.getFullYear() !== new Date().getFullYear();
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(showYear ? { year: "numeric" } : {}) });
}

interface NotifyScreenProps {
  device: DeviceIdentity;
  cards: CardRecord[];
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

export function NotifyScreen({ device, cards, onBack, onSent }: NotifyScreenProps) {
  const [choice, setChoice] = useState<Choice>("unspecified");
  const [moreOpen, setMoreOpen] = useState(false);
  // Start of the day of the last negative test; null = not known.
  const [lastNegative, setLastNegative] = useState<number | null>(null);
  // What actually gets encrypted.
  const stiValue: string = choice === "unspecified" ? UNSPECIFIED_STI : choice;
  const contacts = useMemo(
    () => selectContacts(cards, { sti: stiValue, lastNegative }),
    [cards, stiValue, lastNegative],
  );
  const fromMs = notifyFrom({ sti: stiValue, lastNegative });
  // An infection from "More…" moves up next to the common ones once picked.
  const pickedExtra = MORE.find((option) => option.id === choice) ?? null;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const minDate = new Date(today.getTime() - MAX_AGE_DAYS * DAY_MS);

  const onPickDate = (_event: unknown, date?: Date) => {
    if (date) {
      // Never in the future, never older than the server keeps contacts.
      const day = Math.min(startOfDay(date), startOfDay(new Date()));
      setLastNegative(Math.max(day, startOfDay(minDate)));
    }
  };
  const chooseDate = () => {
    const current = new Date(lastNegative ?? Date.now());
    setLastNegative(startOfDay(current));
    if (Platform.OS === "ios") {
      setPickerOpen((open) => !open);
    } else {
      DateTimePickerAndroid.open({
        value: current,
        mode: "date",
        maximumDate: today,
        minimumDate: minDate,
        onChange: onPickDate,
      });
    }
  };

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      if (__DEV__) {
        console.log(
          `[notify] ${stiValue}, from ${new Date(fromMs).toISOString()}, last negative ${lastNegative === null ? "unknown" : new Date(lastNegative).toISOString()}: ${contacts.length} contacts selected`,
        );
      }
      const outcome = await notifyContacts(device, contacts, stiValue);
      onSent(outcome);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

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
          <Chip label="Don't specify" selected={choice === "unspecified"} onPress={() => setChoice("unspecified")} />
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

        <Text style={styles.sectionTitle}>
          When were you last <Text style={styles.underline}>negative</Text>?
        </Text>
        <Text style={styles.sectionHint}>Your last negative test, or the day you finished treatment. An approximate date is fine.</Text>
        <View style={styles.chips}>
          <Chip
            label="I'm not sure"
            selected={lastNegative === null}
            onPress={() => {
              setLastNegative(null);
              setPickerOpen(false);
            }}
          />
          <Chip
            label={lastNegative === null ? "Pick a date" : formatDay(lastNegative, true)}
            selected={lastNegative !== null}
            onPress={() => {
              chooseDate();
            }}
          />
        </View>
        {pickerOpen && Platform.OS === "ios" ? (
          <Panel style={styles.pickerPanel}>
            <DateTimePicker
              value={new Date(lastNegative ?? Date.now())}
              mode="date"
              display="inline"
              maximumDate={today}
              minimumDate={minDate}
              onChange={(event, date) => {
                onPickDate(event, date);
                setPickerOpen(false);
              }}
              themeVariant="dark"
              accentColor={colors.violetLight}
            />
          </Panel>
        ) : null}

        <Panel style={styles.cardBox}>
          <Text style={styles.cardLabel}>{contacts.length === 0 ? "No contacts to notify" : `${since} will be notified`}</Text>
          {lastNegative === null ? (
            <Text style={styles.cardMeta}>{`Standard period: ${lookbackDays(stiValue)} days.`}</Text>
          ) : null}
        </Panel>

        <Panel tint="blue" style={styles.preview}>
          <Text style={styles.previewLabel}>They will see</Text>
          <Text style={styles.previewLock}>You have a new message. Open the app to read it.</Text>
          <Text style={styles.previewIn}>
            Inside the app: "{reportedText(stiValue)}"
          </Text>
        </Panel>

        <GradientButton
          label="Notify Partners"
          colors={gradients.primary}
          busy={busy}
          disabled={contacts.length === 0}
          onPress={() => {
            setError(null);
            setConfirming(true);
          }}
        />
        <Pressable onPress={onBack} accessibilityRole="button" style={styles.cancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.privacy}>The STI type is encrypted on this phone.{"\n"}The server cannot read it.</Text>
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
  pickerPanel: { padding: 8, alignItems: "center" },
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
  privacy: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 6,
  },
});
