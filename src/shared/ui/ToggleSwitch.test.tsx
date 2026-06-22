import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToggleSwitch } from "./ToggleSwitch";

describe("ToggleSwitch", () => {
  it("has switch role", () => {
    render(<ToggleSwitch checked={false} onChange={vi.fn()} label="Enable" />);
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });

  it("reflects checked state via aria-checked", () => {
    render(<ToggleSwitch checked={true} onChange={vi.fn()} label="On" />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("calls onChange with toggled value on click", async () => {
    const handler = vi.fn();
    render(<ToggleSwitch checked={false} onChange={handler} label="Toggle" />);
    await userEvent.click(screen.getByRole("switch"));
    expect(handler).toHaveBeenCalledWith(true);
  });

  it("applies green bg when checked", () => {
    render(<ToggleSwitch checked={true} onChange={vi.fn()} label="On" />);
    expect(screen.getByRole("switch")).toHaveStyle({ backgroundColor: "#00ca48" });
  });

  it("applies gray bg when unchecked", () => {
    render(<ToggleSwitch checked={false} onChange={vi.fn()} label="Off" />);
    expect(screen.getByRole("switch")).toHaveStyle({ backgroundColor: "#dcd9d4" });
  });
});
