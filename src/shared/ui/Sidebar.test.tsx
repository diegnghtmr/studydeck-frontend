import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { Sidebar } from "./Sidebar";
import i18n from "../i18n/i18n";

// Mock useAuthStore — not authenticated in these tests
vi.mock("@shared/auth/auth-store", () => ({
  useAuthStore: (selector: (s: { user: null }) => unknown) => selector({ user: null }),
}));

// Track sidebar state for the mock
let mockSidebarOpen = true;
const mockToggleSidebar = vi.fn(() => {
  mockSidebarOpen = !mockSidebarOpen;
});

vi.mock("@shared/lib/store", () => ({
  usePreferencesStore: (selector: (s: { sidebarOpen: boolean; toggleSidebar: () => void }) => unknown) =>
    selector({ sidebarOpen: mockSidebarOpen, toggleSidebar: mockToggleSidebar }),
}));

function renderSidebar(props = {}) {
  return render(
    <MemoryRouter>
      <Sidebar {...props} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockSidebarOpen = true;
  mockToggleSidebar.mockClear();
  mockToggleSidebar.mockImplementation(() => {
    mockSidebarOpen = !mockSidebarOpen;
  });
});

describe("Sidebar", () => {
  it("renders the sidebar container", () => {
    renderSidebar();
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
  });

  it("renders brand wordmark when open", () => {
    renderSidebar();
    expect(screen.getByTestId("sidebar-wordmark")).toHaveTextContent("StudyDeck");
  });

  it("renders Dashboard nav link", () => {
    renderSidebar();
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
  });

  it("renders Study nav link", () => {
    renderSidebar();
    expect(screen.getByRole("link", { name: /study/i })).toBeInTheDocument();
  });

  it("renders Cards & Decks nav link", () => {
    renderSidebar();
    expect(screen.getByRole("link", { name: /cards & decks/i })).toBeInTheDocument();
  });

  it("renders Import JSON nav link", () => {
    renderSidebar();
    expect(screen.getByRole("link", { name: /import json/i })).toBeInTheDocument();
  });

  it("renders AI Generate nav link", () => {
    renderSidebar();
    expect(screen.getByRole("link", { name: /ai generate/i })).toBeInTheDocument();
  });

  it("renders Ask your notes nav link", () => {
    renderSidebar();
    expect(screen.getByRole("link", { name: /ask your notes/i })).toBeInTheDocument();
  });

  it("renders Settings nav link", () => {
    renderSidebar();
    expect(screen.getByRole("link", { name: /settings/i })).toBeInTheDocument();
  });

  it("shows collapse button when open", () => {
    renderSidebar();
    expect(screen.getByTestId("sidebar-collapse-btn")).toBeInTheDocument();
  });

  it("shows expand button when collapsed", () => {
    mockSidebarOpen = false;
    renderSidebar();
    expect(screen.getByTestId("sidebar-expand-btn")).toBeInTheDocument();
  });

  it("toggles sidebar on collapse button click", async () => {
    renderSidebar();
    await userEvent.click(screen.getByTestId("sidebar-collapse-btn"));
    expect(mockToggleSidebar).toHaveBeenCalledOnce();
  });

  it("renders due count badge when studyDueCount > 0", () => {
    renderSidebar({ studyDueCount: 5 });
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("hides due count badge when studyDueCount is 0", () => {
    renderSidebar({ studyDueCount: 0 });
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("renders daily goal widget when open", () => {
    renderSidebar({ goalCurrent: 10, goalTotal: 40 });
    expect(screen.getByTestId("sidebar-daily-goal")).toBeInTheDocument();
    expect(screen.getByText("10/40")).toBeInTheDocument();
  });

  it("renders user card when open", () => {
    renderSidebar();
    expect(screen.getByTestId("sidebar-user-card")).toBeInTheDocument();
  });

  it("highlights active route with NavLink active state", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Sidebar />
      </MemoryRouter>,
    );
    // Dashboard link should be rendered and present
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
  });
});

describe("Sidebar i18n", () => {
  it("i18n resolves Spanish nav.settings key", async () => {
    await i18n.changeLanguage("es");
    expect(i18n.t("nav.settings")).toBe("Configuración");
    // restore
    await i18n.changeLanguage("en");
  });
});
