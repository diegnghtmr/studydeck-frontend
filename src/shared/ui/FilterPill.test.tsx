import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterPill, SegmentedTab } from "./FilterPill";

describe("FilterPill", () => {
  it("renders children", () => {
    render(<FilterPill>All</FilterPill>);
    expect(screen.getByRole("button", { name: /all/i })).toBeInTheDocument();
  });

  it("applies active style when active=true", () => {
    render(<FilterPill active data-testid="pill">Active</FilterPill>);
    expect(screen.getByTestId("pill")).toHaveStyle({ backgroundColor: "#121212" });
  });

  it("applies inactive style when active=false", () => {
    render(<FilterPill data-testid="pill">Inactive</FilterPill>);
    expect(screen.getByTestId("pill")).toHaveStyle({ backgroundColor: "#f6f4ef" });
  });

  it("calls onClick when clicked", async () => {
    const handler = vi.fn();
    render(<FilterPill onClick={handler}>Click</FilterPill>);
    await userEvent.click(screen.getByRole("button"));
    expect(handler).toHaveBeenCalledOnce();
  });
});

describe("SegmentedTab", () => {
  it("renders children", () => {
    render(<SegmentedTab>Overview</SegmentedTab>);
    expect(screen.getByRole("button", { name: /overview/i })).toBeInTheDocument();
  });
});
