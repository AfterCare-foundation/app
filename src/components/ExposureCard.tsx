// The card from the hero mockup. The body line is the one place this app
// differs from the picture: it shows the decrypted STI type when a scanned
// token opens the payload, otherwise only the server's generic alert.

import { StyleSheet, Text, View } from "react-native";

import type { AlertRecord } from "../storage/secureStore";
import { colors, fonts, radius } from "../theme";
import { GradientButton } from "./Buttons";
import { HeartIcon } from "./Icons";

const STI_LABELS: Record<string, string> = {
  gonorrhoea: "gonorrhoea",
  chlamydia: "chlamydia",
  syphilis: "syphilis",
  hiv: "HIV",
  mpox: "mpox",
  hpv: "HPV",
  other: "an STI",
};

export function stiLabel(sti: string): string {
  // `sti` can be free text typed by the sender, so only trust own keys.
  if (Object.prototype.hasOwnProperty.call(STI_LABELS, sti)) {
    return STI_LABELS[sti] ?? sti;
  }
  // Another phone sent this text, so keep it short whatever it says.
  return sti.length > 60 ? `${sti.slice(0, 60)}…` : sti;
}

interface ExposureCardProps {
  alert: AlertRecord;
  onAcknowledge: () => void;
}

export function ExposureCard({ alert, onAcknowledge }: ExposureCardProps) {
  const body = alert.sti
    ? `Someone you connected with has reported ${stiLabel(alert.sti)}. Get tested when you can.`
    : alert.alert;
  return (
    <View style={styles.card}>
      <View style={styles.badge}>
        <HeartIcon size={18} color="#fff" strokeWidth={2} />
      </View>
      <Text style={styles.headline}>You may have been{"\n"}exposed to an STI.</Text>
      <Text style={styles.body}>{body}</Text>
      <GradientButton label="Learn what to do" onPress={onAcknowledge} style={styles.button} />
      <Text style={styles.time}>{formatTime(alert.receivedAt)}</Text>
    </View>
  );
}

export function AnonymityNote() {
  return (
    <View style={styles.note}>
      <Text style={styles.noteText}>This is an anonymous notification.{"\n"}No personal information is shared.</Text>
    </View>
  );
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 18,
    paddingTop: 16,
    gap: 14,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.violet,
    alignItems: "center",
    justifyContent: "center",
  },
  headline: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 21,
    lineHeight: 28,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  body: {
    color: colors.textSoft,
    fontFamily: fonts.regular,
    fontSize: 14.5,
    lineHeight: 21,
    textAlign: "center",
    paddingHorizontal: 4,
  },
  button: {
    marginTop: 2,
  },
  time: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 11.5,
    textAlign: "right",
    marginTop: -4,
  },
  note: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  noteText: {
    color: colors.textSoft,
    fontFamily: fonts.regular,
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: "center",
  },
});
