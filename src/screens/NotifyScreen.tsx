// Notify partners. Not tied to one card and nobody is picked by hand: the
// infection and the last negative test decide who is reached (see windows.ts).
// Contacts are never counted on screen.

import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { GradientButton } from "../components/Buttons";
import { SubHeader } from "../components/Chrome";
import { HoldToConfirm } from "../components/HoldToConfirm";
import { stiLabel, stiTitle } from "../components/ExposureCard";
import { Panel } from "../components/Panel";
import { STI_TYPES, type StiType } from "../crypto/contract";
import { describeError, notifyContacts, type NotifyOutcome } from "../flows";
import type { CardRecord, DeviceIdentity } from "../storage/secureStore";
import { colors, fonts, gradients, radius, type } from "../theme";
import { DAY_MS, MAX_AGE_DAYS, lookbackDays, notifyFrom, selectContacts } from "../windows";

const OTHER_MAX_LENGTH = 40;

type Choice = "unspecified" | Exclude<StiType, "other"> | "other";

// "Don't specify" goes on the wire as the contract's generic `other`, which
// the recipient reads as "an STI". The "Other" choice sends the typed name.
const NAMED_TYPES = STI_TYPES.filter((t): t is Exclude<StiType, "other"> => t !== "other");
const CHOICES: readonly Choice[] = ["unspecified", ...NAMED_TYPES, "other"];

function choiceLabel(choice: Choice): string {
  if (choice === "unspecified") {
    return "Don't specify";
  }
  return choice === "other" ? "Other" : stiTitle(choice);
}

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

export function NotifyScreen({ device, cards, onBack, onSent }: NotifyScreenProps) {
  const [choice, setChoice] = useState<Choice>("unspecified");
  const [otherText, setOtherText] = useState("");
  // Start of the day of the last negative test; null = not known.
  const [lastNegative, setLastNegative] = useState<number | null>(null);
  // What actually gets encrypted.
  const typed = otherText.replace(/\s+/g, " ").trim();
  const missingName = choice === "other" && typed === "";
  const stiValue: string = choice === "unspecified" ? "other" : choice === "other" ? typed : choice;
  const contacts = useMemo(
    () => selectContacts(cards, { sti: stiValue, lastNegative }),
    [cards, stiValue, lastNegative],
  );
  const fromMs = notifyFrom({ sti: stiValue, lastNegative });
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
          {CHOICES.map((type) => {
            const selected = type === choice;
            return (
              <Pressable
                key={type}
                onPress={() => setChoice(type)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{choiceLabel(type)}</Text>
              </Pressable>
            );
          })}
        </View>

        {choice === "other" ? (
          <TextInput
            value={otherText}
            onChangeText={(t) => setOtherText(t.slice(0, OTHER_MAX_LENGTH))}
            placeholder="Which infection?"
            placeholderTextColor="rgba(156, 163, 175, 0.55)"
            maxLength={OTHER_MAX_LENGTH}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            accessibilityLabel="Name of the infection"
            style={styles.otherInput}
          />
        ) : null}
        {missingName ? <Text style={styles.warning}>Type the name to continue.</Text> : null}

        <Text style={styles.sectionTitle}>When was your last negative test?</Text>
        <View style={styles.chips}>
          <Pressable
            onPress={() => {
              setLastNegative(null);
              setPickerOpen(false);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: lastNegative === null }}
            style={[styles.chip, lastNegative === null && styles.chipSelected]}
          >
            <Text style={[styles.chipText, lastNegative === null && styles.chipTextSelected]}>I don't know</Text>
          </Pressable>
          <Pressable
            onPress={chooseDate}
            accessibilityRole="radio"
            accessibilityState={{ selected: lastNegative !== null }}
            style={[styles.chip, lastNegative !== null && styles.chipSelected]}
          >
            <Text style={[styles.chipText, lastNegative !== null && styles.chipTextSelected]}>
              {lastNegative === null ? "Pick a date" : formatDay(lastNegative, true)}
            </Text>
          </Pressable>
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
            Inside the app: "Someone you connected with has reported {stiLabel(stiValue) || "…"}. Get tested when you can."
          </Text>
        </Panel>

        <GradientButton
          label="Notify Partners"
          colors={gradients.primary}
          busy={busy}
          disabled={contacts.length === 0 || missingName}
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
  otherInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.card - 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 14,
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
