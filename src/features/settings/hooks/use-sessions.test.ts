import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";

vi.mock("@shared/api/axios-instance", () => ({
  axiosInstance: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

import { axiosInstance } from "@shared/api/axios-instance";
import { useSessions, useRevokeSession } from "./use-sessions";
import type { Session } from "./use-sessions";
import { queryKeys } from "@shared/query/query-keys";

const mockGet = vi.mocked(axiosInstance.get);
const mockDelete = vi.mocked(axiosInstance.delete);

const SESSION_FIXTURES: Session[] = [
  {
    id: "s1",
    ipAddress: "1.2.3.4",
    device: "Chrome/Mac",
    startedAt: "2024-01-01T00:00:00.000Z",
    lastAccessAt: "2024-01-01T01:00:00.000Z",
    current: true,
  },
  {
    id: "s2",
    ipAddress: "5.6.7.8",
    device: "Firefox/Win",
    startedAt: "2024-01-01T00:00:00.000Z",
    lastAccessAt: "2024-01-01T02:00:00.000Z",
    current: false,
  },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useSessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns sessions array on successful fetch", async () => {
    mockGet.mockResolvedValue({ data: SESSION_FIXTURES });

    const { result } = renderHook(() => useSessions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(SESSION_FIXTURES);
  });

  it("calls GET /v1/account/sessions", async () => {
    mockGet.mockResolvedValue({ data: SESSION_FIXTURES });

    renderHook(() => useSessions(), { wrapper: createWrapper() });

    await waitFor(() => expect(mockGet).toHaveBeenCalledOnce());
    expect(mockGet.mock.calls[0]![0]).toBe("/v1/account/sessions");
  });

  it("is in error state when the request fails", async () => {
    mockGet.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useSessions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useRevokeSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls DELETE /v1/account/sessions/:id with correct id", async () => {
    mockDelete.mockResolvedValue({ data: undefined });

    const { result } = renderHook(() => useRevokeSession(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("s2");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDelete).toHaveBeenCalledWith("/v1/account/sessions/s2");
  });

  it("invalidates account.sessions query on success", async () => {
    mockDelete.mockResolvedValue({ data: undefined });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const spy = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = function Wrapper({ children }: { children: ReactNode }) {
      return createElement(QueryClientProvider, { client: queryClient }, children);
    };

    const { result } = renderHook(() => useRevokeSession(), { wrapper });
    result.current.mutate("s1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({
      queryKey: queryKeys.account.sessions(),
    });
  });

  it("is in error state when the delete request fails", async () => {
    mockDelete.mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useRevokeSession(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("s1");

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
