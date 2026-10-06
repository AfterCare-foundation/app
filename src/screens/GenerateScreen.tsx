// Home flow: no paper card. Make a fresh token on this phone, subscribe to it
// right away (so this phone is one half of the pair), and show it as a QR
// code for the other person to scan. Same token, same /subscribe as a card.

import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { GhostButton, GradientButton } from "../components/Buttons";
import { SubHeader } from "../components/Chrome";
import { Panel } from "../components/Panel";
import { connectUrl } from "../crypto/contract";
import { randomToken } from "../crypto/random";
import { describeError, subscribeToCard } from "../flows";
import type { CardRecord, DeviceIdentity } from "../storage/secureStore";
import { colors, fonts, radius, type } from "../theme";

interface GenerateScreenProps {
  device: DeviceIdentity;
  onBack: () => void;
  onGenerated: (card: CardRecord) => void;
}

export function GenerateScreen({ device, onBack, onGenerated }: GenerateScreenProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const link = connectUrl(randomToken());
      const saved = await subscribeToCard(device, link);
      setUrl(link);
      onGenerated(saved);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;
    void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.flex}>
      <SubHeader title="Create a code" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.qrBox}>
          {url ? (
            <QRCode value={url} size={220} backgroundColor="#ffffff" color="#1b1040" />
          ) : busy ? (
            <ActivityIndicator color={colors.violet} />
          ) : (
            <Text style={styles.qrFallback}>No code yet.</Text>
          )}
        </View>

        <Text style={styles.hint}>
          Ask the other person to scan this code, or share the link with them. Once they connect, either of you can notify the other.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {url ? (
          <>
            <GradientButton label="Done" onPress={onBack} />
            <GhostButton label="Share link" onPress={() => void Share.share({ message: url })} />
          </>
        ) : (
          <>
            <GradientButton label="Try again" busy={busy} onPress={() => void generate()} />
            <GhostButton label="Done" onPress={onBack} />
          </>
        )}

        <Panel style={styles.privacy}>
          <Text style={styles.privacyTitle}>Private by design</Text>
          <Text style={styles.privacyText}>
            This code only means "these two phones met". It holds no name, number or location, and the server only
            sees a hash of it.
          </Text>
        </Panel>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 32, gap: 14, alignItems: "stretch" },
  qrBox: {
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    width: 260,
    height: 260,
    backgroundColor: "#ffffff",
    borderRadius: radius.card,
    // Brand glow around the card; the code itself stays dark on white so it scans.
    shadowColor: "#7d47e0",
    shadowOpacity: 0.55,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 0 },
  },
  qrFallback: { color: "#0a0a10", fontFamily: fonts.regular },
  hint: {
    color: colors.textSoft,
    fontFamily: fonts.regular,
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: "center",
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.regular,
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: "center",
  },
  privacy: { padding: 16, gap: 4, marginTop: 6 },
  privacyTitle: { ...type.cardTitle },
  privacyText: { ...type.cardDesc },
});
