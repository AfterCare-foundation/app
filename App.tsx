import { useFonts } from "expo-font";
import { DarkTheme, NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState, Linking, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { resolveChoice, setLang, t, type Choice } from "./src/i18n";
import { apiBaseUrl, deleteDevice, health } from "./src/api/client";
import { useAppLock } from "./src/appLock";
import { Screen, TabBar, type Tab } from "./src/components/Chrome";
import { formatDate, stiTitle } from "./src/components/ExposureCard";
import {
  currentPushToken,
  describeError,
  pullInbox,
  raiseDueRetests,
  closeExposure,
  recordTestForAlert,
  syncLanguage,
  syncPushToken,
  type InboxStatus,
  type PullStats,
  type NotifyOutcome,
} from "./src/flows";
import { cancelAllRetestReminders, scheduleRetestReminders } from "./src/reminders";
import {
  clearDeliveredPushes,
  installNotificationHandler,
  onPushTokenChange,
  onPushWake,
  openNotificationSettings,
  pushIsBlocked,
  pushSupported,
} from "./src/push";
import { TodoScreen, type Celebration } from "./src/screens/TodoScreen";
import { InfoScreen } from "./src/screens/InfoScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { LockScreen, PrivacyCover } from "./src/screens/LockScreen";
import { GenerateScreen } from "./src/screens/GenerateScreen";
import { NotifyScreen } from "./src/screens/NotifyScreen";
import { ScanScreen } from "./src/screens/ScanScreen";
import { TestedScreen } from "./src/screens/TestedScreen";
import {
  acknowledgeAlert,
  clearLocalData,
  listAlerts,
  listCards,
  listSent,
  listTests,
  deleteTests,
  loadLanguageChoice,
  loadOrCreateDevice,
  saveLanguageChoice,
  type AlertRecord,
  type CardRecord,
  type DeviceIdentity,
  type SentRecord,
  type TestRecord,
} from "./src/storage/secureStore";
import { isCovered, type TestResult } from "./src/testRules";
import { openGroups, untested, type TodoGroup } from "./src/todo";
import { colors, fonts } from "./src/theme";

type Route =
  | { name: "home" }
  | { name: "scan" }
  | { name: "generate" }
  | { name: "notify"; sti?: string }
  | { name: "tested"; alerts: AlertRecord[]; from?: Celebration };

installNotificationHandler();

const Stack = createNativeStackNavigator();
const NAV_THEME = { ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg } };

