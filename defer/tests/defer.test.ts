import { expect, mock, test } from "claude-code/testing";
import type { On } from "claude-code";
import type { Engine } from "claude-code/testing";

const DAY_MS = 24 * 60 * 60 * 1000;

const PICKER_PROPS = {
  title: "Saved questions",
  isFocused: true,
  bodyColumns: 40,
  placement: "inline",
  scroll: { offset: 0, bodyRows: 6 },
  view: {},
} as const;

const submit = ($: Engine, text: string, turnId?: string) =>
  $.prompt.submit({
    text,
    wait: false,
    origin: { kind: "composer" },
    ...(turnId === undefined ? {} : { turnId }),
  });

const run = async ($: Engine, command: string, args = "") =>
  (
    await $.command.run({
      command,
      args,
      origin: { kind: "composer" },
      presentation: { isFullscreen: true, columns: 120 },
    })
  ).text;

const band = ($: Engine) =>
  $.ui.mount({
    plugin: "defer",
    surface: "terminal",
    component: "AbovePrompt",
    props: {
      hasSurvey: false,
      isWorking: false,
      maxRows: 3,
      bodyColumns: 80,
      scroll: { offset: 0, bodyRows: 3 },
      view: {},
    },
  });

// The engine beneath the plugin: a session id the test can change, a store and clock in memory, and a prompt box.
function world(on: On) {
  const state = { sessionId: "session-a", sent: [] as string[], filled: [] as string[] };
  // A store in memory the test can read back.
  const store = new Map<string, unknown>();
  on("store.get", (_$, e) => ({ value: store.get(e.key) }));
  on("store.set", (_$, e) => (store.set(e.key, e.value), { value: undefined }));
  on("store.delete", (_$, e) => (store.delete(e.key), { value: undefined }));
  on("store.keys", () => ({ value: [...store.keys()] }));
  on("session.id", () => ({ value: state.sessionId }));
  const clock = mock.clock(on, { now: 100 * DAY_MS });
  on("prompt.submit", (_$, e) => {
    state.sent.push(e.text);
    return { text: e.text };
  });
  on("prompt.read", () => ({ value: { text: "", cursor: 0 } }));
  on("prompt.fill", (_$, e) => {
    state.filled.push(e.text);
    return { isFilled: true };
  });
  on("ui.open", () => ({ value: { isPlaced: true } }));
  on("ui.close", () => ({ value: undefined }));
  on("classic.SessionStart", () => ({}));

  return { state, clock, store };
}

test("/defer saves a question without sending it, even while Claude is busy", async ($, on) => {
  const { state } = world(on);

  expect(await run($, "defer", "what is a monad?")).toMatch(/Saved for later · 1 saved question/);
  const trailing = await submit($, "and a functor?\n/defer", "running-turn");
  expect(trailing.drop).toMatch(/2 saved questions/);
  await run($, "differ", "the typo works too");
  await submit($, "a normal prompt");

  expect(state.sent).toEqual(["a normal prompt"]);
  const ui = await band($);
  expect(await ui.find({ type: "Text", text: "3 saved questions · /defer to pick" })).toBeDefined();
  await ui.unmount();
});

test("picking puts the question in the prompt box and takes it off the list", async ($, on) => {
  const { state } = world(on);
  await run($, "defer", "first");
  await run($, "defer", "second");

  expect(await run($, "defer")).toBe("Pick a saved question.");
  const picker = await $.ui.mount({
    plugin: "defer",
    surface: "terminal",
    component: "Pane",
    requestId: "defer-picker",
    props: PICKER_PROPS,
  });
  await picker.press({ key: "item-1" });
  await picker.unmount();

  expect(state.filled).toEqual(["second"]);
  const ui = await band($);
  expect(await ui.find({ type: "Text", text: "1 saved question · /defer to pick" })).toBeDefined();
  await ui.unmount();
});

test("each session has its own list, and a resumed session gets its list back", async ($, on) => {
  const { state } = world(on);
  await run($, "defer", "in session A");

  // /clear starts a new session id with an empty list.
  state.sessionId = "session-b";
  await $.classic.SessionStart({ source: "clear", session_id: "session-b" });
  expect(await run($, "defer")).toMatch(/No saved questions/);

  // A new process after a restart holds nothing in $.state.
  state.sessionId = "session-a";
  await $.classic.SessionStart({ source: "resume", session_id: "session-a" });
  const ui = await band($);
  expect(await ui.find({ type: "Text", text: "1 saved question · /defer to pick" })).toBeDefined();
  await ui.unmount();
});

test("old, empty and surplus lists are removed from the store", async ($, on) => {
  const { state, clock, store } = world(on);
  const now = clock.now();
  const entries: Record<string, unknown> = {
    "items:stale": { items: ["old"], changedAt: now - 31 * DAY_MS },
    "items:empty": { items: [], changedAt: now },
    "items:undated": { items: ["from the first version"] },
  };
  for (let index = 0; index < 50; index += 1) {
    entries[`items:recent-${index}`] = { items: ["q"], changedAt: now - DAY_MS - index };
  }
  for (const [key, value] of Object.entries(entries)) {
    store.set(key, value);
  }

  state.sessionId = "session-new";
  await run($, "defer", "a new question");

  const keys = [...store.keys()];
  expect(keys).toHaveLength(50);
  expect(keys).toContain("items:session-new");
  expect(keys).toContain("items:undated");
  expect(keys.includes("items:stale")).toBe(false);
  expect(keys.includes("items:empty")).toBe(false);
  // The two changed longest ago went to make room.
  expect(keys.includes("items:recent-49")).toBe(false);
  expect(keys.includes("items:recent-48")).toBe(false);
  expect(store.get("items:undated")).toEqual({
    items: ["from the first version"],
    changedAt: now,
  });

  // Picking the last question removes the list at once.
  const picker = await $.ui.mount({
    plugin: "defer",
    surface: "terminal",
    component: "Pane",
    requestId: "defer-picker",
    props: PICKER_PROPS,
  });
  await picker.press({ key: "item-0" });
  await picker.unmount();
  expect(store.get("items:session-new")).toBeUndefined();
});
