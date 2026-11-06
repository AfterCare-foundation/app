# App switch to v2.1 routing — plan

Status: **plan only, nothing built.** Written 2026-11-06 against `backend/docs/CRYPTO.md` §4
(server side done and unpushed on backend `main`: `/v2/slots`, `/v2/slots/reseal`,
`/v2/notify`, `/v2/inbox`, `/v2/inbox/confirm`, `/v2/forget`). App baseline: `752ceff`
(fix-plan step 1.5: v2 padded messages, reader accepts v1 and v2).

CRYPTO.md is the contract and is read-only from this repo. Where this plan and CRYPTO.md
disagree, CRYPTO.md wins; stop and report the gap rather than work around it.

**Ready now (2026-11-06):** Chunk 1 (keys, §4.5 vectors, nonce-owning seal/encrypt) and the
API-client half of Chunk 2 (request/response types and the typed error value; no user-facing
copy). **Waiting for the founders' answers to Q1 and Q3–Q7:** user-facing errors (Chunk 2
copy), migration of stored cards (Chunk 3) and "Delete my data" (Chunk 8). Chunks 4–7 build
on Chunk 3's storage and follow it.

## How to run this plan

Chunks run in order, one commit or more each, every commit green (`npm test`,
`npm run typecheck`). **After each chunk and before the next one: a reflection gate.** Reread the
chunk's diff against its "bad ways" table, write down what turned out different from this plan
and any improvement it suggests, and fold that into the remaining chunks' design (edit this file
in the same commit) before moving on. The gates below already record what this planning pass
folded in. They are where the next ones go.

---

## 0. What the app does today (v1), for orientation

- One `DeviceIdentity` (credential + push token, `src/storage/secureStore.ts`); cards keyed by
  `etHash` = SHA-256(TOKEN); messages keyed with `enc_key` (`src/crypto/contract.ts`).
- `subscribeToCard` → `/subscribe`; `notifyContacts` → `/notify`, with per-card `skipped`
  reasons and a `resubscribe` second campaign; `pullInbox` → `/inbox` + `/inbox/confirm`;
  `syncPushToken` / `syncLanguage` → `/update-push-id`; `deleteAllData` → `DELETE` device, then
  `clearLocalData`, resumable through the `wipe.pending` marker (`src/flows.ts`).

---

## Chunk 1 — Keys and sealing (§4.1, §4.2, §4.5)

Pure functions in `src/crypto/` plus tests. No network, no storage.

- `routeId(token)`, `sealKey(token)`, `msgKey(token)`: HKDF-SHA256, IKM = 16 raw token bytes,
  salt absent, 32-byte output, `info` = `aftercare/v2/route` | `aftercare/v2/seal` |
  `aftercare/v2/msg`. `@noble/hashes/hkdf` is already a dependency (no new package).
- `slotSecret(installSecret, routeIdBytes)`: HKDF(IKM = install_secret, salt = the **32 raw
  bytes** of route_id, info = `aftercare/v2/slot`). `slotHash` only in tests (the server
  computes it).
- `sealPush(sealKey, {p, t, l})`: JSON keys in order `p,t,l`, zero-pad to 256, AES-256-GCM,
  380 chars. Throws if the JSON is over 256 bytes (token over 229 ios / 225 android).
- `encryptMessage(msgKey, …)` / `decryptMessage(msgKey, …)`: the 1.5 plaintext and reader,
  keyed with `msg_key` instead of `enc_key`. Share the padding and parsing code with 1.5; do
  not copy it.
- **Nonces:** the functions the app calls take no nonce and draw 12 fresh random bytes inside.
  The deterministic variants used by tests are named `…WithNonceForTesting` and a test greps
  `src/` (outside `src/crypto/`) to fail if anything imports them.

Tests (`test/contract.test.ts`, or a new `test/contract_v2.test.ts` if the file gets long):
every §4.5 value reproduced exactly (route_id, seal_key, msg_key, slot_secret, slot_hash,
the 91-byte sealed JSON + 165 zero bytes, `sealed_push`), cross-checked against Node's own
`crypto.hkdfSync` and AES-GCM as the independent reference, as the v1 tests do today. Plus:
salt is bytes not hex (a hex salt gives a different secret); two cards give unrelated slot
secrets; two seals of the same input differ; length is always 380; over-long token throws.

