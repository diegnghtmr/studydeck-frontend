import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { DeckCard } from "./DeckCard";
import type { DeckModel } from "@shared/api/types";

const mockNavigate = vi.fn();

vi.mock("react-router", async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const baseDeck: DeckModel = {
  id: "deck-abc-123",
  title: "Cell Biology",
  archived: false,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

function renderCard(deck: DeckModel = baseDeck) {
  return render(
    <MemoryRouter>
      <DeckCard deck={deck} />
    </MemoryRouter>,
  );
}

describe("DeckCard", () => {
  it("renders the deck title", () => {
    renderCard();
    expect(screen.getByText("Cell Biology")).toBeInTheDocument();
  });

  it("renders a description when provided", () => {
    renderCard({ ...baseDeck, description: "Study of cells and organisms." });
    expect(screen.getByText("Study of cells and organisms.")).toBeInTheDocument();
  });

  it("does not render a description when omitted", () => {
    renderCard();
    expect(screen.queryByText(/organism/i)).not.toBeInTheDocument();
  });

  it("shows 'Archived' badge when deck is archived", () => {
    renderCard({ ...baseDeck, archived: true });
    expect(screen.getByText("Archived")).toBeInTheDocument();
  });

  it("does not show 'Archived' badge for active decks", () => {
    renderCard();
    expect(screen.queryByText("Archived")).not.toBeInTheDocument();
  });

  it("renders tags (max 2 visible + overflow count)", () => {
    renderCard({
      ...baseDeck,
      tags: ["bio", "science", "exam"],
    });
    expect(screen.getByText("bio")).toBeInTheDocument();
    expect(screen.getByText("science")).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("navigates to /decks/:id on click", async () => {
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole("button", { name: /open deck: cell biology/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/decks/deck-abc-123");
  });

  it("navigates on Enter key press", async () => {
    const user = userEvent.setup();
    renderCard();
    const card = screen.getByRole("button", { name: /open deck: cell biology/i });
    card.focus();
    await user.keyboard("{Enter}");
    expect(mockNavigate).toHaveBeenCalledWith("/decks/deck-abc-123");
  });

  it("has a data-deck-id attribute matching the deck id", () => {
    renderCard();
    const card = screen.getByTestId("deck-card");
    expect(card).toHaveAttribute("data-deck-id", "deck-abc-123");
  });
});
