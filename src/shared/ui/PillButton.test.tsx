import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PillButton } from "./PillButton";

describe("PillButton", () => {
  it("renders children", () => {
    render(<PillButton>Click me</PillButton>);
    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("applies primary background color token", () => {
    render(<PillButton variant="primary">Save</PillButton>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveStyle({ backgroundColor: "var(--color-midnight)" });
  });

  it("applies secondary background", () => {
    render(<PillButton variant="secondary">Cancel</PillButton>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveStyle({ backgroundColor: "#f6f4ef" });
  });

  it("applies danger background", () => {
    render(<PillButton variant="danger">Delete</PillButton>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveStyle({ backgroundColor: "var(--color-ember-orange)" });
  });

  it("is disabled when disabled prop is true", () => {
    render(<PillButton disabled>Save</PillButton>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("calls onClick when clicked", async () => {
    const handler = vi.fn();
    render(<PillButton onClick={handler}>Go</PillButton>);
    await userEvent.click(screen.getByRole("button"));
    expect(handler).toHaveBeenCalledOnce();
  });

  it("renders leadingIcon", () => {
    render(<PillButton leadingIcon={<span data-testid="icon">★</span>}>With Icon</PillButton>);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });
});
