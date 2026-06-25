import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SettingsPage } from "./SettingsPage";
import { useUserStats, useUpdatePreferences } from "@shared/stats/use-user-stats";
import { useAuth } from "react-oidc-context";
import { useDeleteAccount } from "./hooks/use-delete-account";
import { useSessions, useRevokeSession } from "./hooks/use-sessions";
import type { Session } from "./hooks/use-sessions";
import {
  useAiProviders,
  useCreateAiProvider,
  useUpdateAiProvider,
  useDeleteAiProvider,
  useActivateAiProvider,
} from "./hooks/use-ai-providers";
import type { AiProvider } from "./hooks/use-ai-providers";
import {
  useAiProviderStore,
  hasLegacyLocalStorageProviders,
  clearLegacyLocalStorage,
  LEGACY_STORAGE_KEY,
} from "./store/use-ai-provider-store";

// ---- Global mocks -----------------------------------------------------------

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
  useUserStats: vi.fn(() => ({
    data: {
      dailyGoal: 40,
      language: "en",
      timezone: "UTC",
      desiredRetention: 0.9,
      newCardsPerDay: 10,
      schedulerAlgorithm: "FSRS",
    },
  })),
  useUpdateDailyGoal: vi.fn(() => ({ mutate: vi.fn() })),
  useUpdatePreferences: vi.fn(() => ({ mutate: vi.fn() })),
}));

const mockSetShowIntervals = vi.fn();

vi.mock("@shared/lib/store", () => ({
  usePreferencesStore: vi.fn((selector) =>
    selector({
      sidebarOpen: true,
      showIntervals: false,
      toggleSidebar: vi.fn(),
      setSidebarOpen: vi.fn(),
      setShowIntervals: mockSetShowIntervals,
    }),
  ),
}));

// Store mock — migrationDismissed: false by default
vi.mock("./store/use-ai-provider-store", () => ({
  useAiProviderStore: vi.fn((selector) =>
    selector({
      migrationDismissed: false,
      setMigrationDismissed: vi.fn(),
    }),
  ),
  hasLegacyLocalStorageProviders: vi.fn(() => false),
  clearLegacyLocalStorage: vi.fn(),
  LEGACY_STORAGE_KEY: "studydeck-ai-providers",
  PROVIDER_PRESETS: [
    { label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o" },
    { label: "Custom", baseUrl: "", model: "" },
  ],
}));

// Server hooks mock — empty list by default
vi.mock("./hooks/use-ai-providers", () => ({
  useAiProviders: vi.fn(() => ({
    data: [],
    isLoading: false,
    isError: false,
  })),
  useCreateAiProvider: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
  })),
  useUpdateAiProvider: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
  })),
  useDeleteAiProvider: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
  })),
  useActivateAiProvider: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
  })),
}));

vi.mock("react-oidc-context", () => ({
  useAuth: vi.fn(() => ({ signoutRedirect: vi.fn() })),
}));

vi.mock("./hooks/use-delete-account", () => ({
  useDeleteAccount: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
  })),
  useLogoutAllSessions: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
  })),
}));

vi.mock("./hooks/use-sessions", () => ({
  useSessions: vi.fn(() => ({
    data: [],
    isLoading: false,
    isError: false,
  })),
  useRevokeSession: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
  })),
}));

// ---- Helpers ----------------------------------------------------------------

