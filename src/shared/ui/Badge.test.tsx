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
});
