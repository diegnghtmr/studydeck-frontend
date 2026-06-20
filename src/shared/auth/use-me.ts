import { useQuery } from "@tanstack/react-query";
import { authApi } from "@shared/api/client";
import { queryKeys } from "@shared/query/query-keys";
import { useAuthStore } from "./auth-store";
import type { AuthPrincipal } from "@shared/api/generated/models";

/**
 * Fetches the authenticated principal from GET /v1/auth/me.
 * Only runs when a token is present in the auth store.
 */
export function useMe() {
  const accessToken = useAuthStore((s) => s.accessToken);

  return useQuery<AuthPrincipal>({
    queryKey: queryKeys.auth.me(),
    queryFn: async () => {
      const response = await authApi.getCurrentPrincipal();
      return response.data;
    },
    enabled: Boolean(accessToken),
    staleTime: 5 * 60 * 1000,
  });
}
