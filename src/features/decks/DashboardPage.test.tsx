import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { DashboardPage } from "./DashboardPage";

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe("DashboardPage", () => {
  it("renders the dashboard page container", () => {
    renderDashboard();
    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
  });

  it("renders the welcome heading with StudyDeck brand", () => {
    renderDashboard();
    const heading = screen.getByTestId("dashboard-heading");
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent(/studydeck/i);
  });

  it("renders a link to the Decks page", () => {
    renderDashboard();
    const decksLink = screen.getByTestId("nav-decks-link");
    expect(decksLink).toBeInTheDocument();
    expect(decksLink).toHaveAttribute("href", "/decks");
  });

  it("renders feature cards for key sections", () => {
    renderDashboard();
    expect(screen.getByRole("heading", { name: /my decks/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^review$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /ai assistant/i })).toBeInTheDocument();
  });
});
