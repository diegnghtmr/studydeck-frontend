import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { NavBar } from "./NavBar";

// NavBar is retained as a component but no longer rendered in the app shell.
// These tests verify the component renders correctly in isolation.
describe("NavBar (legacy)", () => {
  it("renders the brand wordmark", () => {
    render(<MemoryRouter><NavBar /></MemoryRouter>);
    expect(screen.getByTestId("brand-wordmark")).toHaveTextContent("StudyDeck");
  });

  it("renders the navbar container", () => {
    render(<MemoryRouter><NavBar /></MemoryRouter>);
    expect(screen.getByTestId("navbar")).toBeInTheDocument();
  });
});
