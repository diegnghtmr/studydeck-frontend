import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";

vi.mock("@shared/api/axios-instance", () => ({
  axiosInstance: {
    get: vi.fn(),
  },
}));

import { axiosInstance } from "@shared/api/axios-instance";
import { useUserStats } from "./use-user-stats";
import type { UserStats } from "./use-user-stats";

const mockGet = vi.mocked(axiosInstance.get);

const STATS_FIXTURE: UserStats = {
  dueToday: 12,
  newCards: 5,
  reviewedToday: 8,
  dayStreak: 3,
  retention30d: 0.87,
  dailyGoal: 40,
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
