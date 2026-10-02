// Everything that has happened on this phone, newest first: alerts you have
// read (arrow in) and notifications you sent (arrow out), each with a date.

import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Header } from "../components/Chrome";
import { ArrowInIcon, ArrowOutIcon } from "../components/Icons";
import { formatDateTime, stiTitle } from "../components/ExposureCard";
import { Panel } from "../components/Panel";
import type { AlertRecord, SentRecord } from "../storage/secureStore";
import { colors, type } from "../theme";

interface Entry {
  id: string;
  kind: "received" | "sent";
  at: string;
  sti: string | null;
}

export function HistoryScreen({ alerts, sent }: { alerts: AlertRecord[]; sent: SentRecord[] }) {
  const entries: Entry[] = [
    ...alerts
      .filter((a) => a.acknowledgedAt !== null)
      .map((a): Entry => ({ id: `r-${a.id}`, kind: "received", at: a.receivedAt, sti: a.sti })),
    ...sent.map((r): Entry => ({ id: `s-${r.id}`, kind: "sent", at: r.sentAt, sti: r.sti })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header />
      <Text style={styles.title}>History</Text>
      {entries.length === 0 ? (
        <Panel style={styles.empty}>
          <Text style={styles.emptyText}>Alerts you read and notifications you send will show up here.</Text>
        </Panel>
      ) : (
        <View style={styles.list}>
          {entries.map((entry) => (
            <Panel key={entry.id} style={styles.row}>
              <View style={styles.main}>
                <View
                  style={[styles.badge, entry.kind === "sent" ? styles.badgeSent : styles.badgeReceived]}
                  accessible
                  accessibilityLabel={entry.kind === "sent" ? "Sent" : "Received"}
                >
                  {entry.kind === "sent" ? (
                    <ArrowOutIcon size={16} color={colors.violetLight} />
                  ) : (
                    <ArrowInIcon size={16} color={colors.teal} />
                  )}
                </View>
                <Text style={styles.sti}>{entry.sti ? stiTitle(entry.sti) : "Unspecified STI"}</Text>
              </View>
              <Text style={styles.when}>{formatDateTime(entry.at)}</Text>
            </Panel>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingBottom: 28, gap: 16 },
  title: { ...type.sectionTitle },
  list: { gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  main: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeSent: { borderColor: "rgba(167, 139, 250, 0.45)", backgroundColor: "rgba(125, 71, 224, 0.16)" },
  badgeReceived: { borderColor: "rgba(45, 212, 191, 0.4)", backgroundColor: "rgba(45, 212, 191, 0.12)" },
  sti: { ...type.cardTitle },
  when: { ...type.cardDesc, textAlign: "right" },
  empty: { padding: 20, alignItems: "center" },
  emptyText: { ...type.slideDesc, color: colors.textSoft, textAlign: "center" },
});
