import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, Linking, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { apiBaseUrl, deleteDevice, health } from "./src/api/client";
import { Screen, TabBar, type Tab } from "./src/components/Chrome";
import { stiTitle } from "./src/components/ExposureCard";
import {
  currentPushToken,
  describeError,
  pullInbox,
  syncPushToken,
  type InboxStatus,
  type NotifyOutcome,
} from "./src/flows";
import {
  clearDeliveredPushes,
  installNotificationHandler,
  onPushTokenChange,
  onPushWake,
  pushSupported,
} from "./src/push";
import { HistoryScreen } from "./src/screens/HistoryScreen";
import { InfoScreen } from "./src/screens/InfoScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { GenerateScreen } from "./src/screens/GenerateScreen";
import { NotifyScreen } from "./src/screens/NotifyScreen";
import { ScanScreen } from "./src/screens/ScanScreen";
import {
  acknowledgeAlert,
  clearLocalData,
  listAlerts,
  listCards,
  listSent,
  loadOrCreateDevice,
  type AlertRecord,
  type CardRecord,
  type DeviceIdentity,
  type SentRecord,
} from "./src/storage/secureStore";
import { colors, fonts } from "./src/theme";

type Route = { name: "home" } | { name: "scan" } | { name: "generate" } | { name: "notify" };

installNotificationHandler();

const INBOX_POLL_MS = 4000;
const HEALTH_POLL_MS = 15000;

const TEST_FINDER_URL = "https://testfinder.info/";

