import { expect, test } from "claude-code/testing";

const stop = {
  stop_hook_active: false,
  session_id: "session-a",
  transcript_path: "/tmp/session-a.jsonl",
  cwd: "/Users/me/Code/hibachi",
};

test("a finished reply raises a banner named after the session", async ($, on) => {
  const banners: { text: string; title?: string }[] = [];
  on("classic.Stop", () => ({}));
  on("process.run", () => ({ value: { exitCode: 1, stdout: "", stderr: "", isStdoutTruncated: false, isStderrTruncated: false } }));
  on("ui.notify", (_$, e) => {
    banners.push(e);
    return { value: { isSent: true, channel: "ghostty" } };
  });

  await $.classic.Stop(stop);
  expect(banners).toEqual([{ text: "hibachi is done", title: "Claude Code" }]);
});

test("a session renamed with /rename uses that name", async ($, on) => {
  const banners: string[] = [];
  on("classic.Stop", () => ({}));
  on("process.run", () => ({
    value: {
      exitCode: 0,
      stdout: '{"type":"custom-title","customTitle":"old"}\n{"type":"custom-title","customTitle":"pager fix"}\n',
      stderr: "",
      isStdoutTruncated: false,
      isStderrTruncated: false,
    },
  }));
  on("ui.notify", (_$, e) => {
    banners.push(e.text);
    return { value: { isSent: true, channel: "ghostty" } };
  });

  await $.classic.Stop(stop);
  await $.classic.Stop({ ...stop, agent_id: "subagent-1" });
  expect(banners).toEqual(["pager fix is done"]);
});
