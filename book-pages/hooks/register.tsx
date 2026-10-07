import { atom, read, update } from "claude-code";
import type { EngineInterface, Register } from "claude-code";

import type { Book, BookEntry, BookPosition } from "../types";
import { entryPages } from "./pages";
import type { Line, Run } from "./pages";

const PANE = "book-pages";
const DEFAULT_COLUMNS = 76;
// The pane's border and padding around the text.
const DOCK_MARGIN = 4;
const MAX_ENTRIES = 200;
// The button row and the rule under it.
const HEADER_ROWS = 2;
// Typed into an empty prompt, these turn the page instead of typing. The Japanese ones are what the IME types.
const PREV_KEYS = [",", "、"];
const NEXT_KEYS = [".", "。"];

const EMPTY_BOOK: Book = {
  sessionId: "",
  entries: [],
  position: { entry: 0, page: 0 },
};
const heldBook = atom({ plugin: "book-pages", key: "book" } as const, EMPTY_BOOK);
const pendingPrompt = atom(
  { plugin: "book-pages", key: "pendingPrompt" } as const,
  "",
);

// Each session's book is also saved in $.store, so a restart or /resume brings it back.
// $.store holds 4 MiB in all, so only the newest books are kept.
const MAX_SAVED_BOOKS = 30;
const SAVED_SESSIONS_KEY = "sessions";
const entriesKey = (sessionId: string) => `entries:${sessionId}`;
const positionKey = (sessionId: string) => `position:${sessionId}`;

// The running session's book: the copy in $.state, or the saved one when that copy is another session's.
async function loadBook($: EngineInterface): Promise<Book> {
  const sessionId = await $.session.id();
  const held = await read($, heldBook);
  if (held.sessionId === sessionId) {
    return held;
  }
  const entries = (await $.store.get(entriesKey(sessionId))) as
    | BookEntry[]
    | undefined;
  const position = (await $.store.get(positionKey(sessionId))) as
    | BookPosition
    | undefined;

  return {
    sessionId,
    entries: entries ?? [],
    position: position ?? EMPTY_BOOK.position,
  };
}

async function forgetBook($: EngineInterface, sessionId: string) {
  await $.store.delete(entriesKey(sessionId));
  await $.store.delete(positionKey(sessionId));
}

async function saveEntries($: EngineInterface, saved: Book) {
  const listed =
    ((await $.store.get(SAVED_SESSIONS_KEY)) as string[] | undefined) ?? [];
  const sessions = [
    ...listed.filter((id) => id !== saved.sessionId),
    saved.sessionId,
  ];
  while (sessions.length > MAX_SAVED_BOOKS) {
    await forgetBook($, sessions.shift() ?? "");
  }
  // When the store is full, the oldest books make room.
  for (;;) {
    try {
      await $.store.set(entriesKey(saved.sessionId), saved.entries);
      break;
    } catch (error) {
      const oldest = sessions[0];
      if (oldest === undefined || oldest === saved.sessionId) {
        throw error;
      }
      sessions.shift();
      await forgetBook($, oldest);
    }
  }
  await $.store.set(SAVED_SESSIONS_KEY, sessions);
}

// The page width from the plugin's settings, set when the module loads.
let maxColumns = DEFAULT_COLUMNS;

// The pane's text size from its last draw, so a key typed in the prompt pages the same way.
let layout = { width: DEFAULT_COLUMNS, rows: 20 };

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
  const current = await loadBook($);
  const book = current.entries.map((entry) =>
    entryPages(entry, layout.width, layout.rows),
  );
  const saved = current.position;
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
  const current = await loadBook($);
  await update($, heldBook, () => ({ ...current, position: nextSpot }));
  await $.store.set(positionKey(current.sessionId), nextSpot);
}

function openPane($: EngineInterface, isFocused: boolean) {
  return $.ui.open({
    id: PANE,
    title: "Pages",
    columns: maxColumns + DOCK_MARGIN,
    ...(isFocused ? { focus: true } : {}),
  });
}

export const register: Register = (on, options) => {
  maxColumns =
    typeof options.width === "number" ? options.width : DEFAULT_COLUMNS;
  layout = { ...layout, width: maxColumns };

  on("session.start", async ($, e, next) => {
    await $.command.register({
      name: "pages",
      description: "Show or hide Claude's replies as fixed pages in a side pane",
    });
    void openPane($, false);

    return next(e);
  });

  // /clear goes on under a new session id with no session.start, so this redraws the pane with that session's book.
  on("classic.SessionStart", async ($, e, next) => {
    if (e.source === "clear") {
      await update($, heldBook, () => EMPTY_BOOK);
    }

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
      const current = await loadBook($);
      const entries = [...current.entries, { prompt, reply: e.answer }].slice(
        -MAX_ENTRIES,
      );
      const position = { entry: entries.length - 1, page: 0 };
      const grown = { ...current, entries, position };
      await update($, heldBook, () => grown);
      await update($, pendingPrompt, () => "");
      await saveEntries($, grown);
      await $.store.set(positionKey(current.sessionId), position);
    }

    return next(e);
  });

  on("ui.render", { component: "Pane", requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e);
    layout = {
      width: Math.max(10, Math.min(maxColumns, e.props.bodyColumns)),
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