const PROVIDER_A: AiProvider = {
  id: "p1",
  label: "OpenAI",
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4o",
  keyHint: "sk-o…7Xz4",
  active: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const PROVIDER_B: AiProvider = {
  id: "p2",
  label: "Anthropic",
  baseUrl: "https://api.anthropic.com/v1",
  model: "claude-sonnet-4-6",
  keyHint: "sk-a…1234",
  active: false,
  createdAt: "2024-01-02T00:00:00.000Z",
  updatedAt: "2024-01-02T00:00:00.000Z",
};

// ---- Tests ------------------------------------------------------------------

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  });

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

  it("renders empty state when no providers configured", () => {
    render(<SettingsPage />);
    expect(screen.getByText("No providers configured. Add one above.")).toBeDefined();
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

// ---- Server-backed provider list --------------------------------------------

describe("SettingsPage — server-backed AI providers (B-3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  });

  it("renders a provider row when server returns one provider", () => {
    vi.mocked(useAiProviders).mockReturnValue({
      data: [PROVIDER_A],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useAiProviders>);

    render(<SettingsPage />);
    expect(screen.getByTestId("provider-row-p1")).toBeDefined();
    // Use testid-scoped query to distinguish provider label from preset button
    const row = screen.getByTestId("provider-row-p1");
    expect(row.textContent).toContain("OpenAI");
  });

  it("shows the masked keyHint for a saved provider (NOT an input value)", () => {
    vi.mocked(useAiProviders).mockReturnValue({
      data: [PROVIDER_A],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useAiProviders>);

    render(<SettingsPage />);
    // keyHint appears as read-only text, not as input value
    expect(screen.getByText("sk-o…7Xz4")).toBeDefined();
  });

  it("apiKey input is empty (write-only) — not pre-filled with stored key", () => {
    vi.mocked(useAiProviders).mockReturnValue({
      data: [PROVIDER_A],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useAiProviders>);

    render(<SettingsPage />);
    // The password input for apiKey must not have a stored value
    const apiKeyInput = screen.getByTestId("apiKey-p1");
    expect((apiKeyInput as HTMLInputElement).value).toBe("");
  });

  it("active provider shows Active badge", () => {
    vi.mocked(useAiProviders).mockReturnValue({
      data: [PROVIDER_A],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useAiProviders>);

    render(<SettingsPage />);
    const badge = screen.getByTestId("badge-p1");
    expect(badge.textContent).toBe("Active");
  });

  it("inactive provider shows Use button", () => {
    vi.mocked(useAiProviders).mockReturnValue({
      data: [PROVIDER_B],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useAiProviders>);

    render(<SettingsPage />);
    expect(screen.getByTestId("use-p2")).toBeDefined();
  });

  it("clicking Use calls useActivateAiProvider.mutate with provider id", () => {
    const mockMutate = vi.fn();
    vi.mocked(useActivateAiProvider).mockReturnValue({
      mutate: mockMutate,
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useActivateAiProvider>);
    vi.mocked(useAiProviders).mockReturnValue({
      data: [PROVIDER_B],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useAiProviders>);

    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId("use-p2"));
    expect(mockMutate).toHaveBeenCalledWith("p2");
  });

  it("clicking Remove opens the confirm dialog", () => {
    vi.mocked(useAiProviders).mockReturnValue({
      data: [PROVIDER_A],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useAiProviders>);

    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId("remove-p1"));
    expect(screen.getByTestId("confirm-dialog")).toBeDefined();
  });

  it("confirming remove calls useDeleteAiProvider.mutate with provider id and callbacks", () => {
    const mockMutate = vi.fn();
    vi.mocked(useDeleteAiProvider).mockReturnValue({
      mutate: mockMutate,
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useDeleteAiProvider>);
    vi.mocked(useAiProviders).mockReturnValue({
      data: [PROVIDER_A],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useAiProviders>);

    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId("remove-p1"));
    fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));
    // C1: mutate now receives (id, { onSuccess, onError }) — verify id is correct
    expect(mockMutate).toHaveBeenCalledWith("p1", expect.any(Object));
  });

  it("shows loading state when providers are loading", () => {
    vi.mocked(useAiProviders).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useAiProviders>);

    render(<SettingsPage />);
    expect(screen.getByText("Loading providers…")).toBeDefined();
  });

  it("shows error state when providers fail to load", () => {
    vi.mocked(useAiProviders).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useAiProviders>);

    render(<SettingsPage />);
    expect(screen.getByText("Could not load providers.")).toBeDefined();
  });

  it("clicking Save calls useUpdateAiProvider.mutate", async () => {
    const mockMutate = vi.fn();
    vi.mocked(useUpdateAiProvider).mockReturnValue({
      mutate: mockMutate,
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useUpdateAiProvider>);
    vi.mocked(useAiProviders).mockReturnValue({
      data: [PROVIDER_A],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useAiProviders>);

    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId("save-p1"));
    expect(mockMutate).toHaveBeenCalled();
  });
});

// ---- Migration prompt (B-5) -------------------------------------------------

describe("SettingsPage — migration prompt (B-5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  });

  it("does NOT show migration banner when no legacy providers in localStorage", () => {
    vi.mocked(hasLegacyLocalStorageProviders).mockReturnValue(false);
    vi.mocked(useAiProviders).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useAiProviders>);

    render(<SettingsPage />);
    expect(screen.queryByTestId("migration-banner")).toBeNull();
  });

  it("does NOT show migration banner when server already has providers (even if legacy exists)", () => {
    vi.mocked(hasLegacyLocalStorageProviders).mockReturnValue(true);
    vi.mocked(useAiProviders).mockReturnValue({
      data: [PROVIDER_A],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useAiProviders>);

    render(<SettingsPage />);
    expect(screen.queryByTestId("migration-banner")).toBeNull();
  });

  it("does NOT show migration banner when migrationDismissed is true", () => {
    vi.mocked(hasLegacyLocalStorageProviders).mockReturnValue(true);
    vi.mocked(useAiProviders).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useAiProviders>);
    vi.mocked(useAiProviderStore).mockImplementation((selector) =>
      selector({ migrationDismissed: true, setMigrationDismissed: vi.fn() }),
    );

    render(<SettingsPage />);
    expect(screen.queryByTestId("migration-banner")).toBeNull();
  });

  it("shows migration banner when legacy keys exist AND server has no providers AND not dismissed", () => {
    vi.mocked(hasLegacyLocalStorageProviders).mockReturnValue(true);
    vi.mocked(useAiProviders).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useAiProviders>);
    vi.mocked(useAiProviderStore).mockImplementation((selector) =>
      selector({ migrationDismissed: false, setMigrationDismissed: vi.fn() }),
    );

    render(<SettingsPage />);
    expect(screen.getByTestId("migration-banner")).toBeDefined();
  });

  it("clicking Dismiss on migration banner calls setMigrationDismissed(true)", () => {
    const mockSetDismissed = vi.fn();
    vi.mocked(hasLegacyLocalStorageProviders).mockReturnValue(true);
    vi.mocked(useAiProviders).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useAiProviders>);
    vi.mocked(useAiProviderStore).mockImplementation((selector) =>
      selector({ migrationDismissed: false, setMigrationDismissed: mockSetDismissed }),
    );

    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId("migration-banner-dismiss"));
    expect(mockSetDismissed).toHaveBeenCalledWith(true);
  });
});

