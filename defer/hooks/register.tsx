import { atom, read, update } from "claude-code";
import type { EngineInterface, Register } from "claude-code";

import type { DeferList, SavedList } from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;
// Claude Code deletes a session after `cleanupPeriodDays`, 30 by default, so a list older than that has nothing to
// open it.
const MAX_AGE_MS = 30 * DAY_MS;
// Counts sessions, not questions. One session's list has no limit.
const MAX_LISTS = 50;
const KEY_PREFIX = "items:";
const listKey = (sessionId: string) => `${KEY_PREFIX}${sessionId}`;

const EMPTY_LIST: DeferList = { sessionId: "", items: [] };
const heldList = atom({ plugin: "defer", key: "list" } as const, EMPTY_LIST);

function toSaved(value: unknown): SavedList | undefined {
  if (Array.isArray(value)) {
    return { items: value.filter((item) => typeof item === "string") };
  }
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const { items, changedAt } = value as Partial<SavedList>;

  return {
    items: Array.isArray(items) ? items : [],
    ...(typeof changedAt === "number" ? { changedAt } : {}),
  };
}

// The running session's list: the copy in $.state, or the saved one when that copy is another session's.
async function loadList(
  $: EngineInterface,
  sessionId?: string,
): Promise<DeferList> {
  sessionId ??= await $.session.id();
  const held = await read($, heldList);
  if (held.sessionId === sessionId) {
    return held;
  }
  const saved = toSaved(await $.store.get(listKey(sessionId)));

  return { sessionId, items: saved?.items ?? [] };
}

// Removes empty lists, lists not changed for 30 days, and past 50 lists the ones changed longest ago.
async function prune($: EngineInterface) {
  const now = await $.clock.now();
  const kept: { key: string; changedAt: number }[] = [];
  for (const key of await $.store.keys()) {
    if (!key.startsWith(KEY_PREFIX)) {
      continue;
    }
    const saved = toSaved(await $.store.get(key));
    if (
      saved === undefined ||
      saved.items.length === 0 ||
      now - (saved.changedAt ?? now) > MAX_AGE_MS
    ) {
      await $.store.delete(key);
      continue;
    }
    if (saved.changedAt === undefined) {
      await $.store.set(key, { ...saved, changedAt: now });
    }
    kept.push({ key, changedAt: saved.changedAt ?? now });
  }
  kept.sort((a, b) => a.changedAt - b.changedAt);
  for (const { key } of kept.slice(0, Math.max(0, kept.length - MAX_LISTS))) {
    await $.store.delete(key);
  }
}

// Puts the list in $.state, which redraws the band and the picker, and saves it in $.store.
async function setList($: EngineInterface, list: DeferList) {
  await update($, heldList, () => list);
  if (list.items.length === 0) {
    await $.store.delete(listKey(list.sessionId));
  } else {
    await $.store.set(listKey(list.sessionId), {
      items: list.items,
      changedAt: await $.clock.now(),
    } satisfies SavedList);
  }
  await prune($);
}

// Opening or resuming a session counts as a change, so a list in a session still in use is kept.
async function openSession($: EngineInterface, sessionId: string) {
  const list = await loadList($, sessionId);
  await update($, heldList, () => list);
  if (list.items.length > 0) {
    await $.store.set(listKey(sessionId), {
      items: list.items,
      changedAt: await $.clock.now(),
    } satisfies SavedList);
  }
  await prune($);
}

const PICKER = "defer-picker";
// `/differ` is the same command, for the typo.
const COMMANDS = ["defer", "differ"];
// A prompt that ends with `/defer` is saved in place of being sent.
const TRAILING = /^([\s\S]*\S)\s+\/(?:defer|differ)$/;
// The record of a `/defer <question>` run, which the model reads on its next turn.
const COMMAND_RECORD = /<command-name>\/(?:defer|differ)<\/command-name>/;
const COMMAND_ARGS = /<command-args>[\s\S]*?<\/command-args>/g;
// Picker keys, in list order. A question past these is picked with a click.
const HOTKEYS = "123456789abcdefghijklmnopqrstuvwxyz";
// The rows around the questions in the picker: the hint line.
const PICKER_EXTRA_ROWS = 1;

const plural = (count: number) =>
  `${count} saved question${count === 1 ? "" : "s"}`;

