// Checks the /v2 client's request bodies and error mapping against a stubbed fetch.

import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  V2Error,
  v2ConfirmInbox,
  v2Forget,
  v2Inbox,
  v2Join,
  v2Notify,
  v2Reseal,
  type V2Card,
  type V2Delivery,
  type V2SealedCard,
} from "../src/api/client";

process.env.EXPO_PUBLIC_API_URL = "http://api.test";
(globalThis as Record<string, unknown>).__DEV__ = false;

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  (globalThis as Record<string, unknown>).__DEV__ = false;
});

interface Call {
  url: string;
  init: RequestInit;
  body: unknown;
}

function stub(status: number, payload: unknown): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {}, body: JSON.parse(String(init?.body)) });
    return new Response(JSON.stringify(payload), { status });
  }) as typeof fetch;
  return calls;
}

const SECRET = "5".repeat(64);
const SEAL_KEY = "6".repeat(64);
const R1 = "1".repeat(64);
const R2 = "2".repeat(64);
const SEALED = "A".repeat(380);

// Extra fields at every level: the server rejects unknown ones with 422.
const card = (route: string): V2Card => ({ route_id: route, slot_secret: SECRET, etHash: "x" }) as V2Card;
const sealed = (route: string): V2SealedCard =>
  ({ route_id: route, slot_secret: SECRET, sealed_push: SEALED, etHash: "x" }) as V2SealedCard;
const delivery = (route: string): V2Delivery =>
  ({ route_id: route, slot_secret: SECRET, seal_key: SEAL_KEY, payload: SEALED, etHash: "x" }) as V2Delivery;

const plainCard = (route: string) => ({ route_id: route, slot_secret: SECRET });
const plainSealed = (route: string) => ({ ...plainCard(route), sealed_push: SEALED });

function checkPost(call: Call | undefined, path: string): Call {
  assert.ok(call, "fetch was called");
  assert.equal(call.url, `http://api.test${path}`);
  assert.equal(call.init.method, "POST");
  assert.deepEqual(call.init.headers, { "content-type": "application/json" });
  return call;
}

test("join sends exactly the listed keys; new_install only when true", async () => {
  let calls = stub(200, { status: "ok" });
  await v2Join(sealed(R1));
  assert.deepEqual(checkPost(calls[0], "/v2/slots").body, plainSealed(R1));
  await v2Join(sealed(R1), { newInstall: false });
  assert.deepEqual(calls[1]!.body, plainSealed(R1));
  calls = stub(200, { status: "ok" });
  await v2Join(sealed(R1), { newInstall: true });
  assert.deepEqual(calls[0]!.body, { ...plainSealed(R1), new_install: true });
});

test("reseal and forget send exactly one card", async () => {
  const calls = stub(200, { status: "ok" });
  await v2Reseal(sealed(R1));
  assert.deepEqual(checkPost(calls[0], "/v2/slots/reseal").body, { cards: [plainSealed(R1)] });
  await v2Forget(card(R1));
  assert.deepEqual(checkPost(calls[1], "/v2/forget").body, { cards: [plainCard(R1)] });

  // @ts-expect-error a list of cards does not compile
  void (() => v2Reseal([sealed(R1), sealed(R2)]));
  // @ts-expect-error a list of cards does not compile
  void (() => v2Forget([card(R1), card(R2)]));
});

test("notify sends campaign_id and deliveries with exactly the listed keys", async () => {
  const response = { status: "ok", sent: 1, waiting: 1 };
  const calls = stub(200, response);
  const got = await v2Notify("campaign-1", [delivery(R1), delivery(R2)]);
  assert.deepEqual(checkPost(calls[0], "/v2/notify").body, {
    campaign_id: "campaign-1",
    deliveries: [R1, R2].map((r) => ({ route_id: r, slot_secret: SECRET, seal_key: SEAL_KEY, payload: SEALED })),
  });
  assert.deepEqual(got, response);
});

