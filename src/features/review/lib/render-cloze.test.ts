import { describe, it, expect } from "vitest";
import { parseCloze, clozePlainText } from "./render-cloze";

describe("parseCloze", () => {
  it("single deletion returns one cloze segment", () => {
    const result = parseCloze("{{c1::answer}}");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ text: "answer", isCloze: true, ordinal: 1 });
  });

  it("multiple deletions return multiple cloze segments with interleaved plain text", () => {
    const result = parseCloze("El {{c1::sol}} y la {{c2::luna}}.");
    expect(result).toEqual([
      { text: "El ", isCloze: false, ordinal: 0 },
      { text: "sol", isCloze: true, ordinal: 1 },
      { text: " y la ", isCloze: false, ordinal: 0 },
      { text: "luna", isCloze: true, ordinal: 2 },
      { text: ".", isCloze: false, ordinal: 0 },
    ]);
  });

  it("hint syntax shows answer and ignores hint", () => {
    const result = parseCloze("{{c1::answer::hint text}}");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ text: "answer", isCloze: true, ordinal: 1 });
  });

  it("captures the cloze ordinal for higher group numbers", () => {
    const result = parseCloze("{{c12::late}}");
    expect(result[0]).toEqual({ text: "late", isCloze: true, ordinal: 12 });
  });

  it("no markup returns a single plain segment with isCloze false", () => {
    const result = parseCloze("Plain text with no markup.");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      text: "Plain text with no markup.",
      isCloze: false,
      ordinal: 0,
    });
  });

  it("malformed {{c1::}} yields empty string cloze segment without crashing", () => {
    const result = parseCloze("{{c1::}}");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ text: "", isCloze: true, ordinal: 1 });
  });

  it("text before first deletion is a plain text segment", () => {
    const result = parseCloze("Before {{c1::word}} after");
    expect(result[0]).toEqual({ text: "Before ", isCloze: false, ordinal: 0 });
    expect(result[1]).toEqual({ text: "word", isCloze: true, ordinal: 1 });
  });

  it("text after last deletion is a plain text segment", () => {
    const result = parseCloze("Before {{c1::word}} after");
    const last = result[result.length - 1];
    expect(last).toEqual({ text: " after", isCloze: false, ordinal: 0 });
  });
});

describe("clozePlainText", () => {
  it("flattens multiple deletions to plain answers", () => {
    expect(clozePlainText("El {{c1::sol}} y la {{c2::luna}}.")).toBe("El sol y la luna.");
  });

  it("drops hints, keeping only the answer", () => {
    expect(clozePlainText("{{c1::answer::hint}}")).toBe("answer");
  });

  it("returns plain input unchanged when there is no markup", () => {
    expect(clozePlainText("No markup here.")).toBe("No markup here.");
  });
});
