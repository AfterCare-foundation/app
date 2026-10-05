// Info tab: how the app works, what stays private, answers to common questions, and links.

import { useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Header } from "../components/Chrome";
import { ArrowRightIcon } from "../components/Icons";
import { Panel } from "../components/Panel";
import { colors, fonts, type } from "../theme";

type UseCase = "club" | "sauna" | "home";
const USE_CASES: { id: UseCase; label: string }[] = [
  { id: "club", label: "Club" },
  { id: "sauna", label: "Sauna" },
  { id: "home", label: "Home" },
];

interface Step {
  title: string;
  desc: string;
}

const NOTIFIED: Step = {
  title: "Notified",
  desc: "If either of you tests positive later, one tap tells the other. Anonymously, no name or identifying info exchanged.",
};
const TREATED: Step = {
  title: "Treated",
  desc: "Get treated sooner, but only when advised by healthcare professionals. Early detection means less spread, and a healthier scene for everyone.",
};
const connected = (desc: string): Step => ({
  title: "Connected",
  desc: `Connecting shares nothing on its own, and nothing is ever sent unless you tap to send it. ${desc}`,
});

const STEPS: Record<UseCase, Step[]> = {
  club: [
    { title: "Tear", desc: "Split a card in half, like a cloakroom stub: one side each." },
    { title: "Keep", desc: "Hang onto your half." },
    { title: "Scan", desc: "Scan it in the app, whenever you're ready." },
    connected("Your halves match up once you've both scanned."),
    NOTIFIED,
    TREATED,
  ],
  sauna: [
    {
      title: "Pair",
      desc: "Tap the reader with your wristband, then the other person taps theirs right after. A blinking light confirms you're connected.",
    },
    {
      title: "Check out",
      desc: "Tap your wristband on the reader on your way out, then enter the code it shows into the app.",
    },
    connected("Your wristband pairing shows up in the app once you've both checked out."),
    NOTIFIED,
    TREATED,
  ],
  home: [
    { title: "Generate", desc: "Generate your personal QR code in the app. No card needed." },
    { title: "Show", desc: "Show your QR to the other person. They scan it with their phone camera." },
    connected("Once the other person scans, the connection is established."),
    NOTIFIED,
    TREATED,
  ],
};

const PRIVACY = [
  { title: "On your phone", desc: "Your codes, contacts and history stay on this phone." },
  { title: "On our server", desc: "No name, email or phone number. What a notification says is encrypted, and the server cannot read it." },
  { title: "Gone after 60 days", desc: "Old notifications are removed from the server automatically." },
  { title: "Yours to erase", desc: "Delete everything at any time in Settings." },
];

const FAQ = [
  {
    q: "What happens when someone scans my code?",
    a: "You are connected. Nothing is shared, and nothing is sent unless you choose to send it.",
  },
  {
    q: "Will they know it is me?",
    a: "No. A notification carries no name or contact details, and does not say who sent it.",
  },
  {
    q: "What does a notification say?",
    a: "That someone you were connected with tested positive, and for what if they chose to say. It is a prompt to get tested, not a diagnosis.",
  },
  {
    q: "Why can I not see how many people I notified?",
    a: "So it never becomes a score. You only see that it was sent.",
  },
  {
    q: "What if I get a new phone?",
    a: "Your codes and contacts live only on your phone, so a new phone or a reinstall starts fresh.",
  },
];

const CONTACT = { title: "Contact us", desc: "contact@after-care.eu", url: "mailto:contact@after-care.eu" };

const LINKS = [
  { title: "AfterCare website", desc: "after-care.eu", url: "https://www.after-care.eu/" },
  {
    title: "Bacterial STIs reach record highs in Europe",
    desc: "ECDC press release, 21 May 2026",
    url: "https://www.ecdc.europa.eu/en/news-events/bacterial-stis-reach-record-highs-europe-congenital-syphilis-cases-nearly-double",
  },
];

// A device without a mail app (or a simulator) rejects mailto: links; show the address instead.
async function openLink(link: { title: string; desc: string; url: string }): Promise<void> {
  try {
    await Linking.openURL(link.url);
  } catch {
    Alert.alert(link.title, link.url.startsWith("mailto:") ? `No mail app found. Write to ${link.desc}.` : "Could not open this link.");
  }
}

