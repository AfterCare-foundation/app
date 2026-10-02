// Resources tab: for now just the website and one ECDC article.

import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ArrowRightIcon } from "../components/Icons";
import { Header } from "../components/Chrome";
import { Panel } from "../components/Panel";
import { colors, type } from "../theme";

const LINKS = [
  {
    title: "AfterCare website",
    desc: "after-care.eu",
    url: "https://www.after-care.eu/",
  },
  {
    title: "Bacterial STIs reach record highs in Europe",
    desc: "ECDC press release, 21 May 2026",
    url: "https://www.ecdc.europa.eu/en/news-events/bacterial-stis-reach-record-highs-europe-congenital-syphilis-cases-nearly-double",
  },
];

export function ResourcesScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header />
      <Text style={styles.title}>Resources</Text>
      <View style={styles.list}>
        {LINKS.map((link) => (
          <Pressable
            key={link.url}
            onPress={() => void Linking.openURL(link.url)}
            accessibilityRole="link"
            accessibilityLabel={`${link.title}. ${link.desc}`}
          >
            <Panel style={styles.row}>
              <View style={styles.body}>
                <Text style={styles.cardTitle}>{link.title}</Text>
                <Text style={styles.cardDesc}>{link.desc}</Text>
              </View>
              <ArrowRightIcon size={16} color={colors.teal} />
            </Panel>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingBottom: 28, gap: 16 },
  title: { ...type.sectionTitle },
  list: { gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  body: { flex: 1, gap: 2 },
  cardTitle: { ...type.cardTitle },
  cardDesc: { ...type.cardDesc },
});
