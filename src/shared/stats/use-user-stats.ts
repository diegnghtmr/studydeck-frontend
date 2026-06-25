import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "@shared/api/axios-instance";
import { queryKeys } from "@shared/query/query-keys";

export interface UserStats {
  dueToday: number;
  newCards: number;
  reviewedToday: number;
  dayStreak: number;
  retention30d?: number;
  dailyGoal: number;
  desiredRetention?: number;
  newCardsPerDay?: number;
  language?: string;
  timezone?: string;
}

export interface PreferencesPayload {
  dailyGoal?: number;
  desiredRetention?: number;
  newCardsPerDay?: number;
  language?: string;
  timezone?: string;
}

export function useUserStats() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return useQuery<UserStats>({
    queryKey: queryKeys.stats.user(),
    queryFn: async () => {
      const response = await axiosInstance.get<UserStats>("/v1/stats", {
        params: { tz },
      });
      return response.data;
    },
  });
}

/**
 * Updates one or more user preferences (synced to the backend) and refreshes stats on success.
 * Only the fields actually present in the payload are sent to the API — never explicit undefined.
 */
export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, PreferencesPayload>({
    mutationFn: async (payload) => {
      const body: PreferencesPayload = {
        ...(payload.dailyGoal !== undefined && { dailyGoal: payload.dailyGoal }),
        ...(payload.desiredRetention !== undefined && { desiredRetention: payload.desiredRetention }),
        ...(payload.newCardsPerDay !== undefined && { newCardsPerDay: payload.newCardsPerDay }),
        ...(payload.language !== undefined && { language: payload.language }),
        ...(payload.timezone !== undefined && { timezone: payload.timezone }),
      };
      await axiosInstance.patch("/v1/account/preferences", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.user() });
    },
  });
}

/**
 * Updates the user's daily study goal (synced to the backend) and refreshes the stats so the
 * sidebar goal widget and dashboard reflect the new target.
 *
 * Delegates to useUpdatePreferences internally.
 */
export function useUpdateDailyGoal() {
  const updatePreferences = useUpdatePreferences();
  return {
    ...updatePreferences,
    mutate: (dailyGoal: number) => updatePreferences.mutate({ dailyGoal }),
    mutateAsync: (dailyGoal: number) => updatePreferences.mutateAsync({ dailyGoal }),
  };
}