/** Marks an alert as seen and schedules its retest reminders, counted from the day its card was saved. */
async function openAlert(alert: AlertRecord): Promise<void> {
  const opened = await acknowledgeAlert(alert.id);
  if (!opened || opened.retestOf || opened.noAction) {
    return; // a retest alert has no retest of its own; one that needs no action has none either
  }
  if (isCovered(opened.testCheck)) {
    return; // a test taken after the contact already covers it
  }
  const cards = await listCards();
  const scannedAt = cards.find((c) => c.etHash === opened.etHash)?.scannedAt ?? null;
  await scheduleRetestReminders(opened, scannedAt);
}

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
  const [tests, setTests] = useState<TestRecord[]>([]);
  // The lock has nothing to protect on a fresh install; null until the first load is done.
  const [dataLoaded, setDataLoaded] = useState(false);
  const [route, setRoute] = useState<Route>({ name: "home" });
  const lastDetail = useRef<Route>({ name: "home" });
  const navigation = useNavigationContainerRef<{ Main: undefined; Detail: undefined }>();
  const [tab, setTab] = useState<Tab>("home");
  // The stack follows `route`: a sub-screen is pushed over the tabs, and removed when the route is home again.
  useEffect(() => {
    if (!navigation.isReady()) {
      return;
    }
    const onDetail = navigation.getCurrentRoute()?.name === "Detail";
    if (route.name !== "home" && !onDetail) {
      navigation.navigate("Detail");
    } else if (route.name === "home" && onDetail) {
      navigation.goBack();
    }
  }, [route, navigation]);
  const todoGroups = useMemo(() => openGroups(alerts), [alerts]);
  // A row ticked off in the To-do list, shown where it was while it animates away.
  const [celebrate, setCelebrate] = useState<Celebration | null>(null);
  // The language is read by `t()` while rendering; this state only makes the app render again when it changes.
  const [, setLangTick] = useState(0);
  const chooseLanguage = useCallback((choice: Choice) => {
    setLang(resolveChoice(choice));
    setLangTick((n) => n + 1);
    void saveLanguageChoice(choice);
    if (device) {
      void syncLanguage(device);
    }
  }, [device]);
  const lock = useAppLock(dataLoaded ? cards.length + alerts.length + sent.length + tests.length > 0 : null);
  const [serverOk, setServerOk] = useState<boolean | null>(null);
  const [inboxStatus, setInboxStatus] = useState<InboxStatus | null>(null);
  const [pullStats, setPullStats] = useState<PullStats | null>(null);
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
    const [nextCards, nextAlerts, nextSent, nextTests] = await Promise.all([
      listCards(),
      listAlerts(),
      listSent(),
      listTests(),
    ]);
    if (seq !== reloadSeq.current) {
      return; // a newer reload started meanwhile; its data is fresher
    }
    setCards(nextCards);
    setAlerts(nextAlerts);
    setSent(nextSent);
    setTests(nextTests);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const savedLanguage = await loadLanguageChoice();
      setLang(resolveChoice(savedLanguage));
      setLangTick((n) => n + 1);
      const loaded = await loadOrCreateDevice();
      if (cancelled) {
        return;
      }
      setDevice(loaded);
      await reload();
      setDataLoaded(true);
      // Tell the server if the OS handed out a new push token since the last launch.
      const synced = await syncPushToken(loaded, await currentPushToken(loaded));
      if (!cancelled && synced.pushToken !== loaded.pushToken) {
        setDevice(synced);
      }
      // The server picks the push text language from this; a failure is retried at the next launch.
      void syncLanguage(synced);
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  // Notifications switched off for AfterCare: checked on open, on coming to the front, and after a scan.
  const [pushBlocked, setPushBlocked] = useState(false);
  const checkPush = useCallback(() => void pushIsBlocked().then(setPushBlocked), []);
  // No phone code or biometrics: the app cannot lock itself. Warn, but do not block.
  const noPasscode = lock.noPasscode && cards.length + alerts.length + sent.length + tests.length > 0;
  useEffect(() => {
    if (noPasscode) {
      say(t("For your privacy, set a device passcode. Without one, anyone who picks up your phone can open AfterCare."), 10000);
    }
  }, [noPasscode, say]);

  // A retest that has come due becomes an ordinary unread alert. Checked on open and on coming to the front.
  const raiseRetests = useCallback(
    () => void raiseDueRetests().then((raised) => (raised > 0 ? reload() : undefined)),
    [reload],
  );
  useEffect(() => {
    checkPush();
    raiseRetests();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        raiseRetests();
        checkPush();
      }
    });
    return () => sub.remove();
  }, [checkPush, raiseRetests]);

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
        setPullStats(result.stats);
        if (result.received.length > 0) {
          await reload();
          void clearDeliveredPushes();
          const first = result.received[0];
          say(
            first?.sti
              ? t("New alert: {sti}.", { sti: stiTitle(first.sti) })
              : t("New alert. No card on this phone could open the details."),
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
    async (card: CardRecord, alreadyKnown: boolean, typed: boolean) => {
      await reload();
      checkPush();
      setRoute({ name: "home" });
      say(
        alreadyKnown
          ? t("You already have this code.")
          : typed
            ? t("Code added.")
            : t("Card scanned. You can now safely discard it."),
      );
    },
    [reload, say, checkPush],
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
          ? t("Sent, but nobody else has scanned yet. Your campaign limit was not used.")
          : t("Your partners have been notified. Thanks for taking care of them."),
        9000,
      );
    },
    [reload, say],
  );

  const onAcknowledge = useCallback(
    async (alert: AlertRecord) => {
      await openAlert(alert);
      await reload();
      // European Test Finder (ECDC, run from the Capital Region of Denmark).
      void Linking.openURL(TEST_FINDER_URL);
    },
    [reload],
  );

  const onDismissAlert = useCallback(
    async (alert: AlertRecord) => {
      await openAlert(alert);
      await reload();
    },
    [reload],
  );

  const onSaveTest = useCallback(
    async (alerts: AlertRecord[], result: TestResult, testedAt: string, from?: Celebration) => {
      let accepted = 0;
      let covered = 0;
      let notBefore = "";
      for (const alert of alerts) {
        const outcome = await recordTestForAlert(alert.id, alert.sti as string, result, testedAt);
        accepted += outcome.accepted ? 1 : 0;
        covered += outcome.covered ? 1 : 0;
        if (outcome.notBefore && outcome.notBefore > notBefore) {
          notBefore = outcome.notBefore;
        }
      }
      await reload();
      setRoute({ name: "home" });
      say(t("Test saved."));
      // The tick animation is for a row that leaves the list: every alert on it was covered.
      if (from && covered === alerts.length && alerts.length === from.group.alerts.length) {
        setCelebrate(from);
      }
      if (accepted === 0) {
        const from = notBefore || alerts.reduce((a, x) => (x.receivedAt > a ? x.receivedAt : a), "");
        Alert.alert(
          t("That date is too early"),
          t("A test counts for this alert only if it was taken on or after {date}. It stays on your list.", { date: formatDate(from) }),
        );
      }
      // A positive result is the moment to warn the people met since the last test.
      if (result === "positive") {
        Alert.alert(t("Notify your contacts?"), t("You can let the people you connected with know. They will not learn who you are."), [
          { text: t("Not now"), style: "cancel" },
          { text: t("Notify partners"), onPress: () => setRoute({ name: "notify", sti: alerts[0]?.sti ?? undefined }) },
        ]);
      }
    },
    [reload, say],
  );

  const onRemoveTodo = useCallback(
    async (group: TodoGroup) => {
      for (const alert of group.alerts) {
        await closeExposure(alert);
      }
      await reload();
    },
    [reload],
  );

  const onDeleteTests = useCallback(async () => {
    await deleteTests();
    await reload();
    say(t("Your test results were deleted."));
  }, [reload, say]);

  const onDeleteData = useCallback(async () => {
    if (!device) {
      return;
    }
    try {
      await deleteDevice({ push_id_hash: device.pushIdHash, device_credential: device.credentialHex });
    } catch (e) {
      Alert.alert(t("Could not delete your data"), describeError(e));
      return;
    }
    await clearLocalData();
    void cancelAllRetestReminders();
    const identity = await loadOrCreateDevice();
    setDevice(identity);
    await reload();
    setTab("home");
    say(t("Your data was deleted."));
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
    void cancelAllRetestReminders();
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
          <Text style={styles.loading}>{fontsLoaded ? t("Preparing your device key…") : ""}</Text>
        </View>
      </Screen>
    );
  }

  // Locked (or still deciding): nothing private is drawn. The inbox keeps being fetched meanwhile.
  if (lock.locked) {
    return (
      <SafeAreaProvider>
        <Screen>
          <StatusBar style="light" />
          <LockScreen onUnlock={() => void lock.unlock()} />
          {lock.covered ? <PrivacyCover /> : null}
        </Screen>
      </SafeAreaProvider>
    );
  }

  // The screen that slides over the tabs. While it slides away the route is already "home", so it
  // keeps showing the last one instead of the tab underneath.
  if (route.name !== "home") {
    lastDetail.current = route;
  }
  const detail = lastDetail.current;

  let detailBody = null;
  if (detail.name === "scan") {
    detailBody = <ScanScreen device={device} onBack={() => setRoute({ name: "home" })} onSubscribed={onSubscribed} />;
  } else if (detail.name === "generate") {
    detailBody = (
      <GenerateScreen device={device} onBack={() => setRoute({ name: "home" })} onGenerated={() => void reload()} />
    );
  } else if (detail.name === "tested") {
    const testedAlerts = detail.alerts;
    const testedSti = testedAlerts[0]?.sti ?? null;
    detailBody = testedSti ? (
      <TestedScreen
        sti={testedSti}
        existing={tests.filter((x) => x.sti === testedSti)}
        onBack={() => setRoute({ name: "home" })}
        onSave={(result, testedAt) => void onSaveTest(testedAlerts, result, testedAt, detail.from)}
        onRemove={
          detail.from
            ? () => {
                const group = (detail.from as Celebration).group;
                setRoute({ name: "home" });
                void onRemoveTodo(group);
              }
            : undefined
        }
      />
    ) : null;
  } else if (detail.name === "notify") {
    detailBody = (
      <NotifyScreen device={device} cards={cards} tests={tests} initialSti={detail.sti} onBack={() => setRoute({ name: "home" })} onSent={onSent} />
    );
  }

  let body;
  if (tab === "todo") {
    body = (
      <TodoScreen
        groups={todoGroups}
        celebrate={celebrate}
        onCelebrated={() => setCelebrate(null)}
        tests={tests}
        onTested={(group) => setRoute({ name: "tested", alerts: untested(group), from: { group, index: todoGroups.findIndex((g) => g.sti === group.sti) } })}
        onRemove={(group) => void onRemoveTodo(group)}
      />
    );
  } else if (tab === "info") {
    body = <InfoScreen />;
  } else if (tab === "settings") {
    body = (
      <SettingsScreen
        device={device}
        serverOk={serverOk}
        serverUrl={apiBaseUrl()}
        inboxStatus={inboxStatus}
        pullStats={pullStats}
        onDeleteData={onDeleteData}
        hasTests={tests.length > 0}
        onDeleteTests={onDeleteTests}
        onResetInstall={onResetInstall}
        onChooseLanguage={chooseLanguage}
      />
    );
  } else {
    body = (
      <HomeScreen
        cards={cards}
        alerts={alerts}
        onTested={(alert) => setRoute({ name: "tested", alerts: [alert] })}
        message={message}
        pushBlocked={pushBlocked}
        onOpenSettings={openNotificationSettings}
        onScan={() => setRoute({ name: "scan" })}
        onGenerate={() => setRoute({ name: "generate" })}
        onNotify={() => setRoute({ name: "notify" })}
        onAcknowledge={onAcknowledge}
        onDismiss={onDismissAlert}
      />
    );
  }

  // Tabs change at once, as on iOS. The other screens use the system stack: they slide in from the
  // right and can be swiped back. `route` stays the single source of truth; the stack follows it.
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer ref={navigation} theme={NAV_THEME}>
        <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="Main">
            {() => (
              <Screen>
                <View style={styles.body}>{body}</View>
                <TabBar active={tab} onSelect={setTab} todoCount={todoGroups.length} />
              </Screen>
            )}
          </Stack.Screen>
          <Stack.Screen
            name="Detail"
            listeners={{ beforeRemove: () => setRoute((current) => (current.name === "home" ? current : { name: "home" })) }}
          >
            {() => (
              <Screen>
                <View style={styles.body}>{detailBody}</View>
              </Screen>
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
      {lock.covered ? <PrivacyCover /> : null}
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
