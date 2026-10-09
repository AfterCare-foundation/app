import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ActionTile, GradientButton } from "../components/Buttons";
import { Panel } from "../components/Panel";
import { Header } from "../components/Chrome";
import { ExposureCard, TestFinderBlock } from "../components/ExposureCard";
import { BellIcon, QrIcon, ScanIcon } from "../components/Icons";
import type { AlertRecord, CardRecord } from "../storage/secureStore";
import { colors, fonts, gradients, type } from "../theme";

interface HomeScreenProps {
  cards: CardRecord[];
  alerts: AlertRecord[];
  message: string | null;
  /** Notifications are off for AfterCare, so alerts cannot reach this phone. */
  pushBlocked: boolean;
  onOpenSettings: () => void;
  onScan: () => void;
  onGenerate: () => void;
  onNotify: () => void;
  onAcknowledge: (alert: AlertRecord) => void;
  onDismiss: (alert: AlertRecord) => void;
}

export function HomeScreen({
  cards,
  alerts,
  message,
  pushBlocked,
  onOpenSettings,
  onScan,
  onGenerate,
  onNotify,
  onAcknowledge,
  onDismiss,
}: HomeScreenProps) {
  const fresh = alerts.filter((a) => a.acknowledgedAt === null);
  const current = fresh[0] ?? null;

  return (
    <ScrollView
      contentContainerStyle={
        current ? [styles.content, styles.contentFill] : styles.content
      }
      keyboardShouldPersistTaps="handled"
    >
      <Header />

      {pushBlocked ? (
        <Pressable onPress={onOpenSettings} accessibilityRole="button" style={styles.warning}>
          <Text style={styles.warningText}>
            Notifications are off, so you will not be told about an exposure. Tap to turn them on in Settings.
          </Text>
        </Pressable>
      ) : null}

      {message ? (
        <View style={styles.message}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : null}

      {current ? (
        <View style={styles.alertArea}>
          <ExposureCard
            alert={current}
            onDone={() => onDismiss(current)}
            contactAt={cards.find((c) => c.etHash === current.etHash)?.scannedAt ?? null}
          />
          <TestFinderBlock onFindTest={() => onAcknowledge(current)} />
          {fresh.length > 1 ? (
            <Text style={styles.moreAlerts}>
              {fresh.length - 1} more{" "}
              {fresh.length - 1 === 1 ? "alert" : "alerts"} waiting
            </Text>
          ) : null}
        </View>
      ) : (
        <Panel tint="teal" style={styles.quiet}>
          <View style={styles.quietIcon}>
            <BellIcon size={18} color={colors.teal} />
          </View>
          <Text style={styles.quietTitle}>No new alerts</Text>
          <Text style={styles.quietBody}>
            {cards.length === 0
              ? "Add the code from the card you took home to stay in the loop."
              : "You will see it here if someone you connected with reports an STI."}
          </Text>
        </Panel>
      )}

      {/* With an alert on screen nothing else is offered; the actions come back once it is dismissed. */}
      {current ? null : (
        <>
          {/* Used most: adding someone's code, then making one. */}
          <View style={styles.tiles}>
            <ActionTile
              highlighted
              title="Add"
              subtitle="Scan or enter a code"
              onPress={onScan}
              icon={<ScanIcon size={20} color="#fff" />}
            />
            <ActionTile
              title="Create"
              subtitle="Show a code to scan"
              onPress={onGenerate}
              icon={<QrIcon size={20} color={colors.teal} />}
            />
          </View>

          {/* Used rarely, so it sits apart from the everyday actions. */}
          <Panel tint="blue" style={styles.notifyBlock}>
            <Text style={styles.notifyTitle}>Tested positive?</Text>
            <Text style={styles.notifyDesc}>
              Let the people you met know. They will not learn who you are.
            </Text>
            <GradientButton
              label="Notify partners"
              colors={gradients.primary}
              onPress={onNotify}
            />
          </Panel>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 18,
    paddingBottom: 28,
    gap: 16,
  },
  // With an alert the card sits in the middle of the space under the logo.
  contentFill: {
    flexGrow: 1,
  },
  alertArea: {
    flex: 1,
    justifyContent: "center",
    gap: 16,
    paddingBottom: 48,
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
  warning: {
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.4)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  warningText: {
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
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  quietIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(45, 212, 191, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(45, 212, 191, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  quietTitle: {
    ...type.slideTitle,
    color: colors.text,
  },
  quietBody: {
    ...type.slideDesc,
    color: colors.textSoft,
    textAlign: "center",
  },
  tiles: {
    flexDirection: "row",
    gap: 12,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  sectionTitle: {
    ...type.sectionTitle,
  },
  sectionCount: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  notifyBlock: {
    padding: 16,
    gap: 6,
  },
  notifyTitle: {
    ...type.cardTitle,
  },
  notifyDesc: {
    ...type.cardDesc,
    marginBottom: 8,
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
    ...type.cardDesc,
    color: colors.textSoft,
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
