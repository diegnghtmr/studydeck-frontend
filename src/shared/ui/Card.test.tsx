import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "./Card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card data-testid="card">Hello</Card>);
    expect(screen.getByTestId("card")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("uses white background by default", () => {
    render(<Card data-testid="card">Content</Card>);
    expect(screen.getByTestId("card")).toHaveStyle({ backgroundColor: "#ffffff" });
  });

  it("uses parchment-card background when recessed", () => {
    render(<Card data-testid="card" recessed>Content</Card>);
    expect(screen.getByTestId("card")).toHaveStyle({
      backgroundColor: "var(--color-parchment-card)",
    });
  });

  it("applies custom radius", () => {
    render(<Card data-testid="card" radius={20}>Content</Card>);
    expect(screen.getByTestId("card")).toHaveStyle({ borderRadius: "20px" });
  });
});
