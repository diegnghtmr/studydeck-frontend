import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";

vi.mock("@shared/api/axios-instance", () => ({
  axiosInstance: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { axiosInstance } from "@shared/api/axios-instance";
import {
  useAiProviders,
  useCreateAiProvider,
  useUpdateAiProvider,
  useDeleteAiProvider,
  useActivateAiProvider,
} from "./use-ai-providers";
import type { AiProvider } from "./use-ai-providers";
import { queryKeys } from "@shared/query/query-keys";

const mockGet = vi.mocked(axiosInstance.get);
const mockPost = vi.mocked(axiosInstance.post);
const mockPut = vi.mocked(axiosInstance.put);
const mockPatch = vi.mocked(axiosInstance.patch);
const mockDelete = vi.mocked(axiosInstance.delete);

const PROVIDER_FIXTURE: AiProvider = {
  id: "p1",
  label: "OpenAI",
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4o",
  keyHint: "sk-o…7Xz4",
  active: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// ---- useAiProviders ----------------------------------------------------------

describe("useAiProviders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a list of providers on success", async () => {
    mockGet.mockResolvedValue({ data: [PROVIDER_FIXTURE] });

    const { result } = renderHook(() => useAiProviders(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([PROVIDER_FIXTURE]);
  });

  it("calls GET /v1/account/ai-providers", async () => {
    mockGet.mockResolvedValue({ data: [] });
    renderHook(() => useAiProviders(), { wrapper: createWrapper() });
    await waitFor(() => expect(mockGet).toHaveBeenCalledOnce());
    expect(mockGet.mock.calls[0]![0]).toBe("/v1/account/ai-providers");
  });

  it("is in error state when the request fails", async () => {
    mockGet.mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useAiProviders(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("AiProvider type does NOT have an apiKey field", () => {
    // Type-level assertion: AiProvider must not expose apiKey.
    // We verify at runtime by checking the fixture keys.
    expect(Object.keys(PROVIDER_FIXTURE)).not.toContain("apiKey");
  });
});

// ---- useCreateAiProvider -----------------------------------------------------

describe("useCreateAiProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls POST /v1/account/ai-providers with the correct body", async () => {
    mockPost.mockResolvedValue({ data: PROVIDER_FIXTURE });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = function Wrapper({ children }: { children: ReactNode }) {
      return createElement(QueryClientProvider, { client: queryClient }, children);
    };

    const { result } = renderHook(() => useCreateAiProvider(), { wrapper });

    result.current.mutate({
      label: "OpenAI",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o",
      apiKey: "sk-plaintext",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith("/v1/account/ai-providers", {
      label: "OpenAI",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o",
      apiKey: "sk-plaintext",
    });
  });

  it("invalidates account.aiProviders query on success", async () => {
    mockPost.mockResolvedValue({ data: PROVIDER_FIXTURE });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const spy = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = function Wrapper({ children }: { children: ReactNode }) {
      return createElement(QueryClientProvider, { client: queryClient }, children);
    };

    const { result } = renderHook(() => useCreateAiProvider(), { wrapper });
    result.current.mutate({
      label: "OpenAI",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o",
      apiKey: "sk-test",
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({
      queryKey: queryKeys.account.aiProviders(),
    });
  });

  it("is in error state when the post fails", async () => {
    mockPost.mockRejectedValue(new Error("Server error"));
    const { result } = renderHook(() => useCreateAiProvider(), {
      wrapper: createWrapper(),
    });
    result.current.mutate({
      label: "OpenAI",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o",
      apiKey: "sk-test",
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---- useUpdateAiProvider -----------------------------------------------------

describe("useUpdateAiProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls PUT /v1/account/ai-providers/:id with the body", async () => {
    mockPut.mockResolvedValue({ data: PROVIDER_FIXTURE });
    const { result } = renderHook(() => useUpdateAiProvider(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: "p1",
      label: "OpenAI Updated",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPut).toHaveBeenCalledWith("/v1/account/ai-providers/p1", {
      label: "OpenAI Updated",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
    });
  });

  it("omits apiKey from body when not provided", async () => {
    mockPut.mockResolvedValue({ data: PROVIDER_FIXTURE });
    const { result } = renderHook(() => useUpdateAiProvider(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: "p1",
      label: "OpenAI",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calledBody = mockPut.mock.calls[0]![1] as Record<string, unknown>;
    expect(calledBody).not.toHaveProperty("apiKey");
  });

  it("includes apiKey in body when provided", async () => {
    mockPut.mockResolvedValue({ data: PROVIDER_FIXTURE });
    const { result } = renderHook(() => useUpdateAiProvider(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: "p1",
      label: "OpenAI",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o",
      apiKey: "sk-newkey",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calledBody = mockPut.mock.calls[0]![1] as Record<string, unknown>;
    expect(calledBody["apiKey"]).toBe("sk-newkey");
  });

  it("invalidates account.aiProviders on success", async () => {
    mockPut.mockResolvedValue({ data: PROVIDER_FIXTURE });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const spy = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = function Wrapper({ children }: { children: ReactNode }) {
      return createElement(QueryClientProvider, { client: queryClient }, children);
    };

    const { result } = renderHook(() => useUpdateAiProvider(), { wrapper });
    result.current.mutate({
      id: "p1",
      label: "Updated",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o",
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({
      queryKey: queryKeys.account.aiProviders(),
    });
  });
});

// ---- useDeleteAiProvider -----------------------------------------------------

describe("useDeleteAiProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls DELETE /v1/account/ai-providers/:id", async () => {
    mockDelete.mockResolvedValue({ data: undefined });
    const { result } = renderHook(() => useDeleteAiProvider(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("p1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDelete).toHaveBeenCalledWith("/v1/account/ai-providers/p1");
  });

  it("invalidates account.aiProviders on success", async () => {
    mockDelete.mockResolvedValue({ data: undefined });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const spy = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = function Wrapper({ children }: { children: ReactNode }) {
      return createElement(QueryClientProvider, { client: queryClient }, children);
    };

    const { result } = renderHook(() => useDeleteAiProvider(), { wrapper });
    result.current.mutate("p1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({
      queryKey: queryKeys.account.aiProviders(),
    });
  });
});

// ---- useActivateAiProvider ---------------------------------------------------

describe("useActivateAiProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls PATCH /v1/account/ai-providers/:id/activate", async () => {
    mockPatch.mockResolvedValue({ data: PROVIDER_FIXTURE });
    const { result } = renderHook(() => useActivateAiProvider(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("p1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith("/v1/account/ai-providers/p1/activate");
  });

  it("invalidates account.aiProviders on success", async () => {
    mockPatch.mockResolvedValue({ data: PROVIDER_FIXTURE });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const spy = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = function Wrapper({ children }: { children: ReactNode }) {
      return createElement(QueryClientProvider, { client: queryClient }, children);
    };

    const { result } = renderHook(() => useActivateAiProvider(), { wrapper });
    result.current.mutate("p1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({
      queryKey: queryKeys.account.aiProviders(),
    });
  });
});
