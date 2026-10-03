// Notify partners. Not tied to one card: pick the STI type and how far back
// to go, confirm, send once. Contacts are never counted on screen.

import { tidy } from "../text";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { GradientButton } from "../components/Buttons";
import { SubHeader } from "../components/Chrome";
import { stiLabel, stiTitle } from "../components/ExposureCard";
import { ArrowRightIcon } from "../components/Icons";
import { Panel } from "../components/Panel";
import { STI_TYPES, type StiType } from "../crypto/contract";
import { describeError, notifyContacts, type NotifyOutcome } from "../flows";
import type { CardRecord, DeviceIdentity } from "../storage/secureStore";
import { colors, fonts, gradients, radius, type } from "../theme";
import { NOTIFY_WINDOWS, selectContacts, type WindowId } from "../windows";

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

interface NotifyScreenProps {
  device: DeviceIdentity;
  cards: CardRecord[];
  onBack: () => void;
  onSent: (outcome: NotifyOutcome) => void;
}

export function NotifyScreen({ device, cards, onBack, onSent }: NotifyScreenProps) {
  const [choice, setChoice] = useState<Choice>("unspecified");
  const [otherText, setOtherText] = useState("");
  const [windowId, setWindowId] = useState<WindowId>("2w");
  const contacts = useMemo(() => selectContacts(cards, windowId), [cards, windowId]);
  // What actually gets encrypted.
  const typed = otherText.replace(/\s+/g, " ").trim();
  const missingName = choice === "other" && typed === "";
  const stiValue: string = choice === "unspecified" ? "other" : choice === "other" ? typed : choice;
  const activeWindow = NOTIFY_WINDOWS.find((w) => w.id === windowId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      if (__DEV__) {
        console.log(`[notify] window ${windowId}: ${contacts.length} contacts selected`);
      }
      const outcome = await notifyContacts(device, contacts, stiValue);
      onSent(outcome);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.flex}>
      <SubHeader title="Notify Partners" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Who should be notified?</Text>
        <View style={styles.chips}>
          {NOTIFY_WINDOWS.map((w) => {
            const selected = w.id === windowId;
            return (
              <Pressable
                key={w.id}
                onPress={() => setWindowId(w.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{w.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Panel style={styles.cardBox}>
          <Text style={styles.cardLabel}>
            {contacts.length === 0
              ? "No contacts in this window"
              : "Contacts in this window will be notified"}
          </Text>
          <Text style={styles.cardMeta}>
            {activeWindow?.hint}
          </Text>
        </Panel>

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

        <Panel tint="blue" style={styles.preview}>
          <Text style={styles.previewLabel}>They will see</Text>
          <Text style={styles.previewLock}>You have a new message. Open the app to read it.</Text>
          <Text style={styles.previewIn}>
            Inside the app: "Someone you connected with has reported {stiLabel(stiValue) || "…"}. Get tested when you can."
          </Text>
        </Panel>

        <Text style={styles.warning}>This cannot be undone.</Text>

        <GradientButton
          label="Notify Partners"
          colors={gradients.primary}
          busy={busy}
          disabled={contacts.length === 0 || missingName}
          onPress={() => void send()}
          icon={<ArrowRightIcon size={15} />}
        />
        <Pressable onPress={onBack} accessibilityRole="button" style={styles.cancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{tidy(error)}</Text> : null}

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
