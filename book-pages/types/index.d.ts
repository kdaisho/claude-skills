export type BookEntry = { prompt: string; reply: string };
export type BookPosition = { entry: number; page: number };
// One session's book. `sessionId` says which session the copy in $.state belongs to.
export type Book = {
  sessionId: string;
  entries: BookEntry[];
  position: BookPosition;
};

declare module "claude-code" {
  interface PluginState {
    "book-pages": {
      book: Book;
      pendingPrompt: string;
    };
  }
}
