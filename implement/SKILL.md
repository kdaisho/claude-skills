---
name: implement
description: Implement a feature end-to-end from a spec, Linear ticket (e.g. KDA-56), or written requirement in this repo — branch, tests first, minimal change, lint + test green, self-review, summary. Use whenever the user asks to build, add, or implement a feature, work on a ticket, or "do KDA-xx", even if they don't say "implement" explicitly.
---

# Implement

Take a requirement from "described" to "done and verified" with the smallest correct change.

## 1. Restate the requirement

Restate what's being asked in a few lines and list the files you expect to touch.

- If there's a Linear ID, fetch it (`mcp__linear__get_issue`). If there's a matching `specs/<ID>-*/spec.md`, read it — its acceptance criteria are the definition of done.
- **Stop and ask if it's ambiguous.** Guessing at scope costs more than one question.

## 2. Find a similar feature and mirror it

Locate an existing feature with a similar shape (a component, route, hook, API endpoint) and follow its structure, naming, and idioms. Consistency with the codebase beats a locally "better" pattern. Reuse existing components and theme tokens rather than hand-rolling new UI.

## 3. Create the branch — before editing any file

Name it `{TICKET-ID}/{kebab-case-title}`, e.g. `KDA-56/add-page-thumbnails`, using the ticket title as-is in kebab-case.

If no ticket ID can be found, use `chore/…` or `bugfix/…` as fits, or ask the user.

## 4. Set the ticket to In Progress

If there's a Linear ID, move it to "In Progress" (`mcp__linear__save_issue` / equivalent status update) as soon as work starts — right after the branch is created, before any file edits.

## 5. Tests first

Write or extend tests covering the new behavior, run them, and confirm they **fail** for the right reason. A test that passes before the change proves nothing.

## 6. Implement the minimal change

Only what the requirement needs. No speculative abstractions, drive-by refactors, or unrelated cleanups — they bloat the diff and hide the real change.

## 7. Verify

```bash
pnpm run lint && pnpm test
```

Fix until green. Don't start, restart, or kill the dev server — the user runs their own.

## 8. Self-review

Read the full diff (`git diff main...`) and check:

- No dead code, leftover debug logging, or commented-out blocks
- No new dependencies without a stated reason
- Error paths handled (failed fetches, empty/invalid input, Wasm failures)

## 9. Summarize

Report:

- Changed files, one line each on what changed
- Test/lint results
- Follow-ups or open questions (anything deferred, out of scope, or uncertain)
