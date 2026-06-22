import { describe, it, expect } from "vitest";
import { getDeckColor, PALETTE } from "./deck-color";

describe("getDeckColor", () => {
  it("returns a color from the palette", () => {
    const c = getDeckColor("deck-001");
    expect(PALETTE).toContainEqual(c);
  });

  it("is deterministic — same id always returns same color", () => {
    expect(getDeckColor("abc")).toEqual(getDeckColor("abc"));
  });

  it("distributes across palette — different ids return different colors", () => {
    const ids = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"];
    const colors = ids.map(getDeckColor);
    const unique = new Set(colors.map((c) => c.color));
    expect(unique.size).toBeGreaterThan(1);
  });

  it("handles empty string without throwing", () => {
    expect(() => getDeckColor("")).not.toThrow();
    expect(PALETTE).toContainEqual(getDeckColor(""));
  });
});
