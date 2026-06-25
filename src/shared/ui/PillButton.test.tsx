import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import userEvent from "@testing-library/user-event";
import { PillButton } from "./PillButton";

describe("PillButton", () => {
  it("renders children", () => {
    render(<PillButton>Click me</PillButton>);
    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("applies primary variant classes by default", () => {
    render(<PillButton variant="primary">Save</PillButton>);
    expect(screen.getByRole("button")).toHaveClass("bg-[var(--color-midnight)]");
  });

  it("applies secondary variant classes", () => {
    render(<PillButton variant="secondary">Cancel</PillButton>);
    expect(screen.getByRole("button")).toHaveClass("bg-[#f6f4ef]");
  });

  it("applies danger variant classes (coral red)", () => {
    render(<PillButton variant="danger">Delete</PillButton>);
    expect(screen.getByRole("button")).toHaveClass("bg-[var(--color-coral-red)]");
  });

  it("applies ghost-danger variant classes", () => {
    render(<PillButton variant="ghost-danger">Delete</PillButton>);
    expect(screen.getByRole("button")).toHaveClass("bg-transparent");
  });

  it("supports the small size", () => {
    render(<PillButton size="sm">Small</PillButton>);
    expect(screen.getByRole("button")).toHaveClass("text-[13px]");
  });

  it("renders as a link when href is set", () => {
    render(
      <MemoryRouter>
        <PillButton href="/decks">Open</PillButton>
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: /open/i });
    expect(link).toHaveAttribute("href", "/decks");
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
