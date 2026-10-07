import { expect, test } from "claude-code/testing";

import {
  formatMarkdown,
  formatPrompt,
  paginate,
  textWidth,
} from "../hooks/pages";

const REPLY = [
  "This is a long first paragraph that should wrap at the width we give it, and never go past it.",
  "",
  "## A heading",
  "",
  "- a list item with **bold words** and `some code` that also needs to wrap across lines",
  "",
  "```bash",
  'echo "a code line that is longer than the width and has to be cut into pieces"',
  "```",
  "",
  "| Ticket | Owner | How it matches |",
  "| --- | --- | --- |",
  "| [APP-1](https://linear.app/x/APP-1) \"Fix the import\" | Nobody | **Overlap.** It covers the same page and the same columns. |",
  "",
  "日本語の文章も二文字分の幅で数えるので、行の長さが正しくなります。日本語の文章も二文字分の幅で数えます。",
].join("\n");

test("no line is wider than the width", async () => {
  for (const width of [20, 40, 76]) {
    for (const line of formatMarkdown(REPLY, width)) {
      const size = line.reduce((sum, run) => sum + textWidth(run.text), 0);
      expect(size <= width).toBe(true);
    }
  }
});

test("markdown markers become styles", async () => {
  const runs = formatMarkdown("a **b** `c`", 76).flat();
  expect(runs.find((run) => run.text === "b")?.style).toBe("bold");
  expect(runs.find((run) => run.text === "c")?.style).toBe("code");
});

test("pages have a fixed size and never start blank", async () => {
  const pages = paginate(formatMarkdown(REPLY, 20), 4);
  for (const page of pages.slice(0, -1)) {
    expect(page.length).toBe(4);
  }
  for (const page of pages) {
    expect(page[0]?.length !== 0).toBe(true);
  }
});

test("a long prompt is cut to four lines that fit the width", async () => {
  const lines = formatPrompt("word ".repeat(200), 30);
  expect(lines.length).toBe(4);
  for (const line of lines) {
    expect(line.reduce((sum, run) => sum + textWidth(run.text), 0) <= 30).toBe(
      true,
    );
  }
});

test("a link shows only its text", async () => {
  const text = formatMarkdown("See [APP-1](https://linear.app/x/APP-1) now", 76)
    .flat()
    .map((run) => run.text)
    .join("");
  expect(text).toBe("See APP-1 now");
});

const WIDE_TABLE = [
  "| Ticket | Owner | How it matches |",
  "| --- | --- | --- |",
  "| APP-1 | Nobody | Overlap. It covers the same page and the same columns. |",
  "| APP-2 | Someone | Related. |",
].join("\n");

test("a table wider than the width becomes one card per row", async () => {
  const lines = formatMarkdown(WIDE_TABLE, 30).map((line) =>
    line.map((run) => run.text).join(""),
  );
  expect(lines).toEqual([
    "APP-1",
    "",
    "  Owner",
    "  Nobody",
    "",
    "  How it matches",
    "  Overlap. It covers the same",
    "  page and the same columns.",
    "─".repeat(30),
    "APP-2",
    "",
    "  Owner",
    "  Someone",
    "",
    "  How it matches",
    "  Related.",
  ]);
});

test("a table that fits stays as aligned columns", async () => {
  const table = ["| A | Long |", "|---|---|", "| `x` | y |", "| zz | \\| |"].join(
    "\n",
  );
  const lines = formatMarkdown(table, 76).map((line) =>
    line.map((run) => run.text).join(""),
  );
  expect(lines).toEqual(["A   Long", "─".repeat(8), "x   y", "zz  |"]);
});
