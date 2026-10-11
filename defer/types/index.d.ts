// One session's saved questions. `sessionId` says which session the copy in $.state belongs to.
export type DeferList = { sessionId: string; items: string[] };
// A list as $.store keeps it. `changedAt` is in milliseconds; a list saved without it gets one when next checked.
export type SavedList = { items: string[]; changedAt?: number };

declare module "claude-code" {
  interface PluginState {
    defer: {
      list: DeferList;
    };
  }
}
