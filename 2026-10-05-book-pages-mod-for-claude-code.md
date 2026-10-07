# book-pager mod for Claude Code

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

Seven hooks in `hooks/register.tsx`:

| Hook               | What it does                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------- |
| `session.start`    | Registers the `/pages` command and opens the pane                                             |
| `command.run`      | Answers `/pages`: closes the pane if it is shown, else opens it with keyboard focus           |
| `prompt.submit`    | Saves my prompt until Claude's reply to it finishes                                           |
| `turn.complete`    | When a reply finishes, adds `{ prompt, reply }` to the book and jumps to its first page       |
| `prompt.edit`      | When the prompt is empty and the pane is visible, takes `,` or `.` and turns the page instead |
| `classic.SessionStart` | After `/clear`, redraws the pane with the new session's book, which is empty          |
| `ui.render` (Pane) | Draws the current page                                                                        |

How a page is made (`hooks/pages.ts`):

```
reply text (markdown)
  → wrap at min(width setting, pane width) characters; Japanese counts as 2 columns
  → cut into pages of (pane height − 2) lines
  → a page never starts with a blank line
  → each reply starts on a new page
```

Values kept for the session in `$.state` (they survive a reload of the mod, but not a restart, `/clear`, `/resume` or `/branch`):

- `book`: the session's id, its replies with their prompts (newest 200), and which reply and page I am on
- `pendingPrompt`: my latest prompt, until the reply to it finishes

Values saved in `$.store`, a JSON file in `~/.claude/plugins/store/`, so a restart or `/resume` brings the book back:

- `entries:<session id>` and `position:<session id>`: each session's book
- `sessions`: the saved session ids, oldest first. Only the newest 30 books are kept. The store holds 4 MiB in all, so when it is full the oldest books are deleted first.

When the pane draws, the mod asks for the session id. If the book in `$.state` belongs to another session, it reads the saved book from `$.store`.

## What failed

- **Binding keys to the page buttons.** A Button can name a Claude Code keybinding action (`action` prop), and the docs say the person's binding for it then presses the button from the prompt. I bound `Option+,` / `Option+.` and `ctrl+x p` / `ctrl+x n` in `~/.claude/keybindings.json`, first to `pane:previous` / `pane:next`, then to two unused actions. None of them pressed the buttons. I could not see why, because the session had no debug log. I removed the bindings.
- **`Cmd+←` / `Cmd+→`.** Ghostty already sends "start of line" / "end of line" for these keys, so Claude Code never sees them.
- **Plain `Tab` to focus the pane.** Possible (`abovePrompt:focus` in the `Chat` context), but `Tab` also accepts completions, so I did not use it.

## Where it lives

- Code: [`book-pager/`](book-pager/) in this repository, cloned to `~/code/claude-skills/`.
- It loads in every session because of this setting in `~/.claude/settings.json`. To load more mods, add their paths separated by `:`:
  ```json
  "env": { "CLAUDE_CODE_PLUGIN_DIRS": "~/code/claude-skills/book-pager" }
  ```
  To turn it off, remove `~/code/claude-skills/book-pager` from that line and start a new session.
- The saved books are not in the repository. They are in `~/.claude/plugins/store/book-pager_*.json` on each machine.

## Page width

The page width is the `width` setting, in terminal columns (characters, not pixels). The default is 76, and it can be 20 to 200. The pane opens 4 columns wider than the text. If the terminal is too narrow to give the pane that much room, the text shrinks to fit the pane.

To change it, change "Page width" in `/config`, or add this to `~/.claude/settings.json` and restart:

```json
"pluginConfigs": { "book-pager": { "options": { "width": 90 } } }
```

Check the spelling of `pluginConfigs`. Claude Code ignores a key it does not know, so a typo leaves the width at 76 with no error. If the width still does not change after a restart, try the name `book-pager@inline` in place of `book-pager`, or use `/config`, which saves it under the right name.

Do not change `"default"` in `plugin.json` to set your own width. That changes it for everyone who installs the mod.
## Set it up on a machine

1. Run `claude --version`. The mod was built and tested on 2.1.289. If the version is older, run `claude update` first, because the mod API is "early access" and changes between releases.
2. Clone this repository to `~/code/claude-skills/`, or run `git pull` if it is already there.
3. Run `claude plugin validate ~/code/claude-skills/book-pager`. The expected result is "Validation passed with warnings". The known warning is "No author information provided". It is harmless.
4. Run `claude plugin test ~/code/claude-skills/book-pager`. The expected result is "12 pass, 0 fail".
5. If a step fails, the API has probably changed. Ask Claude to load the `plugin-authoring` skill, read `.claude-plugin/types/claude-code/index.d.ts` in the mod folder (Claude Code writes it for the installed version), and fix the code to match it.
6. Add the `CLAUDE_CODE_PLUGIN_DIRS` line from "Where it lives" to `~/.claude/settings.json`. If the file already has an `"env"` block, add the line inside that block. Do not replace the file. If the line already points to `~/.claude/mods/book-pages` (the old place), change it, then delete that old folder. If it points to `~/code/claude-skills/book-pages` (the name before the rename to `book-pager`), change it, and rename the `book-pages` key in `pluginConfigs` to `book-pager` too.
7. Start a new session and run `/pages`.
8. To use a different page width, see "Page width".

`tsconfig.json` and `.claude-plugin/types/` are not in the repository. Claude Code creates them when it first loads the mod.

If `/pages` is missing from the `/` list even though steps 3 and 4 passed, the mod did not load. One possible reason is that the mod API is not available on that plan or account. This is not known for the Pro plan.

## Compacting, /clear and restarts

- The book survives compacting. The mod keeps its own copy of each reply, and compacting does not reset it.
- Each session has its own book. A new session or `/clear` starts an empty book.
- A restart or `/resume` brings the session's book back from `$.store`. Fixed on 2026-10-06; before that, the book was only in `$.state` and was lost.
- `/branch` starts a new session, so it starts an empty book. Not tested.
- Saved books have no time limit. They are deleted only when there are more than 30, or when the store is full.

## Changing it

- Check: `claude plugin validate <folder>`
- Test: `claude plugin test <folder>` (9 tests: line width, styles, page size, prompt cut, page turning on terminal and desktop, a resumed session getting its own book back, and the width setting with its default and a set value)
- The test tools cannot simulate typing into the prompt, so the `,` and `.` keys were only tested by hand.
- Ask Claude to load the `plugin-authoring` skill before changing the code. It has the mod API docs.

## Before sharing it publicly

- It is a plugin, not a skill. A skill cannot draw a pane or catch keys. Share it as a plugin in a GitHub repository.
- Make the keys a user setting. Taking `,` and `.` fits me, but not everyone. The width became a setting on 2026-10-06.
- Say what it was tested on: Ghostty, Claude Code's fullscreen layout, Claude Code 2.1.289. The mod API is marked "early access" and can change between releases.
- Test the narrow layout more, where the pane sits above the prompt (below 110 columns). Opening and closing it with `/pages` works there. Turning pages there has not been tested.
- Collect the existing replies when the mod loads, so the pane does not start empty.
- Describe the research carefully (see above).
