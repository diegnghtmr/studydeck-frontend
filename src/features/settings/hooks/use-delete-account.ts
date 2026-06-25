import { useMutation } from "@tanstack/react-query";
import { axiosInstance } from "@shared/api/axios-instance";

export function useDeleteAccount() {
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await axiosInstance.delete("/v1/account");
    },
  });
}

/**
 * Revokes all of the user's Keycloak sessions ("sign out everywhere").
 * Backend proxies to the Keycloak Admin API.
 */
export function useLogoutAllSessions() {
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await axiosInstance.post("/v1/account/logout-all");
    },
  });
}