| Bad way | Why it's bad | Good way |
|---|---|---|
| Nonce as a parameter of the app-facing functions (the v1 pattern) | One caller passing a constant or reused nonce breaks AES-GCM for **both** phones on the card (they share the keys) | Nonce drawn inside; deterministic variant test-only and import-guarded |
| Salt = route_id hex string | Matches nothing on the server's vector; silently wrong only for v2 | Raw 32 bytes; a test proves hex salt fails the vector |
| Copy the 1.5 pad/parse code for v2 messages | Two readers drift | One padded-plaintext module, two keys |
| Only self-consistency tests | Both sides can be wrong the same way | Exact §4.5 vectors + Node `hkdfSync` reference |

**Gate 1 (folded in now):** the vector nonces in §4.5 tempt a "fixed nonce for tests" global.
Hence the import-guard test rather than a comment.

---

## Chunk 2 — API client and error mapping (§4.3)

`src/api/client.ts`: request/response types for the six `/v2` calls, mirroring
`backend/app/models.py` (`V2JoinRequest`, `V2ResealRequest`, `V2NotifyRequest`,
`V2InboxRequest`, `V2ConfirmRequest`, `V2ForgetRequest`). Bodies refuse unknown fields, so
send exactly the listed keys and omit optional booleans when false.

Errors become a typed value, not regex on `detail`:

| Server answer | App meaning | What the user sees (draft copy, see Q4) |
|---|---|---|
| 403 `unknown_card` | One or more cards in the request are not proven (slot expired, or never joined). Nothing changed. | Not shown directly: Chunk 6 finds the card and retries without it. If a card is dropped: "Some of your connections have expired and could not be told." |
| 409 `code_in_use` (scan) | Card full or burned | "This code is already in use." (existing string) |
| 409 `campaign_already_used` (notify) | The earlier send with this id went through | Success screen, as if just sent |
| 429 `send_limit` | A card is over 2/day or 4/30 days. Whole request refused, nothing stored. | Should not happen (Chunk 6 pre-checks). If it does: "You have reached the limit for notifications for now." (existing string) |
| 503 `busy` | Global limit this hour. Nothing stored. | "AfterCare is busy right now. Your alert has not been sent yet. Try again in an hour." (see Q5) |
| 413 / 422 | App bug | "Something went wrong" (dev log only, never the body) |
| Network error / timeout | Outcome unknown | Notify: kept as pending (Chunk 6). Others: retried at the next trigger. |

| Bad way | Why it's bad | Good way |
|---|---|---|
| Keep `describeError`'s regexes on `detail` | v2 details are fixed codes; regex invites false matches between v1 and v2 | `V2Error` union by `(status, detail)` |
| Show 403 `unknown_card` as "Refused" | Blames the user for an expired slot; reveals nothing useful | Resolve in the flow (Chunk 6) |
| Log request bodies on failure | Bodies hold slot secrets and seal keys | Log status and code only, `__DEV__` only |

**Gate 2 (folded in now):** 403 and 429 are raised inside the server's notify transaction
(`v2_flow.run_notify`), so the campaign claim rolls back. The same `campaign_id` is safe to
reuse after dropping a card. Chunk 6 relies on this; pinned by the server's
`tests/test_v2_notify.py` (403 and 429 cases).

---

## Chunk 3 — Local data and migration of v1 cards

- `install_secret`: 32 random bytes, SecureStore, created once. Kept under its own key, not
  inside `DeviceIdentity`, so v1 code that rewrites the identity can't drop it.
- Card storage keeps `etHash` as the **local** id (`card.<etHash>` keys and `AlertRecord.etHash`
  stay as they are). New optional fields: `routeId` and `v2: "pending" | "joined" | "refused"`.
  No storage key is renamed, so a crash mid-migration loses nothing.
