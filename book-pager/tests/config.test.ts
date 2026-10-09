import { expect, mock, test } from "claude-code/testing";
import type { Engine } from "claude-code/testing";

const PANE_PROPS = {
  title: "Pager",
  isFocused: true,
  bodyColumns: 60,
  placement: "dock",
  scroll: { offset: 0, bodyRows: 6 },
  view: {},
} as const;

// The rule under the buttons is exactly as wide as the page text.
const showsRule = async ($: Engine, width: number) => {
  const ui = await $.ui.mount({
    plugin: "book-pager",
    surface: "terminal",
    component: "Pane",
    requestId: "book-pager",
    props: PANE_PROPS,
  });
  const rule = await ui.find({
    type: "Text",
    text: new RegExp(`^─{${width}}$`),
  });
  await ui.unmount();
  return rule !== undefined;
};

test("pages fill the pane up to the default width", async ($, on) => {
  on("session.id", () => ({ value: "session-a" }));
  mock.store(on);
  expect(await showsRule($, 60)).toBe(true);
});

test("the width setting caps the page width", { options: { width: 30 } }, async ($, on) => {
  on("session.id", () => ({ value: "session-a" }));
  mock.store(on);
  expect(await showsRule($, 30)).toBe(true);
  expect(await showsRule($, 60)).toBe(false);
});
