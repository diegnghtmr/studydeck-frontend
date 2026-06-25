import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";

vi.mock("@shared/api/axios-instance", () => ({
  axiosInstance: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

import { axiosInstance } from "@shared/api/axios-instance";
import { useUserStats, useUpdatePreferences, wireToUiAlgorithm, uiToWireAlgorithm } from "./use-user-stats";
import type { UserStats } from "./use-user-stats";

const mockGet = vi.mocked(axiosInstance.get);
const mockPatch = vi.mocked(axiosInstance.patch);

const STATS_FIXTURE: UserStats = {
  dueToday: 12,
  newCards: 5,
  reviewedToday: 8,
  dayStreak: 3,
  retention30d: 0.87,
  dailyGoal: 40,
  desiredRetention: 0.9,
  newCardsPerDay: 10,
  language: "en",
  timezone: "UTC",
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useUserStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user stats on successful fetch", async () => {
    mockGet.mockResolvedValue({ data: STATS_FIXTURE });

    const { result } = renderHook(() => useUserStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(STATS_FIXTURE);
  });

  it("calls GET /v1/stats with tz param", async () => {
    mockGet.mockResolvedValue({ data: STATS_FIXTURE });

    renderHook(() => useUserStats(), { wrapper: createWrapper() });

    await waitFor(() => expect(mockGet).toHaveBeenCalledOnce());
    const [url, config] = mockGet.mock.calls[0] as [string, { params: { tz: string } }];
    expect(url).toBe("/v1/stats");
    expect(config.params.tz).toBeTruthy();
  });

  it("handles absent retention30d (undefined)", async () => {
    const statsNoRetention: UserStats = {
      dueToday: 0,
      newCards: 0,
      reviewedToday: 0,
      dayStreak: 0,
      dailyGoal: 40,
    };
    mockGet.mockResolvedValue({ data: statsNoRetention });

    const { result } = renderHook(() => useUserStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.retention30d).toBeUndefined();
  });

  it("is in error state when the request fails", async () => {
    mockGet.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useUserStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useUpdatePreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PATCHes /v1/account/preferences with the full payload", async () => {
    mockPatch.mockResolvedValue({ data: undefined });

    const { result } = renderHook(() => useUpdatePreferences(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      dailyGoal: 30,
      desiredRetention: 0.85,
      newCardsPerDay: 20,
      language: "es",
      timezone: "America/New_York",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith("/v1/account/preferences", {
      dailyGoal: 30,
      desiredRetention: 0.85,
      newCardsPerDay: 20,
      language: "es",
      timezone: "America/New_York",
    });
  });

  it("PATCHes with only the fields provided (partial payload)", async () => {
    mockPatch.mockResolvedValue({ data: undefined });

    const { result } = renderHook(() => useUpdatePreferences(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ language: "fr" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith("/v1/account/preferences", {
      language: "fr",
    });
  });

  it("invalidates stats query on success", async () => {
    mockPatch.mockResolvedValue({ data: undefined });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const spy = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = function Wrapper({ children }: { children: ReactNode }) {
      return createElement(QueryClientProvider, { client: queryClient }, children);
    };

    const { result } = renderHook(() => useUpdatePreferences(), { wrapper });
    result.current.mutate({ language: "es" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalled();
  });

  it("is in error state when the patch fails", async () => {
    mockPatch.mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useUpdatePreferences(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ dailyGoal: 20 });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("sends schedulerAlgorithm as wire token 'SM2' when UI value is 'SM-2'", async () => {
    mockPatch.mockResolvedValue({ data: undefined });

    const { result } = renderHook(() => useUpdatePreferences(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ schedulerAlgorithm: "SM-2" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith("/v1/account/preferences", {
      schedulerAlgorithm: "SM2",
    });
  });

  it("sends schedulerAlgorithm as 'FSRS' when UI value is 'FSRS'", async () => {
    mockPatch.mockResolvedValue({ data: undefined });

    const { result } = renderHook(() => useUpdatePreferences(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ schedulerAlgorithm: "FSRS" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith("/v1/account/preferences", {
      schedulerAlgorithm: "FSRS",
    });
  });
});

describe("wireToUiAlgorithm / uiToWireAlgorithm", () => {
  it("maps wire 'SM2' to UI 'SM-2'", () => {
    expect(wireToUiAlgorithm("SM2")).toBe("SM-2");
  });

  it("maps wire 'FSRS' to UI 'FSRS'", () => {
    expect(wireToUiAlgorithm("FSRS")).toBe("FSRS");
  });

  it("maps UI 'SM-2' to wire 'SM2'", () => {
    expect(uiToWireAlgorithm("SM-2")).toBe("SM2");
  });

  it("maps UI 'FSRS' to wire 'FSRS'", () => {
    expect(uiToWireAlgorithm("FSRS")).toBe("FSRS");
  });
});

describe("useUserStats — schedulerAlgorithm mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps wire 'SM2' to UI 'SM-2' in returned stats", async () => {
    mockGet.mockResolvedValue({
      data: { ...STATS_FIXTURE, schedulerAlgorithm: "SM2" },
    });

    const { result } = renderHook(() => useUserStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.schedulerAlgorithm).toBe("SM-2");
  });

  it("maps wire 'FSRS' to UI 'FSRS' in returned stats", async () => {
    mockGet.mockResolvedValue({
      data: { ...STATS_FIXTURE, schedulerAlgorithm: "FSRS" },
    });

    const { result } = renderHook(() => useUserStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.schedulerAlgorithm).toBe("FSRS");
  });

  it("leaves schedulerAlgorithm undefined when absent from server response", async () => {
    mockGet.mockResolvedValue({ data: STATS_FIXTURE });

    const { result } = renderHook(() => useUserStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.schedulerAlgorithm).toBeUndefined();
  });
});
