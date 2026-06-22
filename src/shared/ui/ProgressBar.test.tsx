import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressBar } from "./ProgressBar";

describe("ProgressBar", () => {
  it("has progressbar role", () => {
    render(<ProgressBar value={0.5} />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("sets fill width proportionally", () => {
    render(<ProgressBar value={0.75} />);
    const fill = screen.getByTestId("progress-bar-fill");
    expect(fill).toHaveStyle({ width: "75%" });
  });

  it("clamps value above 1 to 100%", () => {
    render(<ProgressBar value={2} />);
    expect(screen.getByTestId("progress-bar-fill")).toHaveStyle({ width: "100%" });
  });

  it("clamps negative value to 0%", () => {
    render(<ProgressBar value={-0.5} />);
    expect(screen.getByTestId("progress-bar-fill")).toHaveStyle({ width: "0%" });
  });

  it("applies custom color", () => {
    render(<ProgressBar value={0.5} color="#0090ff" />);
    expect(screen.getByTestId("progress-bar-fill")).toHaveStyle({ backgroundColor: "#0090ff" });
  });
});
