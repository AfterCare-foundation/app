// Settings tab: app icon, language (placeholder), privacy and deleting data.
// A developer section appears only in development builds.

import { useEffect, useState } from "react";
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";

import { getLang, t, type Choice, type Lang } from "../i18n";
import { chooseIcon, currentIconChoice } from "../appIcon";
import { Header } from "../components/Chrome";
import { ArrowRightIcon, CheckIcon } from "../components/Icons";
import { Panel } from "../components/Panel";
import type { InboxStatus, PullStats } from "../flows";
import type { AppIconChoice, DeviceIdentity } from "../storage/secureStore";
import { colors, fonts, radius, type } from "../theme";

// The language names are written in their own language. Automatic (the phone's language) applies
// on a fresh install; after that the user's pick is kept.
const LANGUAGES: readonly { id: Lang; label: string }[] = [
  { id: "en", label: "English" },
  { id: "de", label: "Deutsch" },
];

const PRIVACY_URL = "https://www.after-care.eu/privacy";

const ICONS: readonly { id: AppIconChoice; label: string; image: ImageSourcePropType }[] = [
  { id: "playful", label: "Playful", image: require("../../assets/icon-preview-playful.png") },
  { id: "discreet", label: "Discreet", image: require("../../assets/icon-preview-discreet.png") },
];

interface SettingsScreenProps {
  device: DeviceIdentity | null;
  serverOk: boolean | null;
  serverUrl: string;
  inboxStatus: InboxStatus | null;
  pullStats: PullStats | null;
  onDeleteData: () => Promise<void>;
  /** Test results are stored: "Delete my test results" is shown. */
  hasTests: boolean;
  onDeleteTests: () => Promise<void>;
  onResetInstall: () => void;
  onChooseLanguage: (choice: Choice) => void;
}

export function SettingsScreen({
  device,
  serverOk,
  serverUrl,
  inboxStatus,
  pullStats,
  onDeleteData,
  hasTests,
  onDeleteTests,
  onResetInstall,
  onChooseLanguage,
}: SettingsScreenProps) {
  const [icon, setIcon] = useState<AppIconChoice>("playful");
  const [iconError, setIconError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);

  useEffect(() => {
    void currentIconChoice().then(setIcon);
  }, []);

  const pickIcon = async (choice: AppIconChoice) => {
    setIconError(null);
    setIcon(choice);
    try {
      await chooseIcon(choice);
    } catch {
      setIconError(t("The icon could not be changed."));
      setIcon(await currentIconChoice());
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      t("Delete my data?"),
      t("This removes your codes, contacts, alerts and test dates from this phone, and your device from the server. It cannot be undone."),
      [
        { text: t("Cancel"), style: "cancel" },
        {
          text: t("Delete"),
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

  const confirmDeleteTests = () => {
    Alert.alert(
      t("Delete my test results?"),
      t("Use this if you entered a test by mistake. New alerts will no longer take it into account. Alerts you already have stay as they are."),
      [
        { text: t("Cancel"), style: "cancel" },
        { text: t("Delete"), style: "destructive", onPress: () => void onDeleteTests() },
      ],
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header />
      <Text style={styles.title}>{t("Settings")}</Text>

      <Text style={styles.sectionLabel}>{t("App icon")}</Text>
      <View style={styles.iconRow}>
        {ICONS.map((option) => {
          const selected = option.id === icon;
          return (
            <Pressable
              key={option.id}
              onPress={() => void pickIcon(option.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={t("{name} app icon", { name: t(option.label) })}
              style={[styles.iconOption, selected && styles.iconOptionSelected]}
            >
              <Image source={option.image} style={styles.iconImage} accessibilityIgnoresInvertColors />
              <Text style={[styles.iconLabel, selected && styles.iconLabelSelected]}>{t(option.label)}</Text>
            </Pressable>
          );
        })}
      </View>
      {iconError ? <Text style={styles.error}>{iconError}</Text> : null}

      <Text style={styles.sectionLabel}>{t("Language")}</Text>
      <Pressable
        onPress={() => setLanguageOpen((open) => !open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: languageOpen }}
      >
        <Panel style={styles.row}>
          <Text style={styles.rowTitle}>{LANGUAGES.find((option) => option.id === getLang())?.label}</Text>
          <View style={{ transform: [{ rotate: languageOpen ? "-90deg" : "90deg" }] }}>
            <ArrowRightIcon size={16} color={colors.teal} />
          </View>
        </Panel>
      </Pressable>
      {languageOpen ? (
        <Panel style={styles.menu}>
          {LANGUAGES.map((option, index) => {
            const selected = option.id === getLang();
            return (
              <Pressable
                key={option.id}
                onPress={() => {
                  setLanguageOpen(false);
                  onChooseLanguage(option.id);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.menuItem, index > 0 && styles.menuDivider]}
              >
                <Text style={selected ? styles.menuTextSelected : styles.menuText}>{option.label}</Text>
                {selected ? <CheckIcon size={16} color={colors.teal} /> : null}
              </Pressable>
            );
          })}
        </Panel>
      ) : null}

      <Text style={styles.sectionLabel}>{t("Privacy")}</Text>
      <Pressable onPress={() => void Linking.openURL(PRIVACY_URL)} accessibilityRole="link">
        <Panel style={styles.row}>
          <Text style={styles.rowTitle}>{t("Privacy policy")}</Text>
          <ArrowRightIcon size={16} color={colors.teal} />
        </Panel>
      </Pressable>
      {hasTests ? (
        <Pressable onPress={confirmDeleteTests} accessibilityRole="button">
          <Panel style={styles.row}>
            <View style={styles.rowBody}>
              <Text style={styles.dangerTitle}>{t("Delete my test results")}</Text>
              <Text style={styles.rowDesc}>
                {t("Only your most recent result for each infection is kept, on this phone only. It decides how new alerts are treated.")}
              </Text>
            </View>
          </Panel>
        </Pressable>
      ) : null}
      <Pressable onPress={confirmDelete} disabled={deleting} accessibilityRole="button">
        <Panel style={deleting ? styles.rowSoon : styles.row}>
          <View style={styles.rowBody}>
            <Text style={styles.dangerTitle}>{deleting ? t("Deleting…") : t("Delete my data")}</Text>
            <Text style={styles.rowDesc}>{t("Removes everything from this phone and from the server.")}</Text>
          </View>
        </Panel>
      </Pressable>

      {__DEV__ || process.env.EXPO_PUBLIC_DEV_TOOLS === "true" ? (
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
            <Text style={styles.devLine}>
              Last fetch{" "}
              {pullStats
                ? `${pullStats.at.slice(11, 19)} UTC · returned ${pullStats.fetched} · saved ${pullStats.saved} · unreadable ${pullStats.unreadable} · confirmed ${pullStats.confirmed}`
                : "none yet"}
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
  menu: { paddingHorizontal: 16 },
  menuItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14 },
  menuDivider: { borderTopWidth: 1, borderTopColor: colors.borderStrong },
  menuText: { ...type.cardDesc, color: colors.textSoft },
  menuTextSelected: { ...type.cardTitle },
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
