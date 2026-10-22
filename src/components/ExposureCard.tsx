// The card from the hero mockup. The body line is the one place this app
// differs from the picture: it shows the decrypted STI type when a scanned
// token opens the payload, otherwise only the server's generic alert.

import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import type { AlertRecord } from "../storage/secureStore";
import { colors, fonts, radius, type } from "../theme";
import { pepLine } from "../advice";
import { isCovered } from "../testRules";
import { dayMonth, rich, t } from "../i18n";
import { findSti, stiLabel } from "../sti";
import { GhostButton, GradientButton } from "./Buttons";
import { BellIcon } from "./Icons";
import { Panel } from "./Panel";

/** Name for lists and chips: "Gonorrhoea", "HIV". Unknown or generic reads "Unspecified STI". */
export function stiTitle(sti: string): string {
  return findSti(sti) ? stiLabel(sti) : t("Unspecified STI");
}

/** The infection, underlined; the generic type reads "an STI" and is not underlined. */
function Sti({ named }: { named: string | null }) {
  return named ? <Text style={styles.stiName}>{named}</Text> : <>{t("an STI")}</>;
}

/**
 * The alert sentence, as nested text so the infection can be underlined. Disease names start
 * with a capital; the generic type reads "an STI" and is not underlined.
 */
export function ReportedText({ sti }: { sti: string }) {
  const named = findSti(sti) ? stiLabel(sti) : null;
  return (
    <>
      {rich("Someone you connected with has reported {sti}. Get tested when you can.", { sti: <Sti named={named} /> })}
    </>
  );
}

/** The follow-up alert. Everyone gets it, so it says nothing about earlier tests or the contact. */
function RetestText({ sti }: { sti: string }) {
  const named = findSti(sti) ? stiLabel(sti) : null;
  return (
    <>
      {rich(
        "This follows the alert about {sti}. One test soon after contact can miss an infection, so get tested again when you can, even if you already have.",
        { sti: <Sti named={named} /> },
      )}
    </>
  );
}

/** "3 Oct 2026". */
export function formatDate(iso: string): string {
  return dayMonth(new Date(iso), true);
}

/** For a contact a test the user took later already covers. */
function TestedText({ sti }: { sti: string }) {
  const named = findSti(sti) ? stiLabel(sti) : null;
  return (
    <>
      {rich("Someone you connected with has reported {sti}. You have already been tested, so {action}.", {
        sti: <Sti named={named} />,
        action: <Text style={styles.stiName}>{t("no further action is needed from you")}</Text>,
      })}
    </>
  );
}

/** For an alert about a contact made before the user's own positive result. */
function NoActionText({ sti }: { sti: string }) {
  const named = findSti(sti) ? stiLabel(sti) : null;
  return (
    <>
      {rich("Someone you connected with has reported {sti}. The contact appears to be from before your positive test, so {action}.", {
        sti: <Sti named={named} />,
        action: <Text style={styles.stiName}>{t("no further action is needed from you")}</Text>,
      })}
    </>
  );
}

interface ExposureCardProps {
  alert: AlertRecord;
  /** "OK": mark the alert as seen. */
  onDone: () => void;
  /** When this phone saved the card the alert came through, or null when unknown. */
  contactAt?: string | null;
  /** "I've been tested recently": opens the test date form, once per alert. Omitted where it makes no sense. */
  onTested?: () => void;
}