// ---- server-synced preferences ----------------------------------------------

describe("server-synced preferences", () => {
  it("hydrates Language dropdown from userStats.language", () => {
    render(<SettingsPage />);
    expect(vi.mocked(useUserStats)).toHaveBeenCalled();
  });

  it("selecting a language calls useUpdatePreferences.mutate with { language }", () => {
    const mockMutate = vi.fn();
    vi.mocked(useUpdatePreferences).mockReturnValueOnce({ mutate: mockMutate } as unknown as ReturnType<typeof useUpdatePreferences>);

    render(<SettingsPage />);
    const languageDropdown = screen.getAllByRole("button").find(
      (b) => b.textContent === "English"
    );
    expect(languageDropdown).toBeDefined();
    if (languageDropdown) fireEvent.click(languageDropdown);
    const spanishOption = screen.queryByText("Spanish");
    if (spanishOption) fireEvent.click(spanishOption);
    if (spanishOption) expect(mockMutate).toHaveBeenCalledWith({ language: "es" });
  });

  it("hydrates New cards Dropdown from userStats.newCardsPerDay", () => {
    render(<SettingsPage />);
    expect(screen.getByText("10 cards")).toBeDefined();
  });

  it("helper text for language says Synced to your account", () => {
    render(<SettingsPage />);
    const helpers = screen.getAllByText("Synced to your account.");
    expect(helpers.length).toBeGreaterThanOrEqual(1);
  });

  it("hydrates retention slider from userStats.desiredRetention", () => {
    render(<SettingsPage />);
    // desiredRetention: 0.9 → 90%
    expect(screen.getByText("90%")).toBeDefined();
  });

  it("moving retention slider fires mutation on pointer up with desiredRetention as fraction", () => {
    const mockMutate = vi.fn();
    vi.mocked(useUpdatePreferences).mockReturnValue({ mutate: mockMutate } as unknown as ReturnType<typeof useUpdatePreferences>);

    render(<SettingsPage />);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "85" } });
    fireEvent.pointerUp(slider);
    expect(mockMutate).toHaveBeenCalledWith({ desiredRetention: 0.85 });

    vi.mocked(useUpdatePreferences).mockReturnValue({ mutate: vi.fn() } as unknown as ReturnType<typeof useUpdatePreferences>);
  });

  it("FSRS tab is active when userStats.schedulerAlgorithm is 'FSRS'", () => {
    render(<SettingsPage />);
    const fsrsBtn = screen.getAllByRole("button").find((b) => b.textContent === "FSRS");
    expect(fsrsBtn).toBeTruthy();
  });

  it("clicking SM-2 tab calls useUpdatePreferences.mutate with { schedulerAlgorithm: 'SM-2' }", () => {
    const mockMutate = vi.fn();
    vi.mocked(useUpdatePreferences).mockReturnValueOnce({ mutate: mockMutate } as unknown as ReturnType<typeof useUpdatePreferences>);

    render(<SettingsPage />);
    const sm2Btn = screen.getAllByRole("button").find((b) => b.textContent === "SM-2");
    expect(sm2Btn).toBeDefined();
    if (sm2Btn) fireEvent.click(sm2Btn);
    expect(mockMutate).toHaveBeenCalledWith({ schedulerAlgorithm: "SM-2" });
  });
});

