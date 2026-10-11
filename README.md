# claude-skills

Reusable Claude Code skills, and a few mods.

## Skills

Copy (or symlink) a skill folder into a project's `.claude/skills/` to use it.

- `implement`
- `skeleton-ui`

## Mods

### `book-pager`

Shows Claude's finished replies in a side pane as fixed pages with short lines, so they are easier to read in a wide terminal. Each session keeps its own book, and a restart or `/resume` brings it back.

To load it in every session, add this to `~/.claude/settings.json` (inside the `"env"` block if there already is one), then start a new session:

```json
"env": { "CLAUDE_CODE_PLUGIN_DIRS": "~/code/claude-skills/book-pager" }
```

- `/pager` shows or hides the pane.
- `p` / `n` turn the page when the pane has focus. With the prompt empty, `,` and `.` turn it from the prompt.
- The text fills the pane, so drag the pane's edge to change the page width. A table is drawn with borders when it fits, with long cells wrapped inside their column, and as one card per row when even its narrowest columns do not fit.
- The pane opens at the `width` setting, in terminal columns of text (default 76, 20 to 200). Change "Page width" in `/config`, or set it in `~/.claude/settings.json` and restart:

  ```json
  "pluginConfigs": { "book-pager": { "options": { "width": 90 } } }
  ```

### `defer`

Saves a question for later without sending it to Claude.

- Save: `/defer <question>`, or end a prompt with `/defer`. Both work while Claude is busy. The prompt form never reaches Claude, and the command form keeps the question out of the conversation.
- Pick: `/defer` with no text opens a list. Press `1`, `2`, and so on, or click. The question goes into the prompt box and leaves the list.
- A line above the prompt shows "2 saved questions · /defer to pick". `/differ` does the same as `/defer`.
- Each session has its own list. It survives compaction, restarts and `/resume`, and `/clear` starts an empty one. A list is saved in `$.store` under `items:<session id>`, and is removed when it becomes empty, when it has not changed for 30 days, or when more than 50 lists are saved (the one changed longest ago goes first).

### Loading the mods

Separate the folders with `:`:

```json
"env": { "CLAUDE_CODE_PLUGIN_DIRS": "~/code/claude-skills/book-pager:~/code/claude-skills/defer" }
```

The mod API is early access. book-pager was built on Claude Code 2.1.289; defer on 2.1.296. Setup steps, the design and what was tested are in [the design note](2026-10-05-book-pages-mod-for-claude-code.md).
