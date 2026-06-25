import { describe, it, expect } from "vitest";
import { formatRelativeTime } from "./format-relative-time";

const NOW_MS = 1_700_000_000_000; // fixed reference

describe("formatRelativeTime", () => {
  it("returns 'just now' for 30 seconds ago", () => {
    const iso = new Date(NOW_MS - 30_000).toISOString();
    expect(formatRelativeTime(iso, NOW_MS)).toBe("just now");
  });

  it("returns 'just now' for 0 seconds ago", () => {
    const iso = new Date(NOW_MS).toISOString();
    expect(formatRelativeTime(iso, NOW_MS)).toBe("just now");
  });

  it("returns '1m ago' for 90 seconds ago", () => {
    const iso = new Date(NOW_MS - 90_000).toISOString();
    expect(formatRelativeTime(iso, NOW_MS)).toBe("1m ago");
  });

  it("returns '2h ago' for 7200 seconds ago", () => {
    const iso = new Date(NOW_MS - 7_200_000).toISOString();
    expect(formatRelativeTime(iso, NOW_MS)).toBe("2h ago");
  });

  it("returns '2d ago' for 172800 seconds ago", () => {
    const iso = new Date(NOW_MS - 172_800_000).toISOString();
    expect(formatRelativeTime(iso, NOW_MS)).toBe("2d ago");
  });

  it("returns '59m ago' for 3599 seconds ago (just under 1 hour)", () => {
    const iso = new Date(NOW_MS - 3_599_000).toISOString();
    expect(formatRelativeTime(iso, NOW_MS)).toBe("59m ago");
  });
});
