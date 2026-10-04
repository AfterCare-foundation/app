// The card from the hero mockup. The body line is the one place this app
// differs from the picture: it shows the decrypted STI type when a scanned
// token opens the payload, otherwise only the server's generic alert.

import { StyleSheet, Text, View } from "react-native";

import type { AlertRecord } from "../storage/secureStore";
import { colors, fonts, radius, type } from "../theme";
import { GradientButton } from "./Buttons";
import { HeartIcon } from "./Icons";
import { Panel } from "./Panel";

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

/**
 * Same name for lists and chips, starting with a capital: "Gonorrhoea",
 * "HIV", "Mpox". The generic type reads "Unspecified STI"; typed names keep
 * their own spelling apart from the first letter.
 */
export function stiTitle(sti: string): string {
  if (sti === "other") {
    return "Unspecified STI";
  }
  const label = stiLabel(sti);
  return label.charAt(0).toUpperCase() + label.slice(1);
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
    <Panel tint="blue" style={styles.card}>
      <View style={styles.badge}>
        <HeartIcon size={18} color="#fff" strokeWidth={2} />
      </View>
      <Text style={styles.headline}>You may have been{"\n"}exposed to an STI.</Text>
      <Text style={styles.body}>{body}</Text>
      <GradientButton label="Learn what to do" onPress={onAcknowledge} style={styles.button} />
      <Text style={styles.time}>{formatTime(alert.receivedAt)}</Text>
    </Panel>
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

/** "3 Oct, 00:12", with the year only when it is not the current one. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const year = d.getFullYear() === new Date().getFullYear() ? "" : ` ${d.getFullYear()}`;
  return `${d.getDate()} ${months[d.getMonth()]}${year}, ${formatTime(iso)}`;
}

const styles = StyleSheet.create({
  card: {
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
    ...type.slideTitle,
    textAlign: "center",
  },
  body: {
    ...type.slideDesc,
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
    ...type.cardDesc,
    textAlign: "center",
  },
});
