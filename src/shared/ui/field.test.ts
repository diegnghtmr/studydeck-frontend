import { describe, it, expect } from "vitest";
import { FIELD_CLASS, fieldClass } from "./field";

describe("fieldClass()", () => {
  it("fieldClass() with no argument equals FIELD_CLASS exactly", () => {
    expect(fieldClass()).toBe(FIELD_CLASS);
  });

  it("fieldClass({ error: false }) equals FIELD_CLASS exactly", () => {
    expect(fieldClass({ error: false })).toBe(FIELD_CLASS);
  });

  it("fieldClass({ error: true }) contains coral-red ring token", () => {
    const result = fieldClass({ error: true });
    expect(result).toContain("ring-[var(--color-coral-red)]");
  });

  it("fieldClass({ error: true }) does NOT contain normal ring-[#e7e4df]", () => {
    const result = fieldClass({ error: true });
    expect(result).not.toContain("ring-[#e7e4df]");
  });

  it("fieldClass({ error: true }) does NOT contain blue focus ring ring-[#0090ff]", () => {
    const result = fieldClass({ error: true });
    expect(result).not.toContain("ring-[#0090ff]");
  });

  it("fieldClass({ error: true }) contains FIELD_BASE tokens: resize-none", () => {
    expect(fieldClass({ error: true })).toContain("resize-none");
  });

  it("fieldClass({ error: true }) contains FIELD_BASE tokens: rounded-[10px]", () => {
    expect(fieldClass({ error: true })).toContain("rounded-[10px]");
  });

  it("fieldClass({ error: true }) contains FIELD_BASE tokens: bg-[#fbfaf9]", () => {
    expect(fieldClass({ error: true })).toContain("bg-[#fbfaf9]");
  });

  it("fieldClass({ error: false }) contains FIELD_BASE tokens: bg-[#fbfaf9]", () => {
    expect(fieldClass({ error: false })).toContain("bg-[#fbfaf9]");
  });

  it("fieldClass() value equals fieldClass({ error: false }) value (identity)", () => {
    expect(fieldClass()).toBe(fieldClass({ error: false }));
  });

  it("FIELD_CLASS is still exported and contains ring-[#e7e4df]", () => {
    expect(FIELD_CLASS).toContain("ring-[#e7e4df]");
  });

  it("FIELD_CLASS is still exported and contains focus:ring-[#0090ff]", () => {
    expect(FIELD_CLASS).toContain("focus:ring-[#0090ff]");
  });
});
