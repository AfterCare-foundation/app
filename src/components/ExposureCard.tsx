// The card from the hero mockup. The body line is the one place this app
// differs from the picture: it shows the decrypted STI type when a scanned
// token opens the payload, otherwise only the server's generic alert.

import { StyleSheet, Text, View } from "react-native";

import type { AlertRecord } from "../storage/secureStore";
import { colors, fonts, radius, type } from "../theme";
import { findSti } from "../sti";
import { GradientButton } from "./Buttons";
import { BellIcon } from "./Icons";
import { Panel } from "./Panel";

/** Name for lists and chips: "Gonorrhoea", "HIV". Unknown or generic reads "Unspecified STI". */
export function stiTitle(sti: string): string {
  return findSti(sti)?.label ?? "Unspecified STI";
}

/** The alert sentence. Disease names start with a capital; the generic type reads "an STI". */
export function reportedText(sti: string): string {
  const name = findSti(sti)?.label ?? "an STI";
  return `Someone you connected with has reported ${name}. Get tested when you can.`;
}

interface ExposureCardProps {
  alert: AlertRecord;
  onAcknowledge: () => void;
}

export function ExposureCard({ alert, onAcknowledge }: ExposureCardProps) {
  const body = alert.sti
    ? reportedText(alert.sti)
    : alert.alert;
  return (
    <Panel tint="blue" style={styles.card}>
      <View style={styles.badge}>
        <BellIcon size={18} color={colors.violetLight} />
      </View>
      <Text style={styles.headline}>You may have been{"\n"}exposed to an STI</Text>
      <Text style={styles.body}>{body}</Text>
      <GradientButton label="Learn what to do" onPress={onAcknowledge} style={styles.button} />
    </Panel>
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
    alignItems: "center",
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(125, 71, 224, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(168, 130, 255, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  headline: {
    ...type.slideTitle,
    color: colors.text,
    textAlign: "center",
  },
  body: {
    ...type.slideDesc,
    color: colors.textSoft,
    textAlign: "center",
    paddingHorizontal: 4,
  },
  button: {
    alignSelf: "stretch",
    marginTop: 2,
  },
});