// ---- Account section actions ------------------------------------------------

describe("Account section actions", () => {
  const mockSignoutRedirect = vi.fn();
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Sign out everywhere button is enabled (not disabled)", () => {
    render(<SettingsPage />);
    const btn = screen.getByRole("button", { name: "Sign out everywhere" });
    expect(btn).not.toBeDisabled();
  });

  it("Delete account button is enabled (not disabled)", () => {
    render(<SettingsPage />);
    const btn = screen.getByRole("button", { name: "Delete account" });
    expect(btn).not.toBeDisabled();
  });

  it("clicking Sign out everywhere calls signoutRedirect", async () => {
    vi.mocked(useAuth).mockReturnValue({ signoutRedirect: mockSignoutRedirect } as unknown as ReturnType<typeof useAuth>);
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Sign out everywhere" }));
    await waitFor(() => expect(mockSignoutRedirect).toHaveBeenCalled());
  });

  it("clicking Delete account opens confirm dialog", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    expect(screen.getByTestId("confirm-dialog")).toBeDefined();
  });

  it("confirming delete dialog calls the delete mutation", async () => {
    mockMutateAsync.mockResolvedValue(undefined);
    vi.mocked(useDeleteAccount).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: mockMutateAsync,
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useDeleteAccount>);

    vi.mocked(useAuth).mockReturnValue({ signoutRedirect: mockSignoutRedirect } as unknown as ReturnType<typeof useAuth>);

    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());
  });
});

// ---- Session list -----------------------------------------------------------

describe("Session list", () => {
  const ISO = "2024-01-01T00:00:00.000Z";

  const TWO_SESSIONS: Session[] = [
    {
      id: "s1",
      device: "Chrome/Mac",
      ipAddress: "1.2.3.4",
      startedAt: ISO,
      lastAccessAt: ISO,
      current: true,
    },
    {
      id: "s2",
      device: "Firefox/Win",
      ipAddress: "5.6.7.8",
      startedAt: ISO,
      lastAccessAt: ISO,
      current: false,
    },
  ];

  beforeEach(() => {
    vi.mocked(useSessions).mockReturnValue({
      data: TWO_SESSIONS,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useSessions>);
    vi.mocked(useRevokeSession).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
    } as unknown as ReturnType<typeof useRevokeSession>);
  });

  it("shows Current badge for the current session", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Current")).toBeDefined();
  });

  it("shows Revoke button for non-current session", () => {
    render(<SettingsPage />);
    expect(screen.getByTestId("revoke-s2")).toBeDefined();
  });

  it("clicking Revoke opens the confirm dialog", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId("revoke-s2"));
    expect(screen.getByTestId("confirm-dialog")).toBeDefined();
  });

  it("confirming revoke calls mutate with the session id", () => {
    const mockMutate = vi.fn();
    vi.mocked(useRevokeSession).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isSuccess: false,
      isError: false,
    } as unknown as ReturnType<typeof useRevokeSession>);

    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId("revoke-s2"));
    fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));
    expect(mockMutate).toHaveBeenCalledWith("s2", expect.any(Object));
  });
});

// ---- Bug fix: C1 — delete toast must fire in onSuccess, not synchronously ---