function LinkRow({ link }: { link: { title: string; desc: string; url: string } }) {
  return (
    <Pressable
      onPress={() => void openLink(link)}
      accessibilityRole="link"
      accessibilityLabel={`${link.title}. ${link.desc}`}
    >
      <Panel style={styles.linkRow}>
        <View style={styles.stepBody}>
          <Text style={styles.cardTitle}>{link.title}</Text>
          <Text style={styles.cardDesc}>{link.desc}</Text>
        </View>
        <ArrowRightIcon size={16} color={colors.teal} />
      </Panel>
    </Pressable>
  );
}

export function InfoScreen() {
  const [useCase, setUseCase] = useState<UseCase>("club");
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header />

      <Text style={styles.intro}>
        Add a code when you meet someone. If either of you tests positive later, one tap tells the other, anonymously.
      </Text>

      <Text style={[styles.title, styles.firstTitle]}>How it works.</Text>
      <View style={styles.toggle} accessibilityRole="tablist">
        {USE_CASES.map((uc) => {
          const active = uc.id === useCase;
          return (
            <Pressable
              key={uc.id}
              onPress={() => setUseCase(uc.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.toggleBtn, active && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{uc.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.list}>
        {STEPS[useCase].map((step, i) => (
          <Panel key={`${useCase}-${step.title}`} style={styles.step}>
            <View style={styles.num}>
              <Text style={styles.numText}>{i + 1}</Text>
            </View>
            <View style={styles.stepBody}>
              <Text style={styles.cardTitle}>{step.title}</Text>
              <Text style={styles.cardDesc}>{step.desc}</Text>
            </View>
          </Panel>
        ))}
      </View>

      <Text style={styles.title}>What stays private.</Text>
      <View style={styles.list}>
        {PRIVACY.map((item) => (
          <Panel key={item.title} style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDesc}>{item.desc}</Text>
          </Panel>
        ))}
      </View>

      <Text style={styles.title}>Questions.</Text>
      <View style={styles.list}>
        {FAQ.map((item) => {
          const open = openFaq === item.q;
          return (
            <Pressable
              key={item.q}
              onPress={() => setOpenFaq(open ? null : item.q)}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
            >
              <Panel style={styles.card}>
                <Text style={styles.cardTitle}>{item.q}</Text>
                {open ? <Text style={styles.cardDesc}>{item.a}</Text> : null}
              </Panel>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.title}>Learn more.</Text>
      <View style={styles.list}>
        {LINKS.map((link) => (
          <LinkRow key={link.url} link={link} />
        ))}
      </View>

      <Text style={styles.title}>Contact.</Text>
      <LinkRow link={CONTACT} />

      <Text style={styles.tagline}>Take care with AfterCare 💜</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingBottom: 28, gap: 14 },
  title: { ...type.sectionTitle, marginTop: 32 },
  firstTitle: { marginTop: 18 },
  list: { gap: 10 },
  card: { padding: 16, gap: 4 },
  cardTitle: { ...type.cardTitle },
  cardDesc: { ...type.cardDesc },
  intro: { ...type.cardDesc, fontSize: 16, lineHeight: 23 },
  toggle: {
    flexDirection: "row",
    alignSelf: "center",
    gap: 6,
    padding: 4,
    backgroundColor: "rgba(244, 244, 246, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(244, 244, 246, 0.10)",
    borderRadius: 999,
  },
  toggleBtn: { borderRadius: 999, paddingVertical: 7, paddingHorizontal: 22 },
  toggleBtnActive: { backgroundColor: "rgba(244, 244, 246, 0.18)" },
  toggleText: { fontFamily: fonts.regular, fontSize: 14, color: "rgba(244, 244, 246, 0.55)" },
  toggleTextActive: { color: colors.text },
  step: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16 },
  num: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(45, 212, 191, 0.4)",
    backgroundColor: "rgba(45, 212, 191, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  numText: { ...type.cardTitle, fontSize: 13, color: colors.teal },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  stepBody: { flex: 1, gap: 2 },
  tagline: { ...type.cardTitle, textAlign: "center", marginTop: 32 },
});