- Migration runs at launch, in the background, on cards with `v2` unset or `pending`, **one
  `/v2/slots` per card** (§4.4), never with `new_install`. Results: 200 → `joined`; 409
  `code_in_use` → `refused` (the card stays readable for v1 messages but can't send or receive
  on v2; see Q3); network / 503 → stays `pending`, next launch.
- Cards older than `MAX_AGE_DAYS` from `scannedAt` are not migrated (v1 has dropped them).
- Usage-flag state: last UTC day `first_open_today` was sent, last UTC month
  `first_open_this_month` was sent, and whether this install has sent `new_install`. Set only
  after the request carrying the flag succeeded.

| Bad way | Why it's bad | Good way |
|---|---|---|
| Migrate all cards in one burst at first launch | Same-second rows sit together in WAL/backups, linking one phone's cards (the reason §4.4 forbids batching) | One card per request, spread out: at most one per launch or per minute (see Q6) |
| Rename storage to `route_id` keys | A crash mid-rename loses cards; every reader changes | Keep `etHash` as local id; add `routeId` |
| Mark migrated cards with `new_install` | Inflates the installs stat by every existing tester | Never on migration |
| Treat `code_in_use` on migration as "delete the card" | It can hold unread v1 messages, and the user loses a contact silently | Keep, mark `refused`, decide display with Q3 |

**Gate 3 (folded in now):** iOS Keychain items usually survive an uninstall; Android Keystore
does not. Re-scan after an Android reinstall therefore makes a new secret and gets 409. Android
isn't shipped yet; listed as Q8 and a Check, not designed around.

---

## Chunk 4 — Scan → `/v2/slots`

`subscribeToCard` becomes: parse → derive keys → `sealPush` with the current token and
language → `POST /v2/slots` → `saveCard` with `v2: "joined"`. `new_install: true` on the first
successful join of this install only (Q2). Re-scanning a card the phone already holds is a
normal 200 (sealed push replaced, expiry not extended).

| Bad way | Why it's bad | Good way |
|---|---|---|
| Queue scans offline and send them later together | Batches them (§4.4) | A scan fails visibly when offline, like today |
| Save the card before the server answered | A 409 card would sit on the phone as a contact that can never send | Save after 200, as today |
| Re-scan as a way to refresh the push token | Expiry isn't extended, and reseal is the documented path | Reseal (Chunk 7) |

**Gate 4:** to be written after building.

---

## Chunk 5 — Inbox on v2

`pullInbox` sends `/v2/inbox {cards: joined cards' (route_id, slot_secret)}`, with
`first_open_today` / `first_open_this_month` when due. Decrypt each `enc` with each joined
card's `msg_key` (keys derived once per pull, as today). Store `connected` per card from the
response. Confirm with `/v2/inbox/confirm` after saving, same paging (200) and round cap.
Dedupe by the message `id` inside the plaintext plus STI (stronger than `enc`, which differs
per card when one sender reaches us through several codes).

While v1 still exists (until 2.9), also drain the v1 inbox as today, read-only in the sense of
the transition: a 404 or other failure from a v1 call is ignored.

| Bad way | Why it's bad | Good way |
|---|---|---|
| One `/v2/inbox` per card | N requests every open, and they arrive together anyway; inbox writes no slot rows, so batching it links nothing in the database | One request with all joined cards (1–100) |
| Let one expired card's 403 break the whole inbox forever | Any slot past 180 days would stop all alerts | On 403: find the unproven card with one-card `/v2/inbox` probes (they change nothing), mark it expired, retry |
| Send the usage flags on every open | Breaks the "phone deduplicates" promise (N1) and inflates stats | Local last-sent day/month, set after success |
| Try `enc_key` and `msg_key` on every message | Twice the work; hides which path a message came from | v1 inbox → `enc_key`, v2 inbox → `msg_key` |

**Gate 5 (folded in now):** `connected` is the only per-card delivery signal v2 gives (the
notify response is counts only). Chunk 6 uses it.

---

## Chunk 6 — Notify on v2

