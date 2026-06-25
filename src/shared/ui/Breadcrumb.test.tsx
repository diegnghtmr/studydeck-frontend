import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Breadcrumb } from "./Breadcrumb";

function renderBreadcrumb(items: { label: string; href?: string }[]) {
  return render(
    <MemoryRouter>
      <Breadcrumb items={items} />
    </MemoryRouter>,
  );
}

describe("Breadcrumb", () => {
  it("renders all item labels", () => {
    renderBreadcrumb([
      { label: "My Decks", href: "/decks" },
      { label: "Biología", href: "/decks/1" },
      { label: "Basic note" },
    ]);
    expect(screen.getByText("My Decks")).toBeInTheDocument();
    expect(screen.getByText("Biología")).toBeInTheDocument();
    expect(screen.getByText("Basic note")).toBeInTheDocument();
  });

  it("renders items with href as links", () => {
    renderBreadcrumb([
      { label: "My Decks", href: "/decks" },
      { label: "Biología" },
    ]);
    expect(screen.getByRole("link", { name: "My Decks" })).toHaveAttribute("href", "/decks");
  });

  it("renders the last item as the current page (not a link)", () => {
    renderBreadcrumb([
      { label: "My Decks", href: "/decks" },
      { label: "Biología" },
    ]);
    const current = screen.getByText("Biología");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "Biología" })).not.toBeInTheDocument();
  });

  it("exposes a Breadcrumb landmark", () => {
    renderBreadcrumb([{ label: "My Decks", href: "/decks" }, { label: "X" }]);
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument();
  });
});
