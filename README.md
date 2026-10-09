# claude-skills

Reusable Claude Code skills, and one mod.

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
- The text fills the pane, so drag the pane's edge to change the page width. A table shows as columns when it fits and as one card per row when it does not.
- The pane opens at the `width` setting, in terminal columns of text (default 76, 20 to 200). Change "Page width" in `/config`, or set it in `~/.claude/settings.json` and restart:

  ```json
  "pluginConfigs": { "book-pager": { "options": { "width": 90 } } }
  ```

The mod API is early access, and the mod was built on Claude Code 2.1.289. Setup steps, the design and what was tested are in [the design note](2026-10-05-book-pages-mod-for-claude-code.md).
