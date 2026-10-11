import type { EngineInterface, Register } from "claude-code";

const TITLE = "Claude Code";

// The name the voice notification says: the /rename title, else the folder's name.
async function sessionName(
  $: EngineInterface,
  transcriptPath: string,
  cwd: string,
): Promise<string> {
  const found = await $.process
    .run(["grep", '"type":"custom-title"', transcriptPath])
    .catch(() => undefined);
  const last = found?.stdout.trim().split("\n").pop() ?? "";
  try {
    const title = (JSON.parse(last) as { customTitle?: unknown }).customTitle;
    if (typeof title === "string" && title !== "") {
      return title;
    }
  } catch {
    // No /rename in this session.
  }

  return cwd.split("/").filter(Boolean).pop() ?? "Claude";
}

// A banner when Claude finishes, beside the voice from ~/.claude/hooks/say-notify.sh. Claude Code raises its own banner
// when it waits for an answer, through the same `preferredNotifChannel`.
export const register: Register = (on) => {
  on("classic.Stop", async ($, e, next) => {
    const result = await next(e);
    if (e.agent_id === undefined) {
      const name = await sessionName($, e.transcript_path, e.cwd);
      await $.ui.notify(`${name} is done`, { title: TITLE }).catch(() => undefined);
    }

    return result;
  });
};
