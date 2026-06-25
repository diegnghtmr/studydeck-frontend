import { describe, it, expect } from "vitest";
import { formatInterval } from "./format-interval";

describe("formatInterval", () => {
  it("returns '1d' for 0 days", () => {
    expect(formatInterval(0)).toBe("1d");
  });

  it("returns '1d' for 1 day", () => {
    expect(formatInterval(1)).toBe("1d");
  });

  it("returns '2d' for 2 days", () => {
    expect(formatInterval(2)).toBe("2d");
  });

  it("returns '10d' for 10 days", () => {
    expect(formatInterval(10)).toBe("10d");
  });

  it("returns '29d' for 29 days (boundary before months)", () => {
    expect(formatInterval(29)).toBe("29d");
  });

  it("returns '1mo' for 30 days", () => {
    expect(formatInterval(30)).toBe("1mo");
  });

  it("returns '2mo' for 60 days", () => {
    expect(formatInterval(60)).toBe("2mo");
  });

  it("returns '12mo' for 364 days (last day before yearly threshold)", () => {
    expect(formatInterval(364)).toBe("12mo");
  });

  it("returns '1y' for 365 days", () => {
    expect(formatInterval(365)).toBe("1y");
  });

  it("returns '2y' for 730 days", () => {
    expect(formatInterval(730)).toBe("2y");
  });

  it("returns '3y' for 1095 days", () => {
    expect(formatInterval(1095)).toBe("3y");
  });
});
