import { describe, it, expect } from "vitest";
import { queryKeys } from "./query-keys";

describe("queryKeys factory", () => {
  describe("auth", () => {
    it("auth.all is a stable base key", () => {
      expect(queryKeys.auth.all).toEqual(["auth"]);
    });

    it("auth.me() returns a unique, stable key", () => {
      expect(queryKeys.auth.me()).toEqual(["auth", "me"]);
      // Calling it twice returns equal tuples (not the same reference, but equal)
      expect(queryKeys.auth.me()).toEqual(queryKeys.auth.me());
    });

    it("auth.me() is scoped under auth.all", () => {
      const [prefix] = queryKeys.auth.me();
      expect(prefix).toBe(queryKeys.auth.all[0]);
    });
  });

  describe("decks", () => {
    it("decks.all is the base key", () => {
      expect(queryKeys.decks.all).toEqual(["decks"]);
    });

    it("decks.list() with no params uses empty object", () => {
      expect(queryKeys.decks.list()).toEqual(["decks", "list", {}]);
    });

    it("decks.list() with params embeds them in the key", () => {
      const key = queryKeys.decks.list({ page: 2, size: 10, search: "biology" });
      expect(key).toEqual(["decks", "list", { page: 2, size: 10, search: "biology" }]);
    });

    it("decks.detail() includes the deckId", () => {
      const key = queryKeys.decks.detail("deck-123");
      expect(key).toEqual(["decks", "detail", "deck-123"]);
    });

    it("decks.stats() includes the deckId", () => {
      const key = queryKeys.decks.stats("deck-456");
      expect(key).toEqual(["decks", "stats", "deck-456"]);
    });

    it("list keys with different params are not equal", () => {
      const k1 = queryKeys.decks.list({ page: 0 });
      const k2 = queryKeys.decks.list({ page: 1 });
      expect(k1).not.toEqual(k2);
    });

    it("detail and list keys with same id are distinct", () => {
      const list = queryKeys.decks.list();
      const detail = queryKeys.decks.detail("abc");
      expect(list).not.toEqual(detail);
    });
  });

  describe("notes", () => {
    it("notes.list() with deckId embeds it", () => {
      const key = queryKeys.notes.list({ deckId: "d1" });
      expect(key[2]).toMatchObject({ deckId: "d1" });
    });

    it("notes.cardsByNote() scopes by noteId", () => {
      expect(queryKeys.notes.cardsByNote("n1")).toEqual(["notes", "cards", "n1"]);
    });
  });

  describe("cards", () => {
    it("cards.due() with no deckId uses null sentinel", () => {
      expect(queryKeys.cards.due()).toEqual(["cards", "due", null]);
    });

    it("cards.due() with deckId embeds it", () => {
      expect(queryKeys.cards.due("d1")).toEqual(["cards", "due", "d1"]);
    });
  });

  describe("reviews", () => {
    it("reviews.sessions() uses empty object when no params", () => {
      expect(queryKeys.reviews.sessions()).toEqual(["reviews", "sessions", {}]);
    });

    it("reviews.session() scopes by sessionId", () => {
      expect(queryKeys.reviews.session("s1")).toEqual(["reviews", "session", "s1"]);
    });
  });

  describe("key isolation (different features don't collide)", () => {
    it("deck detail and note detail with same id are distinct", () => {
      const deckKey = queryKeys.decks.detail("same-id");
      const noteKey = queryKeys.notes.detail("same-id");
      expect(deckKey[0]).not.toBe(noteKey[0]);
    });

    it("auth.all does not overlap with decks.all", () => {
      expect(queryKeys.auth.all).not.toEqual(queryKeys.decks.all);
    });
  });
});