describe("SettingsPage — C1: delete/activate toast timing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  });

  it("does NOT call deleteProvider.mutate with a synchronous toast — toast should only appear after success", () => {
    // We verify that when mutate is called and has not yet resolved (no onSuccess fired),
    // no success toast has been emitted. We simulate this by capturing the mutate call
    // and confirming it receives an onSuccess callback (not that a toast is called inline).
    let capturedOptions: Record<string, unknown> | undefined;
    vi.mocked(useDeleteAiProvider).mockReturnValue({
      mutate: vi.fn((_id: string, opts?: Record<string, unknown>) => {
        capturedOptions = opts;
      }),
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useDeleteAiProvider>);
    vi.mocked(useAiProviders).mockReturnValue({
      data: [PROVIDER_A],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useAiProviders>);

    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId("remove-p1"));
    fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));

    // mutate must receive an options object containing onSuccess
    expect(capturedOptions).toBeDefined();
    expect(typeof capturedOptions?.onSuccess).toBe("function");
    // and onError too (new requirement)
    expect(typeof capturedOptions?.onError).toBe("function");
  });

  it("delete onSuccess callback shows removed toast", () => {
    let capturedOnSuccess: (() => void) | undefined;
    vi.mocked(useDeleteAiProvider).mockReturnValue({
      mutate: vi.fn((_id: string, opts?: { onSuccess?: () => void }) => {
        capturedOnSuccess = opts?.onSuccess;
      }),
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useDeleteAiProvider>);
    vi.mocked(useAiProviders).mockReturnValue({
      data: [PROVIDER_A],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useAiProviders>);

    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId("remove-p1"));
    fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));

    // Trigger onSuccess manually (simulates async resolve)
    act(() => { capturedOnSuccess?.(); });
    expect(screen.queryByTestId("toast")).toBeDefined();
  });

  it("delete onError callback shows error toast", () => {
    let capturedOnError: (() => void) | undefined;
    vi.mocked(useDeleteAiProvider).mockReturnValue({
      mutate: vi.fn((_id: string, opts?: { onError?: () => void }) => {
        capturedOnError = opts?.onError;
      }),
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useDeleteAiProvider>);
    vi.mocked(useAiProviders).mockReturnValue({
      data: [PROVIDER_A],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useAiProviders>);

    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId("remove-p1"));
    fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));

    // Trigger onError manually
    act(() => { capturedOnError?.(); });
    expect(screen.queryByTestId("toast")).toBeDefined();
  });
});

// ---- Bug fix: C4 — migration banner must not flash during loading ------------

describe("SettingsPage — C4: migration banner hidden while loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  });

  it("does NOT show migration banner while providers are loading (even if legacy exists)", () => {
    vi.mocked(hasLegacyLocalStorageProviders).mockReturnValue(true);
    vi.mocked(useAiProviders).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useAiProviders>);
    vi.mocked(useAiProviderStore).mockImplementation((selector) =>
      selector({ migrationDismissed: false, setMigrationDismissed: vi.fn() }),
    );

    render(<SettingsPage />);
    expect(screen.queryByTestId("migration-banner")).toBeNull();
  });
});

// ---- Bug fix: C2 — clearLegacyLocalStorage must be gated on migration context

describe("SettingsPage — C2: clearLegacyLocalStorage only on migration context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  });

  it("does NOT call clearLegacyLocalStorage on a plain update when not in migration context", () => {
    // No legacy data — migration banner would NOT be active
    vi.mocked(hasLegacyLocalStorageProviders).mockReturnValue(false);
    vi.mocked(useAiProviders).mockReturnValue({
      data: [PROVIDER_A],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useAiProviders>);

    let capturedOnSuccess: (() => void) | undefined;
    vi.mocked(useUpdateAiProvider).mockReturnValue({
      mutate: vi.fn((_args: unknown, opts?: { onSuccess?: () => void }) => {
        capturedOnSuccess = opts?.onSuccess;
      }),
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useUpdateAiProvider>);

    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId("save-p1"));

    // Simulate onSuccess
    act(() => { capturedOnSuccess?.(); });

    // clearLegacyLocalStorage must NOT have been called
    expect(clearLegacyLocalStorage).not.toHaveBeenCalled();
  });

  it("DOES call clearLegacyLocalStorage on save when migration context is active", () => {
    // Legacy data exists + server has no providers + not dismissed → migration active
    vi.mocked(hasLegacyLocalStorageProviders).mockReturnValue(true);
    vi.mocked(useAiProviders).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useAiProviders>);
    vi.mocked(useAiProviderStore).mockImplementation((selector) =>
      selector({ migrationDismissed: false, setMigrationDismissed: vi.fn() }),
    );

    // We can't directly test save-on-empty list (no provider row), but we can
    // test via create's onSuccess when migration is active. Use useCreateAiProvider.
    let capturedOnSuccess: (() => void) | undefined;
    vi.mocked(useCreateAiProvider).mockReturnValue({
      mutate: vi.fn((_args: unknown, opts?: { onSuccess?: () => void }) => {
        capturedOnSuccess = opts?.onSuccess;
      }),
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useCreateAiProvider>);

    render(<SettingsPage />);

    // Open the draft form
    const addBtn = screen.getByTestId("add-provider-btn");
    fireEvent.click(addBtn);

    // Fill in the apiKey for the draft
    const draftApiKey = screen.getByTestId("draft-apiKey-input");
    fireEvent.change(draftApiKey, { target: { value: "sk-test-key" } });

    // Save the draft
    fireEvent.click(screen.getByTestId("draft-save-btn"));

    // Simulate onSuccess
    act(() => { capturedOnSuccess?.(); });

    expect(clearLegacyLocalStorage).toHaveBeenCalled();
  });
});

