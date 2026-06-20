import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { NavBar } from "./NavBar";

function renderNavBar() {
  return render(
    <MemoryRouter>
      <NavBar />
    </MemoryRouter>,
  );
}

describe("NavBar", () => {
  it("renders the brand wordmark", () => {
    renderNavBar();
    expect(screen.getByTestId("brand-wordmark")).toHaveTextContent("StudyDeck");
  });

  it("renders the Dashboard nav link", () => {
    renderNavBar();
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
  });

  it("renders the Decks nav link", () => {
    renderNavBar();
    expect(screen.getByRole("link", { name: /decks/i })).toBeInTheDocument();
  });

  it("renders the navbar container", () => {
    renderNavBar();
    expect(screen.getByTestId("navbar")).toBeInTheDocument();
  });

  it("renders Log In and Get Started buttons", () => {
    renderNavBar();
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /get started/i })).toBeInTheDocument();
  });
});