// A question as one line of the picker, cut with "…" to the pane width.
function oneLine(text: string, columns: number): string {
  const line = text.replace(/\s+/g, " ").trim();
  const room = Math.max(8, columns);

  return line.length > room ? `${line.slice(0, room - 1)}…` : line;
}

async function save($: EngineInterface, question: string): Promise<string> {
  const list = await loadList($);
  const items = [...list.items, question];
  await setList($, { ...list, items });

  return `Saved for later · ${plural(items.length)} · /defer to pick`;
}

async function openPicker($: EngineInterface): Promise<string> {
  const list = await loadList($);
  if (list.items.length === 0) {
    return "No saved questions. Save one with /defer <question>.";
  }
  await $.ui.open({
    id: PICKER,
    title: "Saved questions",
    focus: true,
    closeOnEscape: true,
    holdToasts: true,
    rows: list.items.length + PICKER_EXTRA_ROWS,
  });

  return "Pick a saved question.";
}

// The picked question leaves the list and goes into the prompt box, after any draft already there.
async function pick($: EngineInterface, index: number) {
  const list = await loadList($);
  const question = list.items[index];
  if (question === undefined) {
    return;
  }
  await setList($, {
    ...list,
    items: list.items.filter((_, at) => at !== index),
  });
  // The box takes no text while the picker holds it as a dialog.
  await $.ui.close({ id: PICKER });
  const draft = await $.prompt.read();
  await $.prompt.fill(
    draft.text.trim() === ""
      ? { text: question }
      : { text: `\n${question}`, mode: "append" },
  );
}


export const register: Register = (on) => {
  on("session.start", async ($, e, next) => {
    for (const name of COMMANDS) {
      await $.command.register({
        name,
        description: "Save a question for later, or pick a saved one",
        argumentHint: "[question]",
        // Runs mid-turn, so a question can be saved while Claude is busy.
        immediate: true,
      });
    }
    // Saves a list that an open session held in $.state alone before this load.
    await openSession($, await $.session.id());

    return next(e);
  });

  // A restart with --resume or --continue, /resume and /clear go on under another session id.
  on("classic.SessionStart", async ($, e, next) => {
    await openSession($, e.session_id);

    return next(e);
  });

  // A prompt typed while Claude works is caught at Enter too, before it is queued.
  on("prompt.submit", async ($, e, next) => {
    const trailing = TRAILING.exec(e.text.trim());
    if (trailing?.[1] !== undefined) {
      return { drop: await save($, trailing[1].trim()) };
    }

    return next(e);
  }).catch(($, e, next) => {
    // A question meant for later never reaches Claude, even when saving it failed.
    if (next.called || !TRAILING.test(e.text.trim())) {
      return next(e);
    }

    return { drop: "defer: could not save the question. It was not sent." };
  });

  for (const command of COMMANDS) {
    on("command.run", { command }, async ($, e) => {
      const question = e.args.trim();

      return { text: await (question === "" ? openPicker($) : save($, question)) };
    });
  }

  // The command's record keeps its name but loses the question, so Claude does not read it.
  on("session.append", { door: "command" }, ($, e, next) => {
    const isDefer = e.message.content.some(
      (block) => block.type === "text" && COMMAND_RECORD.test(block.text),
    );
    if (!isDefer) {
      return next(e);
    }
    const content = e.message.content.map((block) =>
      block.type === "text"
        ? { ...block, text: block.text.replace(COMMAND_ARGS, "<command-args></command-args>") }
        : block,
    );

    return next({ ...e, message: { ...e.message, content } });
  });

  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    const list = await loadList($);
    if (e.props.hasSurvey || list.items.length === 0) {
      return next(e);
    }
    const { Text } = $.ui.resolve(e);

    return (
      <Text dimColor>{`${plural(list.items.length)} · /defer to pick`}</Text>
    );
  });

  on("ui.render", { component: "Pane", requestId: PICKER }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e);
    const list = await loadList($);
    // The hotkey's "1: " before each label.
    const columns = e.props.bodyColumns - 3;

    return (
      <Box flexDirection="column">
        {list.items.length === 0 && <Text dimColor>No saved questions.</Text>}
        {list.items.map((item, index) => (
          <Button
            key={`item-${index}`}
            plain
            label={oneLine(item, columns)}
            onPress={() => pick($, index)}
            {...(HOTKEYS[index] === undefined
              ? {}
              : { hotkey: HOTKEYS[index] })}
          />
        ))}
        <Text dimColor>Press a number or click to pick · Esc closes</Text>
      </Box>
    );
  });
};
