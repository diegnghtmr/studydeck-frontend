import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders label text", () => {
    render(<Badge label="Active" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("applies blue tone by default", () => {
    render(<Badge label="Info" />);
    expect(screen.getByText("Info")).toHaveStyle({ color: "#0090ff" });
  });

  it("applies green tone", () => {
    render(<Badge label="Done" tone="green" />);
    expect(screen.getByText("Done")).toHaveStyle({ color: "#00ca48" });
  });

  it("applies amber tone", () => {
    render(<Badge label="Warn" tone="amber" />);
    expect(screen.getByText("Warn")).toHaveStyle({ color: "#d48f00" });
  });

  it("accepts custom color override", () => {
    render(<Badge label="Custom" color="#ff0000" />);
    expect(screen.getByText("Custom")).toHaveStyle({ color: "#ff0000" });
  });

  describe("shape prop", () => {
    it("shape absent → borderRadius is 6px (default behavior unchanged)", () => {
      render(<Badge label="Default" />);
      expect(screen.getByText("Default")).toHaveStyle({ borderRadius: "6px" });
    });

    it('shape="rounded" → borderRadius is 6px (explicit default)', () => {
      render(<Badge label="Rounded" shape="rounded" />);
      expect(screen.getByText("Rounded")).toHaveStyle({ borderRadius: "6px" });
    });

    it('shape="pill" → borderRadius is 9999px', () => {
      render(<Badge label="Pill" shape="pill" />);
      expect(screen.getByText("Pill")).toHaveStyle({ borderRadius: "9999px" });
    });

    it('shape="pill" with bg and color overrides honored alongside pill shape', () => {
      render(<Badge label="Custom" shape="pill" bg="#ff001a" color="#fff" />);
      const badge = screen.getByText("Custom");
      expect(badge).toHaveStyle({ borderRadius: "9999px" });
      expect(badge).toHaveStyle({ backgroundColor: "#ff001a" });
      expect(badge).toHaveStyle({ color: "#fff" });
    });
  });
});
