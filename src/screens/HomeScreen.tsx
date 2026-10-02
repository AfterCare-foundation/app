import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { GhostButton, GradientButton } from "../components/Buttons";
import { Header } from "../components/Chrome";
import { AnonymityNote, ExposureCard, formatTime, stiLabel } from "../components/ExposureCard";
import { ArrowRightIcon, BellIcon, ScanIcon } from "../components/Icons";
import type { InboxStatus } from "../flows";
import type { AlertRecord, CardRecord, DeviceIdentity } from "../storage/secureStore";
import { colors, fonts, gradients, radius } from "../theme";

interface HomeScreenProps {
  device: DeviceIdentity | null;
  cards: CardRecord[];
  alerts: AlertRecord[];
  serverOk: boolean | null;
  serverUrl: string;
  inboxStatus: InboxStatus | null;
  message: string | null;
  onScan: () => void;
  onGenerate: () => void;
  onNotify: () => void;
  onAcknowledge: (alert: AlertRecord) => void;
  onResetInstall: () => void;
}

export function HomeScreen({
  device,
  cards,
  alerts,
  serverOk,
  serverUrl,
  inboxStatus,
  message,
  onScan,
  onGenerate,
  onNotify,
  onAcknowledge,
  onResetInstall,
}: HomeScreenProps) {
  const fresh = alerts.filter((a) => a.acknowledgedAt === null);
  const seen = alerts.filter((a) => a.acknowledgedAt !== null);
  const current = fresh[0] ?? null;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Header />

      {message ? (
        <View style={styles.message}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : null}

      {current ? (
        <>
          <ExposureCard alert={current} onAcknowledge={() => onAcknowledge(current)} />
          <AnonymityNote />
          {fresh.length > 1 ? (
            <Text style={styles.moreAlerts}>
              {fresh.length - 1} more {fresh.length - 1 === 1 ? "alert" : "alerts"} waiting
            </Text>
          ) : null}
        </>
      ) : (
        <View style={styles.quiet}>
          <View style={styles.quietIcon}>
            <BellIcon size={18} color={colors.teal} />
          </View>
          <Text style={styles.quietTitle}>No new alerts</Text>
          <Text style={styles.quietBody}>
            {cards.length === 0
              ? "Scan the card you took home to stay in the loop."
              : "You will see it here if someone you connected with reports an STI."}
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <GradientButton
          label="Notify partners"
          colors={gradients.notify}
          onPress={onNotify}
          icon={<ArrowRightIcon size={15} />}
        />
        <GhostButton label="Scan a card" onPress={onScan} icon={<ScanIcon size={18} color={colors.text} />} />
        <GhostButton label="Generate my QR code" onPress={onGenerate} icon={<ScanIcon size={18} color={colors.teal} />} />
      </View>

      {seen.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Earlier alerts</Text>
          </View>
          <View style={styles.list}>
            {seen.map((alert) => (
              <View key={alert.id} style={styles.seenRow}>
                <Text style={styles.seenText}>{alert.sti ? stiLabel(alert.sti) : "Unspecified STI"}</Text>
                <Text style={styles.seenTime}>{formatTime(alert.receivedAt)}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <Pressable onLongPress={onResetInstall} delayLongPress={1200} style={styles.footer} accessibilityLabel="Development status. Long press to reset this install.">
        <Text style={styles.footerLine}>
          Server {serverUrl} · {serverOk === null ? "checking" : serverOk ? "reachable" : "unreachable"}
        </Text>
        <Text style={styles.footerLine}>
          Inbox {inboxStatus ?? "idle"} · device {device ? device.pushIdHash.slice(0, 8) : "…"} · {device?.platform ?? ""}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 18,
    paddingBottom: 28,
    gap: 16,
  },
  message: {
    backgroundColor: "rgba(45, 212, 191, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(45, 212, 191, 0.25)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  messageText: {
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 13.5,
    textAlign: "center",
  },
  moreAlerts: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 12.5,
    textAlign: "center",
  },
  quiet: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  quietIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(45, 212, 191, 0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  quietTitle: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  quietBody: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: "center",
  },
  section: {
    gap: 10,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  sectionCount: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  list: {
    gap: 8,
  },
  empty: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 13.5,
    paddingHorizontal: 2,
  },
  seenRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  seenText: {
    color: colors.textSoft,
    fontFamily: fonts.regular,
    fontSize: 13.5,
  },
  seenTime: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 12.5,
  },
  footer: {
    paddingTop: 6,
    gap: 2,
  },
  footerLine: {
    color: "rgba(156, 163, 175, 0.6)",
    fontFamily: fonts.regular,
    fontSize: 11,
    textAlign: "center",
  },
});
