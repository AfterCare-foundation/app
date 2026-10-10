# AfterCare app

Mobile app for [AfterCare](https://after-care.eu/): anonymous STI exposure notification. People connect by scanning a paper card. Later, if someone tests positive, they can warn their connections without names, phone numbers or an account.

This repo is the **mobile app** (Expo / React Native / TypeScript). The notification server is a separate repo, [AfterCare backend](https://github.com/AfterCare-foundation/backend). Both are open source under [AGPL-3.0](LICENSE).

**Status:** club (paper card) flow only. In development, not production-ready.

## What the app does

- **Add**: scan or paste a connection code from someone's card.
- **Create**: show your own code to be scanned.
- **Notify partners**: after a positive test, warn the people you connected with. Pick the infection and the date of your last negative test or completed treatment for it. The app works out whom to notify from that, and the notification is sent immediately. You check a preview of what they will see on the confirmation screen.
- **Alerts**: if someone you connected with reports an infection, the app shows an alert. Alerts are kept in History. The alert card is short: who reported what, and "Get tested when you can". Only for HIV and mpox it adds one line about PEP or a vaccine while the 72-hour or 14-day deadline can still be met (`pepLine` in `src/advice.ts`). The rest of the timing advice is not shown on it. When a retest is due, the Home screen shows the same exposure card as a new alert (same text, same "Need a test?" block), until the user taps OK. A retest is not labelled as one. The phone also schedules a local notification for it (`src/reminders.ts`, same generic text as a real alert push: "You have a new message. Open the app to read it."). Nothing goes to the server. Each alert gets a random delay of 0 to 72 hours, chosen when it is opened, that is added to the reminder times, so the time does not give the contact day away. Reminders never fire before 10:00 or after 20:00 local time. OK, deleting data and resetting the install cancel them. So does notifying partners about the same infection afterwards: someone who tested positive does not need a retest (`settleRetests` in `src/flows.ts`). It is worked out on the phone from the day the card was saved, when the alert is opened. That date is never shown and never sent to the server, and the alert text carries no retest date.
- **Test finder**: an alert points to the European Test Finder. The same link is on History and Info.

Keys and connection codes stay on the phone (in the secure store). Only hashes and encrypted payloads are sent to the server. The cryptographic contract is documented in the backend repo (`docs/CRYPTO.md`); the app side is in `src/crypto/`.

## Who gets notified

Notify never asks "who". The infection and the date decide, and the rules are in `src/windows.ts`:

- With a date (last negative test or completed treatment): contacts saved on or after that day, but never further back than the infection's standard lookback. Any past date can be picked, and an older one simply gives the standard period.
- Without a date: a per-infection lookback counted back from today. The periods come from the German STI Society (DSTIG) and the IUSTI 2024 European partner-management guideline. Each value in `LOOKBACK_DAYS` names its source, and the links are in that file.
- Contacts already told about the same infection are skipped, and at most 100 contacts go in one send.
- Nothing is scheduled. Every notification is sent immediately, and the app never sends `scheduled_at`. When a test becomes reliable is for the recipient's clinic to say.
- Herpes and HPV are not offered, because neither guideline recommends notifying past partners for them.

The server keeps each code for **6 months** (180 days), so contacts older than that can't be reached. `MAX_AGE_DAYS` in `src/windows.ts` must stay in step with the backend's `SUBSCRIPTION_TTL_DAYS`.

The infection list, lookback values and the timing advice in `src/advice.ts` is health content. Have them reviewed by clinicians before changing them.

## Requirements

- Node.js 20 or newer and npm
- The **Expo Go** app on your phone (App Store / Google Play), and/or Xcode (iOS Simulator) or Android Studio (emulator)

## Setup

```bash
npm install
```

### Pointing the app at a server

The app talks to the AfterCare backend. By default it uses `http://127.0.0.1:8000` (see `src/api/client.ts`). To use another server, for example a hosted dev one, create a git-ignored `.env.local` in this folder:

```bash
EXPO_PUBLIC_API_URL=https://your-dev-backend.example.com
```

Restart Metro after changing it (`npx expo start --clear`). `.env*` files are git-ignored, so don't commit server addresses or credentials.

To run the backend locally, follow the backend repo's README. A real phone can't reach `127.0.0.1` on your computer, so for phone testing use a hosted dev server or your computer's LAN address.

## Run and test with Expo Go

```bash
npm start
```

This starts Metro and prints a QR code. Then pick one:

### On a real phone

1. Install **Expo Go** and open it.
2. **Same Wi-Fi as your computer:** scan the QR code (iOS: the Camera app; Android: Expo Go), or enter `exp://<your-computer-LAN-IP>:8081` manually.
3. **Different network, or Wi-Fi that blocks device-to-device traffic** (office, guest, firewall): use a tunnel instead.

   ```bash
   npm install -g @expo/ngrok   # one time
   npx expo start --tunnel
   ```

   Open the printed `exp://….exp.direct` link in Expo Go. The link changes on every start. Keep the dev server running and the computer awake while testing.

The camera is needed for scanning cards. Allow the permission when asked. Without a camera you can paste a code instead.

### iOS Simulator

```bash
npm run ios
```

or press `i` in the Metro terminal. The simulator has **no camera**, so scanning only works by pasting a code.

### Android emulator

```bash
npm run android
```

or press `a` in the Metro terminal.

### Trying a full flow

You need two installs (two phones, or a phone and a simulator), one acting as each person:

1. On device A open **Create** to show a code. On device B open **Add** and scan (or paste) it.
2. On device A choose **Notify partners**, pick an infection and a date, check the preview and confirm.
3. Device B gets an alert within a few seconds. The app polls the server while it is open.

### Troubleshooting

- **App won't open or shows a red error screen:** shake the device (or press `r` in Metro) to reload. If Metro seems stuck, run `npx expo start --clear`.
- **"Cannot reach server":** check `EXPO_PUBLIC_API_URL`, that the server is up, and that the phone has internet.
- **Phone can't find the LAN address:** a firewall or VPN may be blocking it. Use `--tunnel`.
- **Tunnel fails to start:** install `@expo/ngrok` (see above) and try again.
- **Changes don't show up:** Fast Refresh sometimes stalls. Reload the app, or close Expo Go and reopen the project link.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start Metro / Expo dev server |
| `npm run ios` / `npm run android` | Start and open in a simulator / emulator |
| `npm test` | Unit tests (crypto contract vectors, notify windows, timing advice) |
| `npm run typecheck` | TypeScript check for the app and tests |

Run `npm test` and `npm run typecheck` before sending changes.

## Project layout

```
App.tsx            navigation and app-level state
src/screens/       Home, Add (Scan), Create (Generate), Notify, History, Info, Settings
src/components/    shared UI (buttons, panels, logo, exposure card)
src/crypto/        hashing and encryption (must match the backend contract)
src/storage/       secure on-device storage
src/api/           server client
src/sti.ts         list of infections shown in the app
src/windows.ts     which contacts to notify, lookback periods and their sources
src/advice.ts      timing advice and retest dates (one table per infection, with sources); the alert card shows only the PEP line
test/              unit tests
```

## Push notifications

iOS builds from EAS (`eas build --platform ios --profile testflight`) use real push through `expo-notifications` and the native APNs token (`src/push.ts`). Expo Go and Android keep a stub push token, because real push needs a build with the push entitlement, and ask the server's mailbox on a timer while the app is open. Android (FCM) is not set up. Don't commit Apple or Google credentials.

- **Permission:** iOS asks when the user first scans a code (`subscribeToCard`), not at launch. A short message explains why first, because iOS shows its own prompt only once. If notifications are off for AfterCare, Home shows a banner that opens iOS Settings. It is rechecked when the app comes to the front.
- **Mailbox:** a push is only a wake-up with generic lock-screen text. The messages wait on the server. The app calls `POST /inbox` when it opens, comes to the front, or a push arrives or is tapped, decrypts each message with the matching card, saves it on the phone, and only then calls `POST /inbox/confirm`. A message no card can open stays on the server (dropped after 7 days) and is fetched again. See `pullInbox` in `src/flows.ts`.
- **Dismissed pushes:** nothing is lost, because the ciphertext is in the mailbox, not in the push.
- **Token changes:** `syncPushToken` in `src/flows.ts` compares the OS token with the one the server last accepted, at launch and when the OS reports a new one, and calls `POST /update-push-id`. It is skipped until the first successful `/subscribe`.

## Security

Please don't report vulnerabilities in public issues. See [SECURITY.md](SECURITY.md).

## License

[AGPL-3.0](LICENSE)