export default function App() {
  const [fontsLoaded] = useFonts({
    [fonts.regular]: require("./assets/fonts/Poppins-Regular.ttf"),
    [fonts.semibold]: require("./assets/fonts/Poppins-SemiBold.ttf"),
  });

  const [device, setDevice] = useState<DeviceIdentity | null>(null);
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [sent, setSent] = useState<SentRecord[]>([]);
  const [route, setRoute] = useState<Route>({ name: "home" });
  const [tab, setTab] = useState<Tab>("home");
  const [serverOk, setServerOk] = useState<boolean | null>(null);
  const [inboxStatus, setInboxStatus] = useState<InboxStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const say = useCallback((text: string, ms = 6000) => {
    setMessage(text);
    if (messageTimer.current) {
      clearTimeout(messageTimer.current);
    }
    messageTimer.current = setTimeout(() => setMessage(null), ms);
  }, []);

  const reloadSeq = useRef(0);
  const reload = useCallback(async () => {
    const seq = ++reloadSeq.current;
    const [nextCards, nextAlerts, nextSent] = await Promise.all([listCards(), listAlerts(), listSent()]);
    if (seq !== reloadSeq.current) {
      return; // a newer reload started meanwhile; its data is fresher
    }
    setCards(nextCards);
    setAlerts(nextAlerts);
    setSent(nextSent);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadOrCreateDevice();
      if (cancelled) {
        return;
      }
      setDevice(loaded);
      await reload();
      // Tell the server if the OS handed out a new push token since the last launch.
      const synced = await syncPushToken(loaded, await currentPushToken(loaded));
      if (!cancelled && synced.pushToken !== loaded.pushToken) {
        setDevice(synced);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  // The OS replacing the push token: tell the server.
  useEffect(() => {
    if (!device) {
      return;
    }
    return onPushTokenChange((token) => {
      void syncPushToken(device, token).then((next) => {
        if (next.pushToken !== device.pushToken) {
          setDevice(next);
        }
      });
    });
  }, [device]);

  // Server reachability.
  useEffect(() => {
    let active = true;
    const check = async () => {
      const ok = await health();
      if (active) {
        setServerOk(ok);
      }
    };
    void check();
    const id = setInterval(() => void check(), HEALTH_POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  // The server's mailbox. A push only wakes the app, so the messages are fetched when the app
  // opens or comes to the front and when a push arrives or is tapped. Without real push
  // (Expo Go, Android) a timer keeps asking while the app is open.
  useEffect(() => {
    if (!device) {
      return;
    }
    let active = true;
    let inFlight = false;
    const poll = async () => {
      if (inFlight || AppState.currentState !== "active") {
        return;
      }
      inFlight = true;
      try {
        const result = await pullInbox(device);
        if (!active) {
          return;
        }
        setInboxStatus(result.status);
        if (result.received.length > 0) {
          await reload();
          void clearDeliveredPushes();
          const first = result.received[0];
          say(
            first?.sti
              ? `New alert: ${stiTitle(first.sti)}.`
              : "New alert. No card on this phone could open the details.",
          );
        }
      } finally {
        inFlight = false;
      }
    };
    void poll();
    const id = pushSupported ? null : setInterval(() => void poll(), INBOX_POLL_MS);
    const stopWake = onPushWake(() => void poll());
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void poll();
      }
    });
    return () => {
      active = false;
      if (id) {
        clearInterval(id);
      }
      stopWake();
      sub.remove();
    };
  }, [device, reload, say]);

  const onSubscribed = useCallback(
    async (card: CardRecord, alreadyKnown: boolean) => {
      await reload();
      setRoute({ name: "home" });
      say(
        alreadyKnown
          ? "You already have this code."
          : "Card scanned. You can now safely discard it.",
      );
    },
    [reload, say],
  );

  const onSent = useCallback(
    async (outcome: NotifyOutcome) => {
      await reload();
      setRoute({ name: "home" });
      if (__DEV__) {
        // Development log only. Counts are never shown in the UI.
        console.log(
          `[notify] campaign ${outcome.campaignId}: contacts ${outcome.contacts}, pushed ${outcome.pushed}, retrying ${outcome.retrying}`,
        );
      }
      say(
        outcome.pushed === 0 && outcome.retrying === 0
          ? "Sent, but nobody else has scanned yet. Your campaign limit was not used."
          : "Your partners have been notified. Thanks for taking care of them.",
        9000,
      );
    },
    [reload, say],
  );

  const onAcknowledge = useCallback(
    async (alert: AlertRecord) => {
      await acknowledgeAlert(alert.id);
      await reload();
      // European Test Finder (ECDC, run from the Capital Region of Denmark).
      void Linking.openURL(TEST_FINDER_URL);
    },
    [reload],
  );

  const onDismissAlert = useCallback(
    async (alert: AlertRecord) => {
      await acknowledgeAlert(alert.id);
      await reload();
    },
    [reload],
  );

  const onDeleteData = useCallback(async () => {
    if (!device) {
      return;
    }
    try {
      await deleteDevice({ push_id_hash: device.pushIdHash, device_credential: device.credentialHex });
    } catch (e) {
      Alert.alert("Could not delete your data", describeError(e));
      return;
    }
    await clearLocalData();
    const identity = await loadOrCreateDevice();
    setDevice(identity);
    await reload();
    setTab("home");
    say("Your data was deleted.");
  }, [device, reload, say]);

  const onResetInstall = useCallback(() => {
    Alert.alert(
      "Reset this install?",
      "Removes the device credential, cards, and alerts from this phone. The server keeps its rows; this is only for development.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await clearLocalData();
            const identity = await loadOrCreateDevice();
            setDevice(identity);
            await reload();
            say("Fresh install. New device credential and push token.");
          },
        },
      ],
    );
  }, [reload, say]);

  if (!fontsLoaded || !device) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.loading}>{fontsLoaded ? "Preparing your device key…" : ""}</Text>
        </View>
      </Screen>
    );
  }

  let body;
  if (route.name === "scan") {
    body = <ScanScreen device={device} onBack={() => setRoute({ name: "home" })} onSubscribed={onSubscribed} />;
  } else if (route.name === "generate") {
    body = (
      <GenerateScreen device={device} onBack={() => setRoute({ name: "home" })} onGenerated={() => void reload()} />
    );
  } else if (route.name === "notify") {
    body = (
      <NotifyScreen device={device} cards={cards} onBack={() => setRoute({ name: "home" })} onSent={onSent} />
    );
  } else if (tab === "history") {
    body = <HistoryScreen
        alerts={alerts}
        sent={sent}
        onFindTest={() => void Linking.openURL(TEST_FINDER_URL)}
      />;
  } else if (tab === "info") {
    body = <InfoScreen />;
  } else if (tab === "settings") {
    body = (
      <SettingsScreen
        device={device}
        serverOk={serverOk}
        serverUrl={apiBaseUrl()}
        inboxStatus={inboxStatus}
        onDeleteData={onDeleteData}
        onResetInstall={onResetInstall}
      />
    );
  } else {
    body = (
      <HomeScreen
        cards={cards}
        alerts={alerts}
        message={message}
        onScan={() => setRoute({ name: "scan" })}
        onGenerate={() => setRoute({ name: "generate" })}
        onNotify={() => setRoute({ name: "notify" })}
        onAcknowledge={onAcknowledge}
        onDismiss={onDismissAlert}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <Screen>
        <StatusBar style="light" />
        <View style={styles.body}>{body}</View>
        {route.name === "home" ? (
          <TabBar
            active={tab}
            onSelect={setTab}
          />
        ) : null}
      </Screen>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loading: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 14,
  },
});
