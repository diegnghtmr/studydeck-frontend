import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Toast } from "./Toast";

describe("Toast", () => {
  it("renders message when visible", () => {
    render(<Toast visible message="Saved!" />);
    expect(screen.getByTestId("toast")).toBeInTheDocument();
    expect(screen.getByText("Saved!")).toBeInTheDocument();
  });

  it("returns null when not visible", () => {
    render(<Toast visible={false} message="Not shown" />);
    expect(screen.queryByTestId("toast")).not.toBeInTheDocument();
  });

  it("has status role for accessibility", () => {
    render(<Toast visible message="Done" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