export function ExposureCard({ alert, onDone, contactAt = null, onTested }: ExposureCardProps) {
  const tested = alert.testCheck;
  const okay = alert.noAction || isCovered(tested);
  // Worked out when the alert is shown, so the deadline reflects the time that has passed.
  const pep = alert.sti && !okay ? pepLine(alert.sti, contactAt) : null;
  return (
    <Panel tint="blue" style={styles.card}>
      <View style={okay ? styles.badgeOk : styles.badge}>
        <BellIcon size={18} color={okay ? colors.teal : colors.violetLight} />
      </View>
      <Text style={styles.headline}>
        {okay ? t("No action needed") : alert.retestOf ? t("Time to get\ntested again") : t("You may have been\nexposed to an STI")}
      </Text>
      <Text style={styles.body}>
        {alert.sti ? (
          alert.noAction ? (
            <NoActionText sti={alert.sti} />
          ) : isCovered(tested) ? (
            <TestedText sti={alert.sti} />
          ) : alert.retestOf ? (
            <RetestText sti={alert.sti} />
          ) : (
            <ReportedText sti={alert.sti} />
          )
        ) : (
          alert.alert
        )}
      </Text>
      {pep ? <Text style={styles.prevention}>{pep}</Text> : null}
      {!okay && !alert.retestOf ? (
        <Text style={styles.calm}>
          {t("Exposure does not mean infection.")}
          {alert.sti === "hiv" ? "\n" + t("Most exposures do not lead to HIV, and treatment today works very well.") : ""}
        </Text>
      ) : null}
      <GradientButton label="OK" onPress={onDone} style={styles.button} />
      {tested && !alert.noAction ? (
        <Text style={styles.lastTest}>
          {okay
            ? t("Last test: {date}", { date: formatDate(tested.testedAt) })
            : t("Your test on {date} does not clear this alert. Get tested when you can.", { date: formatDate(tested.testedAt) })}
        </Text>
      ) : onTested && !alert.noAction ? (
        <GhostButton label={t("I've been tested recently")} onPress={onTested} style={styles.button} />
      ) : null}
    </Panel>
  );
}

/** Pointer to the test finder, kept apart from the alert because most people already know what to do. */
export function TestFinderBlock({
  onFindTest,
  onDismiss,
}: {
  onFindTest: () => void;
  /** Shown where the block can be hidden. */
  onDismiss?: () => void;
}) {
  return (
    <Panel style={styles.finder}>
      <Text style={styles.finderTitle}>{t("Need a test?")}</Text>
      <Text style={styles.finderText}>
        {t("AfterCare is not a medical service. To find a place to get tested, we recommend using the European Test Finder.")}
      </Text>
      <GhostButton label={t("Find a test")} onPress={onFindTest} />
      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.finderDismiss}
        >
          <Text style={styles.finderDismissText}>{t("Dismiss")}</Text>
        </Pressable>
      ) : null}
    </Panel>
  );
}

/**
 * Anonymous phone counselling by the German AIDS-Hilfe, for an HIV alert. The numbers are the
 * Aidshilfe's own: 0180 33 19411 across Germany, 030 19411 for the Berlin AIDS-Hilfe. The phone
 * only opens its dialer; nothing is sent from the app, and no location is read.
 */
export function HelplineBlock() {
  const call = (number: string) => void Linking.openURL(`tel:${number}`);
  return (
    <Panel style={styles.finder}>
      <Text style={styles.finderTitle}>{t("Want to talk to someone?")}</Text>
      <Text style={styles.finderText}>
        {t("The AIDS-Hilfe offers anonymous counselling by phone, and a chat for gay and bisexual men.")}
      </Text>
      <GhostButton label={t("Germany: 0180 33 19411")} onPress={() => call("01803319411")} />
      <GhostButton label={t("Berlin: 030 19411")} onPress={() => call("03019411")} />
      <GhostButton label={t("Gay Health Chat (online)")} onPress={() => void Linking.openURL("https://www.gayhealthchat.de/")} />
      <Text style={styles.helplineHours}>
        {t("Germany: Mon–Fri 9–21, Sat and Sun 12–14. Berlin: daily 16–22. Chat: daily 17–20.")}
      </Text>
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
  return `${dayMonth(d, d.getFullYear() !== new Date().getFullYear())}, ${formatTime(iso)}`;
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
  // Same teal as the "No new alerts" card: all good.
  badgeOk: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(45, 212, 191, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(45, 212, 191, 0.4)",
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
  calm: { ...type.slideDesc, color: colors.textSoft, textAlign: "center", paddingHorizontal: 4 },
  lastTest: { ...type.cardDesc, color: colors.textSoft, textAlign: "center", marginTop: 2 },
  stiName: {
    textDecorationLine: "underline",
  },
  helplineHours: { ...type.cardDesc, fontSize: 12, textAlign: "center" },
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
