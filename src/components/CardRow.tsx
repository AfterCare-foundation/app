// One scanned card on the home screen. Shows a short hash label (never the
// raw token), when it was scanned, and the Notify Partners control.

import { StyleSheet, Text, View } from "react-native";

import { shortHash } from "../crypto/contract";
import type { CardRecord } from "../storage/secureStore";
import { colors, fonts, radius } from "../theme";
import { NotifyButton } from "./Buttons";
import { stiLabel } from "./ExposureCard";

interface CardRowProps {
  card: CardRecord;
  onNotify: (card: CardRecord) => void;
}

export function CardRow({ card, onNotify }: CardRowProps) {
  const sent = card.notifiedAt !== null;
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.label}>Card {shortHash(card.etHash)}</Text>
        <Text style={styles.meta}>Scanned {formatDate(card.scannedAt)}</Text>
        {sent ? (
          <Text style={styles.thanks}>
            Thanks for taking care of your partners
            {card.notifiedSti ? ` · ${stiLabel(card.notifiedSti)}` : ""}
            {card.lastPushed !== null ? ` · pushed ${card.lastPushed}` : ""}
          </Text>
        ) : null}
      </View>
      <NotifyButton sent={sent} onPress={() => onNotify(card)} />
    </View>
  );
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (sameDay) {
    return `today ${time}`;
  }
  return `${d.getDate()}.${d.getMonth() + 1}. ${time}`;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card - 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 14,
    fontVariant: ["tabular-nums"],
  },
  meta: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  thanks: {
    color: colors.violetLight,
    fontFamily: fonts.regular,
    fontSize: 11.5,
    marginTop: 2,
  },
});