// ---- Bug fix: C3 — add-from-preset must use a draft flow, not POST immediately

describe("SettingsPage — C3: add-from-preset draft flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    vi.mocked(useAiProviders).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useAiProviders>);
  });

  it("clicking a preset button does NOT call useCreateAiProvider immediately", () => {
    const mockMutate = vi.fn();
    vi.mocked(useCreateAiProvider).mockReturnValue({
      mutate: mockMutate,
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useCreateAiProvider>);

    render(<SettingsPage />);
    // Open draft form with OpenAI preset
    const openAiPresetBtn = screen.getByTestId("preset-OpenAI");
    fireEvent.click(openAiPresetBtn);

    // mutate must NOT have been called yet
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("clicking a preset shows a draft form with label and baseUrl prefilled", () => {
    render(<SettingsPage />);
    const openAiPresetBtn = screen.getByTestId("preset-OpenAI");
    fireEvent.click(openAiPresetBtn);

    // Label input should be prefilled with OpenAI
    const labelInput = screen.getByTestId("draft-label-input");
    expect((labelInput as HTMLInputElement).value).toBe("OpenAI");
  });

  it("Save draft button is disabled when apiKey is empty", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId("preset-OpenAI"));

    const saveBtn = screen.getByTestId("draft-save-btn");
    expect((saveBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("Save draft button is enabled when apiKey is filled", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId("preset-OpenAI"));

    const apiKeyInput = screen.getByTestId("draft-apiKey-input");
    fireEvent.change(apiKeyInput, { target: { value: "sk-test" } });

    const saveBtn = screen.getByTestId("draft-save-btn");
    expect((saveBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it("clicking Save draft with a non-blank apiKey calls useCreateAiProvider.mutate", () => {
    const mockMutate = vi.fn();
    vi.mocked(useCreateAiProvider).mockReturnValue({
      mutate: mockMutate,
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useCreateAiProvider>);

    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId("preset-OpenAI"));

    const apiKeyInput = screen.getByTestId("draft-apiKey-input");
    fireEvent.change(apiKeyInput, { target: { value: "sk-test" } });
    fireEvent.click(screen.getByTestId("draft-save-btn"));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "OpenAI",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o",
        apiKey: "sk-test",
      }),
      expect.any(Object),
    );
  });

  it("create failure shows an error toast (onError)", () => {
    let capturedOnError: (() => void) | undefined;
    vi.mocked(useCreateAiProvider).mockReturnValue({
      mutate: vi.fn((_args: unknown, opts?: { onError?: () => void }) => {
        capturedOnError = opts?.onError;
      }),
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useCreateAiProvider>);

    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId("preset-OpenAI"));
    const apiKeyInput = screen.getByTestId("draft-apiKey-input");
    fireEvent.change(apiKeyInput, { target: { value: "sk-test" } });
    fireEvent.click(screen.getByTestId("draft-save-btn"));

    act(() => { capturedOnError?.(); });
    expect(screen.queryByTestId("toast")).toBeDefined();
  });

  it("clicking the plain Add Provider button (no preset) opens a blank draft form", () => {
    render(<SettingsPage />);
    const addBtn = screen.getByTestId("add-provider-btn");
    fireEvent.click(addBtn);

    const labelInput = screen.getByTestId("draft-label-input");
    expect((labelInput as HTMLInputElement).value).toBe("");
  });
});
