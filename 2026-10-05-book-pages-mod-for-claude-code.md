# book-pages mod for Claude Code

A mod (a Claude Code plugin made of function hooks) that shows Claude's finished replies in a pane on the right side of the screen. It splits them into pages of a fixed size, like a book, with short lines.

## Why I built it

When I look at another screen and come back to the terminal, I often cannot find the line I was reading. With a paper book this rarely happens, because I remember roughly where the line was on the page.

The terminal breaks this in two ways:

- New text arrives at the bottom and pushes old text up. If I look away while Claude is still writing, the line moves.
- The whole width of a MacBook 14 is too wide for me to read comfortably. Before this mod, I split the terminal by hand to get a narrow column.

The mod fixes both. Lines stay in place until I turn the page, and the text column is at most 76 characters wide.

## Is the theory real?

Mostly yes, but the effect is modest and not found in every study.

- **People remember where on a page they read something, without trying to.** Rothkopf (1971): people read a 12-page text and were not told that location would be tested. Afterwards they picked the right part of a page 20.6% of the time, against 12.5% for a random guess. Later studies found the same effect and describe the page as a "reference frame" for remembering where words were.
- **Scrolling seems to weaken this.** Mangen, Walgermo & Brønnick (2013): 72 Norwegian 10th graders. Students who read on paper understood the texts better than students who read a scrolling PDF. The authors explain it like this: "Scrolling is known to hamper the process of reading, by imposing a spatial instability which may negatively affect the reader's mental representation of the text."
- **Pages versus scrolling on a screen.** Several older lab studies found better understanding with pages, especially for long texts (Wästlund and others 2008, Sanchez & Wiley 2009). Some studies found no difference. A 2025 study on phones found smaller effects.
- **Line length is mixed.** Very long lines (95–100 characters) are often read faster on screen. Medium lines (about 55 characters) gave the best understanding in Dyson's studies, and people say they prefer them. So "short lines are always better" is too strong.

A safe way to explain it to others: "Research suggests that readers remember the position of text on a page without trying, and that scrolling weakens this. The effect is modest and not found in every study."

Sources:

