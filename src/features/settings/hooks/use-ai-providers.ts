import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryResult, UseMutationResult } from "@tanstack/react-query";
import { axiosInstance } from "@shared/api/axios-instance";
import { queryKeys } from "@shared/query/query-keys";

// ---- Server type ------------------------------------------------------------
// NO apiKey field — the key is write-only; the server never returns plaintext.

export interface AiProvider {
  id: string;
  label: string;
  baseUrl: string;
  model: string;
  /** Masked hint e.g. "sk-o…7Xz4". Never the plaintext key. */
  keyHint: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---- Input types (write path) -----------------------------------------------

export interface CreateAiProviderInput {
  label: string;
  baseUrl: string;
  model: string;
  /** Write-only: sent to the server; never stored or re-read by the client. */
  apiKey: string;
}

export interface UpdateAiProviderInput {
  id: string;
  label: string;
  baseUrl: string;
  model: string;
  /**
   * Write-only: include ONLY when the user enters a new key.
   * Omit entirely to keep the existing server-side key.
   */
  apiKey?: string;
}

// ---- Hooks ------------------------------------------------------------------

/**
 * List the authenticated user's AI providers.
 * Response NEVER contains plaintext apiKey — only `keyHint` (masked).
 */
export function useAiProviders(): UseQueryResult<AiProvider[]> {
  return useQuery<AiProvider[]>({
    queryKey: queryKeys.account.aiProviders(),
    queryFn: () =>
      axiosInstance
        .get<AiProvider[]>("/v1/account/ai-providers")
        .then((r) => r.data),
  });
}

/**
 * Create a new AI provider. The `apiKey` is sent once and never returned.
 */
export function useCreateAiProvider(): UseMutationResult<
  AiProvider,
  Error,
  CreateAiProviderInput
> {
  const queryClient = useQueryClient();
  return useMutation<AiProvider, Error, CreateAiProviderInput>({
    mutationFn: (input) =>
      axiosInstance
        .post<AiProvider>("/v1/account/ai-providers", input)
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.account.aiProviders(),
      });
    },
  });
}

/**
 * Update an existing AI provider.
 * Omit `apiKey` to keep the existing server-side key unchanged.
 */
export function useUpdateAiProvider(): UseMutationResult<
  AiProvider,
  Error,
  UpdateAiProviderInput
> {
  const queryClient = useQueryClient();
  return useMutation<AiProvider, Error, UpdateAiProviderInput>({
    mutationFn: ({ id, apiKey, ...rest }) => {
      // Only include apiKey in the body when the user explicitly provided one.
      const body = apiKey !== undefined ? { ...rest, apiKey } : rest;
      return axiosInstance
        .put<AiProvider>(`/v1/account/ai-providers/${id}`, body)
        .then((r) => r.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.account.aiProviders(),
      });
    },
  });
}

/**
 * Delete a provider by id.
 * Returns 204; cross-owner or absent → 404.
 */
export function useDeleteAiProvider(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id: string) =>
      axiosInstance
        .delete(`/v1/account/ai-providers/${id}`)
        .then(() => undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.account.aiProviders(),
      });
    },
  });
}

/**
 * Activate a provider. Deactivates all other providers for the same user
 * on the server side.
 */
export function useActivateAiProvider(): UseMutationResult<
  AiProvider,
  Error,
  string
> {
  const queryClient = useQueryClient();
  return useMutation<AiProvider, Error, string>({
    mutationFn: (id: string) =>
      axiosInstance
        .patch<AiProvider>(`/v1/account/ai-providers/${id}/activate`)
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.account.aiProviders(),
      });
    },
  });
}