1. Refresh `connected` (an inbox pull) just before building the send.
2. Deliveries go **only to joined, connected, unexpired cards** that are under the per-card
   limit by the phone's own count (2 per UTC day, 4 per 30 days, recorded per card when a send
   succeeds). Unconnected cards count as `waiting` locally, as today's "nobody has scanned
   these cards yet". Reason: the server bumps the sender's counter before checking for a
   partner, so a delivery to an unconnected card spends budget and stores nothing.
3. One `campaign_id`, fresh nonce and message id per delivery, `d` = UTC send date.
4. Before sending, persist the exact body as a pending send (SecureStore already holds the
   tokens these keys come from). Network failure or 503 → keep it pending; retry with **the
   same body and the same `campaign_id`** (§4.4) at the next app open / user tap (Q5).
   200 or 409 `campaign_already_used` → mark cards notified, delete the pending send.
5. 403 `unknown_card` → probe to find the card(s) (Chunk 5), mark them expired, rebuild the
   body without them, keep the `campaign_id` (Gate 2), send once more. 429 → drop the card(s)
   the local count says are nearest the limit, same way; if still 429, stop and show the
   limit message.
6. Remove `resubscribe` and the second campaign from the v2 path; they existed for v1's
   `not_subscribed`.

| Bad way | Why it's bad | Good way |
|---|---|---|
| New `campaign_id` on retry | Can send twice if the first one landed | Same id; 409 = sent |
| Fresh nonces on retry of the same campaign | The body changes; harmless for GCM but makes the retry a different message (double alerts if the first landed) | Replay the stored body byte for byte |
| Send to every card and read `waiting` | Spends the partner-protection budget for nothing; can't say which card waited | Connected cards only |
| Let the server's 429 be the limit check | One over-limit card refuses the whole send for everyone else | Local pre-check per card |
| Mark cards notified on 503 | It wasn't sent | Only on 200 / 409 |

**Gate 6 (folded in now):** a pending send held for hours conflicts with the README's "sent
immediately" wording and with "Never retry a failed push yourself" (§1, a v1 rule about pushes,
not bodies). Both need the founders' answer to Q5 and a README update in this chunk.

---

## Chunk 7 — Reseal on push token or language change

`syncPushToken` and `syncLanguage` call `/v2/slots/reseal` for joined cards with a fresh seal
per card; the stored token changes only after success, as today. Also called once after
migration finishes, so every slot holds the current token. Replaces `/update-push-id` for v2.

| Bad way | Why it's bad | Good way |
|---|---|---|
| One reseal request with all cards | One transaction updates every slot of this phone together: the backup link §4.4 avoids | One card per request (§4.4) |
| Build one seal and a nonce once, loop over cards | Tempts reusing the nonce; each card has its own `seal_key` anyway | `sealPush` per card, nonce inside |
| Reseal on every launch | Needless writes that line up this phone's slots in time | Only on a real token or language change |

**Gate 7:** to be written after building.

---

## Chunk 8 — "Delete my data"

Order, with the existing `wipe.pending` marker extended by per-card progress:

1. Write the marker.
2. `/v2/forget` for joined cards, one card per request (§4.4), recording each confirmed card.
   403 `unknown_card` counts as done (already gone).
3. v1 `DELETE` device as today while v1 exists; 403 or 404 counts as done.
4. **Only after 2 and 3 are confirmed:** `clearLocalData` (now also `install_secret`, the
   usage-flag state and pending sends), then clear the marker.

Any other failure leaves the marker, and `resumePendingWipe` continues from the recorded
progress at the next launch. Delete `install_secret` last: without it the phone can no longer
prove its slots, so a premature delete would leave them on the server for 180 days.

| Bad way | Why it's bad | Good way |
|---|---|---|
| Wipe the phone, then call forget "in the background" | Offline → the server keeps slots and mailbox for 180/30 days and the phone can no longer prove them | Server first, phone after confirmation (Phase 4 rule in the fix plan) |
| Forget all cards in one request | Burned routes written in one transaction link the phone's cards in a backup | One per request |
| Treat 403 as failure | A card that already expired would block the wipe forever | 403 = done |

