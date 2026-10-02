// Scan the card QR, or paste the connect URL. The paste field exists so two
// simulators can share one token; the iOS simulator has no real camera.

import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useCallback, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { GhostButton, GradientButton } from "../components/Buttons";
import { SubHeader } from "../components/Chrome";
import { describeError, subscribeToCard } from "../flows";
import type { CardRecord, DeviceIdentity } from "../storage/secureStore";
import { colors, fonts, radius } from "../theme";

interface ScanScreenProps {
  device: DeviceIdentity;
  onBack: () => void;
  onSubscribed: (card: CardRecord, alreadyKnown: boolean) => void;
}

export function ScanScreen({ device, onBack, onSubscribed }: ScanScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const lockRef = useRef(false);

  const submit = useCallback(
    async (raw: string) => {
      if (lockRef.current) {
        return;
      }
      lockRef.current = true;
      setBusy(true);
      setError(null);
      try {
        const before = Date.now();
        const card = await subscribeToCard(device, raw);
        const alreadyKnown = new Date(card.scannedAt).getTime() < before - 1000;
        onSubscribed(card, alreadyKnown);
      } catch (e) {
        setError(describeError(e));
        // Allow another attempt after a short pause so one bad frame does
        // not spam the server.
        setTimeout(() => {
          lockRef.current = false;
        }, 1500);
      } finally {
        setBusy(false);
      }
    },
    [device, onSubscribed],
  );

  const onBarcode = useCallback(
    (result: BarcodeScanningResult) => {
      if (lockRef.current || !result.data) {
        return;
      }
      setLastScan(result.data);
      void submit(result.data);
    },
    [submit],
  );

  const cameraGranted = permission?.granted === true;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <SubHeader title="Scan a card" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.viewfinder}>
          {cameraGranted ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={busy ? undefined : onBarcode}
            />
          ) : (
            <View style={styles.permission}>
              <Text style={styles.permissionText}>
                {permission === null
                  ? "Checking camera access…"
                  : permission.canAskAgain
                    ? "Allow camera access to scan the QR on your card half."
                    : "Camera access is off. Enable it in Settings, or paste the link below."}
              </Text>
              {permission?.canAskAgain !== false ? (
                <GhostButton label="Allow camera" onPress={() => void requestPermission()} />
              ) : null}
            </View>
          )}
          <View pointerEvents="none" style={styles.frame} />
        </View>
        <Text style={styles.hint}>Align the QR within the frame.</Text>

        <View style={styles.divider}>
          <View style={styles.rule} />
          <Text style={styles.dividerText}>or paste the link</Text>
          <View style={styles.rule} />
        </View>

        <TextInput
          value={pasted}
          onChangeText={setPasted}
          placeholder="https://after-care.eu/connect#et=…"
          placeholderTextColor="rgba(156, 163, 175, 0.55)"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={() => void submit(pasted)}
          style={styles.input}
          accessibilityLabel="Card link"
        />
        <GradientButton label="Connect" busy={busy} disabled={!pasted.trim()} onPress={() => void submit(pasted)} />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {lastScan && !error ? <Text style={styles.scanned}>Read a code. Registering…</Text> : null}

        <Text style={styles.privacy}>
          Only a hash of the card leaves this phone. The card itself is never sent.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 32,
    gap: 14,
  },
  viewfinder: {
    aspectRatio: 1,
    borderRadius: radius.card,
    overflow: "hidden",
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  frame: {
    position: "absolute",
    width: "62%",
    height: "62%",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "rgba(45, 212, 191, 0.85)",
  },
  permission: {
    padding: 24,
    gap: 14,
    alignItems: "center",
  },
  permissionText: {
    color: colors.textSoft,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  hint: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: "center",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  rule: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 12.5,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.button,
    paddingVertical: 13,
    paddingHorizontal: 14,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.regular,
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: "center",
  },
  scanned: {
    color: colors.teal,
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: "center",
  },
  privacy: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 6,
  },
});
