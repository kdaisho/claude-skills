import { expect, mock, test } from "claude-code/testing";

// 6 body rows less the 2 header rows leaves 4 lines per page.
const PANE_PROPS = {
  title: "Pager",
  isFocused: true,
  bodyColumns: 40,
  placement: "dock",
  scroll: { offset: 0, bodyRows: 6 },
  view: {},
} as const;

const LONG_REPLY = Array.from(
  { length: 30 },
  (_, i) => `Line number ${i + 1}.`,
).join("\n");

for (const surface of ["terminal", "desktop"] as const) {
  test(`replies form one book on ${surface}`, async ($, on) => {
    on("session.id", () => ({ value: "session-a" }));
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
    const ui = await $.ui.mount({
      plugin: "book-pager",
      surface,
      component: "Pane",
      requestId: "book-pager",
      props: PANE_PROPS,
    });
    const shows = async (text: RegExp) =>
      (await ui.find({ type: "Text", text })) !== undefined;

    expect(await shows(/No finished reply yet/)).toBe(true);

    // Entry 1: prompt, blank, reply = 1 page. Entry 2: prompt, blank, 30 lines = 8 pages.
    await finishTurn("first question", "Short answer.");
    expect(await shows(/Page 1 \/ 1/)).toBe(true);
    await finishTurn("second question", LONG_REPLY);
    expect(await shows(/Page 2 \/ 9/)).toBe(true);
    expect(await shows(/› second question/)).toBe(true);

    await ui.press({ key: "next" });
    expect(await shows(/Page 3 \/ 9/)).toBe(true);
    expect(await shows(/Line number 3\./)).toBe(true);

    await ui.press({ key: "prev" });
    await ui.press({ key: "prev" });
    expect(await shows(/Page 1 \/ 9/)).toBe(true);
    expect(await shows(/› first question/)).toBe(true);
    expect(await shows(/Short answer\./)).toBe(true);

    await ui.press({ key: "prev" });
    expect(await shows(/Page 1 \/ 9/)).toBe(true);

    await ui.unmount();
  });
}