**Gate 8:** to be written after building.

---

## Chunk 9 — What stays v1, and the order of release

The app never **depends** on both sides: every v2 path works with v1 gone, and every remaining
v1 call is optional and treats 404 as "done".

| Stays v1 until server step 2.9 | Why | After 2.9 |
|---|---|---|
| Reading the v1 inbox (`/inbox`, `/inbox/confirm`) and `enc_key` decryption | Messages sent by not-yet-updated testers to this phone's v1 subscription | Remove the calls; keep decrypting already stored alerts (they are plaintext on the phone, nothing to do) |
| v1 `DELETE` device in "Delete my data" | Removes the v1 device row and subscriptions | Remove |
| v1 message reader (1.5 transition) | Old stored `enc` values, old senders | Separate decision; not tied to routing |

Moves to v2 with no v1 fallback: scan, notify, push token / language updates. The app stops
calling `/subscribe`, `/notify` and `/update-push-id`. The one-way consequence: a v2 sender
can't reach a partner still on an old build (no slot → `waiting`; nothing is stored for them).
That's the rollout question Q1.

Release order: server v2 deployed (migrations 008, 009) → this build to TestFlight → testers
updated (Q1) → backend 2.9 removes v1 → a later app build removes the v1 calls.

---

## Open technical points (for the user / backend, not founders)

- **T1. Resolved** (backend `b54716e`): §4.4 now says reseal and forget go one card per request.
- **T2. Resolved** (backend `b54716e`): §2 vector prose corrected to 81 + 175 bytes. The app
  test's comment about the old prose can go in Chunk 1.
- **T3. Resolved:** the server's `tests/test_v2_notify.py` already checks that a 403 or 429
  leaves the `campaign_id` unused and sendable again.

## Questions for the founders (clinical or product; no answer assumed)

- **Q1. Rollout.** A v2 sender can't reach a tester still on an old build. Require every tester
  to update before anyone sends on v2 (a minimum-version gate), or accept that those alerts show
  as "waiting"?
- **Q2. What counts as an install** for `new_install`: a reinstall that kept its Keychain
  secret, yes or no? Rec (technical, for the day boundary only): "today" / "this month" are
  UTC, because the server files the counts by UTC day. The install definition is still open.
- **Q3. A card refused at migration** (`code_in_use`: someone else took the second slot): show
  it to the user as "no longer connected", or hide it?
- **Q4. Wording** for each error the user can see (draft copy in Chunk 2), German included.
- **Q5. A send that hit "busy" or a lost connection:** retry automatically at the next app open,
  or only when the user taps again? How long may a pending alert wait before it's dropped? This
  changes the README's "sent immediately" promise.
- **Q6. Migration pacing.** One card per launch is safest for privacy but slow for someone with
  many cards. Is a delay of a few days before every card works on v2 acceptable?
- **Q7. Card lifetime after migration.** The server keeps a slot 180 days from the migration
  join, not from the original scan. Should the phone forget a card 180 days after its original
  scan (as v1 did), or let it run to the server's expiry? Rec (technical): original scan + 180,
  with the phone sending `/v2/forget` then. Otherwise a card moved on day 170 stays on the server
  for about 350 days, and the 180-day retention promise quietly stretches.
- **Q8. Android reinstall** loses the install secret, so the user loses their cards (re-scan
  gives "already in use"). Acceptable for the Android launch, or does that need a design?
- **Q9. The send date `d`** now arrives with every v2 message. Should the recipient's alert show
  it, or stay as today (arrival date only)? This is a clinical-communication question; the app
  must not present it as an exposure date either way.

## Checks (need a device)

- [ ] Check: SecureStore `install_secret` survives an iOS uninstall/reinstall (TestFlight build).
- [ ] Check: a real APNs token seals under 256 bytes and passes `is_valid_push_token`.
- [ ] Check: Expo Go / stub tokens (`stub-ios-<uuid>`): what `/v2/slots` and a later notify do
      with them. v1 already rejects them by format; the server can't see inside a seal at join.
