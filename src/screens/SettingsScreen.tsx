// Settings tab: app icon, language (placeholder), privacy and deleting data.
// A developer section appears only in development builds.

import { useEffect, useState } from "react";
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { chooseIcon, currentIconChoice } from "../appIcon";
import { Header } from "../components/Chrome";
import { ArrowRightIcon } from "../components/Icons";
import { Panel } from "../components/Panel";
import type { InboxStatus } from "../flows";
import type { AppIconChoice, DeviceIdentity } from "../storage/secureStore";
import { tidy } from "../text";
import { colors, fonts, radius, type } from "../theme";

const PRIVACY_URL = "https://www.after-care.eu/privacy";

const ICONS: readonly { id: AppIconChoice; label: string; image: number }[] = [
  { id: "playful", label: "Playful", image: require("../../assets/icon-preview-playful.png") },
  { id: "discreet", label: "Discreet", image: require("../../assets/icon-preview-discreet.png") },
];

interface SettingsScreenProps {
  device: DeviceIdentity | null;
  serverOk: boolean | null;
  serverUrl: string;
  inboxStatus: InboxStatus | null;
  onDeleteData: () => Promise<void>;
  onResetInstall: () => void;
}

export function SettingsScreen({
  device,
  serverOk,
  serverUrl,
  inboxStatus,
  onDeleteData,
  onResetInstall,
}: SettingsScreenProps) {
  const [icon, setIcon] = useState<AppIconChoice>("playful");
  const [iconError, setIconError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void currentIconChoice().then(setIcon);
  }, []);

  const pickIcon = async (choice: AppIconChoice) => {
    setIconError(null);
    setIcon(choice);
    try {
      await chooseIcon(choice);
    } catch {
      setIconError("The icon could not be changed.");
      setIcon(await currentIconChoice());
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      "Delete my data?",
      "This removes your codes, contacts and history from this phone, and your device from the server. It cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await onDeleteData();
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header />
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.sectionLabel}>App icon</Text>
      <View style={styles.iconRow}>
        {ICONS.map((option) => {
          const selected = option.id === icon;
          return (
            <Pressable
              key={option.id}
              onPress={() => void pickIcon(option.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${option.label} app icon`}
              style={[styles.iconOption, selected && styles.iconOptionSelected]}
            >
              <Image source={option.image} style={styles.iconImage} accessibilityIgnoresInvertColors />
              <Text style={[styles.iconLabel, selected && styles.iconLabelSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {iconError ? <Text style={styles.error}>{iconError}</Text> : null}

      <Text style={styles.sectionLabel}>Language</Text>
      <Panel style={styles.rowSoon}>
        <Text style={styles.rowTitle}>English</Text>
        <Text style={styles.rowMeta}>Soon</Text>
      </Panel>

      <Text style={styles.sectionLabel}>Privacy</Text>
      <Pressable onPress={() => void Linking.openURL(PRIVACY_URL)} accessibilityRole="link">
        <Panel style={styles.row}>
          <Text style={styles.rowTitle}>Privacy policy</Text>
          <ArrowRightIcon size={16} color={colors.teal} />
        </Panel>
      </Pressable>
      <Pressable onPress={confirmDelete} disabled={deleting} accessibilityRole="button">
        <Panel style={deleting ? styles.rowSoon : styles.row}>
          <View style={styles.rowBody}>
            <Text style={styles.dangerTitle}>{deleting ? "Deleting…" : "Delete my data"}</Text>
            <Text style={styles.rowDesc}>{tidy("Removes everything from this phone and from the server.")}</Text>
          </View>
        </Panel>
      </Pressable>

      {__DEV__ ? (
        <>
          <Text style={styles.sectionLabel}>Developer</Text>
          <Panel style={styles.dev}>
            <Text style={styles.devLine}>
              Server {serverUrl} · {serverOk === null ? "checking" : serverOk ? "reachable" : "unreachable"}
            </Text>
            <Text style={styles.devLine}>
              Inbox {inboxStatus ?? "idle"} · device {device ? device.pushIdHash.slice(0, 8) : "…"} ·{" "}
              {device?.platform ?? ""}
            </Text>
            <Pressable onPress={onResetInstall} accessibilityRole="button" style={styles.devButton}>
              <Text style={styles.devButtonText}>Reset this install</Text>
            </Pressable>
          </Panel>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingBottom: 28, gap: 12 },
  title: { ...type.sectionTitle },
  sectionLabel: {
    ...type.cardDesc,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontSize: 11.5,
    marginTop: 14,
  },
  iconRow: { flexDirection: "row", gap: 12 },
  iconOption: {
    flex: 1,
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: radius.panel,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  iconOptionSelected: {
    borderColor: colors.violetLight,
    backgroundColor: "rgba(125, 71, 224, 0.22)",
  },
  iconImage: { width: 72, height: 72, borderRadius: 16 },
  iconLabel: { color: colors.textSoft, fontFamily: fonts.regular, fontSize: 13.5 },
  iconLabelSelected: { color: colors.text, fontFamily: fonts.semibold },
  error: { color: colors.danger, fontFamily: fonts.regular, fontSize: 13.5 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowSoon: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    opacity: 0.5,
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { ...type.cardTitle },
  rowMeta: { ...type.cardDesc },
  rowDesc: { ...type.cardDesc },
  dangerTitle: { ...type.cardTitle, color: colors.danger },
  dev: { padding: 14, gap: 4 },
  devLine: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 11.5 },
  devButton: { marginTop: 8, alignSelf: "flex-start" },
  devButtonText: { color: colors.textSoft, fontFamily: fonts.regular, fontSize: 13, textDecorationLine: "underline" },
});
