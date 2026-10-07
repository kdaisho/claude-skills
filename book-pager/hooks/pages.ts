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

// A link shows only its text, because the pane cannot open the URL.
const LINK = /\[([^\]]+)\]\([^)\s]+\)/g;

function parseInline(text: string, base: Style): Run[] {
  const runs: Run[] = [];
  for (const part of text
    .replace(LINK, "$1")
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/)) {
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

// Cuts at the width with no word wrapping, for code.
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

const TABLE_ROW = /^\s*\|/;
const COLUMN_GAP = 2;

// "\|" is a pipe inside a cell, not a column border.
function splitCells(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, "")
    .replace(/(?<!\\)\|$/, "")
    .split(/(?<!\\)\|/)
    .map((cell) => cell.replace(/\\\|/g, "|").trim());
}

function isDividerRow(cells: string[]): boolean {
  return cells.every((cell) => /^:?-+:?$/.test(cell));
}

// Aligned columns, or undefined when the table is wider than the width.
function formatGrid(
  header: string[],
  body: string[][],
  width: number,
): Line[] | undefined {
  const rows = [
    ...(header.length > 0
      ? [header.map((cell) => parseInline(cell, "bold"))]
      : []),
    ...body.map((row) => row.map((cell) => parseInline(cell, "plain"))),
  ];
  const columns = Math.max(0, ...rows.map((row) => row.length));
  const widths = Array.from({ length: columns }, (_, column) =>
    Math.max(0, ...rows.map((row) => lineWidth(row[column] ?? []))),
  );
  const total =
    widths.reduce((sum, size) => sum + size, 0) +
    COLUMN_GAP * Math.max(0, columns - 1);
  if (total > width) {
    return undefined;
  }
  const lines: Line[] = rows.map((row) =>
    widths.flatMap((size, column) => {
      const cell = row[column] ?? [];
      if (column === columns - 1) {
        return cell;
      }
      const padding = size - lineWidth(cell) + COLUMN_GAP;

      return [...cell, { text: " ".repeat(padding), style: "plain" as const }];
    }),
  );
  if (header.length > 0) {
    lines.splice(1, 0, [{ text: "─".repeat(total), style: "dim" }]);
  }

  return lines;
}

// One block per row: the first cell is the title, then each header over its value.
function formatCards(
  header: string[],
  body: string[][],
  width: number,
): Line[] {
  const lines: Line[] = [];
  body.forEach((row, index) => {
    if (index > 0) {
      lines.push([{ text: "─".repeat(width), style: "dim" }]);
    }
    lines.push(...wrap(parseInline(row[0] ?? "", "bold"), width, "", ""));
    row.slice(1).forEach((cell, column) => {
      if (cell === "") {
        return;
      }
      lines.push([]);
      const label = header[column + 1] ?? "";
      if (label !== "") {
        lines.push(...wrap(parseInline(label, "bold"), width, "  ", "  "));
      }
      lines.push(...wrap(parseInline(cell, "plain"), width, "  ", "  "));
    });
  });

  return lines;
}

function formatTable(rows: string[], width: number): Line[] {
  const cells = rows.map(splitCells);
  const hasHeader = cells.length > 1 && isDividerRow(cells[1] ?? []);
  const header = hasHeader ? (cells[0] ?? []) : [];
  const body = hasHeader ? cells.slice(2) : cells;

  return formatGrid(header, body, width) ?? formatCards(header, body, width);
}

export function formatMarkdown(markdown: string, width: number): Line[] {
  const lines: Line[] = [];
  let isInCode = false;
  let tableRows: string[] = [];
  for (const source of markdown.replace(/\t/g, "  ").split("\n")) {
    if (!isInCode && TABLE_ROW.test(source)) {
      tableRows.push(source);
      continue;
    }
    if (tableRows.length > 0) {
      lines.push(...formatTable(tableRows, width));
      tableRows = [];
    }
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
  if (tableRows.length > 0) {
    lines.push(...formatTable(tableRows, width));
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
