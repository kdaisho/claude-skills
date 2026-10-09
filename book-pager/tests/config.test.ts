import { expect, mock, test } from "claude-code/testing";
import type { Engine } from "claude-code/testing";

const paneProps = (bodyColumns: number) =>
  ({
    title: "Pager",
    isFocused: true,
    bodyColumns,
    placement: "dock",
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  }) as const;

const shows = async ($: Engine, bodyColumns: number, text: RegExp) => {
  const ui = await $.ui.mount({
    plugin: "book-pager",
    surface: "terminal",
    component: "Pane",
    requestId: "book-pager",
    props: paneProps(bodyColumns),
  });
  const found = await ui.find({ type: "Text", text });
  await ui.unmount();
  return found !== undefined;
};

// The rule under the buttons is exactly as wide as the page text.
const showsRule = ($: Engine, bodyColumns: number, width: number) =>
  shows($, bodyColumns, new RegExp(`^─{${width}}$`));

test("pages fill the pane", async ($, on) => {
  on("session.id", () => ({ value: "session-a" }));
  mock.store(on);
  expect(await showsRule($, 60, 60)).toBe(true);
});

test("a pane dragged wider than the width setting gets wider pages", { options: { width: 30 } }, async ($, on) => {
  on("session.id", () => ({ value: "session-a" }));
  mock.store(on);
  expect(await showsRule($, 120, 120)).toBe(true);
  expect(await showsRule($, 120, 30)).toBe(false);
});

// 69 columns with borders.
const WIDE_TABLE = [
  "| Method       | Grind  | Water temp | Brew time | Gear needed      |",
  "| ------------ | ------ | ---------- | --------- | ---------------- |",
  "| Espresso     | Fine   | 90–96 °C   | 30 sec    | Espresso machine |",
  "| French press | Coarse | 93–96 °C   | 4 min     | Press pot        |",
].join("\n");

test("a table gets its borders when the pane is wide enough", { options: { width: 40 } }, async ($, on) => {
  on("session.id", () => ({ value: "session-a" }));
  mock.store(on);
  on("prompt.submit", (_$, e) => ({ text: e.text }));
  on("turn.complete", (_$, e) => ({ text: e.answer }));
  await $.prompt.submit({ text: "table", wait: false, origin: { kind: "composer" } });
  await $.turn.complete({
    answer: WIDE_TABLE,
    durationMs: 1,
    isAborted: false,
    turnId: "table",
    reason: "answer",
  });
  const grid = /│ Method\s+│ Grind\s+│ Water temp/;
  expect(await shows($, 40, grid)).toBe(false);
  expect(await shows($, 100, grid)).toBe(true);
});
