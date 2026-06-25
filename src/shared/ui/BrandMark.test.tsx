import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrandMark } from "./BrandMark";

describe("BrandMark", () => {
  it("renders the StudyDeck wordmark", () => {
    render(<BrandMark />);
    expect(screen.getByText(/StudyDeck/)).toBeInTheDocument();
  });

  it("forwards the wordmark test id when provided", () => {
    render(<BrandMark wordmarkTestId="sidebar-wordmark" />);
    expect(screen.getByTestId("sidebar-wordmark")).toBeInTheDocument();
  });

  it("does not render a test id attribute when none is provided", () => {
    const { container } = render(<BrandMark />);
    expect(container.querySelector("[data-testid]")).toBeNull();
  });
});
