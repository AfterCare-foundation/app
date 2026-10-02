// Notify partners. Not tied to one card: pick the STI type and how far back
// to go, see how many contacts that covers, confirm, send once.

import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { GradientButton } from "../components/Buttons";
import { SubHeader } from "../components/Chrome";
import { stiLabel } from "../components/ExposureCard";
import { ArrowRightIcon } from "../components/Icons";
import { STI_TYPES, type StiType } from "../crypto/contract";
import { describeError, notifyContacts, type NotifyOutcome } from "../flows";
import type { CardRecord, DeviceIdentity } from "../storage/secureStore";
import { colors, fonts, gradients, radius } from "../theme";
import { NOTIFY_WINDOWS, selectContacts, type WindowId } from "../windows";

interface NotifyScreenProps {
  device: DeviceIdentity;
  cards: CardRecord[];
  onBack: () => void;
  onSent: (outcome: NotifyOutcome) => void;
}

export function NotifyScreen({ device, cards, onBack, onSent }: NotifyScreenProps) {
  const [sti, setSti] = useState<StiType>("gonorrhoea");
  const [windowId, setWindowId] = useState<WindowId>("2w");
  const contacts = useMemo(() => selectContacts(cards, windowId), [cards, windowId]);
  const activeWindow = NOTIFY_WINDOWS.find((w) => w.id === windowId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const outcome = await notifyContacts(device, contacts, sti);
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
        <Text style={styles.sectionTitle}>Who should be told?</Text>
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
        <View style={styles.cardBox}>
          <Text style={styles.cardLabel}>
            {contacts.length === 0
              ? "No contacts in this window"
              : `${contacts.length} ${contacts.length === 1 ? "contact" : "contacts"} will be notified`}
          </Text>
          <Text style={styles.cardMeta}>
            {activeWindow?.hint} Each one gets one anonymous alert. You will not get one yourself.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>What did you test positive for?</Text>
        <View style={styles.chips}>
          {STI_TYPES.map((type) => {
            const selected = type === sti;
            return (
              <Pressable
                key={type}
                onPress={() => setSti(type)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{stiLabel(type)}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.preview}>
          <Text style={styles.previewLabel}>They will see</Text>
          <Text style={styles.previewLock}>Someone you connected with may have an STI.</Text>
          <Text style={styles.previewIn}>
            Inside the app: "Someone you connected with has reported {stiLabel(sti)}. Get tested when you can."
          </Text>
        </View>

        <Text style={styles.warning}>This cannot be undone.</Text>

        <GradientButton
          label={contacts.length > 0 ? `Notify ${contacts.length} ${contacts.length === 1 ? "contact" : "contacts"}` : "Notify Partners"}
          colors={gradients.notify}
          busy={busy}
          disabled={contacts.length === 0}
          onPress={() => void send()}
          icon={<ArrowRightIcon size={15} />}
        />
        <Pressable onPress={onBack} accessibilityRole="button" style={styles.cancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.privacy}>
          The STI type is encrypted on this phone, separately for each contact, with a key only the two of
          you share. The server forwards it without being able to read it.
        </Text>
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card - 4,
    padding: 14,
    gap: 4,
  },
  cardLabel: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  cardMeta: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 15,
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
  preview: {
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card - 4,
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
