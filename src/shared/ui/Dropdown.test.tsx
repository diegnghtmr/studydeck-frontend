import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fireEvent } from "@testing-library/react";
import { Dropdown } from "./Dropdown";

const ITEMS = [
  { value: "a", label: "Apple" },
  { value: "b", label: "Banana" },
  { value: "c", label: "Cherry" },
];

describe("Dropdown", () => {
  it("renders trigger with placeholder", () => {
    render(<Dropdown items={ITEMS} onSelect={vi.fn()} placeholder="Pick a fruit" />);
    expect(screen.getByTestId("dropdown-trigger")).toHaveTextContent("Pick a fruit");
  });

  it("shows selected label", () => {
    render(<Dropdown items={ITEMS} value="b" onSelect={vi.fn()} />);
    expect(screen.getByTestId("dropdown-trigger")).toHaveTextContent("Banana");
  });

  it("opens panel on trigger click", async () => {
    render(<Dropdown items={ITEMS} onSelect={vi.fn()} />);
    await userEvent.click(screen.getByTestId("dropdown-trigger"));
    expect(screen.getByTestId("dropdown-panel")).toBeInTheDocument();
  });

  it("calls onSelect with item value when item clicked", async () => {
    const handler = vi.fn();
    render(<Dropdown items={ITEMS} onSelect={handler} />);
    await userEvent.click(screen.getByTestId("dropdown-trigger"));
    await userEvent.click(screen.getByRole("option", { name: "Apple" }));
    expect(handler).toHaveBeenCalledWith("a");
  });

  it("closes panel after selection", async () => {
    render(<Dropdown items={ITEMS} onSelect={vi.fn()} />);
    await userEvent.click(screen.getByTestId("dropdown-trigger"));
    await userEvent.click(screen.getByRole("option", { name: "Cherry" }));
    expect(screen.queryByTestId("dropdown-panel")).not.toBeInTheDocument();
  });

  it("opens panel with Enter key on trigger", async () => {
    render(<Dropdown items={ITEMS} onSelect={vi.fn()} />);
    const trigger = screen.getByTestId("dropdown-trigger");
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(screen.getByTestId("dropdown-panel")).toBeInTheDocument();
  });

  it("selects item with Enter key on listbox", async () => {
    const handler = vi.fn();
    render(<Dropdown items={ITEMS} onSelect={handler} />);
    await userEvent.click(screen.getByTestId("dropdown-trigger"));
    const listbox = screen.getByRole("listbox");
    // ArrowDown to navigate to first item (index 0 is set on open)
    fireEvent.keyDown(listbox, { key: "Enter" });
    expect(handler).toHaveBeenCalledWith("a");
  });

  it("closes panel on Escape key", async () => {
    render(<Dropdown items={ITEMS} onSelect={vi.fn()} />);
    await userEvent.click(screen.getByTestId("dropdown-trigger"));
    expect(screen.getByTestId("dropdown-panel")).toBeInTheDocument();
    const listbox = screen.getByRole("listbox");
    fireEvent.keyDown(listbox, { key: "Escape" });
    expect(screen.queryByTestId("dropdown-panel")).not.toBeInTheDocument();
  });

  it("navigates options with ArrowDown/ArrowUp keys", async () => {
    const handler = vi.fn();
    render(<Dropdown items={ITEMS} onSelect={handler} />);
    await userEvent.click(screen.getByTestId("dropdown-trigger"));
    const listbox = screen.getByRole("listbox");
    // Active starts at index 0 (Apple). ArrowDown → Banana. Enter → selects Banana.
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    fireEvent.keyDown(listbox, { key: "Enter" });
    expect(handler).toHaveBeenCalledWith("b");
  });
});
