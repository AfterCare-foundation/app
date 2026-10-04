// Scan the card QR, or paste the connect URL. The paste field exists so two
// simulators can share one token; the iOS simulator has no real camera.

import { tidy } from "../text";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { colors, fonts, radius, type } from "../theme";

interface ScanScreenProps {
  device: DeviceIdentity;
  onBack: () => void;
  onSubscribed: (card: CardRecord, alreadyKnown: boolean) => void;
}

type AddMode = "scan" | "paste" | "code";

// "code" (a short one-time code from a sauna reader) needs backend support
// that does not exist yet, so it is listed but cannot be picked.
const MODES: readonly { id: AddMode; label: string; soon?: boolean }[] = [
  { id: "scan", label: "Scan" },
  { id: "paste", label: "Paste" },
  { id: "code", label: "Code", soon: true },
];

const CORNERS = ["tl", "tr", "bl", "br"] as const;

// Teal corner brackets with a beam sweeping the frame, as in the website's scan step.
function ScanFrame() {
  const sweep = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(500),
        Animated.timing(sweep, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [sweep]);

  return (
    <View pointerEvents="none" style={styles.frame}>
      {CORNERS.map((c) => (
        <Fragment key={c}>
          <View style={[styles.corner, styles.cornerH, cornerPos[c]]} />
          <View style={[styles.corner, styles.cornerV, cornerPos[c]]} />
        </Fragment>
      ))}
      <Animated.View
        style={[
          styles.beam,
          {
            opacity: sweep.interpolate({
              inputRange: [0, 0.05, 0.9, 1],
              outputRange: [0, 1, 1, 0],
            }),
            transform: [
              {
                translateY: sweep.interpolate({
                  inputRange: [0, 1],
                  outputRange: [8, 190],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
}

const cornerPos = StyleSheet.create({
  tl: { top: 0, left: 0 },
  tr: { top: 0, right: 0 },
  bl: { bottom: 0, left: 0 },
  br: { bottom: 0, right: 0 },
});

export function ScanScreen({ device, onBack, onSubscribed }: ScanScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<AddMode>("scan");
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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SubHeader title="Add a code" onBack={onBack} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.toggle} accessibilityRole="tablist">
          {MODES.map((m) => {
            const active = m.id === mode;
            return (
              <Pressable
                key={m.id}
                disabled={m.soon}
                onPress={() => {
                  setMode(m.id);
                  setError(null);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: active, disabled: m.soon === true }}
                style={[styles.toggleBtn, active && styles.toggleBtnActive, m.soon && styles.toggleBtnSoon]}
              >
                <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{m.label}</Text>
                {m.soon ? <Text style={styles.soon}>Soon</Text> : null}
              </Pressable>
            );
          })}
        </View>

        {mode === "scan" ? (
          <>
            <Text style={styles.label}>Scan the code</Text>
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
                    {tidy(
                      permission === null
                        ? "Checking camera access…"
                        : permission.canAskAgain
                          ? "Allow camera access to scan the QR on your card half."
                          : "Camera access is off. Enable it in Settings, or use Paste.",
                    )}
                  </Text>
                  {permission?.canAskAgain !== false ? (
                    <GhostButton label="Allow camera" onPress={() => void requestPermission()} />
                  ) : null}
                </View>
              )}
              <ScanFrame />
            </View>
            <Text style={styles.hint}>Align the QR within the frame</Text>
            <View style={[styles.severalRow, styles.toggleBtnSoon]} accessibilityState={{ disabled: true }}>
              <Text style={styles.severalText}>Scan several in a row</Text>
              <Text style={styles.soon}>Soon</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.label}>Paste the link</Text>
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
            <GradientButton
              label="Connect"
              busy={busy}
              disabled={!pasted.trim()}
              onPress={() => void submit(pasted)}
            />
          </>
        )}

        {error ? <Text style={styles.error}>{tidy(error)}</Text> : null}
        {lastScan && !error ? (
          <Text style={styles.scanned}>
            {tidy("Read a code. Registering…")}
          </Text>
        ) : null}

        <Text style={styles.privacy}>
          {tidy(
            "Only a hash of the card leaves this phone. The card itself is never sent.",
          )}
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
  label: { ...type.slideTitle, color: colors.text, textAlign: "center" },
  frame: { position: "absolute", width: 200, height: 200 },
  corner: {
    position: "absolute",
    backgroundColor: colors.teal,
    borderRadius: 2,
  },
  cornerH: { width: 36, height: 5 },
  cornerV: { width: 5, height: 36 },
  beam: {
    position: "absolute",
    left: 4,
    right: 4,
    height: 2,
    borderRadius: 999,
    backgroundColor: colors.teal,
    shadowColor: colors.teal,
    shadowOpacity: 0.7,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
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
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 18,
  },
  toggleBtnActive: { backgroundColor: "rgba(244, 244, 246, 0.18)" },
  toggleBtnSoon: { opacity: 0.5 },
  toggleText: { fontFamily: fonts.regular, fontSize: 14, color: "rgba(244, 244, 246, 0.55)" },
  toggleTextActive: { color: colors.text },
  soon: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 11 },
  severalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  severalText: { ...type.cardDesc },
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
