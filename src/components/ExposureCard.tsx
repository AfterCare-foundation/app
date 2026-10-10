// The card from the hero mockup. The body line is the one place this app
// differs from the picture: it shows the decrypted STI type when a scanned
// token opens the payload, otherwise only the server's generic alert.

import { Pressable, StyleSheet, Text, View } from "react-native";

import type { AlertRecord } from "../storage/secureStore";
import { colors, fonts, radius, type } from "../theme";
import { pepLine } from "../advice";
import { findSti } from "../sti";
import { GhostButton, GradientButton } from "./Buttons";
import { BellIcon } from "./Icons";
import { Panel } from "./Panel";

/** Name for lists and chips: "Gonorrhoea", "HIV". Unknown or generic reads "Unspecified STI". */
export function stiTitle(sti: string): string {
  return findSti(sti)?.label ?? "Unspecified STI";
}

/**
 * The alert sentence, as nested text so the infection can be underlined. Disease names start
 * with a capital; the generic type reads "an STI" and is not underlined.
 */
export function ReportedText({ sti }: { sti: string }) {
  const named = findSti(sti)?.label;
  return (
    <>
      Someone you connected with has reported{" "}
      {named ? <Text style={styles.stiName}>{named}</Text> : "an STI"}. Get
      tested when you can.
    </>
  );
}

interface ExposureCardProps {
  alert: AlertRecord;
  /** "OK": mark the alert as seen. */
  onDone: () => void;
  /** When this phone saved the card the alert came through, or null when unknown. */
  contactAt?: string | null;
}

export function ExposureCard({ alert, onDone, contactAt = null }: ExposureCardProps) {
  // Worked out when the alert is shown, so the deadline reflects the time that has passed.
  const pep = alert.sti ? pepLine(alert.sti, contactAt) : null;
  return (
    <Panel tint="blue" style={styles.card}>
      <View style={styles.badge}>
        <BellIcon size={18} color={colors.violetLight} />
      </View>
      <Text style={styles.headline}>
        You may have been{"\n"}exposed to an STI
      </Text>
      <Text style={styles.body}>
        {alert.sti ? <ReportedText sti={alert.sti} /> : alert.alert}
      </Text>
      {pep ? <Text style={styles.prevention}>{pep}</Text> : null}
      <GradientButton label="OK" onPress={onDone} style={styles.button} />
    </Panel>
  );
}

/** Pointer to the test finder, kept apart from the alert because most people already know what to do. */
export function TestFinderBlock({
  onFindTest,
  onDismiss,
}: {
  onFindTest: () => void;
  /** Shown where the block can be hidden, as on History. */
  onDismiss?: () => void;
}) {
  return (
    <Panel style={styles.finder}>
      <Text style={styles.finderTitle}>Need a test?</Text>
      <Text style={styles.finderText}>
        AfterCare is not a medical service. To find a place to get tested, we
        recommend using the European Test Finder.
      </Text>
      <GhostButton label="Find a test" onPress={onFindTest} />
      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.finderDismiss}
        >
          <Text style={styles.finderDismissText}>Dismiss</Text>
        </Pressable>
      ) : null}
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
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const year =
    d.getFullYear() === new Date().getFullYear() ? "" : ` ${d.getFullYear()}`;
  return `${d.getDate()} ${months[d.getMonth()]}${year}, ${formatTime(iso)}`;
}

const styles = StyleSheet.create({
  card: {
    padding: 22,
    paddingTop: 20,
    gap: 16,
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
  prevention: {
    ...type.cardDesc,
    color: colors.text,
    textAlign: "center",
    paddingHorizontal: 4,
  },
  finder: {
    padding: 20,
    gap: 10,
  },
  stiName: {
    textDecorationLine: "underline",
  },
  finderDismiss: {
    alignSelf: "center",
    paddingTop: 6,
  },
  finderDismissText: {
    color: colors.textMuted,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  finderTitle: {
    ...type.cardTitle,
  },
  finderText: {
    ...type.cardDesc,
    marginBottom: 8,
  },
  button: {
    alignSelf: "stretch",
    marginTop: 2,
  },
});
