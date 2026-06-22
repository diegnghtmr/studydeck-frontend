import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SettingsPage } from "./SettingsPage";

vi.mock("@shared/auth/auth-store", () => ({
  useAuthStore: vi.fn((selector) =>
    selector({
      user: {
        id: "u1",
        email: "test@example.com",
        displayName: "Test User",
        roles: [],
        scopes: [],
      },
      accessToken: "tok",
      setAccessToken: vi.fn(),
      setUser: vi.fn(),
      clearAuth: vi.fn(),
    }),
  ),
}));

vi.mock("@shared/stats/use-user-stats", () => ({
  useUserStats: vi.fn(() => ({ data: { dailyGoal: 40 } })),
  useUpdateDailyGoal: vi.fn(() => ({ mutate: vi.fn() })),
}));

const mockSetShowIntervals = vi.fn();
const mockSetSchedulerAlgorithm = vi.fn();

vi.mock("@shared/lib/store", () => ({
  usePreferencesStore: vi.fn((selector) =>
    selector({
      theme: "light",
      sidebarOpen: true,
      showIntervals: false,
      schedulerAlgorithm: "FSRS",
      setTheme: vi.fn(),
      toggleSidebar: vi.fn(),
      setSidebarOpen: vi.fn(),
      setShowIntervals: mockSetShowIntervals,
      setSchedulerAlgorithm: mockSetSchedulerAlgorithm,
    }),
  ),
}));

describe("SettingsPage", () => {
  it("renders h1 with text Settings", () => {
    render(<SettingsPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeDefined();
  });

  it("renders section title Profile", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Profile")).toBeDefined();
  });

  it("renders section title AI Providers", () => {
    render(<SettingsPage />);
    expect(screen.getByText("AI Providers")).toBeDefined();
  });

  it("renders section title Study & Scheduler", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Study & Scheduler")).toBeDefined();
  });

  it("renders section title Account", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Account")).toBeDefined();
  });

  it("shows real display name from mocked auth store", () => {
    render(<SettingsPage />);
    const input = screen.getByDisplayValue("Test User");
    expect(input).toBeDefined();
  });

  it("shows real email from mocked auth store", () => {
    render(<SettingsPage />);
    const input = screen.getByDisplayValue("test@example.com");
    expect(input).toBeDefined();
  });

  it("both AI provider rows show badge labeled Not set", () => {
    render(<SettingsPage />);
    const badges = screen.getAllByText("Not set");
    expect(badges.length).toBe(2);
  });

  it("Show intervals ToggleSwitch renders unchecked when showIntervals is false", () => {
    render(<SettingsPage />);
    const toggle = screen.getByRole("switch", { name: /show intervals/i });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
  });

  it("clicking Show intervals ToggleSwitch calls setShowIntervals with true", () => {
    render(<SettingsPage />);
    const toggle = screen.getByRole("switch", { name: /show intervals/i });
    fireEvent.click(toggle);
    expect(mockSetShowIntervals).toHaveBeenCalledWith(true);
  });
});
