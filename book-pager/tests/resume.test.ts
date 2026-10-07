import { expect, mock, test } from "claude-code/testing";

const PANE_PROPS = {
  title: "Pages",
  isFocused: true,
  bodyColumns: 40,
  placement: "dock",
  scroll: { offset: 0, bodyRows: 6 },
  view: {},
} as const;

test("a resumed session gets its own book back", async ($, on) => {
  let sessionId = "session-a";
  on("session.id", () => ({ value: sessionId }));
  mock.store(on);
  on("prompt.submit", (_$, e) => ({ text: e.text }));
  on("turn.complete", (_$, e) => ({ text: e.answer }));
  const finishTurn = async (prompt: string, answer: string) => {
    await $.prompt.submit({
      text: prompt,
      wait: false,
      origin: { kind: "composer" },
    });
    await $.turn.complete({
      answer,
      durationMs: 1,
      isAborted: false,
      turnId: prompt,
      reason: "answer",
    });
  };
  const mount = () =>
    $.ui.mount({
      plugin: "book-pager",
      surface: "terminal",
      component: "Pane",
      requestId: "book-pager",
      props: PANE_PROPS,
    });

  await finishTurn("question in A", "Answer in A.");

  // Session B starts with an empty book, and its reply does not join A's.
  sessionId = "session-b";
  let ui = await mount();
  expect((await ui.find({ type: "Text", text: /No finished reply yet/ })) !== undefined).toBe(true);
  await finishTurn("question in B", "Answer in B.");
  expect((await ui.find({ type: "Text", text: /Page 1 \/ 1/ })) !== undefined).toBe(true);
  await ui.unmount();

  // Back in A, the book comes from the store, since $.state now holds B's.
  sessionId = "session-a";
  ui = await mount();
  expect((await ui.find({ type: "Text", text: /Answer in A\./ })) !== undefined).toBe(true);
  expect((await ui.find({ type: "Text", text: /Answer in B\./ })) === undefined).toBe(true);
  expect((await ui.find({ type: "Text", text: /Page 1 \/ 1/ })) !== undefined).toBe(true);
  await ui.unmount();
});