- [Rothkopf (1971), Incidental memory for location of information in text](https://www.proquest.com/openview/2fe98da28ac169405dabed0ddde4b679/1?pq-origsite=gscholar&cbl=1819609)
- [Memory for words in prose and their locations on the page](https://link.springer.com/article/10.3758/BF03196979)
- [Visuospatial processing in memory for word location in writing](https://econtent.hogrefe.com/doi/10.1027/1618-3169/a000136)
- [Supporting and Exploiting Spatial Memory in User Interfaces](https://dl.acm.org/doi/10.1561/1100000046)
- [Mangen, Walgermo & Brønnick (2013), full text PDF](https://educacion.udd.cl/files/2017/05/MI_MAngen-et-al-2012-Reading-linear-texts-on-paper-versus-computer-screen-effects-on-reading.pdf)
- [Sanchez & Wiley (2009), To Scroll or Not to Scroll](https://www.researchgate.net/publication/41668120_To_Scroll_or_Not_to_Scroll_Scrolling_Working_Memory_Capacity_and_Comprehending_Complex_Texts)
- [Is Scrolling Disrupting While Reading?](https://repository.isls.org/bitstream/1/497/1/18.pdf)
- [The Impact of Paging vs. Scrolling on Reading Online Text Passages](https://www.academia.edu/3010617/The_Impact_of_Paging_vs_Scrolling_on_Reading_Online_Text_Passages)
- [Is Pagination Better than Scrolling when Reading on a Phone? (2025)](https://dl.acm.org/doi/full/10.1145/3706599.3720178)
- [Dyson (2004), How physical text layout affects reading from screen](https://stu.westga.edu/~ssynan1/literacy/Dyson.pdf)

## Usage

- The pane opens by itself when a session starts, if the terminal is wide enough. Claude Code allows a pane that opens without being asked only at 144 columns or more, or 110 columns or more after I have opened the pane once myself.
- In a narrower terminal, I open it with `/pages`. That works at any width. Below 110 columns, the pane sits above the prompt instead of on the right side.
- `/pages` also moves the keyboard focus to the pane.
- When the pane is shown, `/pages` closes it. `ctrl+x x` and `Esc` did not close it in a narrow terminal, so `/pages` works as a toggle.
- In an **empty** prompt, `,` goes back one page and `.` goes forward one page. The character is not typed. With the Japanese input mode on, `、` and `。` work the same way after I confirm the character.
- Inside the pane (after `ctrl+x tab`, a click, or `/pages`): `p` and `n` turn pages, and `Esc` goes back to the prompt.
- On the first or last page, a short notice says "This is the first page." or "This is the last page."

What the pane shows:

- Every finished reply of the session, as one book. Each reply starts at the top of a new page.
- My prompt as a dim line starting with `›` above each reply, cut to 4 lines.
- A top row with `p: Prev`, `n: Next`, the page count and a reminder of the keys, then a thin line, then the text.
- Bold text as bold, inline code in cyan, headings as bold. Code blocks and tables are cut at the line width instead of wrapped.

## Tokens

No extra tokens. The hooks run inside Claude Code, and the pane is not sent to the model. The one exception: `/pages` adds the line "Pages pane opened." or "Pages pane closed." to the conversation, a few tokens.

The plugin docs say the `/pages` description is shown in the `/` list and in `/help`. I found nothing that says it is also sent to the model, but I could not prove that.

## How it is built

Six hooks in `hooks/register.tsx`:

| Hook               | What it does                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------- |
| `session.start`    | Registers the `/pages` command and opens the pane                                             |
| `command.run`      | Answers `/pages`: closes the pane if it is shown, else opens it with keyboard focus           |
| `prompt.submit`    | Saves my prompt until Claude's reply to it finishes                                           |
| `turn.complete`    | When a reply finishes, adds `{ prompt, reply }` to the book and jumps to its first page       |
| `prompt.edit`      | When the prompt is empty and the pane is visible, takes `,` or `.` and turns the page instead |
| `ui.render` (Pane) | Draws the current page                                                                        |

How a page is made (`hooks/pages.ts`):

```
reply text (markdown)
  → wrap at min(76, pane width) characters; Japanese counts as 2 columns
  → cut into pages of (pane height − 2) lines
  → a page never starts with a blank line
  → each reply starts on a new page
```

Values kept for the session in `$.state` (they survive a reload of the mod, but not a restart, `/clear`, `/resume` or `/branch`):

- `entries`: the replies with their prompts, newest 200
- `position`: which reply and which page I am on
- `pendingPrompt`: my latest prompt, until the reply to it finishes

## What failed

- **Binding keys to the page buttons.** A Button can name a Claude Code keybinding action (`action` prop), and the docs say the person's binding for it then presses the button from the prompt. I bound `Option+,` / `Option+.` and `ctrl+x p` / `ctrl+x n` in `~/.claude/keybindings.json`, first to `pane:previous` / `pane:next`, then to two unused actions. None of them pressed the buttons. I could not see why, because the session had no debug log. I removed the bindings.
- **`Cmd+←` / `Cmd+→`.** Ghostty already sends "start of line" / "end of line" for these keys, so Claude Code never sees them.
- **Plain `Tab` to focus the pane.** Possible (`abovePrompt:focus` in the `Chat` context), but `Tab` also accepts completions, so I did not use it.

## Where it lives

- Code: `~/.claude/mods/book-pages/`. The full source is in the appendix below.
- It loads in every session because of this setting in `~/.claude/settings.json`. To load more mods, add their paths separated by `:`:
  ```json
  "env": { "CLAUDE_CODE_PLUGIN_DIRS": "~/.claude/mods/book-pages" }
  ```
  To turn it off, remove `~/.claude/mods/book-pages` from that line and start a new session.

## Build it on a new machine

These steps are for a Claude Code session that builds the mod from this note. The code does not need to match exactly. The behavior in "Usage" is what matters.

1. Run `claude --version`. The mod was built and tested on 2.1.289. If the version is older, run `claude update` first, because the mod API is "early access" and changes between releases.
2. Load the `plugin-authoring` skill. It has the mod API docs.
3. Create the folder `~/.claude/mods/book-pages/`. Write each file from the appendix at the path in its heading. There are 7 files.
4. Do not write `tsconfig.json` or anything in `.claude-plugin/types/`. Claude Code creates them when it first loads the mod.
5. Run `claude plugin validate ~/.claude/mods/book-pages`. The expected result is "Validation passed with warnings". The two known warnings are "No author information provided" and "gating hook without .catch: prompt.submit". Both are harmless.
6. Run `claude plugin test ~/.claude/mods/book-pages`. The expected result is "6 pass, 0 fail".
7. If a step fails, the API has probably changed. Read `.claude-plugin/types/claude-code/index.d.ts` in the mod folder, which Claude Code writes for the installed version, and fix the code to match it.
8. Try it for one session: `claude --plugin-dir ~/.claude/mods/book-pages`, then run `/pages`.
9. To load it in every session, add the `CLAUDE_CODE_PLUGIN_DIRS` line from "Where it lives" to `~/.claude/settings.json`. If the file already has an `"env"` block, add the line inside that block. Do not replace the file.

If `/pages` is missing from the `/` list even though steps 5 and 6 passed, the mod did not load. One possible reason is that the mod API is not available on that plan or account. This is not known for the Pro plan.

On 2026-10-05, the appendix alone was written into an empty folder on Claude Code 2.1.289. It passed both `validate` and `test`.

## Compacting, /clear and restarts

- The book survives compacting. The mod keeps its own copy of each reply in `$.state`, and compacting does not reset `$.state`.
- The book starts empty after a restart, `/clear`, `/resume` or `/branch`, because those reset `$.state`. Saving the book in `$.store` instead would fix that; not done.

## Changing it

- Check: `claude plugin validate <folder>`
- Test: `claude plugin test <folder>` (6 tests: line width, styles, page size, prompt cut, and page turning on terminal and desktop)
- The test tools cannot simulate typing into the prompt, so the `,` and `.` keys were only tested by hand.
- Ask Claude to load the `plugin-authoring` skill before changing the code. It has the mod API docs.

## Before sharing it publicly

- It is a plugin, not a skill. A skill cannot draw a pane or catch keys. Share it as a plugin in a GitHub repository.
- Make the keys and the width user settings. Taking `,` and `.` fits me, but not everyone.
- Say what it was tested on: Ghostty, Claude Code's fullscreen layout, Claude Code 2.1.289. The mod API is marked "early access" and can change between releases.
- Test the narrow layout more, where the pane sits above the prompt (below 110 columns). Opening and closing it with `/pages` works there. Turning pages there has not been tested.
- Collect the existing replies when the mod loads, so the pane does not start empty.
- Describe the research carefully (see above).

## Appendix: full source

### `.claude-plugin/plugin.json`

```json
{
  "name": "book-pages",
  "version": "0.1.0",
  "description": "Shows Claude's finished replies in a side pane as fixed pages with short lines",
  "types": "./types/index.d.ts"
}
```

### `hooks/hooks.json`

```json
{ "modules": ["./register.tsx"] }
```

### `types/index.d.ts`

```ts
export type BookEntry = { prompt: string; reply: string };
export type BookPosition = { entry: number; page: number };

declare module "claude-code" {
  interface PluginState {
    "book-pages": {
      entries: BookEntry[];
      position: BookPosition;
      pendingPrompt: string;
    };
  }
}
```

### `hooks/register.tsx`

```tsx
import { atom, read, update } from "claude-code";
import type { EngineInterface, Register } from "claude-code";

import type { BookEntry, BookPosition } from "../types";
import { entryPages } from "./pages";
import type { Line, Run } from "./pages";

const PANE = "book-pages";
const MAX_COLUMNS = 76;
const DOCK_COLUMNS = 80;
const MAX_ENTRIES = 200;
// The button row and the rule under it.
const HEADER_ROWS = 2;
// Typed into an empty prompt, these turn the page instead of typing. The Japanese ones are what the IME types.
const PREV_KEYS = [",", "、"];
const NEXT_KEYS = [".", "。"];

const entries = atom(
  { plugin: "book-pages", key: "entries" } as const,
  [] as BookEntry[],
);
const position = atom(
  { plugin: "book-pages", key: "position" } as const,
  {
    entry: 0,
    page: 0,
  } as BookPosition,
);
const pendingPrompt = atom(
  { plugin: "book-pages", key: "pendingPrompt" } as const,
  "",
);

// The pane's text size from its last draw, so a key typed in the prompt pages the same way.
let layout = { width: MAX_COLUMNS, rows: 20 };

type Spot = {
  book: Line[][][];
  entry: number;
  page: number;
  before: number;
  total: number;
  isFirst: boolean;
  isLast: boolean;
};

async function findSpot($: EngineInterface): Promise<Spot> {
  const book = (await read($, entries)).map((entry) =>
    entryPages(entry, layout.width, layout.rows),
  );
  const saved = await read($, position);
  const lastEntry = book.length - 1;
  const entry = Math.max(0, Math.min(saved.entry, lastEntry));
  const pagesInEntry = book[entry]?.length ?? 1;
  const page = Math.min(saved.page, pagesInEntry - 1);
  const before = book
    .slice(0, entry)
    .reduce((sum, pages) => sum + pages.length, 0);
  const total = Math.max(
    1,
    book.reduce((sum, pages) => sum + pages.length, 0),
  );

  return {
    book,
    entry,
    page,
    before,
    total,
    isFirst: entry === 0 && page === 0,
    isLast: entry >= lastEntry && page === pagesInEntry - 1,
  };
}

async function turnPage($: EngineInterface, direction: 1 | -1) {
  const spot = await findSpot($);
  const { book, entry, page } = spot;
  if (direction === 1 && spot.isLast) {
    $.ui.toast("This is the last page.");
    return;
  }
  if (direction === -1 && spot.isFirst) {
    $.ui.toast("This is the first page.");
    return;
  }
  const pagesInEntry = book[entry]?.length ?? 1;
  const nextSpot =
    direction === 1
      ? page < pagesInEntry - 1
        ? { entry, page: page + 1 }
        : { entry: entry + 1, page: 0 }
      : page > 0
        ? { entry, page: page - 1 }
        : { entry: entry - 1, page: (book[entry - 1]?.length ?? 1) - 1 };
  await update($, position, () => nextSpot);
}

function openPane($: EngineInterface, isFocused: boolean) {
  return $.ui.open({
    id: PANE,
    title: "Pages",
    columns: DOCK_COLUMNS,
    ...(isFocused ? { focus: true } : {}),
  });
}

export const register: Register = (on) => {
  on("session.start", async ($, e, next) => {
    await $.command.register({
      name: "pages",
      description: "Show or hide Claude's replies as fixed pages in a side pane",
    });
    void openPane($, false);

    return next(e);
  });

  // A toggle, because the close key and Escape do not close the pane everywhere.
  on("command.run", { command: "pages" }, async ($) => {
    const panes = await $.ui.panes();
    if (panes.some((pane) => pane.id === PANE && pane.isShown && pane.isPlaced)) {
      await $.ui.close({ id: PANE });

      return { text: "Pages pane closed." };
    }
    await openPane($, true);

    return { text: "Pages pane opened." };
  });

  // A prompt typed while Claude works joins the prompt of the running turn.
  on("prompt.submit", async ($, e, next) => {
    if (e.text.trim() !== "/pages") {
      await update($, pendingPrompt, (pending) =>
        e.turnId !== undefined && pending !== ""
          ? `${pending}\n${e.text}`
          : e.text,
      );
    }

    return next(e);
  });

  on("prompt.edit", async ($, e, next) => {
    const direction = NEXT_KEYS.includes(e.inputText)
      ? 1
      : PREV_KEYS.includes(e.inputText)
        ? -1
        : 0;
    if (e.text !== "" || direction === 0) {
      return next(e);
    }
    const panes = await $.ui.panes();
    if (!panes.some((pane) => pane.id === PANE && pane.isShown)) {
      return next(e);
    }
    await turnPage($, direction);

    return { text: e.text, cursor: e.cursor };
  });

  // Adds a reply only when it is finished, so the page on screen stays still while Claude writes.
  on("turn.complete", async ($, e, next) => {
    if (e.agentId === undefined && e.answer.trim() !== "") {
      const prompt = await read($, pendingPrompt);
      const list = await update($, entries, (list) =>
        [...list, { prompt, reply: e.answer }].slice(-MAX_ENTRIES),
      );
      await update($, position, () => ({ entry: list.length - 1, page: 0 }));
      await update($, pendingPrompt, () => "");
    }

    return next(e);
  });

  on("ui.render", { component: "Pane", requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e);
    layout = {
      width: Math.max(10, Math.min(MAX_COLUMNS, e.props.bodyColumns)),
      rows: Math.max(1, e.props.scroll.bodyRows - HEADER_ROWS),
    };
    const spot = await findSpot($);
    const lines = spot.book[spot.entry]?.[spot.page] ?? [];

    const drawRun = (run: Run) => (
      <Text
        bold={run.style === "bold"}
        dimColor={run.style === "dim"}
        color={run.style === "code" ? "cyan" : undefined}
      >
        {run.text}
      </Text>
    );

    return (
      <Box flexDirection="column">
        <Box>
          <Button
            key="prev"
            hotkey="p"
            plain
            dimColor={spot.isFirst}
            label="Prev"
            onPress={() => turnPage($, -1)}
          />
          <Text> </Text>
          <Button
            key="next"
            hotkey="n"
            plain
            dimColor={spot.isLast}
            label="Next"
            onPress={() => turnPage($, 1)}
          />
          <Text
            dimColor
            wrap="truncate"
          >{`   Page ${spot.before + spot.page + 1} / ${spot.total}   (empty prompt: , and .)`}</Text>
        </Box>
        <Text dimColor>{"─".repeat(layout.width)}</Text>
        {spot.book.length === 0 && <Text dimColor>No finished reply yet.</Text>}
        {lines.map((line) => (
          <Text>{line.length === 0 ? " " : line.map(drawRun)}</Text>
        ))}
      </Box>
    );
  });
};
```

### `hooks/pages.ts`

````ts
import type { BookEntry } from "../types";

export type Style = "plain" | "bold" | "code" | "dim";
export type Run = { text: string; style: Style };
export type Line = Run[];

type Word = Run[];

// Japanese, Chinese, Korean and emoji take two terminal cells.
function charWidth(char: string): number {
  const code = char.codePointAt(0) ?? 0;
  const isWide =
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe30 && code <= 0xfe4f) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6) ||
    (code >= 0x1f300 && code <= 0x1faff);

  return isWide ? 2 : 1;
}

export function textWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    width += charWidth(char);
  }

  return width;
}

function lineWidth(line: Line): number {
  return line.reduce((sum, run) => sum + textWidth(run.text), 0);
}

function parseInline(text: string, base: Style): Run[] {
  const runs: Run[] = [];
  for (const part of text.split(/(\*\*[^*]+\*\*|`[^`]+`)/)) {
    if (part === "") {
      continue;
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      runs.push({
        text: part.slice(2, -2),
        style: base === "plain" ? "bold" : base,
      });
    } else if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      runs.push({ text: part.slice(1, -1), style: "code" });
    } else {
      runs.push({ text: part, style: base });
    }
  }

  return runs;
}

function toWords(runs: Run[]): Word[] {
  const words: Word[] = [];
  let current: Word = [];
  for (const run of runs) {
    const pieces = run.text.split(/( +)/);
    for (const piece of pieces) {
      if (piece === "") {
        continue;
      }
      if (piece.startsWith(" ")) {
        if (current.length > 0) {
          words.push(current);
          current = [];
        }
      } else {
        current.push({ text: piece, style: run.style });
      }
    }
  }
  if (current.length > 0) {
    words.push(current);
  }

  return words;
}

function splitLongWord(word: Word, width: number): Word[] {
  const parts: Word[] = [];
  let part: Word = [];
  let used = 0;
  for (const run of word) {
    for (const char of run.text) {
      const size = charWidth(char);
      if (used + size > width && used > 0) {
        parts.push(part);
        part = [];
        used = 0;
      }
      const last = part[part.length - 1];
      if (last && last.style === run.style) {
        last.text += char;
      } else {
        part.push({ text: char, style: run.style });
      }
      used += size;
    }
  }
  if (part.length > 0) {
    parts.push(part);
  }

  return parts;
}

// Wraps at word boundaries. Lines after the first start with `indent`.
function wrap(
  runs: Run[],
  width: number,
  firstPrefix: string,
  indent: string,
): Line[] {
  const room = Math.max(1, width - textWidth(indent));
  const words = toWords(runs).flatMap((word) =>
    lineWidth(word) > room ? splitLongWord(word, room) : [word],
  );
  const lines: Line[] = [];
  let line: Line =
    firstPrefix === "" ? [] : [{ text: firstPrefix, style: "plain" }];
  let used = textWidth(firstPrefix);
  let hasWord = false;
  for (const word of words) {
    const size = lineWidth(word);
    const gap = hasWord ? 1 : 0;
    if (hasWord && used + gap + size > width) {
      lines.push(line);
      line = indent === "" ? [] : [{ text: indent, style: "plain" }];
      used = textWidth(indent);
      hasWord = false;
    }
    if (hasWord) {
      line.push({ text: " ", style: "plain" });
      used += 1;
    }
    line.push(...word);
    used += size;
    hasWord = true;
  }
  lines.push(line);

  return lines;
}

// Cuts at the width with no word wrapping, for code and tables.
function hardWrap(
  text: string,
  width: number,
  style: Style,
  indent: string,
): Line[] {
  if (text === "") {
    return [[{ text: indent, style }]];
  }
  const room = Math.max(1, width - textWidth(indent));

  return splitLongWord([{ text, style }], room).map((part) => [
    { text: indent, style: "plain" },
    ...part,
  ]);
}

export function formatMarkdown(markdown: string, width: number): Line[] {
  const lines: Line[] = [];
  let isInCode = false;
  for (const source of markdown.replace(/\t/g, "  ").split("\n")) {
    if (/^\s*```/.test(source)) {
      isInCode = !isInCode;
      continue;
    }
    if (isInCode) {
      lines.push(...hardWrap(source, width, "code", "  "));
      continue;
    }
    if (source.trim() === "") {
      lines.push([]);
      continue;
    }
    const heading = /^#{1,6}\s+(.*)$/.exec(source);
    if (heading) {
      lines.push(...wrap(parseInline(heading[1] ?? "", "bold"), width, "", ""));
      continue;
    }
    if (/^\s*\|/.test(source)) {
      lines.push(...hardWrap(source, width, "plain", ""));
      continue;
    }
    const item = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(source);
    if (item) {
      const prefix = `${item[1] ?? ""}${item[2] ?? ""} `;
      const indent = " ".repeat(textWidth(prefix));
      lines.push(
        ...wrap(parseInline(item[3] ?? "", "plain"), width, prefix, indent),
      );
      continue;
    }
    const leading = /^\s*/.exec(source)?.[0] ?? "";
    lines.push(
      ...wrap(parseInline(source.trim(), "plain"), width, leading, leading),
    );
  }

  return lines;
}

// Fixed-size pages. A page never starts with a blank line.
export function paginate(lines: Line[], rows: number): Line[][] {
  const pages: Line[][] = [];
  let page: Line[] = [];
  for (const line of lines) {
    if (page.length === 0 && line.length === 0) {
      continue;
    }
    page.push(line);
    if (page.length === rows) {
      pages.push(page);
      page = [];
    }
  }
  if (page.length > 0 || pages.length === 0) {
    pages.push(page);
  }

  return pages;
}

const PROMPT_MAX_LINES = 4;

// The prompt as a few dim lines above the reply, cut with "…" when long.
export function formatPrompt(prompt: string, width: number): Line[] {
  const text = prompt.replace(/\s+/g, " ").trim();
  if (text === "") {
    return [];
  }
  // Two columns stay free for the " …".
  const lines = wrap([{ text, style: "dim" }], width - 2, "› ", "  ").map(
    (line) => line.map((run) => ({ ...run, style: "dim" as const })),
  );
  if (lines.length <= PROMPT_MAX_LINES) {
    return lines;
  }
  const kept = lines.slice(0, PROMPT_MAX_LINES);
  kept[PROMPT_MAX_LINES - 1]?.push({ text: " …", style: "dim" });

  return kept;
}

// Each entry starts on a new page, so a reply always begins at the top.
export function entryPages(
  entry: BookEntry,
  width: number,
  rows: number,
): Line[][] {
  const prompt = formatPrompt(entry.prompt, width);
  const reply = formatMarkdown(entry.reply, width);

  return paginate(
    prompt.length === 0 ? reply : [...prompt, [], ...reply],
    rows,
  );
}
````

### `tests/pages.test.ts`

````ts
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
````

### `tests/pane.test.ts`

```ts
import { expect, test } from "claude-code/testing";

// 6 body rows less the 2 header rows leaves 4 lines per page.
const PANE_PROPS = {
  title: "Pages",
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
      plugin: "book-pages",
      surface,
      component: "Pane",
      requestId: "book-pages",
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
```
