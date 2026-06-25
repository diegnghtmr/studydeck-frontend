import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryResult, UseMutationResult } from "@tanstack/react-query";
import { axiosInstance } from "@shared/api/axios-instance";
import { queryKeys } from "@shared/query/query-keys";

export interface Session {
  id: string;
  ipAddress: string;
  device: string;
  startedAt: string;
  lastAccessAt: string;
  current: boolean;
}

export function useSessions(): UseQueryResult<Session[]> {
  return useQuery<Session[]>({
    queryKey: queryKeys.account.sessions(),
    queryFn: () =>
      axiosInstance.get<Session[]>("/v1/account/sessions").then((r) => r.data),
  });
}

export function useRevokeSession(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id: string) =>
      axiosInstance.delete(`/v1/account/sessions/${id}`).then(() => undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.account.sessions() });
    },
  });
}