test("inbox sends each usage flag only when true and returns the response unchanged", async () => {
  const response = {
    notifications: [{ id: "n1", enc: SEALED }],
    cards: [{ route_id: R1, connected: true }],
  };
  const calls = stub(200, response);
  const got = await v2Inbox([card(R1), card(R2)]);
  assert.deepEqual(checkPost(calls[0], "/v2/inbox").body, { cards: [plainCard(R1), plainCard(R2)] });
  assert.deepEqual(got, response);
  await v2Inbox([card(R1)], { firstOpenToday: true, firstOpenThisMonth: false });
  assert.deepEqual(calls[1]!.body, { cards: [plainCard(R1)], first_open_today: true });
  await v2Inbox([card(R1)], { firstOpenThisMonth: true });
  assert.deepEqual(calls[2]!.body, { cards: [plainCard(R1)], first_open_this_month: true });
  await v2Inbox([card(R1)], { firstOpenToday: true, firstOpenThisMonth: true });
  assert.deepEqual(calls[3]!.body, { cards: [plainCard(R1)], first_open_today: true, first_open_this_month: true });
});

test("confirm sends cards and ids and returns the response unchanged", async () => {
  const calls = stub(200, { status: "ok", deleted: 2 });
  const got = await v2ConfirmInbox([card(R1)], ["a", "b"]);
  assert.deepEqual(checkPost(calls[0], "/v2/inbox/confirm").body, { cards: [plainCard(R1)], ids: ["a", "b"] });
  assert.deepEqual(got, { status: "ok", deleted: 2 });
});

const ERROR_ROWS: [number, unknown, string][] = [
  [403, { detail: "unknown_card" }, "unknown_card"],
  [409, { detail: "code_in_use" }, "code_in_use"],
  [409, { detail: "campaign_already_used" }, "campaign_already_used"],
  [429, { detail: "send_limit" }, "send_limit"],
  [503, { detail: "busy" }, "busy"],
  [413, { detail: "body_too_large" }, "too_large"],
  [413, { detail: "anything" }, "too_large"],
  [422, { detail: [{ loc: ["body", "cards"], msg: "bad", type: "x" }] }, "invalid"],
  [422, { detail: "other" }, "invalid"],
  [403, { detail: "other" }, "unexpected"],
  [409, { detail: "other" }, "unexpected"],
  [429, { detail: "other" }, "unexpected"],
  [503, { detail: "other" }, "unexpected"],
  [500, { detail: "boom" }, "unexpected"],
  [404, {}, "unexpected"],
];

test("error mapping is exact on (status, detail)", async () => {
  for (const [status, payload, code] of ERROR_ROWS) {
    stub(status, payload);
    await assert.rejects(v2Join(sealed(R1)), (e: unknown) => {
      assert.ok(e instanceof V2Error);
      assert.equal(e.code, code, `${status} ${JSON.stringify(payload)}`);
      assert.equal(e.status, status);
      assert.ok(!e.message.includes(SECRET));
      return true;
    });
  }
});

test("a fetch rejection is a network error with status 0", async () => {
  globalThis.fetch = (async () => {
    throw new Error("down");
  }) as typeof fetch;
  await assert.rejects(v2Forget(card(R1)), (e: unknown) => {
    assert.ok(e instanceof V2Error);
    assert.equal(e.code, "network");
    assert.equal(e.status, 0);
    return true;
  });
});

test("an inbox 200 without notifications and cards is unexpected", async () => {
  for (const payload of [{}, { notifications: [] }, { cards: [] }, null]) {
    stub(200, payload);
    await assert.rejects(v2Inbox([card(R1)]), (e: unknown) => e instanceof V2Error && e.code === "unexpected");
  }
});

test("dev logging never contains the slot secret or seal key", async () => {
  (globalThis as Record<string, unknown>).__DEV__ = true;
  const logged: string[] = [];
  const realWarn = console.warn;
  const realLog = console.log;
  const spy = (...args: unknown[]) => void logged.push(args.map((a) => String(a)).join(" "));
  console.warn = spy;
  console.log = spy;
  try {
    stub(403, { detail: "unknown_card" });
    await assert.rejects(v2Notify("c", [delivery(R1)]));
    globalThis.fetch = (async () => {
      throw new Error("down");
    }) as typeof fetch;
    await assert.rejects(v2Notify("c", [delivery(R1)]));
    stub(200, { status: "ok", sent: 1, waiting: 0 });
    await v2Notify("c", [delivery(R1)]);
  } finally {
    console.warn = realWarn;
    console.log = realLog;
  }
  assert.ok(logged.length > 0, "something was logged");
  for (const line of logged) {
    assert.ok(!line.includes(SECRET) && !line.includes(SEAL_KEY), line);
  }
});
